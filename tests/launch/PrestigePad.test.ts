import chai from 'chai';
import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import {
    Admin,
    CommissionToken,
    Currency,
    EstateToken,
    FeeReceiver,
    EstateForger,
    MockPriceFeed,
    MockEstateForger,
    IEstateTokenizer__factory,
    IEstateTokenReceiver__factory,
    ICommon__factory,
    IERC1155ReceiverUpgradeable__factory,
    ReserveVault,
    PriceWatcher,
    ProjectToken,
    MockPrestigePad,
} from '@typechain-types';
import { callTransaction, getBalance, getSignatures, prepareERC20, prepareNativeToken, randomWallet, resetERC20, resetNativeToken, testReentrancy } from '@utils/blockchain';
import { Constant, DAY } from '@tests/test.constant';
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployFeeReceiver } from '@utils/deployments/common/feeReceiver';
import { deployCurrency } from '@utils/deployments/common/currency';
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

import { MockContract, smock } from '@defi-wonderland/smock';

import {
    callAdmin_ActivateIn,
    callAdmin_AuthorizeManagers,
    callAdmin_AuthorizeModerators,
    callAdmin_DeclareZones,
    callAdmin_UpdateCurrencyRegistries,
} from '@utils/callWithSignatures/admin';
import {
    callEstateToken_UpdateCommissionToken,
    callEstateToken_Pause,
    callEstateToken_AuthorizeTokenizers,
} from '@utils/callWithSignatures/estateToken';
import { BigNumber, BigNumberish, Contract, Wallet } from 'ethers';
import { randomInt } from 'crypto';
import { getBytes4Hex, getInterfaceID, randomBigNumber, structToObject } from '@utils/utils';
import { OrderedMap } from '@utils/utils';
import { deployEstateForger } from '@utils/deployments/land/estateForger';
import { addCurrencyToAdminAndPriceWatcher } from '@utils/callWithSignatures/common';
import { callEstateForger_Pause, callEstateForger_UpdateBaseUnitPriceRange, callEstateForger_UpdateFeeRate, callEstateForger_Whitelist } from '@utils/callWithSignatures/estateForger';
import { deployMockPriceFeed } from '@utils/deployments/mocks/mockPriceFeed';
import { deployFailReceiver } from '@utils/deployments/mocks/failReceiver';
import { deployReentrancy } from '@utils/deployments/mocks/mockReentrancy/reentrancy';
import { deployEstateToken } from '@utils/deployments/land/estateToken';
import { deployMockEstateForger } from '@utils/deployments/mocks/mockEstateForger';
import { deployReentrancyERC1155Holder } from '@utils/deployments/mocks/mockReentrancy/reentrancyERC1155Holder';
import { request } from 'http';
import { Initialization as LaunchInitialization } from '@tests/launch/test.initialization';
import { callReserveVault_AuthorizeProvider } from '@utils/callWithSignatures/reserveVault';
import { remain, scale } from '@utils/formula';
import { RequestQuote, RequestAgenda, RequestEstate, RequestQuota } from '@utils/models/EstateForger';
import { deployPriceWatcher } from '@utils/deployments/common/priceWatcher';
import { Rate } from '@utils/models/Common';
import { MockValidator } from '@utils/mockValidator';
import { RegisterSellerInParams, RequestTokenizationParams, UpdateRequestURIParams, UpdateRequestAgendaParams } from '@utils/models/EstateForger';
import { getRegisterSellerInValidation, getRequestTokenizationValidation, getRegisterSellerInInvalidValidation, getRequestTokenizationInvalidValidation, getUpdateRequestURIValidation, getUpdateRequestURIInvalidValidation } from '@utils/validation/EstateForger';
import { deployMockPrestigePad } from '@utils/deployments/mocks/mockPrestigePad';
import { callPrestigePad_Pause } from '@utils/callWithSignatures/prestigePad';

chai.use(smock.matchers);

export interface PrestigePadFixture {
    admin: Admin;
    feeReceiver: FeeReceiver;
    currencies: Currency[];
    projectToken: MockContract<ProjectToken>;
    reserveVault: MockContract<ReserveVault>;
    priceWatcher: PriceWatcher;
    prestigePad: MockPrestigePad;
    nativePriceFeed: MockPriceFeed;
    currencyPriceFeed: MockPriceFeed;
    validator: MockValidator;
    
    deployer: any;
    admins: any[];

    manager: any;
    moderator: any;
    user: any;
    seller1: any, seller2: any, seller3: any;
    commissionReceiver: any;
    depositor1: any, depositor2: any, depositor3: any;
    depositors: any[];

    zone1: string, zone2: string;
}

async function testReentrancy_estateForger(
    estateForger: EstateForger,
    reentrancyContract: Contract,
    assertion: any,
) {
    let data = [
        estateForger.interface.encodeFunctionData("deposit", [0, 0]),
        estateForger.interface.encodeFunctionData("confirm", [0, ethers.constants.AddressZero]),
        estateForger.interface.encodeFunctionData("withdrawDeposit", [0]),
    ];

    await testReentrancy(
        reentrancyContract,
        estateForger,
        data,
        assertion,
    );
}

export async function applyDiscount(
    admin: Admin,
    feeAmount: BigNumber,
    currency: Contract | null,
) {
    const isExclusive = currency ? await admin.isExclusiveCurrency(currency.address) : false;
    if (isExclusive) {
        const exclusiveRate = currency ? await currency.exclusiveDiscount() : ethers.BigNumber.from(0);
        return remain(feeAmount, exclusiveRate);
    }
    return feeAmount;
}

export async function getFeeDenomination(
    estateForger: EstateForger,
    admin: Admin,
    _unitPrice: BigNumber,
    currency: Contract | null,
) {
    return applyDiscount(
        admin,
        scale(_unitPrice, await estateForger.getFeeRate()),
        currency,
    )
}

export async function getCommissionDenomination(
    commissionToken: CommissionToken,
    feeDenomination: BigNumber,
) {
    return scale(
        feeDenomination,
        await commissionToken.getCommissionRate(),
    )
}

export async function getCashbackBaseDenomination(
    feeDenomination: BigNumber,
    commissionDenomination: BigNumber,
    cashbackBaseRate: Rate,
) {
    return scale(
        feeDenomination.sub(commissionDenomination),
        cashbackBaseRate,
    );
}

describe('7.1. PrestigePad', async () => {
    async function prestigePadFixture(): Promise<PrestigePadFixture> {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        const admins = [];
        for (let i = 1; i <= Constant.ADMIN_NUMBER; ++i) admins.push(accounts[i]);
        const user = accounts[Constant.ADMIN_NUMBER + 1];
        const manager = accounts[Constant.ADMIN_NUMBER + 2];
        const moderator = accounts[Constant.ADMIN_NUMBER + 3];
        const seller1 = accounts[Constant.ADMIN_NUMBER + 4];
        const seller2 = accounts[Constant.ADMIN_NUMBER + 5];
        const seller3 = accounts[Constant.ADMIN_NUMBER + 6];
        const commissionReceiver = accounts[Constant.ADMIN_NUMBER + 7];
        const depositor1 = accounts[Constant.ADMIN_NUMBER + 8];
        const depositor2 = accounts[Constant.ADMIN_NUMBER + 9];
        const depositor3 = accounts[Constant.ADMIN_NUMBER + 10];

        const depositors = [depositor1, depositor2, depositor3];

        const adminAddresses: string[] = admins.map(signer => signer.address);
        const admin = await deployAdmin(
            deployer.address,
            adminAddresses[0],
            adminAddresses[1],
            adminAddresses[2],
            adminAddresses[3],
            adminAddresses[4],
        ) as Admin;

        const feeReceiver = await deployFeeReceiver(
            deployer.address,
            admin.address
        ) as FeeReceiver;

        const SmockCurrencyFactory = await smock.mock('Currency') as any;
        const currency1 = await SmockCurrencyFactory.deploy();
        const currency2 = await SmockCurrencyFactory.deploy();
        const currency3 = await SmockCurrencyFactory.deploy();
        await callTransaction(currency1.initialize('MockCurrency1', 'MCK1'));
        await callTransaction(currency2.initialize('MockCurrency2', 'MCK2'));
        await callTransaction(currency3.initialize('MockCurrency3', 'MCK3'));

        await callTransaction(currency1.setExclusiveDiscount(ethers.utils.parseEther('0.3'), Constant.COMMON_RATE_DECIMALS));
        await callTransaction(currency2.setExclusiveDiscount(ethers.utils.parseEther('0.4'), Constant.COMMON_RATE_DECIMALS));
        await callTransaction(currency3.setExclusiveDiscount(ethers.utils.parseEther('0.5'), Constant.COMMON_RATE_DECIMALS));

        const currencies = [currency1, currency2, currency3];

        const validator = new MockValidator(deployer as any);

        const nativePriceFeed = await deployMockPriceFeed(deployer.address, 0, 0) as MockPriceFeed;
        const currencyPriceFeed = await deployMockPriceFeed(deployer.address, 0, 0) as MockPriceFeed;
        
        const MockProjectTokenFactory = await smock.mock('ProjectToken') as any;
        const projectToken = await MockProjectTokenFactory.deploy() as MockContract<ProjectToken>;
        await callTransaction(projectToken.initialize(
            admin.address,
            feeReceiver.address,
            validator.getAddress(),
            LaunchInitialization.PROJECT_TOKEN_BaseURI,
            LaunchInitialization.PROJECT_TOKEN_RoyaltyRate,
        ));

        const SmockReserveVaultFactory = await smock.mock('ReserveVault') as any;
        const reserveVault = await SmockReserveVaultFactory.deploy() as MockContract<ReserveVault>;
        await callTransaction(reserveVault.initialize(
            admin.address,
        ));

        const priceWatcher = await deployPriceWatcher(
            deployer.address,
            admin.address
        ) as PriceWatcher;

        const prestigePad = await deployMockPrestigePad(
            deployer,
            admin.address,
            projectToken.address,
            priceWatcher.address,
            feeReceiver.address,
            reserveVault.address,
            validator.getAddress(),
            LaunchInitialization.PRESTIGE_PAD_BaseMinUnitPrice,
            LaunchInitialization.PRESTIGE_PAD_BaseMaxUnitPrice,
            LaunchInitialization.PRESTIGE_PAD_FeeRate,
        ) as MockPrestigePad;

        const zone1 = ethers.utils.formatBytes32String("TestZone1");
        const zone2 = ethers.utils.formatBytes32String("TestZone2");

        return {
            admin,
            feeReceiver,
            currencies,
            projectToken,
            reserveVault,
            priceWatcher,
            prestigePad,
            nativePriceFeed,
            currencyPriceFeed,
            validator,
            deployer,
            admins,
            manager,
            moderator,
            user,
            seller1,
            seller2,
            seller3,
            commissionReceiver,
            depositor1,
            depositor2,
            depositor3,
            depositors,
            zone1,
            zone2,
        };
    };

    async function beforePrestigePadTest({
        listSampleCurrencies = false,
        fundERC20ForDepositors = false,
        fundERC20ForManagers = false,
        addZoneForExecutive = false,
        pause = false,
    } = {}): Promise<PrestigePadFixture> {
        const fixture = await loadFixture(prestigePadFixture);
        const { 
            admin,
            admins,
            manager,
            moderator,
            projectToken,
            prestigePad,
            priceWatcher,
            currencies,
            nativePriceFeed,
            currencyPriceFeed,
            commissionReceiver,
            zone1,
            zone2,
            seller1,
            seller2,
            seller3,
            depositor1,
            depositor2,
            depositor3,
            reserveVault,
            deployer,
            validator,
        } = fixture;

        await callAdmin_AuthorizeManagers(
            admin,
            admins,
            [manager.address],
            true,
            await admin.nonce()
        );

        await callAdmin_AuthorizeModerators(
            admin,
            admins,
            [moderator.address],
            true,
            await admin.nonce()
        );

        if (listSampleCurrencies) {
            await nativePriceFeed.updateData(1000_00000000, 8);
            await currencyPriceFeed.updateData(5_00000000, 8);

            await addCurrencyToAdminAndPriceWatcher(
                admin,
                priceWatcher,
                admins,
                [ethers.constants.AddressZero],
                [true],
                [false],
                [nativePriceFeed.address],
                [3600],
                [10000_000],
                [3],
            );
            
            await addCurrencyToAdminAndPriceWatcher(
                admin,
                priceWatcher,
                admins,
                [currencies[0].address],
                [true],
                [true],
                [currencyPriceFeed.address],
                [24 * 3600],
                [50_000],
                [3],
            );

            await callAdmin_UpdateCurrencyRegistries(
                admin,
                admins,
                [currencies[1].address, currencies[2].address],
                [true, true],
                [false, false],
                await admin.nonce(),
            );
        }

        if (fundERC20ForDepositors) {
            await prepareERC20(
                currencies[0],
                [depositor1, depositor2, depositor3],
                [prestigePad],
                ethers.utils.parseEther('1000000000'),
            );
        }

        await callAdmin_DeclareZones(
            admin,
            admins,
            [zone1],
            true,
            await admin.nonce()
        );

        await callAdmin_DeclareZones(
            admin,
            admins,
            [zone2],
            true,
            await admin.nonce()
        );


        let timestamp = await time.latest() + 1000;

        if (addZoneForExecutive) {
            await callAdmin_ActivateIn(
                admin,
                admins,
                zone1,
                [manager.address, moderator.address],
                true,
                await admin.nonce()
            );
            await callAdmin_ActivateIn(
                admin,
                admins,
                zone2,
                [manager.address, moderator.address],
                true,
                await admin.nonce()
            );
        }

        if (pause) {
            await callPrestigePad_Pause(
                prestigePad,
                admins,
                await admin.nonce()
            );
        }

        return fixture;
    }

    describe('7.1.1. initialize(address, address, address, address, address, address, uint256, uint256, uint256)', async () => {
        it('7.1.1.1. Deploy successfully', async () => {
            const { admin, prestigePad, projectToken, feeReceiver, priceWatcher, reserveVault, validator } = await beforePrestigePadTest({});

            const tx = prestigePad.deployTransaction;
            await expect(tx).to.emit(prestigePad, 'BaseUnitPriceRangeUpdate').withArgs(
                LaunchInitialization.PRESTIGE_PAD_BaseMinUnitPrice,
                LaunchInitialization.PRESTIGE_PAD_BaseMaxUnitPrice,
            );
            await expect(tx).to.emit(prestigePad, 'FeeRateUpdate').withArgs(
                LaunchInitialization.PRESTIGE_PAD_FeeRate,
            );
            
            expect(await prestigePad.baseMinUnitPrice()).to.equal(LaunchInitialization.PRESTIGE_PAD_BaseMinUnitPrice);
            expect(await prestigePad.baseMaxUnitPrice()).to.equal(LaunchInitialization.PRESTIGE_PAD_BaseMaxUnitPrice);

            expect(await prestigePad.launchNumber()).to.equal(0);
            expect(await prestigePad.roundNumber()).to.equal(0);

            expect(await prestigePad.paused()).to.equal(false);

            expect(await prestigePad.admin()).to.equal(admin.address);
            expect(await prestigePad.feeReceiver()).to.equal(feeReceiver.address);
            expect(await prestigePad.projectToken()).to.equal(projectToken.address);
            expect(await prestigePad.priceWatcher()).to.equal(priceWatcher.address);
            expect(await prestigePad.reserveVault()).to.equal(reserveVault.address);
            expect(await prestigePad.validator()).to.equal(validator.getAddress());

            const feeRate = await prestigePad.getFeeRate();
            expect(feeRate.value).to.equal(LaunchInitialization.PRESTIGE_PAD_FeeRate);
            expect(feeRate.decimals).to.equal(Constant.COMMON_RATE_DECIMALS);
        });

        it('7.1.1.2. revert with invalid fee rate', async () => {
            const { admin, feeReceiver, projectToken, priceWatcher, reserveVault, validator } = await beforePrestigePadTest({});
            const PrestigePad = await ethers.getContractFactory("PrestigePad");

            await expect(upgrades.deployProxy(PrestigePad, [
                admin.address,
                projectToken.address,
                priceWatcher.address,
                feeReceiver.address,
                reserveVault.address,
                validator.getAddress(),
                LaunchInitialization.PRESTIGE_PAD_BaseMinUnitPrice,
                LaunchInitialization.PRESTIGE_PAD_BaseMaxUnitPrice,
                Constant.COMMON_RATE_MAX_FRACTION.add(1),
            ])).to.be.reverted;
        });
    });

    describe('7.1.2. updateFeeRate(uint256, bytes[])', async () => {
        it('7.1.2.1. updateFeeRate successfully with valid signatures', async () => {
            const { admin, admins, prestigePad } = await beforePrestigePadTest({});
            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256"],
                [prestigePad.address, "updateFeeRate", ethers.utils.parseEther('0.2')]
            );

            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await prestigePad.updateFeeRate(ethers.utils.parseEther('0.2'), signatures);
            await tx.wait();

            await expect(tx).to
                .emit(prestigePad, 'FeeRateUpdate')
                .withArgs(ethers.utils.parseEther('0.2'));

            const feeRate = await prestigePad.getFeeRate();
            expect(feeRate.value).to.equal(ethers.utils.parseEther('0.2'));
            expect(feeRate.decimals).to.equal(Constant.COMMON_RATE_DECIMALS);
        });

        it('7.1.2.2. updateFeeRate unsuccessfully with invalid signatures', async () => {
            const { admin, admins, prestigePad } = await beforePrestigePadTest({});

            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256"],
                [prestigePad.address, "updateFeeRate", ethers.utils.parseEther('0.2')]
            );
            const invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(prestigePad.updateFeeRate(
                ethers.utils.parseEther('0.2'),
                invalidSignatures
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('7.1.2.3. updateFeeRate unsuccessfully with invalid rate', async () => {
            const { admin, admins, prestigePad } = await beforePrestigePadTest({});
            
            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256"],
                [prestigePad.address, "updateFeeRate", Constant.COMMON_RATE_MAX_FRACTION.add(1)]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(prestigePad.updateFeeRate(
                Constant.COMMON_RATE_MAX_FRACTION.add(1),
                signatures
            )).to.be.revertedWithCustomError(prestigePad, 'InvalidRate');
        });
    });

    describe('7.1.3. updateBaseUnitPriceRange(uint256, uint256, bytes[])', async () => {
        it('7.1.3.1. updateBaseUnitPriceRange successfully with valid signatures', async () => {
            const { admin, admins, prestigePad } = await beforePrestigePadTest({});
            
            const baseMinUnitPrice = 20;
            const baseMaxUnitPrice = 100;

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'uint256', 'uint256'],
                [prestigePad.address, 'updateBaseUnitPriceRange', baseMinUnitPrice, baseMaxUnitPrice]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await prestigePad.updateBaseUnitPriceRange(
                baseMinUnitPrice,
                baseMaxUnitPrice,
                signatures
            );
            await tx.wait();

            await expect(tx).to
                .emit(prestigePad, 'BaseUnitPriceRangeUpdate')
                .withArgs(baseMinUnitPrice, baseMaxUnitPrice);

            expect(await prestigePad.baseMinUnitPrice()).to.equal(baseMinUnitPrice);
            expect(await prestigePad.baseMaxUnitPrice()).to.equal(baseMaxUnitPrice);
        });

        it('7.1.3.2. updateBaseUnitPriceRange unsuccessfully with invalid signatures', async () => {
            const { admin, admins, prestigePad } = await beforePrestigePadTest({});
            const baseMinUnitPrice = 20;
            const baseMaxUnitPrice = 100;

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'uint256', 'uint256'],
                [prestigePad.address, 'updateBaseUnitPriceRange', baseMinUnitPrice, baseMaxUnitPrice]
            );
            const invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(prestigePad.updateBaseUnitPriceRange(
                baseMinUnitPrice,
                baseMaxUnitPrice,
                invalidSignatures
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('7.1.3.3. updateBaseUnitPriceRange unsuccessfully with invalid price range', async () => {
            const { admin, admins, prestigePad } = await beforePrestigePadTest({});
            const baseMinUnitPrice = 101;
            const baseMaxUnitPrice = 100;

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'uint256', 'uint256'],
                [prestigePad.address, 'updateBaseUnitPriceRange', baseMinUnitPrice, baseMaxUnitPrice]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(prestigePad.updateBaseUnitPriceRange(
                baseMinUnitPrice,
                baseMaxUnitPrice,
                signatures
            )).to.be.revertedWithCustomError(prestigePad, 'InvalidInput');
        });
    });

    describe('7.1.4. getLaunch(uint256)', async () => {
        it('7.1.4.1. return correct launch with valid launch id', async () => {

        });

        it('7.1.4.2. revert with invalid launch id', async () => {

        });
    });

    describe('7.1.5. getRound(uint256)', async () => {
        it('7.1.5.1. return correct round with valid round id', async () => {

        });

        it('7.1.5.2. revert with invalid round id', async () => {

        });
    });

    describe('7.1.6. initiateLaunch(address, bytes32, string, string, uint256, (uint256, uint256, bytes))', async () => {
        it('7.1.6.1. initiate launch successfully', async () => {

        });

        it('7.1.6.2. initiate launch successfully with zero initial quantity', async () => {

        });

        it('7.1.6.3. initiate launch unsuccessfully by non-executive account', async () => {

        });

        it('7.1.6.4. initiate launch unsuccessfully when paused', async () => {

        });

        it('7.1.6.5. initiate launch unsuccessfully with invalid validation', async () => {

        });

        it('7.1.6.6. initiate launch unsuccessfully with inactive zone', async () => {

        });

        it('7.1.6.7. initiate launch unsuccessfully when sender is not authorized in zone', async () => {

        });

        it('7.1.6.8. initiate launch unsuccessfully when sender is not initiator in zone', async () => {

        });

        it('7.1.6.9. initiate launch unsuccessfully when launching project failed', async () => {

        });

        it('7.1.6.10. initiate launch unsuccessfully when initiator cannot receive erc1155', async () => {

        });
    });

    describe('7.1.7. updateRound(uint256, uint256, (string, (uint256, uint256, uint256), (uint256, address), (uint256, uint256, bytes)))', async () => {
        it('7.1.7.1. update round successfully', async () => {

        });

        it('7.1.7.2. update round unsuccessfully with invalid launch id', async () => {

        });

        it('7.1.7.3. update round unsuccessfully when sender is not launch initiator', async () => {

        });

        it('7.1.7.4. update round unsuccessfully when paused', async () => {

        });

        it('7.1.7.5. update round unsuccessfully with invalid round validation', async () => {

        });

        it('7.1.7.6. update round unsuccessfully when launch is finalized', async () => {

        });

        it('7.1.7.7. update round unsuccessfully with current round is not finished', async () => {

        });

        it('7.1.7.8. update round unsuccessfully when currency price is not in range', async () => {

        });

        it('7.1.7.9. update round unsuccessfully when min selling quantity exceed max selling quantity', async () => {

        });

        it('7.1.7.10. update round unsuccessfully when max selling quantity exceed total quantity', async () => {

        });
    });


    describe('7.1.8. updateRounds(uint256, uint256, (string, (uint256, uint256, uint256), (uint256, address), (uint256, uint256, bytes))[])', async () => {
        it('7.1.8.1. update rounds successfully', async () => {

        });

        it('7.1.8.2. update round unsuccessfully with invalid launch id', async () => {

        });

        it('7.1.8.3. update round unsuccessfully when sender is not launch initiator', async () => {

        });

        it('7.1.8.4. update round unsuccessfully when paused', async () => {

        });

        it('7.1.8.5. update round unsuccessfully when launch is finalized', async () => {

        });

        it('7.1.8.6. update round unsuccessfully when removing round number is greater than current round number', async () => {

        });

        it('7.1.8.7. update round unsuccessfully when current round is removed', async () => {

        });

        it('7.1.8.8. update round unsuccessfully with invalid round validation', async () => {

        });

        it('7.1.8.9. update round unsuccessfully when currency price is not in range', async () => {

        });

        it('7.1.8.10. update round unsuccessfully when min selling quantity exceed max selling quantity', async () => {

        });

        it('7.1.8.11. update round unsuccessfully when max selling quantity exceed total quantity', async () => {

        });
    });

    describe('7.1.9. raiseNextRound(uint256, uint256, uint256, address[], uint256[], uint40, uint40)', async () => {
        it('7.1.9.1. raise next round successfully', async () => {

        });

        it('7.1.9.2. raise next round unsuccessfully when contract is reentered', async () => {

        });

        it('7.1.9.3. raise next round unsuccessfully with invalid launch id', async () => {

        });

        it('7.1.9.4. raise next round unsuccessfully when sender is not launch initiator', async () => {

        });

        it('7.1.9.5. raise next round unsuccessfully when paused', async () => {

        });

        it('7.1.9.6. raise next round unsuccessfully with invalid cashback base rate', async () => {

        });

        it('7.1.9.7. raise next round unsuccessfully with mismatched params length', async () => {

        });

        it('7.1.9.8. raise next round unsuccessfully with raise start time after current timestamp', async () => {

        });

        it('7.1.9.9. raise next round unsuccessfully with raise duration less than minimum requirement', async () => {
        
        });

        it('7.1.9.10. raise next round unsuccessfully when launch is finalized', async () => {

        });

        it('7.1.9.11. raise next round unsuccessfully when current round is not confirmed', async () => {

        });

        it('7.1.9.12. raise next round unsuccessfully when there is no new round', async () => {

        });

        it('7.1.9.13. raise next round unsuccessfully when cashback threshold exceed total quantity', async () => {

        });

        it('7.1.9.14. raise next round unsuccessfully without cashback currencies and rate, but with cashback threshold', async () => {

        });

        it('7.1.9.15. raise next round unsuccessfully with cashback currencies and rate, but without cashback base rate', async () => {

        });

        it('7.1.9.16. raise next round unsuccessfully when open fund failed', async () => {

        });
    });

    describe('7.1.10. cancelCurrentRound(uint256)', async () => {
        it('7.1.10.1. cancel current round successfully', async () => {

        });

        it('7.1.10.2. cancel current round unsuccessfully with invalid launch id', async () => {

        });

        it('7.1.10.3. cancel current round unsuccessfully when sender is not launch initiator', async () => {

        });

        it('7.1.10.4. cancel current round unsuccessfully when paused', async () => {

        });

        it('7.1.10.5. cancel current round unsuccessfully when launch is finalized', async () => {

        });

        it('7.1.10.6. cancel current round unsuccessfully when current round is confirmed', async () => {

        });
    });

    describe('7.1.11. confirmCurrentRound(uint256)', async () => {
        it('7.1.11.1. confirm current round successfully before raise ends', async () => {

        });

        it('7.1.11.2. confirm current round successfully after raise ends', async () => {

        });

        it('7.1.11.3. confirm current round successfully without cashback', async () => {

        });

        it('7.1.11.4. confirm current round when contract is reentered', async () => {

        });

        it('7.1.11.5. confirm current round unsuccessfully with invalid launch id', async () => {

        });

        it('7.1.11.6. confirm current round unsuccessfully when sender is not launch initiator', async () => {

        });

        it('7.1.11.7. confirm current round unsuccessfully when paused', async () => {

        });

        it('7.1.11.8. confirm current round unsuccessfully when round is confirmed', async () => {

        });

        it('7.1.11.9. confirm current round unsuccessfully when confirm time limit is overdue', async () => {

        });

        it('7.1.11.10. confirm current round unsuccessfully when sold quantity is not enough', async () => {

        });

        it('7.1.11.11. confirm current round unsuccessfully when sending native token to initiator failed', async () => {

        });

        it('7.1.11.12. confirm current round unsuccessfully when provide fund failed', async () => {

        });
    });

    describe('7.1.12. finalize(uint256)', async () => {
        it('7.1.12.1. finalize launch successfully', async () => {

        });

        it('7.1.12.2. finalize launch unsuccessfully with invalid launch id', async () => {

        });

        it('7.1.12.3. finalize launch unsuccessfully when sender is not launch initiator', async () => {

        });

        it('7.1.12.4. finalize launch unsuccessfully when paused', async () => {

        });

        it('7.1.12.5. finalize launch unsuccessfully when launch is finalized', async () => {

        });
        
        it('7.1.12.6. finalize launch unsuccessfully when there are more round to raise', async () => {

        });

        it('7.1.12.7. finalize launch unsuccessfully when current round is not confirmed', async () => {

        });
    });

    describe('7.1.13. depositCurrentRound(uint256, uint256)', async () => {
        it('7.1.13.1. deposit current round successfully', async () => {
            
        });

        it('7.1.13.2. deposit current round unsuccessfully with invalid launch id', async () => {

        });

        it('7.1.13.3. deposit current round unsuccessfully when contract is reentered', async () => {

        });

        it('7.1.13.4. deposit current round unsuccessfully when paused', async () => {

        });

        it('7.1.13.5. deposit current round unsuccessfully when launch is finalized', async () => {

        });

        it('7.1.13.6. deposit current round unsuccessfully when current round is confirmed', async () => {

        });

        it('7.1.13.7. deposit current round unsuccessfully before raise starts', async () => {

        });

        it('7.1.13.8. deposit current round unsuccessfully after raise ends', async () => {

        });

        it('7.1.13.9. deposit current round unsuccessfully when deposit quantity exceed remaining quantity', async () => {

        });
    });

    describe('7.1.14. safeDepositCurrentRound(uint256, uint256, bytes32)', async () => {
        it('7.1.14.1. safe deposit current round successfully', async () => {

        });

        it('7.1.14.2. safe deposit current round unsuccessfully with invalid launch id', async () => {

        });

        it('7.1.14.3. safe deposit current round unsuccessfully with invalid anchor', async () => {

        });
    });

    describe('7.1.15. withdrawDeposit(uint256)', async () => {
        it('7.1.15.1. withdraw deposit successfully', async () => {

        });

        it('7.1.15.2. withdraw deposit unsuccessfully when contract is reentered', async () => {

        });

        it('7.1.15.3. withdraw deposit unsuccessfully with invalid round id', async () => {

        });

        it('7.1.15.4. withdraw deposit unsuccessfully when paused', async () => {

        });

        it('7.1.15.5. withdraw deposit unsuccessfully when round is confirmed', async () => {

        });

        it('7.1.15.6. withdraw deposit unsuccessfully when raising is not ended', async () => {
        
        });

        it('7.1.15.7. withdraw deposit unsuccessfully when confirm time limit is not overdue', async () => {

        });

        it('7.1.15.8. withdraw deposit unsuccessfully when not deposited', async () => {

        });

        it('7.1.15.9. withdraw deposit unsuccessfully when already withdrawn', async () => {

        });

        it('7.1.15.10. withdraw deposit unsuccessfully when sending native token to user failed', async () => {

        });
    });

    describe('7.1.16. withdrawProjectToken(uint256, uint256)', async () => {
        it('7.1.16.1. withdraw project token successfully', async () => {

        });

        it('7.1.16.2. withdraw project token successfully without cashback', async () => {

        });

        it('7.1.16.3. withdraw zero project token when user not deposited', async () => {

        });

        it('7.1.16.4. withdraw project token unsuccessfully when contract is reentered', async () => {

        });

        it('7.1.16.5. withdraw project token unsuccessfully with invalid launch id', async () => {

        });

        it('7.1.16.6. withdraw project token unsuccessfully when paused', async () => {

        });

        it('7.1.16.7. withdraw project token unsuccessfully with invalid round index', async () => {

        });

        it('7.1.16.8. withdraw project token unsuccessfully when round is not confirmed', async () => {

        });

        it('7.1.16.9. withdraw project token unsuccessfully when user already withdrawn project token', async () => {

        });

        it('7.1.16.10. withdraw project token unsuccessfully when withdraw fund failed', async () => {

        });
    });

    describe('7.1.17. allocationOfAt(uint256)', async () => {
        it('7.1.17.1. return correct allocation', async () => {

        });

        it('7.1.17.2. revert with invalid launch id', async () => {

        });

        it('7.1.17.3. revert with timestamp after current timestamp', async () => {

        });
    });
});

