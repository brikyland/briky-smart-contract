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
} from '@typechain-types';
import { callTransaction, getBalance, getSignatures, prepareERC20, prepareNativeToken, randomWallet, resetERC20, resetNativeToken, testReentrancy } from '@utils/blockchain';
import { Constant } from '@tests/test.constant';
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
import { BigNumber, BigNumberish, Contract } from 'ethers';
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
import { Initialization as LandInitialization } from '@tests/land/test.initialization';
import { callReserveVault_AuthorizeInitiator } from '@utils/callWithSignatures/reserveVault';
import { remain, scale } from '@utils/formula';
import { RequestEstateInput, RequestQuoteInput, RequestQuotaInput, RequestQuote, RequestAgenda, RequestEstate, RequestQuota } from '@utils/models/EstateForger';
import { deployPriceWatcher } from '@utils/deployments/common/priceWatcher';
import { Rate } from '@utils/models/Common';

chai.use(smock.matchers);

interface EstateForgerFixture {
    admin: Admin;
    feeReceiver: FeeReceiver;
    currencies: Currency[];
    estateToken: MockContract<EstateToken>;
    commissionToken: MockContract<CommissionToken>;
    reserveVault: MockContract<ReserveVault>;
    priceWatcher: PriceWatcher;
    estateForger: MockEstateForger;
    nativePriceFeed: MockPriceFeed;
    currencyPriceFeed: MockPriceFeed;
    
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
    feeAmount: ethers.BigNumber,
    currency: ethers.Contract | null,
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
    _unitPrice: ethers.BigNumber,
    currency: ethers.Contract | null,
) {
    return applyDiscount(
        admin,
        scale(_unitPrice, await estateForger.getFeeRate()),
        currency,
    )
}

export async function getCommissionDenomination(
    commissionToken: CommissionToken,
    feeDenomination: ethers.BigNumber,
) {
    return scale(
        feeDenomination,
        await commissionToken.getCommissionRate(),
    )
}

export async function getCashbackBaseDenomination(
    feeDenomination: ethers.BigNumber,
    commissionDenomination: ethers.BigNumber,
    cashbackBaseRate: Rate,
) {
    return scale(
        feeDenomination.sub(commissionDenomination),
        cashbackBaseRate,
    );
}

describe('4. EstateForger', async () => {
    async function estateForgerFixture(): Promise<EstateForgerFixture> {
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

        const nativePriceFeed = await deployMockPriceFeed(deployer.address, 0, 0) as MockPriceFeed;
        const currencyPriceFeed = await deployMockPriceFeed(deployer.address, 0, 0) as MockPriceFeed;
        
        const MockEstateTokenFactory = await smock.mock('EstateToken') as any;
        const estateToken = await MockEstateTokenFactory.deploy() as MockContract<EstateToken>;
        await callTransaction(estateToken.initialize(
            admin.address,
            feeReceiver.address,
            LandInitialization.ESTATE_TOKEN_BaseURI,
            LandInitialization.ESTATE_TOKEN_RoyaltyRate,
        ));

        const SmockCommissionTokenFactory = await smock.mock('CommissionToken') as any;
        const commissionToken = await SmockCommissionTokenFactory.deploy() as MockContract<CommissionToken>;
        await callTransaction(commissionToken.initialize(
            admin.address,
            estateToken.address,
            feeReceiver.address,
            LandInitialization.COMMISSION_TOKEN_Name,
            LandInitialization.COMMISSION_TOKEN_Symbol,
            LandInitialization.COMMISSION_TOKEN_BaseURI,
            LandInitialization.COMMISSION_TOKEN_CommissionRate,
            LandInitialization.COMMISSION_TOKEN_RoyaltyRate,
        ));

        await callEstateToken_UpdateCommissionToken(
            estateToken,
            admins,
            commissionToken.address,
            await admin.nonce()
        );

        const SmockReserveVaultFactory = await smock.mock('ReserveVault') as any;
        const reserveVault = await SmockReserveVaultFactory.deploy() as MockContract<ReserveVault>;
        await callTransaction(reserveVault.initialize(
            admin.address,
        ));

        const priceWatcher = await deployPriceWatcher(
            deployer.address,
            admin.address
        ) as PriceWatcher;

        const estateForger = await deployMockEstateForger(
            deployer,
            admin.address,
            estateToken.address,
            commissionToken.address,
            priceWatcher.address,
            feeReceiver.address,
            reserveVault.address,
            LandInitialization.ESTATE_FORGER_FeeRate,
            LandInitialization.ESTATE_FORGER_BaseMinUnitPrice,
            LandInitialization.ESTATE_FORGER_BaseMaxUnitPrice
        ) as MockEstateForger;

        const zone1 = ethers.utils.formatBytes32String("TestZone1");
        const zone2 = ethers.utils.formatBytes32String("TestZone2");

        return {
            admin,
            feeReceiver,
            currencies,
            estateToken,
            commissionToken,
            reserveVault,
            priceWatcher,
            estateForger,
            nativePriceFeed,
            currencyPriceFeed,
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

    async function beforeEstateForgerTest({
        listSampleCurrencies = false,
        fundERC20ForDepositors = false,
        addZoneForExecutive = false,
        addEstateForgerToVault = false,
        whitelistDepositors = false,
        listSampleSellers = false,
        addSampleRequests = false,
        addDepositions = false,
        confirmRequests = false,
        pause = false,
    } = {}): Promise<EstateForgerFixture> {
        const fixture = await loadFixture(estateForgerFixture);
        const { 
            admin,
            admins,
            manager,
            moderator,
            estateToken,
            estateForger,
            commissionToken,
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
                [estateForger],
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

        await callEstateToken_AuthorizeTokenizers(
            estateToken,
            admins,
            [estateForger.address],
            true,
            await admin.nonce()
        );

        const baseTimestamp = await time.latest() + 1000;

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

        if (addEstateForgerToVault) {
            await callReserveVault_AuthorizeInitiator(
                reserveVault,
                admins,
                [estateForger.address],
                true,
                await admin.nonce()
            );
        }

        if (whitelistDepositors) {
            await callEstateForger_Whitelist(
                estateForger,
                admins,
                [depositor1.address, depositor2.address, depositor3.address],
                true,
                await admin.nonce()
            );
        }

        if (listSampleSellers) {
            for (const zone of [zone1, zone2]) {
                await callTransaction(estateForger.connect(manager).activateSellerIn(
                    zone,
                    [seller1.address, seller2.address, seller3.address],
                    true,
                ));
            }
        }

        if (addSampleRequests) {
            await callTransaction(estateForger.connect(manager).requestTokenizationWithDuration(                
                seller1.address,
                {
                    zone: zone1,
                    uri: 'TestingURI1',
                    decimals: 3,
                    expireAt: baseTimestamp + 1e9,
                },
                {
                    totalQuantity: 70,
                    minSellingQuantity: 10,
                    maxSellingQuantity: 30,                    
                },
                {
                    unitPrice: ethers.utils.parseEther('0.2'),
                    currency: ethers.constants.AddressZero,
                    cashbackThreshold: 5,
                    cashbackBaseRate: ethers.utils.parseEther("0.1"),
                    cashbackCurrencies: [currencies[0].address, currencies[1].address],
                    cashbackDenominations: [ethers.utils.parseEther('0.01'), ethers.utils.parseEther('0.02')],
                },
                1000,
                2000,
            ));

            await callTransaction(estateForger.connect(manager).requestTokenizationWithDuration(
                seller2.address,
                {
                    zone: zone2,
                    uri: 'TestingURI2',
                    decimals: 3,
                    expireAt: baseTimestamp + 1e9,
                },
                {
                    totalQuantity: 1000,
                    minSellingQuantity: 200,
                    maxSellingQuantity: 1000,
                },
                {
                    unitPrice: ethers.utils.parseEther('100'),
                    currency: currencies[0].address,
                    cashbackThreshold: 50,
                    cashbackBaseRate: ethers.utils.parseEther("0.2"),
                    cashbackCurrencies: [currencies[1].address, ethers.constants.AddressZero],
                    cashbackDenominations: [ethers.utils.parseEther('0.01'), ethers.utils.parseEther('0.02')],
                },
                2000,
                4000
            ));
        }

        if (addDepositions) {
            let timestamp = Math.max(
                (await estateForger.getRequest(1)).agenda.privateSaleEndsAt,
                (await estateForger.getRequest(2)).agenda.privateSaleEndsAt,
            )
            await time.setNextBlockTimestamp(timestamp);

            await callTransaction(estateForger.connect(depositor1).deposit(1, 2, { value: ethers.utils.parseEther('10') }));
            await callTransaction(estateForger.connect(depositor2).deposit(1, 5, { value: ethers.utils.parseEther('10') }));
            await callTransaction(estateForger.connect(depositor3).deposit(1, 10, { value: ethers.utils.parseEther('10') }));

            await callTransaction(estateForger.connect(depositor1).deposit(2, 200));
            await callTransaction(estateForger.connect(depositor2).deposit(2, 300));
            await callTransaction(estateForger.connect(depositor3).deposit(2, 500));
        }

        if (confirmRequests) {         
            await callTransaction(estateForger.connect(manager).confirm(1, ethers.constants.AddressZero));
            await callTransaction(estateForger.connect(manager).confirm(2, commissionReceiver.address));
        }

        if (pause) {
            await callEstateForger_Pause(
                estateForger,
                admins,
                await admin.nonce()
            );
        }

        return fixture;
    }

    describe('4.1. initialize(address, address, string, uint256, uint256, uint256, uint256)', async () => {
        it('4.1.1. Deploy successfully', async () => {
            const { admin, estateForger, estateToken, feeReceiver, commissionToken } = await beforeEstateForgerTest({});
            
            expect(await estateForger.paused()).to.equal(false);

            expect(await estateForger.admin()).to.equal(admin.address);
            expect(await estateForger.feeReceiver()).to.equal(feeReceiver.address);
            expect(await estateForger.estateToken()).to.equal(estateToken.address);
            expect(await estateForger.commissionToken()).to.equal(commissionToken.address);

            const feeRate = await estateForger.getFeeRate();
            expect(feeRate.value).to.equal(LandInitialization.ESTATE_FORGER_FeeRate);
            expect(feeRate.decimals).to.equal(Constant.COMMON_RATE_DECIMALS);

            expect(await estateForger.baseMinUnitPrice()).to.equal(LandInitialization.ESTATE_FORGER_BaseMinUnitPrice);
            expect(await estateForger.baseMaxUnitPrice()).to.equal(LandInitialization.ESTATE_FORGER_BaseMaxUnitPrice);

            expect(await estateForger.requestNumber()).to.equal(0);
        });

        it('4.1.2. revert with invalid fee rate', async () => {
            const { admin, feeReceiver, estateToken, commissionToken, reserveVault } = await beforeEstateForgerTest({});
            const EstateForger = await ethers.getContractFactory("EstateForger");

            await expect(upgrades.deployProxy(EstateForger, [
                admin.address,
                estateToken.address,
                commissionToken.address,
                feeReceiver.address,
                reserveVault.address,
                Constant.COMMON_RATE_MAX_FRACTION.add(1),
                LandInitialization.ESTATE_FORGER_BaseMinUnitPrice,
                LandInitialization.ESTATE_FORGER_BaseMaxUnitPrice
            ])).to.be.reverted;
        });
    });

    describe('4.4. updateFeeRate(uint256, bytes[])', async () => {
        it('4.4.1. updateFeeRate successfully with valid signatures', async () => {
            const { admin, admins, estateForger } = await beforeEstateForgerTest({});
            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256"],
                [estateForger.address, "updateFeeRate", ethers.utils.parseEther('0.2')]
            );

            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await estateForger.updateFeeRate(ethers.utils.parseEther('0.2'), signatures);
            await tx.wait();

            await expect(tx).to
                .emit(estateForger, 'FeeRateUpdate')
                .withArgs(ethers.utils.parseEther('0.2'));

            const feeRate = await estateForger.getFeeRate();
            expect(feeRate.value).to.equal(ethers.utils.parseEther('0.2'));
            expect(feeRate.decimals).to.equal(Constant.COMMON_RATE_DECIMALS);
        });

        it('4.4.2. updateFeeRate unsuccessfully with invalid signatures', async () => {
            const { admin, admins, estateForger } = await beforeEstateForgerTest({});

            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256"],
                [estateForger.address, "updateFeeRate", ethers.utils.parseEther('0.2')]
            );
            const invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(estateForger.updateFeeRate(
                ethers.utils.parseEther('0.2'),
                invalidSignatures
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('4.4.3. updateFeeRate unsuccessfully with invalid rate', async () => {
            const { admin, admins, estateForger } = await beforeEstateForgerTest({});
            
            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256"],
                [estateForger.address, "updateFeeRate", Constant.COMMON_RATE_MAX_FRACTION.add(1)]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(estateForger.updateFeeRate(
                Constant.COMMON_RATE_MAX_FRACTION.add(1),
                signatures
            )).to.be.revertedWithCustomError(estateForger, 'InvalidRate');
        });
    });

    describe('4.5. updateBaseUnitPriceRange(uint256, uint256, bytes[])', async () => {
        it('4.5.1. updateBaseUnitPriceRange successfully with valid signatures', async () => {
            const { admin, admins, estateForger } = await beforeEstateForgerTest({});
            
            const baseMinUnitPrice = 20;
            const baseMaxUnitPrice = 100;

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'uint256', 'uint256'],
                [estateForger.address, 'updateBaseUnitPriceRange', baseMinUnitPrice, baseMaxUnitPrice]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await estateForger.updateBaseUnitPriceRange(
                baseMinUnitPrice,
                baseMaxUnitPrice,
                signatures
            );
            await tx.wait();

            await expect(tx).to
                .emit(estateForger, 'BaseUnitPriceRangeUpdate')
                .withArgs(baseMinUnitPrice, baseMaxUnitPrice);

            expect(await estateForger.baseMinUnitPrice()).to.equal(baseMinUnitPrice);
            expect(await estateForger.baseMaxUnitPrice()).to.equal(baseMaxUnitPrice);
        });

        it('4.5.2. updateBaseUnitPriceRange unsuccessfully with invalid signatures', async () => {
            const { admin, admins, estateForger } = await beforeEstateForgerTest({});
            const baseMinUnitPrice = 20;
            const baseMaxUnitPrice = 100;

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'uint256', 'uint256'],
                [estateForger.address, 'updateBaseUnitPriceRange', baseMinUnitPrice, baseMaxUnitPrice]
            );
            const invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(estateForger.updateBaseUnitPriceRange(
                baseMinUnitPrice,
                baseMaxUnitPrice,
                invalidSignatures
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('4.5.3. updateBaseUnitPriceRange unsuccessfully with invalid price range', async () => {
            const { admin, admins, estateForger } = await beforeEstateForgerTest({});
            const baseMinUnitPrice = 101;
            const baseMaxUnitPrice = 100;

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'uint256', 'uint256'],
                [estateForger.address, 'updateBaseUnitPriceRange', baseMinUnitPrice, baseMaxUnitPrice]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(estateForger.updateBaseUnitPriceRange(
                baseMinUnitPrice,
                baseMaxUnitPrice,
                signatures
            )).to.be.revertedWithCustomError(estateForger, 'InvalidInput');
        });
    });

    describe('4.8. whitelist(address[], bool, bytes[])', async () => {
        it('4.8.1. Whitelist user successfully', async () => {
            const fixture = await beforeEstateForgerTest();
            const { admins, admin, estateForger, depositor1, depositor2, depositor3 } = fixture;            

            const depositors = [depositor1, depositor2, depositor3];

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [estateForger.address, 'whitelist', depositors.map(x => x.address), true]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());
            
            const tx = await estateForger.whitelist(depositors.map(x => x.address), true, signatures);
            await tx.wait();
            
            for(const depositor of depositors) {
                await expect(tx).to
                    .emit(estateForger, 'Whitelist')
                    .withArgs(depositor.address);
            }

            for (let i = 0; i < depositors.length; ++i) {
                const isWhitelisted = await estateForger.isWhitelisted(depositors[i].address);
                expect(isWhitelisted).to.be.true;
            }
        });

        it('4.8.2. Whitelist unsuccessfully with invalid signatures', async () => {
            const fixture = await beforeEstateForgerTest();
            const { admins, admin, estateForger, depositor1, depositor2, depositor3 } = fixture;            

            const depositors = [depositor1, depositor2, depositor3];

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [estateForger.address, 'whitelist', depositors.map(x => x.address), true]
            );
            const signatures = await getSignatures(message, admins, (await admin.nonce()).add(1));
            
            await expect(estateForger.whitelist(
                depositors.map(x => x.address),
                true,
                signatures
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('4.8.3. Whitelist unsuccessfully when whitelisting same account twice on same tx', async () => {
            const fixture = await beforeEstateForgerTest();
            const { admins, admin, estateForger, depositor1, depositor2, depositor3 } = fixture;            

            const depositors = [depositor1, depositor2, depositor3, depositor1];

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [estateForger.address, 'whitelist', depositors.map(x => x.address), true]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());
            
            await expect(estateForger.whitelist(
                depositors.map(x => x.address),
                true,
                signatures
            )).to.be.revertedWithCustomError(estateForger, 'Whitelisted')
                .withArgs(depositor1.address);
        });

        it('4.8.4. Whitelist unsuccessfully when whitelisting same account twice on different tx', async () => {
            const fixture = await beforeEstateForgerTest();
            const { admins, admin, estateForger, depositor1, depositor2, depositor3 } = fixture;            

            let depositors = [depositor1, depositor3];
            await callEstateForger_Whitelist(estateForger, admins, depositors.map(x => x.address), true, await admin.nonce());

            depositors = [depositor2, depositor3];
            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [estateForger.address, 'whitelist', depositors.map(x => x.address), true]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(estateForger.whitelist(
                depositors.map(x => x.address),
                true,
                signatures
            )).to.be.revertedWithCustomError(estateForger, 'Whitelisted')
                .withArgs(depositor3.address);
        });

        
        it('4.8.5. Unwhitelist account successfully', async () => {
            const fixture = await beforeEstateForgerTest({
                whitelistDepositors: true,
            });
            const { admins, admin, estateForger, depositor1, depositor2, depositor3 } = fixture;            

            const depositors = [depositor1, depositor2, depositor3];
            const toUnwhitelistDepositors = [depositor1, depositor3];

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [estateForger.address, 'whitelist', toUnwhitelistDepositors.map(x => x.address), false]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());
            
            const tx = await estateForger.whitelist(
                toUnwhitelistDepositors.map(x => x.address),
                false,
                signatures
            );
            await tx.wait();
            
            for(const depositor of toUnwhitelistDepositors) {
                await expect(tx).to
                    .emit(estateForger, 'Unwhitelist')
                    .withArgs(depositor.address);
            }

            for(const depositor of depositors) {
                if (toUnwhitelistDepositors.includes(depositor)) {
                    expect(await estateForger.isWhitelisted(depositor.address)).to.be.false;
                } else {
                    expect(await estateForger.isWhitelisted(depositor.address)).to.be.true;
                }
            }
        });

        it('4.8.6. Unwhitelist account unsuccessfully with not whitelisted account', async () => {
            const fixture = await beforeEstateForgerTest();
            const { admins, admin, estateForger, depositor1, depositor2, depositor3 } = fixture;            

            const toUnwhitelistDepositors = [depositor1, depositor2, depositor3];
            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [estateForger.address, 'whitelist', toUnwhitelistDepositors.map(x => x.address), false]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(estateForger.whitelist(
                toUnwhitelistDepositors.map(x => x.address),
                false,
                signatures
            )).to.be.revertedWithCustomError(estateForger, 'NotWhitelisted')
                .withArgs(depositor1.address);            
        });

        it('4.8.7. Unwhitelist account unsuccessfully when unwhitelisting same account twice on same tx', async () => {
            const fixture = await beforeEstateForgerTest({
                whitelistDepositors: true,
            });
            const { admins, admin, estateForger, depositor1, depositor2, depositor3 } = fixture;            

            const toUnwhitelistDepositors = [depositor1, depositor2, depositor3, depositor1];

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [estateForger.address, 'whitelist', toUnwhitelistDepositors.map(x => x.address), false]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());
            
            await expect(estateForger.whitelist(
                toUnwhitelistDepositors.map(x => x.address),
                false,
                signatures
            )).to.be.revertedWithCustomError(estateForger, 'NotWhitelisted')
                .withArgs(depositor1.address);            
        });

        it('4.8.8. Unwhitelist account unsuccessfully when unwhitelisting same account twice on different tx', async () => {
            const fixture = await beforeEstateForgerTest({
                whitelistDepositors: true,
            });
            const { admins, admin, estateForger, depositor1, depositor2, depositor3 } = fixture;            

            const tx1_depositors = [depositor1, depositor2];
            await callEstateForger_Whitelist(estateForger, admins, tx1_depositors.map(x => x.address), false, await admin.nonce());
            
            const tx2_depositors = [depositor3, depositor2];
            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [estateForger.address, 'whitelist', tx2_depositors.map(x => x.address), false]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(estateForger.whitelist(
                tx2_depositors.map(x => x.address),
                false,
                signatures
            )).to.be.revertedWithCustomError(estateForger, 'NotWhitelisted')
                .withArgs(depositor2.address);
        });
    });

    describe('4.9. activateSellerIn(string, address[], bool)', async () => {
        it('4.9.1. Activate seller successfully with valid signatures', async () => {
            const { estateForger, manager, seller1, seller2, seller3, zone1 } = await beforeEstateForgerTest({
                addZoneForExecutive: true,
            });

            const toBeActivated = [seller1, seller2, seller3];

            const tx = await estateForger.connect(manager).activateSellerIn(
                zone1,
                toBeActivated.map(x => x.address),
                true,
            );
            await tx.wait();

            for (const seller of toBeActivated) {
                await expect(tx).to
                    .emit(estateForger, 'Activation')
                    .withArgs(zone1, seller.address);
            }

            for (const seller of toBeActivated) {
                const isSeller = await estateForger.isActiveSellerIn(zone1, seller.address);
                if (toBeActivated.includes(seller)) {
                    expect(isSeller).to.be.true;
                } else {
                    expect(isSeller).to.be.false;
                }
            }
        });

        it('4.9.2. Activate seller unsuccessfully by non-manager', async () => {
            const { estateForger, admin, admins, seller1, seller2, seller3, zone1, zone2, user, moderator, manager } = await beforeEstateForgerTest({
                addZoneForExecutive: true,
            });

            const toBeActivated = [seller1, seller2, seller3];

            // User
            await expect(estateForger.connect(user).activateSellerIn(
                zone1,
                toBeActivated.map(x => x.address),
                true,
            )).to.be.revertedWithCustomError(estateForger, `Unauthorized`)
            
            // Moderator
            await expect(estateForger.connect(moderator).activateSellerIn(
                zone1,
                toBeActivated.map(x => x.address),
                true,
            )).to.be.revertedWithCustomError(estateForger, `Unauthorized`)
        });

        it('4.9.3. Activate seller unsuccessfully with inactive zone', async () => {
            const { estateForger, admin, admins, seller1, seller2, seller3, zone1, zone2, user, moderator, manager } = await beforeEstateForgerTest({
                addZoneForExecutive: true,
            });

            const toBeActivated = [seller1, seller2, seller3];

            await callAdmin_DeclareZones(
                admin,
                admins,
                [zone2],
                false,
                await admin.nonce()
            );

            await expect(estateForger.connect(manager).activateSellerIn(
                zone2,
                toBeActivated.map(x => x.address),
                true,
            )).to.be.revertedWithCustomError(estateForger, `Unauthorized`)                
        });

        it('4.9.4. Activate seller unsuccessfully by inactive manager in zone', async () => {
            const { estateForger, admin, admins, seller1, seller2, seller3, zone1, zone2, user, moderator, manager } = await beforeEstateForgerTest({
                addZoneForExecutive: true,
            });

            const toBeActivated = [seller1, seller2, seller3];
                
            await callAdmin_ActivateIn(
                admin,
                admins,
                zone1,
                [manager.address],
                false,
                await admin.nonce()
            );
            await expect(estateForger.connect(manager).activateSellerIn(
                zone1,
                toBeActivated.map(x => x.address),
                true,
            )).to.be.revertedWithCustomError(estateForger, `Unauthorized`)           
        });

        it('4.9.5. Activate seller unsuccessfully when authorizing same account twice on same tx', async () => {
            const { estateForger, manager, seller1, seller2, seller3, zone1 } = await beforeEstateForgerTest({
                addZoneForExecutive: true,
            });

            const duplicateSellers = [seller1, seller2, seller3, seller1];

            await expect(estateForger.connect(manager).activateSellerIn(
                zone1,
                duplicateSellers.map(x => x.address),
                true,
            )).to.be.revertedWithCustomError(estateForger, `Activated`)
                .withArgs(seller1.address);
        });

        it('4.9.6. Activate seller unsuccessfully when authorizing same account twice on different tx', async () => {
            const { estateForger, manager, seller1, seller2, seller3, zone1 } = await beforeEstateForgerTest({
                addZoneForExecutive: true,
            });

            const tx1Sellers = [seller1, seller2];

            await callTransaction(estateForger.connect(manager).activateSellerIn(
                zone1,
                tx1Sellers.map(x => x.address),
                true,
            ));

            const tx2Sellers = [seller3, seller2];

            await expect(estateForger.connect(manager).activateSellerIn(
                zone1,
                tx2Sellers.map(x => x.address),
                true,
            )).to.be.revertedWithCustomError(estateForger, `Activated`)
                .withArgs(seller2.address);
        })

        it('4.9.7. Deactivate seller successfully', async () => {
            const { estateForger, manager, seller1, seller2, seller3, zone1 } = await beforeEstateForgerTest({
                listSampleSellers: true,
                addZoneForExecutive: true,
            });

            const activatedSellers = [seller1, seller2, seller3];
            const toDeactivate = [seller1, seller2];

            const tx = await estateForger.connect(manager).activateSellerIn(
                zone1,
                toDeactivate.map(x => x.address),
                false,
            );
            await tx.wait();

            for (const seller of toDeactivate) {
                await expect(tx).to
                    .emit(estateForger, 'Deactivation')
                    .withArgs(zone1, seller.address);
            }

            for (const seller of activatedSellers) {
                const isSeller = await estateForger.isActiveSellerIn(zone1, seller.address);
                if (toDeactivate.includes(seller)) {
                    expect(isSeller).to.be.false;
                } else {
                    expect(isSeller).to.be.true;
                }
            }            
        });

        it('4.9.8. Deactivate seller unsuccessfully with inactive account', async () => {
            const { estateForger, manager, seller1, seller2, seller3, zone1 } = await beforeEstateForgerTest({
                listSampleSellers: true,
                addZoneForExecutive: true,
            });

            const account = randomWallet();
            const toDeactivate = [seller1, account];

            await expect(estateForger.connect(manager).activateSellerIn(
                zone1,
                toDeactivate.map(x => x.address),
                false,
            )).to.be.revertedWithCustomError(estateForger, `NotActivated`)
                .withArgs(account.address);
        });

        it('4.9.9. Deactivate seller unsuccessfully when deactivating same account twice on same tx', async () => {
            const { estateForger, manager, seller1, seller2, seller3, zone1 } = await beforeEstateForgerTest({
                listSampleSellers: true,
                addZoneForExecutive: true,
            });

            const toDeactivate = [seller1, seller2, seller3, seller1];

            await expect(estateForger.connect(manager).activateSellerIn(
                zone1,
                toDeactivate.map(x => x.address),
                false,
            )).to.be.revertedWithCustomError(estateForger, `NotActivated`)
                .withArgs(seller1.address);
        });

        it('4.9.10. Deactivate seller unsuccessfully when deactivating same accounts twice on different tx', async () => {
            const { estateForger, manager, seller1, seller2, seller3, zone1 } = await beforeEstateForgerTest({
                listSampleSellers: true,
                addZoneForExecutive: true,
            });

            const tx1Sellers = [seller1, seller2];
            await callTransaction(estateForger.connect(manager).activateSellerIn(
                zone1,
                tx1Sellers.map(x => x.address),
                false,
            ));

            const tx2Sellers = [seller3, seller2];
            await expect(estateForger.connect(manager).activateSellerIn(
                zone1,
                tx2Sellers.map(x => x.address),
                false,
            )).to.be.revertedWithCustomError(estateForger, `NotActivated`)
                .withArgs(seller2.address);
        });
    });

    describe('4.10. requestTokenizationWithDuration(address, (bytes32, string, uint8, uint40), (uint256, uint256, uint256), (uint256, address, uint256, uint256, address[], uint256[]), uint40, uint40)', async () => {
        interface RequestTokenizationWithDurationData {
            seller: string;
            requestEstateInput: RequestEstateInput;
            requestQuotaInput: RequestQuotaInput;
            requestQuoteInput: RequestQuoteInput;
            privateSaleDuration: number;
            publicSaleDuration: number;
        }
        
        async function getDefaultParams(
            fixture: EstateForgerFixture,
        ): Promise<RequestTokenizationWithDurationData> {
            const { seller1, zone1, currencies } = fixture;
            const baseTimestamp = await time.latest() + 1000;

            const defaultParams: RequestTokenizationWithDurationData = {
                seller: seller1.address,
                requestEstateInput: {
                    zone: zone1,
                    uri: 'TestingURI1',
                    decimals: 3,
                    expireAt: baseTimestamp + 1e9,
                },
                requestQuotaInput: {
                    totalQuantity: ethers.BigNumber.from('70'),
                    minSellingQuantity: ethers.BigNumber.from('10'),
                    maxSellingQuantity: ethers.BigNumber.from('30'),                    
                },
                requestQuoteInput: {
                    unitPrice: ethers.utils.parseEther('0.2'),
                    currency: ethers.constants.AddressZero,
                    cashbackThreshold: ethers.BigNumber.from(5),
                    cashbackBaseRate: ethers.utils.parseEther("0.1"),
                    cashbackCurrencies: [currencies[0].address, currencies[1].address],
                    cashbackDenominations: [ethers.utils.parseEther('0.01'), ethers.utils.parseEther('0.02')],
                },
                privateSaleDuration: 1000,
                publicSaleDuration: 2000,
            }

            return defaultParams;
        }

        async function expectRevertWithCustomError(estateForger: EstateForger, manager: any, data: RequestTokenizationWithDurationData, error: string) {
            await expect(estateForger.connect(manager).requestTokenizationWithDuration(
                data.seller,
                data.requestEstateInput,
                data.requestQuotaInput,
                data.requestQuoteInput,
                data.privateSaleDuration,
                data.publicSaleDuration,
            )).to.be.revertedWithCustomError(estateForger, error);
        }

        async function expectNotReverted(estateForger: EstateForger, manager: any, data: RequestTokenizationWithDurationData) {
            await expect(estateForger.connect(manager).requestTokenizationWithDuration(
                data.seller,
                data.requestEstateInput,
                data.requestQuotaInput,
                data.requestQuoteInput,
                data.privateSaleDuration,
                data.publicSaleDuration,
            )).to.not.be.reverted;
        }

        it('4.10.1. requestTokenizationWithDuration successfully', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger, nativePriceFeed, reserveVault, commissionToken, priceWatcher, admin } = fixture;

            const defaultParams = await getDefaultParams(fixture);
    
            let currentTimestamp = await time.latest() + 1000;
            await time.setNextBlockTimestamp(currentTimestamp);

            const data = defaultParams;

            const tx = await estateForger.connect(manager).requestTokenizationWithDuration(
                data.seller,
                data.requestEstateInput,
                data.requestQuotaInput,
                data.requestQuoteInput,
                data.privateSaleDuration,
                data.publicSaleDuration,
            );
            const receipt = await tx.wait();

            const fundId = await reserveVault.fundNumber();

            const feeDenomination = await getFeeDenomination(
                estateForger,
                admin,
                data.requestQuoteInput.unitPrice,
                null,
            );
            const commissionDenomination = await getCommissionDenomination(
                commissionToken as any,
                feeDenomination,
            );
            const mainDenomination = await getCashbackBaseDenomination(
                feeDenomination,
                commissionDenomination,
                {
                    value: data.requestQuoteInput.cashbackBaseRate,
                    decimals: 18,
                },
            );

            const fund = await reserveVault.getFund(fundId);
            expect(fund.mainCurrency).to.equal(data.requestQuoteInput.currency);
            expect(fund.mainDenomination).to.equal(mainDenomination);
            expect(fund.extraCurrencies).to.deep.equal(data.requestQuoteInput.cashbackCurrencies);
            expect(fund.extraDenominations).to.deep.equal(data.requestQuoteInput.cashbackDenominations);

            const requestEstate: RequestEstate = {
                ...data.requestEstateInput,
                estateId: ethers.BigNumber.from(0),
            }
            const requestQuota: RequestQuota = {
                ...data.requestQuotaInput,
                soldQuantity: ethers.BigNumber.from(0),
            }
            const requestQuote: RequestQuote = {
                unitPrice: data.requestQuoteInput.unitPrice,
                currency: data.requestQuoteInput.currency,
                cashbackThreshold: data.requestQuoteInput.cashbackThreshold,
                cashbackFundId: fundId,
                feeDenomination: feeDenomination,
                commissionDenomination: commissionDenomination,
            }
            const requestAgenda: RequestAgenda = {
                privateSaleEndsAt: currentTimestamp + data.privateSaleDuration,
                publicSaleEndsAt: currentTimestamp + data.privateSaleDuration + data.publicSaleDuration,
            }

            const newRequestEvent = receipt.events!.find(e => e.event === 'NewRequest')!;
            expect(newRequestEvent.args![0]).to.equal(1);
            expect(newRequestEvent.args![1]).to.equal(data.seller);
            expect(structToObject(newRequestEvent.args![2])).to.deep.equal(data.requestEstateInput);
            expect(structToObject(newRequestEvent.args![3])).to.deep.equal(data.requestQuotaInput);
            expect(structToObject(newRequestEvent.args![4])).to.deep.equal(requestQuote);
            expect(structToObject(newRequestEvent.args![5])).to.deep.equal(requestAgenda);

            const tokenizationRequestNumber = await estateForger.requestNumber();
            expect(tokenizationRequestNumber).to.equal(1);

            const tokenizationRequest = await estateForger.getRequest(tokenizationRequestNumber);
            expect(structToObject(tokenizationRequest.estate)).to.deep.equal(requestEstate);
            expect(structToObject(tokenizationRequest.quota)).to.deep.equal(requestQuota);
            expect(structToObject(tokenizationRequest.quote)).to.deep.equal(requestQuote);
            expect(structToObject(tokenizationRequest.agenda)).to.deep.equal(requestAgenda);
        });

        it('4.10.3. requestTokenizationWithDuration unsuccessfully with invalid sale durations', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addEstateForgerToVault: true,
            });

            const { manager, estateForger } = fixture;

            const defaultParams = await getDefaultParams(fixture);
            const data1 = {
                ...defaultParams,
                privateSaleDuration: 0,
                publicSaleDuration: 0,
            }
            await expectRevertWithCustomError(estateForger, manager, data1, 'InvalidInput');

            const data2 = {
                ...defaultParams,
                privateSaleDuration: 0,
            }
            await expectNotReverted(estateForger, manager, data2);

            const data3 = {
                ...defaultParams,
                publicSaleDuration: 0,
            }
            await expectNotReverted(estateForger, manager, data3);
        });

        it('4.10.4. requestTokenizationWithDuration unsuccessfully by non-executive', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addEstateForgerToVault: true,
            });

            const { user, estateForger } = fixture;

            const defaultParams = await getDefaultParams(fixture);
            
            await expectRevertWithCustomError(estateForger, user, defaultParams, 'Unauthorized');
        });

        it('4.10.6. requestTokenizationWithDuration unsuccessfully when paused', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addEstateForgerToVault: true,
                pause: true,
            });

            const { manager, estateForger } = fixture;

            const defaultParams = await getDefaultParams(fixture);

            await expect(estateForger.connect(manager).requestTokenizationWithDuration(
                defaultParams.seller,
                defaultParams.requestEstateInput,
                defaultParams.requestQuotaInput,
                defaultParams.requestQuoteInput,
                defaultParams.privateSaleDuration,
                defaultParams.publicSaleDuration,
            )).to.be.revertedWith('Pausable: paused');
        })

        it('4.10.7. requestTokenizationWithDuration unsuccessfully with inactive zone', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addEstateForgerToVault: true,
            });

            const { admin, admins, moderator, manager, zone1, estateForger } = fixture;

            await callAdmin_DeclareZones(
                admin,
                admins,
                [zone1],
                false,
                await admin.nonce()
            );

            const defaultParams = await getDefaultParams(fixture);

            await expectRevertWithCustomError(estateForger, moderator, defaultParams, 'Unauthorized');
            await expectRevertWithCustomError(estateForger, manager, defaultParams, 'Unauthorized');
        });

        it('4.10.8. requestTokenizationWithDuration unsuccessfully by inactive executive in zone', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addEstateForgerToVault: true,
            });

            const { admin, admins, moderator, manager, zone1, estateForger } = fixture;

            await callAdmin_ActivateIn(
                admin,
                admins,
                zone1,
                [moderator.address, manager.address],
                false,
                await admin.nonce(),
            )

            const defaultParams = await getDefaultParams(fixture);

            await expectRevertWithCustomError(estateForger, moderator, defaultParams, 'Unauthorized');
            await expectRevertWithCustomError(estateForger, manager, defaultParams, 'Unauthorized');
        });

        it('4.10.12. requestTokenizationWithDuration unsuccessfully with unit price out of base range', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addEstateForgerToVault: true,
            });

            const { manager, estateForger, currencies } = fixture;

            const currency = currencies[0];

            const defaultParams = await getDefaultParams(fixture);

            const data1 = {
                ...defaultParams,
                requestQuoteInput: {
                    ...defaultParams.requestQuoteInput,
                    currency: currency.address,
                    unitPrice: ethers.utils.parseEther('19'),
                },
            }
            await expectRevertWithCustomError(estateForger, manager, data1, 'InvalidUnitPrice');

            const data2 = {
                ...defaultParams,
                requestQuoteInput: {
                    ...defaultParams.requestQuoteInput,
                    currency: currency.address,
                    unitPrice: ethers.utils.parseEther('201'),
                },
            }
            await expectRevertWithCustomError(estateForger, manager, data2, 'InvalidUnitPrice');
        });

        it('4.10.13. requestTokenizationWithDuration unsuccessfully with inactive seller in zone', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                addEstateForgerToVault: true,
            });

            const { manager, estateForger } = fixture;

            const defaultParams = await getDefaultParams(fixture);
            const data = {
                ...defaultParams,
                seller: ethers.constants.AddressZero,
            }
            await expectRevertWithCustomError(estateForger, manager, data, 'InvalidInput');
        });

        it('4.10.14. requestTokenizationWithDuration unsuccessfully with invalid decimals', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addEstateForgerToVault: true,
            });

            const { manager, estateForger, currencies } = fixture;

            const defaultParams = await getDefaultParams(fixture);
            const data = {
                ...defaultParams,
                requestEstateInput: {
                    ...defaultParams.requestEstateInput,
                    decimals: 19,
                },
            }
            await expectRevertWithCustomError(estateForger, manager, data, 'InvalidInput');
        });

        it('4.10.15. requestTokenizationWithDuration unsuccessfully with expired estate', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addEstateForgerToVault: true,
            });

            const { manager, estateForger } = fixture;
            
            const timestamp = await time.latest() + 1000;
            await time.setNextBlockTimestamp(timestamp);

            const defaultParams = await getDefaultParams(fixture);
            const data = {
                ...defaultParams,
                requestEstateInput: {
                    ...defaultParams.requestEstateInput,
                    expireAt: timestamp - 1,
                },
            };
            await expectRevertWithCustomError(estateForger, manager, data, 'InvalidInput');
        });

        it('4.10.16. requestTokenizationWithDuration unsuccessfully when minimum selling amount exceeds maximum', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addEstateForgerToVault: true,
            });

            const { manager, estateForger } = fixture;

            const defaultParams = await getDefaultParams(fixture);
            const data = {
                ...defaultParams,
                requestQuotaInput: {
                    ...defaultParams.requestQuotaInput,
                    minSellingQuantity: defaultParams.requestQuotaInput.maxSellingQuantity.add(1),
                },
            }
            await expectRevertWithCustomError(estateForger, manager, data, 'InvalidInput');
        });

        it('4.10.17. requestTokenizationWithDuration unsuccessfully when maximum selling amount exceeds total supply', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addEstateForgerToVault: true,
            });

            const { manager, estateForger } = fixture;

            const defaultParams = await getDefaultParams(fixture);
            const data = {
                ...defaultParams,
                requestQuotaInput: {
                    ...defaultParams.requestQuotaInput,
                    maxSellingQuantity: defaultParams.requestQuotaInput.totalQuantity.add(1),
                },
            }
            await expectRevertWithCustomError(estateForger, manager, data, 'InvalidInput');
        });

        it('4.10.18. requestTokenizationWithDuration unsuccessfully when estate token supply overflows uint256', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addEstateForgerToVault: true,
            });

            const { manager, estateForger } = fixture;

            const defaultParams = await getDefaultParams(fixture);
            const data = {
                ...defaultParams,
                requestEstateInput: {
                    ...defaultParams.requestEstateInput,
                    decimals: 18,
                },
                requestQuotaInput: {
                    ...defaultParams.requestQuotaInput,
                    totalQuantity: ethers.BigNumber.from(2).pow(256).sub(1),
                },
            }
            await expectRevertWithCustomError(estateForger, manager, data, 'InvalidInput');
        });

        it('4.10.19. requestTokenizationWithDuration unsuccessfully with invalid cashback threshold', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addEstateForgerToVault: true,
            });

            const { manager, estateForger } = fixture;

            const defaultParams = await getDefaultParams(fixture);
            const data = {
                ...defaultParams,
                requestQuoteInput: {
                    ...defaultParams.requestQuoteInput,
                    cashbackThreshold: defaultParams.requestQuotaInput.totalQuantity.add(1),
                },
            }
            await expectRevertWithCustomError(estateForger, manager, data, 'InvalidInput');
        });

        it('4.10.20. requestTokenizationWithDuration unsuccessfully with invalid cashback base rate', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addEstateForgerToVault: true,
            });

            const { manager, estateForger } = fixture;

            const defaultParams = await getDefaultParams(fixture);
            const data = {
                ...defaultParams,
                requestQuoteInput: {
                    ...defaultParams.requestQuoteInput,
                    cashbackBaseRate: Constant.COMMON_RATE_MAX_FRACTION.add(1),
                },
            }
            await expectRevertWithCustomError(estateForger, manager, data, 'InvalidInput');
        });

        it('4.10.21. requestTokenizationWithDuration unsuccessfully with invalid cashback params length', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addEstateForgerToVault: true,
            });

            const { manager, estateForger } = fixture;

            const defaultParams = await getDefaultParams(fixture);
            const data = {
                ...defaultParams,
                requestQuoteInput: {
                    ...defaultParams.requestQuoteInput,
                    cashbackCurrencies: defaultParams.requestQuoteInput.cashbackCurrencies.slice(0, -2),
                }
            };

            await expectRevertWithCustomError(estateForger, manager, data, 'InvalidInput');
        });

        it('4.10.22. requestTokenizationWithDuration unsuccessfully when estate forger is not vault initiator', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
            });

            const { manager, estateForger } = fixture;

            const defaultParams = await getDefaultParams(fixture);
            await expectRevertWithCustomError(estateForger, manager, defaultParams, 'Unauthorized');
        });
    });

    describe('4.11. requestTokenizationWithTimestamp(address, (bytes32, string, uint8, uint40), (uint256, uint256, uint256), (uint256, address, uint256, uint256, address[], uint256[]), uint40, uint40)', async () => {
        interface RequestTokenizationWithTimestampData {
            seller: string;
            requestEstateInput: RequestEstateInput;
            requestQuotaInput: RequestQuotaInput;
            requestQuoteInput: RequestQuoteInput;
            privateSaleEndsAt: number;
            publicSaleEndsAt: number;
        }
        
        async function getDefaultParams(
            fixture: EstateForgerFixture,
        ): Promise<RequestTokenizationWithTimestampData> {
            const { seller1, zone1, currencies } = fixture;
            const baseTimestamp = await time.latest() + 1000;

            const defaultParams: RequestTokenizationWithTimestampData = {
                seller: seller1.address,
                requestEstateInput: {
                    zone: zone1,
                    uri: 'TestingURI1',
                    decimals: 3,
                    expireAt: baseTimestamp + 1e9,
                },
                requestQuotaInput: {
                    totalQuantity: ethers.BigNumber.from('70'),
                    minSellingQuantity: ethers.BigNumber.from('10'),
                    maxSellingQuantity: ethers.BigNumber.from('30'),                    
                },
                requestQuoteInput: {
                    unitPrice: ethers.utils.parseEther('0.2'),
                    currency: ethers.constants.AddressZero,
                    cashbackThreshold: ethers.BigNumber.from(5),
                    cashbackBaseRate: ethers.utils.parseEther("0.1"),
                    cashbackCurrencies: [currencies[0].address, currencies[1].address],
                    cashbackDenominations: [ethers.utils.parseEther('0.01'), ethers.utils.parseEther('0.02')],
                },
                privateSaleEndsAt: baseTimestamp + 1e6,
                publicSaleEndsAt: baseTimestamp + 3e6,
            }

            return defaultParams;
        }

        async function expectRevertWithCustomError(estateForger: EstateForger, manager: any, data: RequestTokenizationWithTimestampData, error: string) {
            await expect(estateForger.connect(manager).requestTokenizationWithTimestamp(
                data.seller,
                data.requestEstateInput,
                data.requestQuotaInput,
                data.requestQuoteInput,
                data.privateSaleEndsAt,
                data.publicSaleEndsAt,
            )).to.be.revertedWithCustomError(estateForger, error);
        }

        async function expectNotReverted(estateForger: EstateForger, manager: any, data: RequestTokenizationWithTimestampData) {
            await expect(estateForger.connect(manager).requestTokenizationWithTimestamp(
                data.seller,
                data.requestEstateInput,
                data.requestQuotaInput,
                data.requestQuoteInput,
                data.privateSaleEndsAt,
                data.publicSaleEndsAt,
            )).to.not.be.reverted;
        }
        
        it('4.11.1. requestTokenizationWithTimestamp successfully', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger, nativePriceFeed, reserveVault, commissionToken, admin } = fixture;

            const defaultParams = await getDefaultParams(fixture);
    
            const data = defaultParams;

            const tx = await estateForger.connect(manager).requestTokenizationWithTimestamp(
                data.seller,
                data.requestEstateInput,
                data.requestQuotaInput,
                data.requestQuoteInput,
                data.privateSaleEndsAt,
                data.publicSaleEndsAt,
            );
            const receipt = await tx.wait();

            const feeDenomination = await getFeeDenomination(
                estateForger,
                admin,
                data.requestQuoteInput.unitPrice,
                null,
            );
            const commissionDenomination = await getCommissionDenomination(
                commissionToken as any,
                feeDenomination,
            );
            const mainDenomination = await getCashbackBaseDenomination(
                feeDenomination,
                commissionDenomination,
                {
                    value: data.requestQuoteInput.cashbackBaseRate,
                    decimals: 18,
                },
            );

            const fundId = await reserveVault.fundNumber();
            const fund = await reserveVault.getFund(fundId);
            expect(fund.mainCurrency).to.equal(data.requestQuoteInput.currency);
            expect(fund.mainDenomination).to.equal(mainDenomination);
            expect(fund.extraCurrencies).to.deep.equal(data.requestQuoteInput.cashbackCurrencies);
            expect(fund.extraDenominations).to.deep.equal(data.requestQuoteInput.cashbackDenominations);

            const requestEstate: RequestEstate = {
                ...data.requestEstateInput,
                estateId: ethers.BigNumber.from(0),
            }
            const requestQuota: RequestQuota = {
                ...data.requestQuotaInput,
                soldQuantity: ethers.BigNumber.from(0),
            }
            const requestQuote: RequestQuote = {
                unitPrice: data.requestQuoteInput.unitPrice,
                currency: data.requestQuoteInput.currency,
                cashbackThreshold: data.requestQuoteInput.cashbackThreshold,
                cashbackFundId: fundId,
                feeDenomination: feeDenomination,
                commissionDenomination: commissionDenomination,
            }
            const requestAgenda: RequestAgenda = {
                privateSaleEndsAt: data.privateSaleEndsAt,
                publicSaleEndsAt: data.publicSaleEndsAt,
            }

            const newRequestEvent = receipt.events!.find(e => e.event === 'NewRequest')!;
            expect(newRequestEvent.args![0]).to.equal(1);
            expect(newRequestEvent.args![1]).to.equal(data.seller);
            expect(structToObject(newRequestEvent.args![2])).to.deep.equal(data.requestEstateInput);
            expect(structToObject(newRequestEvent.args![3])).to.deep.equal(data.requestQuotaInput);
            expect(structToObject(newRequestEvent.args![4])).to.deep.equal(requestQuote);
            expect(structToObject(newRequestEvent.args![5])).to.deep.equal(requestAgenda);

            const tokenizationRequestNumber = await estateForger.requestNumber();
            expect(tokenizationRequestNumber).to.equal(1);

            const tokenizationRequest = await estateForger.getRequest(tokenizationRequestNumber);
            expect(structToObject(tokenizationRequest.estate)).to.deep.equal(requestEstate);
            expect(structToObject(tokenizationRequest.quota)).to.deep.equal(requestQuota);
            expect(structToObject(tokenizationRequest.quote)).to.deep.equal(requestQuote);
            expect(structToObject(tokenizationRequest.agenda)).to.deep.equal(requestAgenda);
        });

        it('4.11.2. requestTokenizationWithTimestamp successfully when private sales ends immediately', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addEstateForgerToVault: true,
            })
            const { manager, estateForger } = fixture;

            const defaultParams = await getDefaultParams(fixture);

            let timestamp = await time.latest() + 1000;
            await time.setNextBlockTimestamp(timestamp);

            const data = {
                ...defaultParams,
                privateSaleEndsAt: timestamp,
                publicSaleEndsAt: timestamp + 1e6,
            }

            await expectNotReverted(estateForger, manager, data);
        });

        it('4.11.3. requestTokenizationWithTimestamp successfully when public sales ends immediately', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addEstateForgerToVault: true,
            })

            const { manager, estateForger } = fixture;

            const defaultParams = await getDefaultParams(fixture);

            let timestamp = await time.latest() + 1000;
            await time.setNextBlockTimestamp(timestamp);

            const data = {
                ...defaultParams,
                privateSaleEndsAt: timestamp + 1e6,
                publicSaleEndsAt: timestamp + 1e6,
            }

            await expectNotReverted(estateForger, manager, data);
        });

        it('4.11.4. requestTokenizationWithTimestamp unsuccessfully with invalid private sale ends timestamp', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addEstateForgerToVault: true,
            });

            const { manager, estateForger } = fixture;

            const defaultParams = await getDefaultParams(fixture);

            let timestamp = await time.latest() + 1000;
            await time.setNextBlockTimestamp(timestamp);

            const data = {
                ...defaultParams,
                privateSaleEndsAt: timestamp - 1,
                publicSaleEndsAt: timestamp + 100,
            }
            await expectRevertWithCustomError(estateForger, manager, data, 'InvalidInput');
        });

        it('4.11.5. requestTokenizationWithTimestamp unsuccessfully when private sale ends before public sale', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addEstateForgerToVault: true,
            });

            const { manager, estateForger } = fixture;

            const defaultParams = await getDefaultParams(fixture);

            let timestamp = await time.latest() + 1000;
            await time.setNextBlockTimestamp(timestamp);

            const data = {
                ...defaultParams,
                privateSaleEndsAt: timestamp + 100,
                publicSaleEndsAt: timestamp + 99,
            }

            await expectRevertWithCustomError(estateForger, manager, data, 'InvalidInput');
        });

        it('4.11.6. requestTokenizationWithTimestamp unsuccessfully with invalid public sale ends timestamp', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addEstateForgerToVault: true,
            });

            const { manager, estateForger } = fixture;

            const defaultParams = await getDefaultParams(fixture);

            let timestamp = await time.latest() + 1000;
            await time.setNextBlockTimestamp(timestamp);

            const data = {
                ...defaultParams,
                privateSaleEndsAt: timestamp,
                publicSaleEndsAt: timestamp,
            }

            await expectRevertWithCustomError(estateForger, manager, data, 'InvalidInput');
        });
    });

    describe('4.12. updateRequest(uint256, address, bytes32, string, uint256, uint256, uint256, uint256, address, uint8, uint40, uint40)', async () => {
        interface UpdateRequestData {
            requestId: number;
            seller: string;
            zone: string;
            uri: string;
            totalSupply: BigNumberish;
            minSellingAmount: BigNumberish;
            maxSellingAmount: BigNumberish;
            unitPrice: BigNumberish;
            currencyAddress: string;
            decimals: number;
            expireAt: number;
            privateSaleEndsAt: number;
            publicSaleEndsAt: number;
        }
        
        async function beforeUpdateRequestTest(
            fixture: EstateForgerFixture,
        ): Promise<{data: UpdateRequestData, newCurrency: Currency, newCurrencyPriceFeed: MockPriceFeed}> {
            const { admin, deployer, seller2, zone2, manager, currency, baseTimestamp, estateForger, currencyPriceFeed, admins } = fixture;
            const newCurrency = await deployCurrency(
                deployer,
                "NewCurrency",
                "NC",
            ) as Currency;

            const newCurrencyPriceFeed = await deployMockPriceFeed(
                deployer,
                50_0000,
                4,
            ) as MockPriceFeed;

            await addCurrencyToEstateForger(
                admin,
                estateForger,
                admins,
                [newCurrency.address],
                [true],
                [false],
                [newCurrencyPriceFeed.address],
                [3600],
                [100_000],
                [3]
            );

            const defaultParams: UpdateRequestData = {
                requestId: 1,
                seller: seller2.address,
                zone: zone2,
                uri: 'NewTestingURI',
                totalSupply: 71,
                minSellingAmount: 11,
                maxSellingAmount: 31,
                unitPrice: ethers.utils.parseEther('11'),
                currencyAddress: newCurrency.address,
                decimals: 2,
                expireAt: baseTimestamp + 1e9 + 1,
                privateSaleEndsAt: baseTimestamp + 1001,
                publicSaleEndsAt: baseTimestamp + 3001,
            }

            return { data: defaultParams, newCurrency, newCurrencyPriceFeed };
        }

        async function expectRevertWithCustomError(estateForger: EstateForger, manager: any, data: UpdateRequestData, error: string) {
            await expect(estateForger.connect(manager).updateRequest(
                data.requestId,
                data.seller,
                data.zone,
                data.uri,
                data.totalSupply,
                data.minSellingAmount,
                data.maxSellingAmount,
                data.unitPrice,
                data.currencyAddress,
                data.decimals,
                data.expireAt,
                data.privateSaleEndsAt,
                data.publicSaleEndsAt,
            )).to.be.revertedWithCustomError(estateForger, error);
        }

        it('4.12.1. update tokenization request successfully', async () => {            
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
            });
            const { manager, estateForger } = fixture;
            const { data, newCurrency, newCurrencyPriceFeed } = await beforeUpdateRequestTest(fixture);
    
            let currentTimestamp = await time.latest() + 1000;
            await time.setNextBlockTimestamp(currentTimestamp);

            const tx = await estateForger.connect(manager).updateRequest(
                data.requestId,
                data.seller,
                data.zone,
                data.uri,
                data.totalSupply,
                data.minSellingAmount,
                data.maxSellingAmount,
                data.unitPrice,
                data.currencyAddress,
                data.decimals,
                data.expireAt,
                data.privateSaleEndsAt,
                data.publicSaleEndsAt,
            );
            await tx.wait();

            const priceRate = await newCurrencyPriceFeed.getRoundData(1);

            await expect(tx).to
                .emit(estateForger, 'RequestUpdate')
                .withArgs(
                    1,
                    data.seller,
                    data.zone,
                    data.uri,
                    data.totalSupply,
                    data.minSellingAmount,
                    data.maxSellingAmount,
                    data.unitPrice,
                    data.currencyAddress,
                    data.decimals,
                    data.expireAt,
                    data.privateSaleEndsAt,
                    data.publicSaleEndsAt,
                )

            // await expect(tx).to
            //     .emit(estateForger, 'UnitPriceValidation')
            //     .withArgs(
            //         data.unitPrice,
            //         data.currencyAddress,
            //         priceRate.answer,
            //         await newCurrencyPriceFeed.decimals(),
            //     );

            const tokenizationRequest = await estateForger.getRequest(1);
            expect(tokenizationRequest.estateId).to.equal(0);
            expect(tokenizationRequest.zone).to.equal(data.zone);
            expect(tokenizationRequest.uri).to.equal(data.uri);
            expect(tokenizationRequest.totalSupply).to.equal(data.totalSupply);
            expect(tokenizationRequest.minSellingAmount).to.equal(data.minSellingAmount);
            expect(tokenizationRequest.maxSellingAmount).to.equal(data.maxSellingAmount);
            expect(tokenizationRequest.soldAmount).to.equal(0);
            expect(tokenizationRequest.unitPrice).to.equal(data.unitPrice);
            expect(tokenizationRequest.currency).to.equal(data.currencyAddress);
            expect(tokenizationRequest.decimals).to.equal(data.decimals);
            expect(tokenizationRequest.expireAt).to.equal(data.expireAt);
            expect(tokenizationRequest.privateSaleEndsAt).to.equal(data.privateSaleEndsAt);
            expect(tokenizationRequest.publicSaleEndsAt).to.equal(data.publicSaleEndsAt);
            expect(tokenizationRequest.seller).to.equal(data.seller);
        });

        it('4.12.2. update tokenization request unsuccessfully by non-executive', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
            });
            const { estateForger, user } = fixture;
            const { data } = await beforeUpdateRequestTest(fixture);
    
            let currentTimestamp = await time.latest() + 1000;
            await time.setNextBlockTimestamp(currentTimestamp);

            await expectRevertWithCustomError(estateForger, user, data, 'Unauthorized');
        });

        it('4.12.3. update tokenization request unsuccessfully with invalid request id', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
            });
            const { manager, estateForger } = fixture;
            const { data } = await beforeUpdateRequestTest(fixture);

            await expectRevertWithCustomError(estateForger, manager, { ...data, requestId: 0 }, 'InvalidRequestId');
            await expectRevertWithCustomError(estateForger, manager, { ...data, requestId: 100 }, 'InvalidRequestId');
        });

        it('4.12.4. update tokenization request unsuccessfully when zone is not declared', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
            });
            const { manager, estateForger, admin, admins, zone2 } = fixture;
            const { data } = await beforeUpdateRequestTest(fixture);

        });

        it('4.12.5. update tokenization request unsuccessfully by inactive zone', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
            });
            const { admin, admins, zone2, moderator, manager, estateForger } = fixture;
            const { data } = await beforeUpdateRequestTest(fixture);

            await callAdmin_DeclareZones(
                admin,
                admins,
                [zone2],
                false,
                await admin.nonce()
            );

            await expectRevertWithCustomError(estateForger, moderator, data, 'Unauthorized');
            await expectRevertWithCustomError(estateForger, manager, data, 'Unauthorized');
        });

        it('4.12.6. update tokenization request unsuccessfully by inactive executive in zone', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
            });
            const { admin, admins, zone2, moderator, manager, estateForger } = fixture;
            const { data } = await beforeUpdateRequestTest(fixture);

            await callAdmin_ActivateIn(
                admin,
                admins,
                zone2,
                [moderator.address, manager.address],
                false,
                await admin.nonce()
            );

            await expectRevertWithCustomError(estateForger, moderator, data, 'Unauthorized');
            await expectRevertWithCustomError(estateForger, manager, data, 'Unauthorized');
        });

        it('4.12.7. update tokenization request unsuccessfully with cancelled request', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
            });
            const { manager, estateForger } = fixture;
            const { data } = await beforeUpdateRequestTest(fixture);

            await estateForger.connect(manager).cancel(data.requestId);

            await expectRevertWithCustomError(estateForger, manager, data, 'Cancelled');
        });

        it('4.12.8. update tokenization request unsuccessfully with tokenized request', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addDepositions: true,
                confirmRequests: true,
                fundERC20ForDepositors: true,
            });
            const { manager, estateForger } = fixture;
            const { data } = await beforeUpdateRequestTest(fixture);

            await expectRevertWithCustomError(estateForger, manager, data, 'Tokenized');
        });

        it('4.12.9. update tokenization request unsuccessfully when request already have deposits', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addDepositions: true,
                fundERC20ForDepositors: true,
            });
            const { manager, estateForger, admin, admins } = fixture;
            const { data, newCurrency, newCurrencyPriceFeed } = await beforeUpdateRequestTest(fixture);

            await expectRevertWithCustomError(estateForger, manager, data, 'AlreadyHadDepositor');
        });

        it('4.12.10. update tokenization request unsuccessfully with unavailable currency', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
            });
            const { manager, estateForger, admin, admins } = fixture;
            const { data } = await beforeUpdateRequestTest(fixture);

            const unavailableCurrency = randomWallet();

            await addCurrencyToEstateForger(
                admin,
                estateForger,
                admins,
                [unavailableCurrency.address],
                [false],
                [false],
                [ethers.constants.AddressZero],
                [3600],
                [100_000],
                [3]
            );

            await expectRevertWithCustomError(estateForger, manager, {
                ...data,
                currencyAddress: unavailableCurrency.address,
            }, 'InvalidCurrency');
        });

        it('4.12.11. update tokenization request unsuccessfully with missing currency rate', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
            });
            const { manager, estateForger, admin, admins, baseTimestamp } = fixture;
            const { data } = await beforeUpdateRequestTest(fixture);

            const unavailableCurrency = randomWallet();

            await addCurrencyToEstateForger(
                admin,
                estateForger,
                admins,
                [unavailableCurrency.address],
                [true],
                [false],
                [ethers.constants.AddressZero],
                [3600],
                [0],
                [0]
            );

            await expectRevertWithCustomError(estateForger, manager, {
                ...data,
                currencyAddress: unavailableCurrency.address,
            }, 'MissingCurrencyRate');
        });
        
        it('4.12.12. update tokenization request unsuccessfully with stale price feed', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
            });
            const { manager, estateForger, currency, baseTimestamp } = fixture;
            const { data } = await beforeUpdateRequestTest(fixture);

            const heartbeat = (await estateForger.getPriceFeed(currency.address)).heartbeat;
            await time.setNextBlockTimestamp(baseTimestamp + heartbeat + 1);

            await expectRevertWithCustomError(estateForger, manager, data, 'StalePriceFeed');
        });

        it('4.12.13. update tokenization request unsuccessfully with invalid unit price', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
            });
            const { manager, estateForger, currency, baseTimestamp } = fixture;
            const { data } = await beforeUpdateRequestTest(fixture);

            await expectRevertWithCustomError(estateForger, manager, {
                ...data,
                unitPrice: ethers.utils.parseEther('1'),
            }, 'InvalidUnitPrice');

            await expectRevertWithCustomError(estateForger, manager, {
                ...data,
                unitPrice: ethers.utils.parseEther('21'),
            }, 'InvalidUnitPrice');
        });

        it('4.12.14. update tokenization request unsuccessfully with inactive seller', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
            });

            const newSeller = randomWallet();
            const { manager, estateForger, currency, baseTimestamp } = fixture;
            const { data } = await beforeUpdateRequestTest(fixture);

            await expectRevertWithCustomError(estateForger, manager, {
                ...data,
                seller: newSeller.address,
            }, 'InvalidInput');
        });

        it('4.12.15. update tokenization request unsuccessfully when minimum selling amount exceeds maximum', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
            });
            const { manager, estateForger, currency, baseTimestamp } = fixture;
            const { data } = await beforeUpdateRequestTest(fixture);

            await expectRevertWithCustomError(estateForger, manager, {
                ...data,
                minSellingAmount: Number(data.maxSellingAmount) + 1,
            }, 'InvalidInput');
        });

        it('4.12.16. update tokenization request unsuccessfully when maximum selling amount exceeds total supply', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
            });
            const { manager, estateForger, currency, baseTimestamp } = fixture;
            const { data } = await beforeUpdateRequestTest(fixture);

            await expectRevertWithCustomError(estateForger, manager, {
                ...data,
                maxSellingAmount: Number(data.totalSupply) + 1,
            }, 'InvalidInput');
        });

        it('4.12.17. update tokenization request unsuccessfully when total estate token supply exceeds max uint256', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
            });
            const { manager, estateForger, currency, baseTimestamp } = fixture;
            const { data } = await beforeUpdateRequestTest(fixture);

            await expectRevertWithCustomError(estateForger, manager, {
                ...data,
                decimals: 18,
                totalSupply: ethers.BigNumber.from(2).pow(256).sub(1),
            }, 'InvalidInput');
            await expectRevertWithCustomError(estateForger, manager, {
                ...data,
                decimals: 18,
                totalSupply: ethers.BigNumber.from(2).pow(256).sub(1),
            }, 'InvalidInput');
        });

        it('4.12.18. update tokenization request unsuccessfully with invalid decimals', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
            });
            const { manager, estateForger, currency, baseTimestamp } = fixture;
            const { data } = await beforeUpdateRequestTest(fixture);

            await expectRevertWithCustomError(estateForger, manager, {
                ...data,
                decimals: 19,
            }, 'InvalidInput');
        });

        it('4.12.19. update tokenization request unsuccessfully with expired estate', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
            });
            const { manager, estateForger, baseTimestamp } = fixture;
            const { data } = await beforeUpdateRequestTest(fixture);

            await time.setNextBlockTimestamp(baseTimestamp);

            await expectRevertWithCustomError(estateForger, manager, {
                ...data,
                expireAt: baseTimestamp - 1,
            }, 'InvalidInput');
            await expectRevertWithCustomError(estateForger, manager, {
                ...data,
                expireAt: baseTimestamp,
            }, 'InvalidInput');
        });

        it('4.12.20. update tokenization request unsuccessfully with invalid private sale timestamp', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
            });
            const { manager, estateForger } = fixture;
            const { data } = await beforeUpdateRequestTest(fixture);

            let timestamp = await time.latest() + 10;
            await time.setNextBlockTimestamp(timestamp);

            await expectRevertWithCustomError(estateForger, manager, {
                ...data,
                privateSaleEndsAt: timestamp - 1,
            }, 'InvalidInput');
            await expectRevertWithCustomError(estateForger, manager, {
                ...data,
                privateSaleEndsAt: timestamp,
            }, 'InvalidInput');
        });

        it('4.12.21. update tokenization request unsuccessfully with invalid public sale timestamp', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
            });
            const { manager, estateForger } = fixture;
            const { data } = await beforeUpdateRequestTest(fixture);

            let timestamp = await time.latest() + 10;
            await time.setNextBlockTimestamp(timestamp);

            await expectRevertWithCustomError(estateForger, manager, {
                ...data,
                privateSaleEndsAt: timestamp + 100,
                publicSaleEndsAt: timestamp + 99,
            }, 'InvalidInput');
            await expectRevertWithCustomError(estateForger, manager, {
                ...data,
                publicSaleEndsAt: timestamp + 100,
                privateSaleEndsAt: timestamp + 100,
            }, 'InvalidInput');
        });
    });

    describe('4.12. updateRequestSeller(uint256, address)', async () => {
        interface UpdateRequestSellerData {
            requestId: number;
            seller: string;
        }

        async function getDefaultParams(fixture: EstateForgerFixture): Promise<UpdateRequestSellerData> {
            const { seller2 } = fixture;
            return {
                requestId: 1,
                seller: seller2.address,
            }
        }

        async function expectRevertWithCustomError(estateForger: EstateForger, manager: any, data: UpdateRequestSellerData, error: string) {
            await expect(estateForger.connect(manager).updateRequestSeller(
                data.requestId,
                data.seller,
            )).to.be.revertedWithCustomError(estateForger, error);
        }

        it('4.12.1. update request seller successfully', async () => {            
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger, seller2 } = fixture;
    
            const data = await getDefaultParams(fixture);

            const tx = await estateForger.connect(manager).updateRequestSeller(
                data.requestId,
                data.seller,
            );
            await tx.wait();

            await expect(tx).to
                .emit(estateForger, 'RequestSellerUpdate')
                .withArgs(
                    data.requestId,
                    data.seller,
                )

            const request = await estateForger.getRequest(data.requestId);
            expect(request.seller).to.equal(data.seller);
        });

        it('4.12.2. update request seller unsuccessfully by non-executive', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { estateForger, user } = fixture;

            const data = await getDefaultParams(fixture);

            await expectRevertWithCustomError(estateForger, user, data, 'Unauthorized');
        });

        it.skip('4.12.3. update request seller unsuccessfully with invalid request id', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger } = fixture;
            const data = await getDefaultParams(fixture);

            await expectRevertWithCustomError(estateForger, manager, { ...data, requestId: 0 }, 'InvalidRequestId');
            await expectRevertWithCustomError(estateForger, manager, { ...data, requestId: 100 }, 'InvalidRequestId');
        });

        it('4.12.4. update request seller unsuccessfully with cancelled request', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger } = fixture;
            const data = await getDefaultParams(fixture);

            await estateForger.connect(manager).cancel(data.requestId);

            await expectRevertWithCustomError(estateForger, manager, data, 'Cancelled');
        });

        it('4.12.5. update request seller unsuccessfully with tokenized request', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addDepositions: true,
                confirmRequests: true,
                fundERC20ForDepositors: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger } = fixture;
            const data = await getDefaultParams(fixture);

            await expectRevertWithCustomError(estateForger, manager, data, 'Tokenized');
        });

        it('4.12.6. update request seller unsuccessfully when request already have deposits', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addDepositions: true,
                fundERC20ForDepositors: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger, admin, admins } = fixture;
            const data = await getDefaultParams(fixture);

            await expectRevertWithCustomError(estateForger, manager, data, 'AlreadyHadDepositor');
        });

        it('4.12.7. update request seller unsuccessfully when zone is inactive', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger, admin, admins } = fixture;
            const data = await getDefaultParams(fixture);

            const zone = (await estateForger.getRequest(data.requestId)).estate.zone;
            await callAdmin_DeclareZones(
                admin,
                admins,
                [zone],
                false,
                await admin.nonce()
            );

            await expectRevertWithCustomError(estateForger, manager, data, 'Unauthorized');
        });

        it('4.12.8. update request seller unsuccessfully by inactive executive in zone', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { admin, admins, moderator, manager, estateForger } = fixture;
            const data = await getDefaultParams(fixture);

            const zone = (await estateForger.getRequest(data.requestId)).estate.zone;
            await callAdmin_ActivateIn(
                admin,
                admins,
                zone,
                [moderator.address, manager.address],
                false,
                await admin.nonce()
            );

            await expectRevertWithCustomError(estateForger, moderator, data, 'Unauthorized');
            await expectRevertWithCustomError(estateForger, manager, data, 'Unauthorized');
        });

        it('4.12.9. update request seller unsuccessfully with inactive seller', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger } = fixture;
            const data = await getDefaultParams(fixture);

            const newSeller = randomWallet();

            await expectRevertWithCustomError(estateForger, manager, {
                ...data,
                seller: newSeller.address,
            }, 'InvalidInput');
        });
    });

    describe('4.13. updateRequestURI(uint256, string)', async () => {
        interface UpdateRequestURIData {
            requestId: number;
            uri: string;
        }

        async function getDefaultParams(
            fixture: EstateForgerFixture,
        ): Promise<UpdateRequestURIData> {
            return {
                requestId: 1,
                uri: 'NewTestingURI',
            }
        }

        async function expectRevertWithCustomError(estateForger: EstateForger, manager: any, data: UpdateRequestURIData, error: string) {
            await expect(estateForger.connect(manager).updateRequestURI(
                data.requestId,
                data.uri,
            )).to.be.revertedWithCustomError(estateForger, error);
        }

        it('4.13.1. update tokenization request URI successfully', async () => {            
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger } = fixture;
            const data = await getDefaultParams(fixture);
    
            const tx = await estateForger.connect(manager).updateRequestURI(
                data.requestId,
                data.uri,
            );
            await tx.wait();

            await expect(tx).to
                .emit(estateForger, 'RequestURIUpdate')
                .withArgs(
                    data.requestId,
                    data.uri,
                )

            const request = await estateForger.getRequest(data.requestId);
            expect(request.estate.uri).to.equal(data.uri);
        });

        it('4.13.2. update tokenization request URI unsuccessfully by non-executive', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger, user } = fixture;
            const data = await getDefaultParams(fixture);
    
            await expectRevertWithCustomError(estateForger, user, data, 'Unauthorized');
        });

        it.skip('4.13.3. update tokenization request URI unsuccessfully with invalid request id', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger } = fixture;
            const data = await getDefaultParams(fixture);

            await expectRevertWithCustomError(estateForger, manager, { ...data, requestId: 0 }, 'InvalidRequestId');
            await expectRevertWithCustomError(estateForger, manager, { ...data, requestId: 100 }, 'InvalidRequestId');
        });

        it('4.13.4. update tokenization request URI unsuccessfully with cancelled request', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger } = fixture;
            const data = await getDefaultParams(fixture);

            await estateForger.connect(manager).cancel(data.requestId);

            await expectRevertWithCustomError(estateForger, manager, data, 'Cancelled');
        });

        it('4.13.5. update tokenization request URI unsuccessfully with tokenized request', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
                confirmRequests: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger } = fixture;
            const data = await getDefaultParams(fixture);

            await expectRevertWithCustomError(estateForger, manager, data, 'Tokenized');
        });

        it('4.13.6. update tokenization request URI unsuccessfully when request already have deposits', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addDepositions: true,
                fundERC20ForDepositors: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger } = fixture;
            const data = await getDefaultParams(fixture);

            await expectRevertWithCustomError(estateForger, manager, data, 'AlreadyHadDepositor');
        });

        it('4.13.7. update tokenization request URI unsuccessfully with inactive zone', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger, admin, admins } = fixture;
            const data = await getDefaultParams(fixture);

            const zone = (await estateForger.getRequest(data.requestId)).estate.zone;
            await callAdmin_DeclareZones(
                admin,
                admins,
                [zone],
                false,
                await admin.nonce()
            );

            await expectRevertWithCustomError(estateForger, manager, data, 'Unauthorized');
        });

        it('4.13.8. update tokenization request URI unsuccessfully by inactive manager in zone', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger, admin, admins } = fixture;
            const data = await getDefaultParams(fixture);

            const zone = (await estateForger.getRequest(data.requestId)).estate.zone;
            await callAdmin_ActivateIn(
                admin,
                admins,
                zone,
                [manager.address],
                false,
                await admin.nonce()
            );

            await expectRevertWithCustomError(estateForger, manager, data, 'Unauthorized');
        });
    });

    describe('4.14. updateRequestEstate(uint256, (bytes32, string, uint8, uint40))', async () => {
        interface UpdateRequestData {
            requestId: number;
            estate: RequestEstateInput;
        }
        
        async function getDefaultParams(
            fixture: EstateForgerFixture,
        ): Promise<UpdateRequestData> {
            const { zone2 } = fixture;
            const baseTimestamp = await time.latest();
            return {
                requestId: 1,
                estate: {
                    zone: zone2,
                    uri: 'NewTestingURI',
                    decimals: 2,
                    expireAt: baseTimestamp + 1e9 + 1,
                }
            }
        }

        async function expectRevertWithCustomError(estateForger: EstateForger, manager: any, data: UpdateRequestData, error: string) {
            await expect(estateForger.connect(manager).updateRequestEstate(
                data.requestId,
                data.estate,
            )).to.be.revertedWithCustomError(estateForger, error);
        }

        it('4.14.1. update tokenization request estate successfully', async () => {            
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger } = fixture;
            const data = await getDefaultParams(fixture);
    
            const tx = await estateForger.connect(manager).updateRequestEstate(
                data.requestId,
                data.estate,
            );
            const receipt = await tx.wait();

            const event = receipt.events!.find(e => e.event === 'RequestEstateUpdate')!;
            expect(event.args!.requestId).to.equal(data.requestId);
            expect(structToObject(event.args!.estate)).to.deep.equal(data.estate);

            const request = await estateForger.getRequest(data.requestId);
            expect(request.estate.estateId).to.equal(0);
            expect(request.estate.zone).to.equal(data.estate.zone);
            expect(request.estate.uri).to.equal(data.estate.uri);
            expect(request.estate.decimals).to.equal(data.estate.decimals);
            expect(request.estate.expireAt).to.equal(data.estate.expireAt);
        });

        it('4.14.2. update tokenization request estate unsuccessfully by non-executive', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { estateForger, user } = fixture;
            const data = await getDefaultParams(fixture);
    
            await expectRevertWithCustomError(estateForger, user, data, 'Unauthorized');
        });

        it.skip('4.14.3. update tokenization request estate unsuccessfully with invalid request id', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger } = fixture;
            const data = await getDefaultParams(fixture);

            await expectRevertWithCustomError(estateForger, manager, { ...data, requestId: 0 }, 'InvalidRequestId');
            await expectRevertWithCustomError(estateForger, manager, { ...data, requestId: 100 }, 'InvalidRequestId');
        });

        it('4.14.4. update tokenization request estate unsuccessfully with cancelled request', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger } = fixture;
            const data = await getDefaultParams(fixture);

            await estateForger.connect(manager).cancel(data.requestId);

            await expectRevertWithCustomError(estateForger, manager, data, 'Cancelled');
        });

        it('4.14.5. update tokenization request estate unsuccessfully with tokenized request', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addDepositions: true,
                confirmRequests: true,
                fundERC20ForDepositors: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger } = fixture;
            const data = await getDefaultParams(fixture);

            await expectRevertWithCustomError(estateForger, manager, data, 'Tokenized');
        });

        it('4.14.6. update tokenization request estate unsuccessfully when request already have deposits', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addDepositions: true,
                fundERC20ForDepositors: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger, admin, admins } = fixture;
            const data = await getDefaultParams(fixture);

            await expectRevertWithCustomError(estateForger, manager, data, 'AlreadyHadDepositor');
        });

        it('4.14.7. update tokenization request estate unsuccessfully when old zone is not active', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger, admin, admins } = fixture;
            const data = await getDefaultParams(fixture);

            const zone = (await estateForger.getRequest(data.requestId)).estate.zone;
            await callAdmin_DeclareZones(
                admin,
                admins,
                [zone],
                false,
                await admin.nonce()
            );

            await expectRevertWithCustomError(estateForger, manager, data, 'Unauthorized');
        });

        it('4.14.8. update tokenization request estate unsuccessfully when new zone is not active', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger, admin, admins } = fixture;
            const data = await getDefaultParams(fixture);

            const zone = data.estate.zone;
            await callAdmin_DeclareZones(
                admin,
                admins,
                [zone],
                false,
                await admin.nonce()
            );

            await expectRevertWithCustomError(estateForger, manager, data, 'Unauthorized');
        });

        it('4.14.9. update tokenization request estate unsuccessfully by inactive executive in old zone', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { moderator, manager, estateForger, admin, admins } = fixture;
            const data = await getDefaultParams(fixture);

            const zone = (await estateForger.getRequest(data.requestId)).estate.zone;
            await callAdmin_ActivateIn(
                admin,
                admins,
                zone,
                [moderator.address, manager.address],
                false,
                await admin.nonce()
            );

            await expectRevertWithCustomError(estateForger, moderator, data, 'Unauthorized');
            await expectRevertWithCustomError(estateForger, manager, data, 'Unauthorized');
        });

        it('4.14.10. update tokenization request estate unsuccessfully by inactive executive in new zone', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { moderator, manager, estateForger, admin, admins } = fixture;
            const data = await getDefaultParams(fixture);

            const zone = data.estate.zone;
            await callAdmin_ActivateIn(
                admin,
                admins,
                zone,
                [moderator.address, manager.address],
                false,
                await admin.nonce()
            );

            await expectRevertWithCustomError(estateForger, moderator, data, 'Unauthorized');
            await expectRevertWithCustomError(estateForger, manager, data, 'Unauthorized');
        });

        it('4.14.11. update tokenization request estate unsuccessfully with invalid decimals', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger } = fixture;
        
            const defaultParams = await getDefaultParams(fixture);

            await expectRevertWithCustomError(estateForger, manager, {
                ...defaultParams,
                estate: {
                    ...defaultParams.estate,
                    decimals: 19,
                }
            }, 'InvalidInput');
        });

        it('4.14.12. update tokenization request estate unsuccessfully with expired estate', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger } = fixture;
            const defaultParams = await getDefaultParams(fixture);

            const baseTimestamp = await time.latest() + 1000;
            await time.setNextBlockTimestamp(baseTimestamp);

            await expectRevertWithCustomError(estateForger, manager, {
                ...defaultParams,
                estate: {
                    ...defaultParams.estate,
                    expireAt: baseTimestamp - 1,
                },
            }, 'InvalidInput');
            await expectRevertWithCustomError(estateForger, manager, {
                ...defaultParams,
                estate: {
                    ...defaultParams.estate,
                    expireAt: baseTimestamp,
                },
            }, 'InvalidInput');
        });
    });

    describe('4.15. updateRequestQuota(uint256, (uint256, uint256, uint256))', async () => {
        interface UpdateRequestQuotaData {
            requestId: number;
            quota: RequestQuotaInput;
        }
        
        async function getDefaultParams(
            fixture: EstateForgerFixture,
        ): Promise<UpdateRequestQuotaData> {
            return {
                requestId: 1,
                quota: {
                    totalQuantity: ethers.BigNumber.from(71),
                    minSellingQuantity: ethers.BigNumber.from(11),
                    maxSellingQuantity: ethers.BigNumber.from(31),
                }
            }
        }

        async function expectRevertWithCustomError(estateForger: EstateForger, manager: any, data: UpdateRequestQuotaData, error: string) {
            await expect(estateForger.connect(manager).updateRequestQuota(
                data.requestId,
                data.quota,
            )).to.be.revertedWithCustomError(estateForger, error);
        }

        it('4.15.1. update tokenization request quota successfully', async () => {            
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger } = fixture;
            const data = await getDefaultParams(fixture);
    
            const tx = await estateForger.connect(manager).updateRequestQuota(
                data.requestId,
                data.quota,
            );
            const receipt = await tx.wait();

            const event = receipt.events!.find(e => e.event === 'RequestQuotaUpdate')!;
            expect(event.args!.requestId).to.equal(data.requestId);
            expect(structToObject(event.args!.quota)).to.deep.equal(data.quota);

            const request = await estateForger.getRequest(data.requestId);
            expect(request.quota.totalQuantity).to.equal(data.quota.totalQuantity);
            expect(request.quota.minSellingQuantity).to.equal(data.quota.minSellingQuantity);
            expect(request.quota.maxSellingQuantity).to.equal(data.quota.maxSellingQuantity);
        });

        it('4.15.2. update tokenization request quota unsuccessfully by non-executive', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { estateForger, user } = fixture;
            const data = await getDefaultParams(fixture);
    
            await expectRevertWithCustomError(estateForger, user, data, 'Unauthorized');
        });

        it.skip('4.15.3. update tokenization request quota unsuccessfully with invalid request id', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger } = fixture;
            const data = await getDefaultParams(fixture);

            await expectRevertWithCustomError(estateForger, manager, { ...data, requestId: 0 }, 'InvalidRequestId');
            await expectRevertWithCustomError(estateForger, manager, { ...data, requestId: 100 }, 'InvalidRequestId');
        });

        it('4.15.4. update tokenization request quota unsuccessfully with cancelled request', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger } = fixture;
            const data = await getDefaultParams(fixture);

            await estateForger.connect(manager).cancel(data.requestId);

            await expectRevertWithCustomError(estateForger, manager, data, 'Cancelled');
        });

        it('4.15.5. update tokenization request quota unsuccessfully with tokenized request', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addDepositions: true,
                confirmRequests: true,
                fundERC20ForDepositors: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger } = fixture;
            const data = await getDefaultParams(fixture);

            await expectRevertWithCustomError(estateForger, manager, data, 'Tokenized');
        });

        it('4.15.6. update tokenization request quota unsuccessfully when request already have deposits', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addDepositions: true,
                fundERC20ForDepositors: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger, admin, admins } = fixture;
            const data = await getDefaultParams(fixture);

            await expectRevertWithCustomError(estateForger, manager, data, 'AlreadyHadDepositor');
        });

        it('4.15.7. update tokenization request quota unsuccessfully by inactive zone', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { admin, admins, moderator, manager, estateForger } = fixture;
            const data = await getDefaultParams(fixture);

            const zone = (await estateForger.getRequest(data.requestId)).estate.zone;
            await callAdmin_DeclareZones(
                admin,
                admins,
                [zone],
                false,
                await admin.nonce()
            );

            await expectRevertWithCustomError(estateForger, moderator, data, 'Unauthorized');
            await expectRevertWithCustomError(estateForger, manager, data, 'Unauthorized');
        });

        it('4.15.8. update tokenization request quota unsuccessfully by inactive executive in zone', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { admin, admins, moderator, manager, estateForger } = fixture;
            const data = await getDefaultParams(fixture);

            const zone = (await estateForger.getRequest(data.requestId)).estate.zone;
            await callAdmin_ActivateIn(
                admin,
                admins,
                zone,
                [moderator.address, manager.address],
                false,
                await admin.nonce()
            );

            await expectRevertWithCustomError(estateForger, moderator, data, 'Unauthorized');
            await expectRevertWithCustomError(estateForger, manager, data, 'Unauthorized');
        });

        it('4.15.9. update tokenization request quota unsuccessfully when minimum selling quantity exceeds maximum', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger } = fixture;
            const data = await getDefaultParams(fixture);

            await expectRevertWithCustomError(estateForger, manager, {
                ...data,
                quota: {
                    ...data.quota,
                    minSellingQuantity: data.quota.maxSellingQuantity.add(1),
                },
            }, 'InvalidInput');
        });

        it('4.15.10. update tokenization request quota unsuccessfully when maximum selling quantity exceeds total quantity', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger } = fixture;
            const data = await getDefaultParams(fixture);

            await expectRevertWithCustomError(estateForger, manager, {
                ...data,
                quota: {
                    ...data.quota,
                    maxSellingQuantity: data.quota.totalQuantity.add(1),
                },
            }, 'InvalidInput');
        });

        it('4.15.11. update tokenization request quota unsuccessfully when total estate token supply exceeds max uint256', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger } = fixture;
            const data = await getDefaultParams(fixture);

            await expectRevertWithCustomError(estateForger, manager, {
                ...data,
                quota: {
                    ...data.quota,
                    totalQuantity: ethers.BigNumber.from(2).pow(256).sub(1),
                },
            }, 'InvalidInput');
        });
    });

    describe('4.16. updateRequestQuote(uint256, (uint256, address, uint256, uint256, address[], uint256[]))', async () => {
        interface UpdateRequestQuoteData {
            requestId: number;
            quote: RequestQuoteInput;
        }
        
        async function getDefaultParams(
            fixture: EstateForgerFixture,
        ): Promise<{defaultParams: UpdateRequestQuoteData, newCurrency: Currency, newCurrencyPriceFeed: MockPriceFeed}> {
            const { admin, deployer, estateForger, admins, priceWatcher } = fixture;
            const newCurrency = await deployCurrency(
                deployer,
                "NewCurrency",
                "NC",
            ) as Currency;

            const newCurrencyPriceFeed = await deployMockPriceFeed(
                deployer,
                50_0000,
                4,
            ) as MockPriceFeed;

            await addCurrencyToAdminAndPriceWatcher(
                admin,
                priceWatcher,
                admins,
                [newCurrency.address],
                [true],
                [false],
                [newCurrencyPriceFeed.address],
                [3600],
                [100_000],
                [3]
            );

            const defaultParams: UpdateRequestQuoteData = {
                requestId: 1,
                quote: {
                    unitPrice: ethers.utils.parseEther('11'),
                    currency: newCurrency.address,
                    cashbackThreshold: ethers.BigNumber.from(6),
                    cashbackBaseRate: ethers.utils.parseEther('0.05'),
                    cashbackCurrencies: [ethers.constants.AddressZero],
                    cashbackDenominations: [ethers.utils.parseEther("0.01")],
                },
            }

            return { defaultParams, newCurrency, newCurrencyPriceFeed };
        }

        async function expectRevertWithCustomError(estateForger: EstateForger, manager: any, data: UpdateRequestQuoteData, error: string) {
            await expect(estateForger.connect(manager).updateRequestQuote(
                data.requestId,
                data.quote,
            )).to.be.revertedWithCustomError(estateForger, error);
        }

        it('4.16.1. update tokenization request quote successfully', async () => {            
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger, reserveVault, commissionToken, admin } = fixture;
            const { defaultParams, newCurrency, newCurrencyPriceFeed } = await getDefaultParams(fixture);
    
            let currentTimestamp = await time.latest() + 1000;
            await time.setNextBlockTimestamp(currentTimestamp);

            const tx = await estateForger.connect(manager).updateRequestQuote(
                defaultParams.requestId,
                defaultParams.quote,
            );
            const receipt = await tx.wait();

            const fundId = await reserveVault.fundNumber();

            const feeDenomination = await getFeeDenomination(
                estateForger,
                admin,
                defaultParams.quote.unitPrice,
                null,
            );
            const commissionDenomination = await getCommissionDenomination(
                commissionToken as any,
                feeDenomination,
            );
            const mainDenomination = await getCashbackBaseDenomination(
                feeDenomination,
                commissionDenomination,
                {
                    value: defaultParams.quote.cashbackBaseRate,
                    decimals: 18,
                },
            );

            const fund = await reserveVault.getFund(fundId);
            expect(fund.mainCurrency).to.equal(defaultParams.quote.currency);
            expect(fund.mainDenomination).to.equal(mainDenomination);
            expect(fund.extraCurrencies).to.deep.equal(defaultParams.quote.cashbackCurrencies);
            expect(fund.extraDenominations).to.deep.equal(defaultParams.quote.cashbackDenominations);

            const requestQuote = {
                unitPrice: defaultParams.quote.unitPrice,
                currency: defaultParams.quote.currency,
                cashbackThreshold: defaultParams.quote.cashbackThreshold,
                cashbackFundId: fundId,
                feeDenomination: feeDenomination,
                commissionDenomination: commissionDenomination,
            }

            const event = receipt.events!.find(e => e.event === 'RequestQuoteUpdate')!;
            expect(event.args!.requestId).to.equal(defaultParams.requestId);
            expect(structToObject(event.args!.quote)).to.deep.equal(requestQuote);

            const request = await estateForger.getRequest(defaultParams.requestId);
            expect(request.quote.unitPrice).to.equal(defaultParams.quote.unitPrice);
            expect(request.quote.currency).to.equal(defaultParams.quote.currency);
            expect(request.quote.cashbackThreshold).to.equal(defaultParams.quote.cashbackThreshold);
            expect(request.quote.cashbackFundId).to.equal(fundId);
        });

        it('4.16.2. update tokenization request quote unsuccessfully by non-executive', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { estateForger, user } = fixture;
            const { defaultParams } = await getDefaultParams(fixture);
    
            let currentTimestamp = await time.latest() + 1000;
            await time.setNextBlockTimestamp(currentTimestamp);

            await expectRevertWithCustomError(estateForger, user, defaultParams, 'Unauthorized');
        });

        it.skip('4.16.3. update tokenization request quote unsuccessfully with invalid request id', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger } = fixture;
            const { defaultParams } = await getDefaultParams(fixture);

            await expectRevertWithCustomError(estateForger, manager, { ...defaultParams, requestId: 0 }, 'InvalidRequestId');
            await expectRevertWithCustomError(estateForger, manager, { ...defaultParams, requestId: 100 }, 'InvalidRequestId');
        });

        it('4.16.4. update tokenization request quote unsuccessfully with cancelled request', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger } = fixture;
            const { defaultParams } = await getDefaultParams(fixture);

            await estateForger.connect(manager).cancel(defaultParams.requestId);

            await expectRevertWithCustomError(estateForger, manager, defaultParams, 'Cancelled');
        });

        it('4.16.5. update tokenization request quote unsuccessfully with tokenized request', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addDepositions: true,
                confirmRequests: true,
                fundERC20ForDepositors: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger } = fixture;
            const { defaultParams } = await getDefaultParams(fixture);

            await expectRevertWithCustomError(estateForger, manager, defaultParams, 'Tokenized');
        });

        it('4.16.6. update tokenization request quote unsuccessfully when request already have deposits', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addDepositions: true,
                fundERC20ForDepositors: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger, admin, admins } = fixture;
            const { defaultParams } = await getDefaultParams(fixture);

            await expectRevertWithCustomError(estateForger, manager, defaultParams, 'AlreadyHadDepositor');
        });

        it('4.16.7. update tokenization request quote unsuccessfully by inactive zone', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { admin, admins, zone2, moderator, manager, estateForger } = fixture;
            const { defaultParams } = await getDefaultParams(fixture);

            const zone = (await estateForger.getRequest(defaultParams.requestId)).estate.zone;
            await callAdmin_DeclareZones(
                admin,
                admins,
                [zone],
                false,
                await admin.nonce()
            );

            await expectRevertWithCustomError(estateForger, moderator, defaultParams, 'Unauthorized');
            await expectRevertWithCustomError(estateForger, manager, defaultParams, 'Unauthorized');
        });

        it('4.16.8. update tokenization request quote unsuccessfully by inactive executive in zone', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { admin, admins, zone2, moderator, manager, estateForger } = fixture;
            const { defaultParams } = await getDefaultParams(fixture);

            const zone = (await estateForger.getRequest(defaultParams.requestId)).estate.zone;
            await callAdmin_ActivateIn(
                admin,
                admins,
                zone,
                [moderator.address, manager.address],
                false,
                await admin.nonce()
            );

            await expectRevertWithCustomError(estateForger, moderator, defaultParams, 'Unauthorized');
            await expectRevertWithCustomError(estateForger, manager, defaultParams, 'Unauthorized');
        });

        it('4.16.9. update tokenization request quote unsuccessfully with invalid cashback threshold', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger } = fixture;
            const { defaultParams } = await getDefaultParams(fixture);

            const request = await estateForger.getRequest(defaultParams.requestId);

            await expectRevertWithCustomError(estateForger, manager, {
                ...defaultParams,
                quote: {
                    ...defaultParams.quote,
                    cashbackThreshold: request.quota.totalQuantity.add(1),
                },
            }, 'InvalidInput');
        });

        it('4.16.10. update tokenization request quote unsuccessfully with invalid cashback base rate', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });

            const { manager, estateForger } = fixture;
            const { defaultParams } = await getDefaultParams(fixture);

            await expectRevertWithCustomError(estateForger, manager, {
                ...defaultParams,
                quote: {
                    ...defaultParams.quote,
                    cashbackBaseRate: Constant.COMMON_RATE_MAX_FRACTION.add(1),
                },
            }, 'InvalidInput');
        });

        it('4.16.11. update tokenization request quote unsuccessfully with conflicting cashback currencies params length', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });

            const { manager, estateForger } = fixture;
            const { defaultParams } = await getDefaultParams(fixture);

            await expectRevertWithCustomError(estateForger, manager, {
                ...defaultParams,
                quote: {
                    ...defaultParams.quote,
                    cashbackCurrencies: [ethers.constants.AddressZero],
                    cashbackDenominations: [ethers.utils.parseEther("0.01"), ethers.utils.parseEther("0.02")],
                },
            }, 'InvalidInput');
        });

        it('4.16.12. update tokenization request quote unsuccessfully with invalid unit price', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger } = fixture;
            const { defaultParams } = await getDefaultParams(fixture);

            await expectRevertWithCustomError(estateForger, manager, {
                ...defaultParams,
                quote: {
                    ...defaultParams.quote,
                    unitPrice: ethers.utils.parseEther('1'),
                },
            }, 'InvalidUnitPrice');

            await expectRevertWithCustomError(estateForger, manager, {
                ...defaultParams,
                quote: {
                    ...defaultParams.quote,
                    unitPrice: ethers.utils.parseEther('21'),
                },
            }, 'InvalidUnitPrice');
        });

        it('4.16.13. update tokenization request quote unsuccessfully when estate forger is not initiator in vault', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { reserveVault, admin, admins, estateForger, manager } = fixture;

            await callReserveVault_AuthorizeInitiator(
                reserveVault,
                admins,
                [estateForger.address],
                false,
                await admin.nonce()
            )

            const { defaultParams } = await getDefaultParams(fixture);
            await expectRevertWithCustomError(estateForger, manager, defaultParams, 'Unauthorized');
        });
    });

    describe('4.17. updateRequestAgenda(uint256, (uint40, uint40))', async () => {
        interface UpdateRequestAgendaData {
            requestId: number;
            privateSaleEndsAt: number;
            publicSaleEndsAt: number;
        }
        
        async function getDefaultParams(
            fixture: EstateForgerFixture,
        ): Promise<UpdateRequestAgendaData> {
            const { estateForger } = fixture;
            const timestamp = await time.latest();
            return {
                requestId: 1,
                privateSaleEndsAt: timestamp + 1000,
                publicSaleEndsAt: timestamp + 2000,
            }
        }

        async function expectRevertWithCustomError(estateForger: EstateForger, manager: any, data: UpdateRequestAgendaData, error: string) {
            await expect(estateForger.connect(manager).updateRequestAgenda(
                data.requestId,
                data.privateSaleEndsAt,
                data.publicSaleEndsAt,
            )).to.be.revertedWithCustomError(estateForger, error);
        }

        it('4.17.1. update tokenization request agenda successfully', async () => {            
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger } = fixture;
            const defaultParams = await getDefaultParams(fixture);
    
            let currentTimestamp = await time.latest() + 1000;
            await time.setNextBlockTimestamp(currentTimestamp);

            const tx = await estateForger.connect(manager).updateRequestAgenda(
                defaultParams.requestId,
                defaultParams.privateSaleEndsAt,
                defaultParams.publicSaleEndsAt,
            );
            const receipt = await tx.wait();

            const event = receipt.events!.find(e => e.event === 'RequestAgendaUpdate')!;
            const agenda: RequestAgenda = {
                privateSaleEndsAt: defaultParams.privateSaleEndsAt,
                publicSaleEndsAt: defaultParams.publicSaleEndsAt,
            }
            expect(event.args!.requestId).to.equal(defaultParams.requestId);
            expect(structToObject(event.args!.agenda)).to.deep.equal(agenda);

            const request = await estateForger.getRequest(defaultParams.requestId);
            expect(request.agenda.privateSaleEndsAt).to.equal(defaultParams.privateSaleEndsAt);
            expect(request.agenda.publicSaleEndsAt).to.equal(defaultParams.publicSaleEndsAt);
        });

        it('4.17.2. update tokenization request agenda successfully when private sales ends immediately', async () => {            
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger } = fixture;
            const defaultParams = await getDefaultParams(fixture);
    
            let currentTimestamp = await time.latest() + 1000;
            await time.setNextBlockTimestamp(currentTimestamp);

            await expect(estateForger.connect(manager).updateRequestAgenda(
                defaultParams.requestId,
                currentTimestamp,
                currentTimestamp + 1000,
            )).to.not.be.reverted;
        });

        it('4.17.3. update tokenization request agenda successfully when public sales ends immediately', async () => {            
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger } = fixture;
            const defaultParams = await getDefaultParams(fixture);
    
            let currentTimestamp = await time.latest() + 1000;
            await time.setNextBlockTimestamp(currentTimestamp);

            await expect(estateForger.connect(manager).updateRequestAgenda(
                defaultParams.requestId,
                currentTimestamp + 1000,
                currentTimestamp + 1000,
            )).to.not.be.reverted;
        });

        it('4.17.4. update tokenization request agenda unsuccessfully by non-executive', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { estateForger, user } = fixture;
            const defaultParams = await getDefaultParams(fixture);
    
            let currentTimestamp = await time.latest() + 1000;
            await time.setNextBlockTimestamp(currentTimestamp);

            await expectRevertWithCustomError(estateForger, user, defaultParams, 'Unauthorized');
        });

        it('4.17.5. update tokenization request agenda unsuccessfully with invalid request id', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger } = fixture;
            const defaultParams = await getDefaultParams(fixture);

            await expectRevertWithCustomError(estateForger, manager, { ...defaultParams, requestId: 0 }, 'InvalidRequestId');
            await expectRevertWithCustomError(estateForger, manager, { ...defaultParams, requestId: 100 }, 'InvalidRequestId');
        });

        it('4.17.6. update tokenization request agenda unsuccessfully with cancelled request', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger } = fixture;
            const defaultParams = await getDefaultParams(fixture);

            await estateForger.connect(manager).cancel(defaultParams.requestId);

            await expectRevertWithCustomError(estateForger, manager, defaultParams, 'Cancelled');
        });

        it('4.17.7. update tokenization request agenda unsuccessfully with tokenized request', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addDepositions: true,
                confirmRequests: true,
                fundERC20ForDepositors: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger } = fixture;
            const defaultParams = await getDefaultParams(fixture);

            await expectRevertWithCustomError(estateForger, manager, defaultParams, 'Tokenized');
        });

        it('4.17.8. update tokenization request agenda unsuccessfully when request already have deposits', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addDepositions: true,
                fundERC20ForDepositors: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger, admin, admins } = fixture;
            const defaultParams = await getDefaultParams(fixture);

            await expectRevertWithCustomError(estateForger, manager, defaultParams, 'AlreadyHadDepositor');
        });

        it('4.17.9. update tokenization request agenda unsuccessfully by inactive zone', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { admin, admins, moderator, manager, estateForger } = fixture;
            const defaultParams = await getDefaultParams(fixture);

            const zone = (await estateForger.getRequest(defaultParams.requestId)).estate.zone;
            await callAdmin_DeclareZones(
                admin,
                admins,
                [zone],
                false,
                await admin.nonce()
            );

            await expectRevertWithCustomError(estateForger, moderator, defaultParams, 'Unauthorized');
            await expectRevertWithCustomError(estateForger, manager, defaultParams, 'Unauthorized');
        });

        it('4.17.10. update tokenization request agenda unsuccessfully by inactive executive in zone', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { admin, admins, moderator, manager, estateForger } = fixture;
            const defaultParams = await getDefaultParams(fixture);

            const zone = (await estateForger.getRequest(defaultParams.requestId)).estate.zone;
            await callAdmin_ActivateIn(
                admin,
                admins,
                zone,
                [moderator.address, manager.address],
                false,
                await admin.nonce()
            );

            await expectRevertWithCustomError(estateForger, moderator, defaultParams, 'Unauthorized');
            await expectRevertWithCustomError(estateForger, manager, defaultParams, 'Unauthorized');
        });

        it('4.17.11. update tokenization request agenda unsuccessfully with invalid private sale ends at', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger } = fixture;
            const defaultParams = await getDefaultParams(fixture);

            const timestamp = await time.latest() + 1000;
            await time.setNextBlockTimestamp(timestamp);

            await expectRevertWithCustomError(estateForger, manager, {
                ...defaultParams,
                privateSaleEndsAt: timestamp - 1,
            }, 'InvalidInput');
        });

        it('4.17.12. update tokenization request agenda unsuccessfully when private sale ends after public sale', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger } = fixture;
            const defaultParams = await getDefaultParams(fixture);

            await expectRevertWithCustomError(estateForger, manager, {
                ...defaultParams,
                privateSaleEndsAt: defaultParams.publicSaleEndsAt + 1,
            }, 'InvalidInput');
        });

        it('4.17.13. update tokenization request agenda unsuccessfully with invalid public sale ends at', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger } = fixture;
            const defaultParams = await getDefaultParams(fixture);

            const timestamp = await time.latest() + 1000;
            await time.setNextBlockTimestamp(timestamp);

            await expectRevertWithCustomError(estateForger, manager, {
                ...defaultParams,
                publicSaleEndsAt: timestamp,
            }, 'InvalidInput');
        });
    });

    describe('4.18. deposit(uint256, uint256)', async () => {
        it('4.18.1. deposit tokenization successfully and correctly refund native currency', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addEstateForgerToVault: true,
            });
            const { admin, admins, estateForger, depositor1, depositor2, reserveVault } = fixture;

            let initBalance1 = await ethers.provider.getBalance(depositor1.address);
            let initBalance2 = await ethers.provider.getBalance(depositor2.address);

            await callEstateForger_Whitelist(
                estateForger,
                admins,
                [depositor1.address],
                true,
                await admin.nonce()
            )

            // During private sale
            // Fund not expanded
            const requestId = 1;
            const quantity1 = 2;
            let value1 = (await estateForger.getRequest(requestId)).quote.unitPrice.mul(quantity1);

            let tx = await estateForger.connect(depositor1).deposit(
                requestId, quantity1, { value: value1.mul(10) }
            );
            await tx.wait();

            await expect(tx).to
                .emit(estateForger, 'Deposit')
                .withArgs(requestId, depositor1.address, quantity1, value1);

            let receipt = await tx.wait();
            const gasFee1 = receipt.effectiveGasPrice.mul(receipt.gasUsed);

            expect(await ethers.provider.getBalance(depositor1.address)).to.equal(
                initBalance1.sub(gasFee1).sub(value1)
            );
            expect(await ethers.provider.getBalance(estateForger.address)).to.equal(value1);

            let request = await estateForger.getRequest(requestId);
            expect(request.quota.soldQuantity).to.equal(quantity1);
            expect(await estateForger.deposits(requestId, depositor1.address)).to.equal(quantity1);

            expect((await reserveVault.getFund(1)).totalQuantity).to.equal(0);

            // During public sale
            // Another user deposit
            initBalance1 = await ethers.provider.getBalance(depositor1.address);
            initBalance2 = await ethers.provider.getBalance(depositor2.address);

            const timestamp = (await estateForger.getRequest(requestId)).agenda.privateSaleEndsAt;
            await time.setNextBlockTimestamp(timestamp);

            const quantity2 = 4;
            let value2 = (await estateForger.getRequest(requestId)).quote.unitPrice.mul(quantity2);

            tx = await estateForger.connect(depositor2).deposit(
                requestId, quantity2, { value: value2.mul(10) }
            );
            receipt = await tx.wait();
            const gasFee2 = receipt.effectiveGasPrice.mul(receipt.gasUsed);

            await expect(tx).to
                .emit(estateForger, 'Deposit')
                .withArgs(requestId, depositor2.address, 4, value2);

            expect(await ethers.provider.getBalance(depositor2.address)).to.equal(
                initBalance2.sub(gasFee2).sub(value2)
            );
            expect(await ethers.provider.getBalance(estateForger.address)).to.equal(value1.add(value2));

            request = await estateForger.getRequest(requestId);
            expect(request.quota.soldQuantity).to.equal(quantity1 + quantity2);
            expect(await estateForger.deposits(requestId, depositor2.address)).to.equal(quantity2);

            expect((await reserveVault.getFund(1)).totalQuantity).to.equal(0);

            // Fund expanded to total quantity (2 + 5 = 7)
            initBalance1 = await ethers.provider.getBalance(depositor1.address);
            initBalance2 = await ethers.provider.getBalance(depositor2.address);

            const quantity3 = 5;
            let value3 = (await estateForger.getRequest(requestId)).quote.unitPrice.mul(quantity3);

            tx = await estateForger.connect(depositor1).deposit(
                requestId, quantity3, { value: value3.mul(10) }
            );
            receipt = await tx.wait();
            const gasFee3 = receipt.effectiveGasPrice.mul(receipt.gasUsed);

            await expect(tx).to
                .emit(estateForger, 'Deposit')
                .withArgs(requestId, depositor1.address, quantity3, value3);

            expect(await ethers.provider.getBalance(depositor1.address)).to.equal(
                initBalance1.sub(gasFee3).sub(value3)
            );
            expect(await ethers.provider.getBalance(estateForger.address)).to.equal(value1.add(value2).add(value3));

            request = await estateForger.getRequest(requestId);
            expect(request.quota.soldQuantity).to.equal(quantity1 + quantity2 + quantity3);
            expect(await estateForger.deposits(requestId, depositor1.address)).to.equal(quantity1 + quantity3);

            expect((await reserveVault.getFund(1)).totalQuantity).to.equal(quantity1 + quantity3);

            // Fund expanded by quantity4
            initBalance1 = await ethers.provider.getBalance(depositor1.address);
            initBalance2 = await ethers.provider.getBalance(depositor2.address);

            const quantity4 = 8;
            let value4 = (await estateForger.getRequest(requestId)).quote.unitPrice.mul(quantity4);

            tx = await estateForger.connect(depositor1).deposit(
                requestId, quantity4, { value: value4.mul(10) }
            );
            receipt = await tx.wait();
            const gasFee4 = receipt.effectiveGasPrice.mul(receipt.gasUsed);

            await expect(tx).to
                .emit(estateForger, 'Deposit')
                .withArgs(requestId, depositor1.address, quantity4, value4);

            expect(await ethers.provider.getBalance(depositor1.address)).to.equal(
                initBalance1.sub(gasFee4).sub(value4)
            );
            expect(await ethers.provider.getBalance(estateForger.address)).to.equal(value1.add(value2).add(value3).add(value4));

            request = await estateForger.getRequest(requestId);
            expect(request.quota.soldQuantity).to.equal(quantity1 + quantity2 + quantity3 + quantity4);
            expect(await estateForger.deposits(requestId, depositor1.address)).to.equal(quantity1 + quantity3 + quantity4);

            expect((await reserveVault.getFund(1)).totalQuantity).to.equal(quantity1 + quantity3 + quantity4);
        });

        it('4.18.2. deposit tokenization successfully with ERC20 currency', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addEstateForgerToVault: true,
            });
            const { admin, admins, manager, estateForger, depositor1, depositor2, currencies } = fixture;
            const currency = currencies[0];
            const initBalance1 = await currency.balanceOf(depositor1.address);
            const initBalance2 = await currency.balanceOf(depositor2.address);
            const initNativeBalance1 = await ethers.provider.getBalance(depositor1.address);
            const initNativeBalance2 = await ethers.provider.getBalance(depositor2.address);
            const requestId = 2;

            // During private sale
            await callEstateForger_Whitelist(
                estateForger,
                admins,
                [depositor1.address],
                true,
                await admin.nonce()
            )

            let value1 = (await estateForger.getRequest(requestId)).quote.unitPrice.mul(100);

            let tx = await estateForger.connect(depositor1).deposit(requestId, 100);
            await tx.wait();

            await expect(tx).to
                .emit(estateForger, 'Deposit')
                .withArgs(requestId, depositor1.address, 100, value1);

            expect(await currency.balanceOf(depositor1.address)).to.equal(
                initBalance1.sub(value1)
            );
            expect(await currency.balanceOf(estateForger.address)).to.equal(value1);

            let receipt = await tx.wait();
            expect(await ethers.provider.getBalance(depositor1.address)).to.equal(
                initNativeBalance1.sub(receipt.effectiveGasPrice.mul(receipt.gasUsed))
            );
            expect(await ethers.provider.getBalance(estateForger.address)).to.equal(0);

            let tokenizationRequest = await estateForger.getRequest(requestId);
            expect(tokenizationRequest.quota.soldQuantity).to.equal(100);
            expect(await estateForger.deposits(requestId, depositor1.address)).to.equal(100);

            // During public sale
            const timestamp = (await estateForger.getRequest(requestId)).agenda.privateSaleEndsAt;
            await time.setNextBlockTimestamp(timestamp);

            let value2 = (await estateForger.getRequest(requestId)).quote.unitPrice.mul(200);

            tx = await estateForger.connect(depositor2).deposit(
                requestId, 200,
            );
            await tx.wait();

            await expect(tx).to
                .emit(estateForger, 'Deposit')
                .withArgs(requestId, depositor2.address, 200, value2);

            expect(await currency.balanceOf(depositor2.address)).to.equal(
                initBalance2.sub(value2)
            );
            expect(await currency.balanceOf(estateForger.address)).to.equal(value1.add(value2));

            receipt = await tx.wait();
            expect(await ethers.provider.getBalance(depositor2.address)).to.equal(
                initNativeBalance2.sub(receipt.effectiveGasPrice.mul(receipt.gasUsed))
            );
            expect(await ethers.provider.getBalance(estateForger.address)).to.equal(0);

            tokenizationRequest = await estateForger.getRequest(requestId);
            expect(tokenizationRequest.quota.soldQuantity).to.equal(300);
            expect(await estateForger.deposits(requestId, depositor2.address)).to.equal(200);
        });

        it('4.18.3. deposit tokenization unsuccessfully when paused', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                whitelistDepositors: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                pause: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger, depositor1 } = fixture;

            await expect(estateForger.connect(depositor1).deposit(
                1, 2, { value: ethers.utils.parseEther('100') },
            )).to.be.revertedWith("Pausable: paused");

            await expect(estateForger.connect(depositor1).deposit(
                2, 100,
            )).to.be.revertedWith("Pausable: paused");
        });

        it('4.18.4. deposit tokenization unsuccessfully with invalid request id', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                whitelistDepositors: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger, depositor1 } = fixture;

            await expect(estateForger.connect(depositor1).deposit(
                0, 2,
            )).to.be.revertedWithCustomError(estateForger, "InvalidRequestId");

            await expect(estateForger.connect(depositor1).deposit(
                100, 2,
            )).to.be.revertedWithCustomError(estateForger, "InvalidRequestId");
        });

        it('4.18.5. deposit tokenization unsuccessfully with cancelled request', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                whitelistDepositors: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger, depositor1 } = fixture;

            await callTransaction(estateForger.connect(manager).cancel(1));

            await expect(estateForger.connect(depositor1).deposit(
                1, 2, { value: ethers.utils.parseEther('100') },
            )).to.be.revertedWithCustomError(estateForger, "Cancelled");

            await callTransaction(estateForger.connect(depositor1).deposit(
                2, 100,
            ));

            await callTransaction(estateForger.connect(manager).cancel(2));

            await expect(estateForger.connect(depositor1).deposit(
                1, 2, { value: ethers.utils.parseEther('100') },
            )).to.be.revertedWithCustomError(estateForger, "Cancelled");

            await expect(estateForger.connect(depositor1).deposit(
                2, 100,
            )).to.be.revertedWithCustomError(estateForger, "Cancelled");
        });

        it('4.18.6. deposit tokenization unsuccessfully with tokenized request', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                whitelistDepositors: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
                confirmRequests: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger, depositor1 } = fixture;

            await expect(estateForger.connect(depositor1).deposit(
                1, 2, { value: 1e9 },
            )).to.be.revertedWithCustomError(estateForger, "Tokenized");

            await expect(estateForger.connect(depositor1).deposit(
                2, 100,
            )).to.be.revertedWithCustomError(estateForger, "Tokenized");
        });

        it('4.18.7. deposit tokenization unsuccessfully by unwhitelisted account before public sale start', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger, depositor1 } = fixture;

            await expect(estateForger.connect(depositor1).deposit(
                1, 2, { value: ethers.utils.parseEther('100') },
            )).to.be.revertedWithCustomError(estateForger, "InvalidDepositing");

            const privateSaleEndsAt = (await estateForger.getRequest(1)).agenda.privateSaleEndsAt;
            await time.setNextBlockTimestamp(privateSaleEndsAt - 1);

            await expect(estateForger.connect(depositor1).deposit(
                1, 2, { value: ethers.utils.parseEther('100') },
            )).to.be.revertedWithCustomError(estateForger, "InvalidDepositing");
        });

        it('4.18.8. deposit tokenization unsuccessfully after public sale ended', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                whitelistDepositors: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger, depositor1 } = fixture;

            const publicSaleEndsAt1 = (await estateForger.getRequest(1)).agenda.publicSaleEndsAt;
            await time.setNextBlockTimestamp(publicSaleEndsAt1);

            await expect(estateForger.connect(depositor1).deposit(
                1, 2, { value: ethers.utils.parseEther('100') },
            )).to.be.revertedWithCustomError(estateForger, "InvalidDepositing");

            await callTransaction(estateForger.connect(depositor1).deposit(
                2, 100,
            ));

            const publicSaleEndsAt2 = (await estateForger.getRequest(2)).agenda.publicSaleEndsAt;
            await time.setNextBlockTimestamp(publicSaleEndsAt2);

            await expect(estateForger.connect(depositor1).deposit(
                1, 2, { value: ethers.utils.parseEther('100') },
            )).to.be.revertedWithCustomError(estateForger, "InvalidDepositing");

            await expect(estateForger.connect(depositor1).deposit(
                2, 100,
            )).to.be.revertedWithCustomError(estateForger, "InvalidDepositing");
        });

        it('4.18.9. deposit tokenization unsuccessfully with max selling amount exceeded', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                whitelistDepositors: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger, depositor1, depositor2 } = fixture;

            await callTransaction(estateForger.connect(depositor1).deposit(
                1, 10, { value: ethers.utils.parseEther('100') },
            ));
            await callTransaction(estateForger.connect(depositor2).deposit(
                2, 100, { value: ethers.utils.parseEther('100') }
            ));
            
            await expect(estateForger.connect(depositor1).deposit(
                1, 41, { value: ethers.utils.parseEther('100') }
            )).to.be.revertedWithCustomError(estateForger, "MaxSellingQuantityExceeded");

            await expect(estateForger.connect(depositor1).deposit(
                2, 901,
            )).to.be.revertedWithCustomError(estateForger, "MaxSellingQuantityExceeded");
        });

        it('4.18.10. deposit tokenization request unsuccessfully with insufficient native token', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                whitelistDepositors: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addEstateForgerToVault: true,
            });
            const { estateForger, depositor1 } = fixture;

            await expect(estateForger.connect(depositor1).deposit(
                1, 2,
            )).to.be.reverted;
        });

        it('4.18.11. deposit tokenization request unsuccessfully with insufficient ERC20 token allowance', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                whitelistDepositors: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { estateForger, depositor1 } = fixture;

            await expect(estateForger.connect(depositor1).deposit(
                2, 100,
            )).to.be.revertedWith("ERC20: insufficient allowance");
        });

        it('4.18.12. deposit tokenization request unsuccessfully when refunding failed', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                whitelistDepositors: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addEstateForgerToVault: true,
            });
            const { deployer, estateForger } = fixture;

            const failReceiver = await deployFailReceiver(deployer);

            const message = estateForger.interface.encodeFunctionData('deposit', [1, 2]);

            const privateSaleEndsAt = (await estateForger.getRequest(1)).agenda.privateSaleEndsAt;
            await time.setNextBlockTimestamp(privateSaleEndsAt);

            await expect(failReceiver.call(estateForger.address, message, { value: ethers.utils.parseEther('100') }))
                .to.be.revertedWithCustomError(estateForger, "FailedRefund");
        });

        it('4.18.13. deposit tokenization request unsuccessfully when this contract is reentered', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addEstateForgerToVault: true,
            });
            const { deployer, estateForger } = fixture;

            let reentrancyData = estateForger.interface.encodeFunctionData('deposit', [1, 2]);

            let reentrancy = await deployReentrancy(deployer);
            await callTransaction(reentrancy.updateReentrancyPlan(estateForger.address, reentrancyData));

            let message = estateForger.interface.encodeFunctionData('deposit', [1, 2]);

            const privateSaleEndsAt = (await estateForger.getRequest(1)).agenda.privateSaleEndsAt;
            await time.setNextBlockTimestamp(privateSaleEndsAt);

            await testReentrancy_estateForger(
                estateForger,
                reentrancy,
                async () => {
                    await expect(reentrancy.call(estateForger.address, message, { value: ethers.utils.parseEther('100') }))
                        .to.be.revertedWithCustomError(estateForger, "FailedRefund");
                }
            );
        });
    });

    describe('4.19. safeDeposit(uint256, uint256, string)', async () => {
        it('4.19.1. deposit tokenization successfully and correctly refund native currency', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addEstateForgerToVault: true,
            });
            const { admin, admins, manager, estateForger, depositor1, depositor2 } = fixture;

            // During private sale
            await callEstateForger_Whitelist(
                estateForger,
                admins,
                [depositor1.address],
                true,
                await admin.nonce()
            )

            const initBalance1 = await ethers.provider.getBalance(depositor1.address);
            const amount1 = 2;
            const requestId = 1;
            let value1 = (await estateForger.getRequest(requestId)).quote.unitPrice.mul(amount1);

            const anchor = ethers.utils.solidityKeccak256(
                ["string"],
                [(await estateForger.getRequest(requestId)).estate.uri]
            );
            let tx = await estateForger.connect(depositor1).safeDeposit(
                requestId, amount1, anchor, { value: value1.mul(10) }
            );
            await tx.wait();

            await expect(tx).to
                .emit(estateForger, 'Deposit')
                .withArgs(requestId, depositor1.address, amount1, value1);

            let receipt = await tx.wait();

            expect(await ethers.provider.getBalance(depositor1.address)).to.equal(
                initBalance1.sub(receipt.effectiveGasPrice.mul(receipt.gasUsed)).sub(value1)
            );
            expect(await ethers.provider.getBalance(estateForger.address)).to.equal(value1);

            let tokenizationRequest = await estateForger.getRequest(requestId);
            expect(tokenizationRequest.quota.soldQuantity).to.equal(amount1);
            expect(await estateForger.deposits(requestId, depositor1.address)).to.equal(amount1);
        });

        it('4.19.2. deposit tokenization unsuccessfully with invalid request id', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                whitelistDepositors: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger, depositor1 } = fixture;

            await expect(estateForger.connect(depositor1).safeDeposit(
                0, 2, ethers.utils.solidityKeccak256(["string"], [""])
            )).to.be.revertedWithCustomError(estateForger, "InvalidRequestId");

            await expect(estateForger.connect(depositor1).safeDeposit(
                100, 2, ethers.utils.solidityKeccak256(["string"], [""])
            )).to.be.revertedWithCustomError(estateForger, "InvalidRequestId");
        });

        it('4.19.3. deposit tokenization unsuccessfully with bad anchor', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                whitelistDepositors: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger, depositor1 } = fixture;

            await expect(estateForger.connect(depositor1).safeDeposit(
                1, 2, ethers.utils.solidityKeccak256(["string"], ["bad anchor"])
            )).to.be.revertedWithCustomError(estateForger, "BadAnchor");

            await expect(estateForger.connect(depositor1).safeDeposit(
                2, 2, ethers.utils.solidityKeccak256(["string"], ["bad anchor"])
            )).to.be.revertedWithCustomError(estateForger, "BadAnchor");
        });
    });

    describe('4.20. cancel(uint256)', async () => {
        it('4.20.1. cancel tokenization successfully', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger, depositor1 } = fixture;

            for (let requestId = 1; requestId <= 2; requestId++) {
                const tx = await estateForger.connect(manager).cancel(requestId);
                await tx.wait();

                await expect(tx).to
                    .emit(estateForger, 'RequestCancellation')
                    .withArgs(requestId);

                const request = await estateForger.getRequest(requestId);
                expect(request.estate.estateId).to.equal(0);
                expect(request.quota.totalQuantity).to.equal(0);
            }
        });

        it('4.20.2. cancel tokenization unsuccessfully by non-manager', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger, user, moderator } = fixture;

            await expect(estateForger.connect(user).cancel(1))
                .to.be.revertedWithCustomError(estateForger, "Unauthorized");

            await expect(estateForger.connect(moderator).cancel(2))
                .to.be.revertedWithCustomError(estateForger, "Unauthorized");
        });

        it('4.20.3. cancel tokenization unsuccessfully with invalid request id', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger, depositor1 } = fixture;

            await expect(estateForger.connect(manager).cancel(0))
                .to.be.revertedWithCustomError(estateForger, "InvalidRequestId");

            await expect(estateForger.connect(manager).cancel(100))
                .to.be.revertedWithCustomError(estateForger, "InvalidRequestId");
        });

        it('4.20.4. cancel tokenization unsuccessfully when paused', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addEstateForgerToVault: true,
                pause: true,
            });
            const { manager, estateForger, admin, admins } = fixture;

            await expect(estateForger.connect(manager).cancel(1))
                .to.be.revertedWith("Pausable: paused");

            await expect(estateForger.connect(manager).cancel(2))
                .to.be.revertedWith("Pausable: paused");
        });

        it('4.20.5. cancel tokenization unsuccessfully when zone is inactive', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger, admin, admins } = fixture;

            const zone = (await estateForger.getRequest(1)).estate.zone;
            await callAdmin_DeclareZones(
                admin,
                admins,
                [zone],
                false,
                await admin.nonce()
            );

            await expect(estateForger.connect(manager).cancel(1))
                .to.be.revertedWithCustomError(estateForger, "Unauthorized");
        });

        it('4.20.6. cancel tokenization unsuccessfully by inactive manager in zone', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger, admin, admins } = fixture;
            
            const zone = (await estateForger.getRequest(1)).estate.zone;
            await callAdmin_ActivateIn(
                admin,
                admins,
                zone,
                [manager.address],
                false,
                await admin.nonce()
            );

            await expect(estateForger.connect(manager).cancel(1))
                .to.be.revertedWithCustomError(estateForger, "Unauthorized");
        });

        it('4.20.7. cancel tokenization unsuccessfully with cancelled request', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger } = fixture;

            await estateForger.connect(manager).cancel(1);
            await expect(estateForger.connect(manager).cancel(1))
                .to.be.revertedWithCustomError(estateForger, "Cancelled");

            await estateForger.connect(manager).cancel(2);
            await expect(estateForger.connect(manager).cancel(2))
                .to.be.revertedWithCustomError(estateForger, "Cancelled");
        });

        it('4.20.8. cancel tokenization unsuccessfully with tokenized request', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
                confirmRequests: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger } = fixture;

            await expect(estateForger.connect(manager).cancel(1))
                .to.be.revertedWithCustomError(estateForger, "Tokenized");
        });
    });

    describe('4.21. confirm(uint256, address)', async () => {
        async function testConfirmTokenization(
            currentRequestId: number,
            fixture: EstateForgerFixture,
            feeRate: BigNumber,
            exclusiveRate: BigNumber,
            commissionRate: BigNumber,
            currency: Currency | null,
            isERC20: boolean,
            isExclusive: boolean,
            minSellingQuantity: BigNumber,
            maxSellingQuantity: BigNumber,
            totalSupply: BigNumber,
            decimals: number,
            unitPrice: BigNumber,
            cashbackThreshold: BigNumber,
            cashbackBaseRate: BigNumber,
            cashbackCurrencies: string[],
            cashbackDenominations: BigNumber[],
            deposits: any[],
            hasCommissionReceiver: boolean,
        ) {
            const { admin, admins, zone1, deployer, manager, estateForger, currencies, seller1, estateToken, feeReceiver, commissionToken, priceWatcher, commissionReceiver, reserveVault } = fixture;

            const currentTimestamp = await time.latest() + 1000;

            const zone = zone1;
            const seller = seller1;

            let newCurrency: Currency | undefined;
            let newCurrencyAddress: string;

            if (currency) {
                newCurrency = currency;
                newCurrencyAddress = currency.address;
            } else {
                if (isERC20) {
                    newCurrency = await deployCurrency(
                        deployer.address,
                        `NewMockCurrency_${currentRequestId}`,
                        `NMC_${currentRequestId}`
                    ) as Currency;
                    await callTransaction(newCurrency.setExclusiveDiscount(exclusiveRate, Constant.COMMON_RATE_DECIMALS));
                    currencies.push(newCurrency);
                    newCurrencyAddress = newCurrency.address;
                } else {
                    newCurrencyAddress = ethers.constants.AddressZero;
                }
            }

            const commissionReceiverAddress = hasCommissionReceiver ? commissionReceiver.address : ethers.constants.AddressZero;

            const currentEstateId = currentRequestId;

            const allCashbackCurrencies = [newCurrencyAddress, ...cashbackCurrencies];

            await callAdmin_UpdateCurrencyRegistries(
                admin,
                admins,
                allCashbackCurrencies,
                allCashbackCurrencies.map(_ => true),
                allCashbackCurrencies.map(_ => false),
                await admin.nonce(),
            );
            await addCurrencyToAdminAndPriceWatcher(
                admin,
                priceWatcher,
                admins,
                [newCurrencyAddress],
                [true],
                [isExclusive],
                [ethers.constants.AddressZero],
                [100],
                [100],
                [0],
            );

            const estateInput = {
                zone: zone,
                uri: `Token_${currentRequestId}`,
                decimals: decimals,
                expireAt: currentTimestamp + 1e9,
            }
            const quotaInput = {
                totalQuantity: totalSupply,
                minSellingQuantity: minSellingQuantity,
                maxSellingQuantity: maxSellingQuantity,
            }
            const quoteInput = {
                currency: newCurrencyAddress,
                unitPrice: unitPrice,
                cashbackThreshold: cashbackThreshold,
                cashbackBaseRate: cashbackBaseRate,
                cashbackCurrencies: cashbackCurrencies,
                cashbackDenominations: cashbackDenominations,
            }

            await callTransaction(estateForger.connect(manager).requestTokenizationWithDuration(
                seller.address,
                estateInput,
                quotaInput,
                quoteInput,
                5,
                1e9,
            ));

            await time.setNextBlockTimestamp(await time.latest() + 5);

            await callEstateForger_UpdateFeeRate(estateForger, admins, feeRate, await admin.nonce());

            commissionToken.setVariable("commissionRate", commissionRate);

            for (const record of deposits) {
                const value = record.depositedValue.mul(unitPrice);
                let ethValue = ethers.BigNumber.from(0);
                await prepareNativeToken(ethers.provider, deployer, [record.depositor], ethers.utils.parseEther("1.0"));
                if (isERC20) {
                    await prepareERC20(newCurrency!, [record.depositor], [estateForger], value);
                } else {
                    ethValue = value;
                    await prepareNativeToken(ethers.provider, deployer, [record.depositor], value);
                }

                await callTransaction(estateForger.connect(record.depositor).deposit(
                    currentRequestId,
                    record.depositedValue,
                    { value: ethValue }
                ));
            }
            
            const walletToReset = [seller, feeReceiver];
            if (hasCommissionReceiver) {
                walletToReset.push(commissionReceiver);
            }

            if (isERC20) {
                await resetERC20(newCurrency!, walletToReset);
            } else {
                await resetNativeToken(ethers.provider, walletToReset);
            }

            const fundId = (await estateForger.getRequest(currentRequestId)).quote.cashbackFundId;
            const fund = await reserveVault.getFund(fundId);

            const cashbackBaseAmount = fund.mainDenomination.mul(fund.totalQuantity);

            const expectedVaultReceives = new Map<string, BigNumber>();
            expectedVaultReceives.set(fund.mainCurrency, cashbackBaseAmount);
            for(let i = 0; i < fund.extraCurrencies.length; ++i) {
                const current = expectedVaultReceives.get(fund.extraCurrencies[i]) || ethers.BigNumber.from(0);
                expectedVaultReceives.set(fund.extraCurrencies[i], current.add(fund.extraDenominations[i].mul(fund.totalQuantity)));
            }

            const expectedManagerSends = new Map<string, BigNumber>();
            for(let i = 0; i < fund.extraCurrencies.length; ++i) {
                const current = expectedManagerSends.get(fund.extraCurrencies[i]) || ethers.BigNumber.from(0);
                expectedManagerSends.set(fund.extraCurrencies[i], current.add(fund.extraDenominations[i].mul(fund.totalQuantity)));
            }

            for(let i = 0; i < allCashbackCurrencies.length; ++i) {
                const currencyAddress = allCashbackCurrencies[i];
                const currencyContract = currencies.find(c => c.address === currencyAddress);
                if (currencyContract) {
                    await prepareERC20(currencyContract, [manager], [estateForger], expectedManagerSends.get(currencyAddress) || ethers.BigNumber.from(0));
                } else {
                    await prepareNativeToken(ethers.provider, deployer, [manager], expectedManagerSends.get(currencyAddress) || ethers.BigNumber.from(0));
                }
            }
            
            const initManagerBalances = new Map<string, BigNumber>();
            const initVaultBalances = new Map<string, BigNumber>();
            const initEstateForgerBalances = new Map<string, BigNumber>();

            for(let i = 0; i < allCashbackCurrencies.length; ++i) {
                const currencyAddress = allCashbackCurrencies[i];
                const currencyContract = currencies.find(c => c.address === currencyAddress);
                initManagerBalances.set(currencyAddress, await getBalance(ethers.provider, manager.address, currencyContract));
                initVaultBalances.set(currencyAddress, await getBalance(ethers.provider, reserveVault.address, currencyContract));
                initEstateForgerBalances.set(currencyAddress, await getBalance(ethers.provider, estateForger.address, currencyContract));
            }
            
            await time.setNextBlockTimestamp(currentTimestamp);
            const tx = await estateForger.connect(manager).confirm(currentRequestId, commissionReceiverAddress, { value: expectedManagerSends.get(ethers.constants.AddressZero) || ethers.BigNumber.from(0) });
            const receipt = await tx.wait();
            const gasFee = receipt.gasUsed.mul(receipt.effectiveGasPrice);;

            const request = await estateForger.getRequest(currentRequestId);
            expect(request.estate.estateId).to.equal(currentEstateId);

            const soldQuantity = request.quota.soldQuantity;

            let value = ethers.BigNumber.from(soldQuantity).mul(unitPrice);
            let fee = ethers.BigNumber.from(soldQuantity).mul(request.quote.feeDenomination);
            let commissionAmount = ethers.BigNumber.from(soldQuantity).mul(request.quote.commissionDenomination);

            await expect(tx).to
                .emit(estateForger, 'RequestConfirmation')
                .withArgs(
                    currentRequestId,
                    currentEstateId,
                    soldQuantity,
                    value,
                    fee,
                    commissionReceiverAddress,
                    commissionAmount,
                    cashbackBaseAmount,
                )

            
            const fundAfter = await reserveVault.getFund(fundId);
            expect(fundAfter.isSufficient).to.equal(true);

            expect(estateToken.tokenizeEstate).to.have.been.calledWith(
                request.quota.totalQuantity.mul(ethers.BigNumber.from(10).pow(decimals)),
                request.estate.zone,
                currentRequestId,
                request.estate.uri,
                request.estate.expireAt,
                request.estate.decimals,
                commissionReceiverAddress,
            );

            for(let i = 0; i < allCashbackCurrencies.length; ++i) {
                const currencyAddress = allCashbackCurrencies[i];
                const currencyContract = currencies.find(c => c.address === currencyAddress);

                const vaultReceives = expectedVaultReceives.get(currencyAddress) || ethers.BigNumber.from(0);
                expect(await getBalance(ethers.provider, reserveVault.address, currencyContract)).to.equal(initVaultBalances.get(currencyAddress)!.add(vaultReceives));

                let managerSends = expectedManagerSends.get(currencyAddress) || ethers.BigNumber.from(0);
                if (currencyAddress == ethers.constants.AddressZero) {
                    managerSends = managerSends.add(gasFee);
                }
                expect(await getBalance(ethers.provider, manager.address, currencyContract)).to.equal(initManagerBalances.get(currencyAddress)!.sub(managerSends));

                let valueInCurrency = (currencyAddress == quoteInput.currency) ? value : ethers.BigNumber.from(0);
                expect(await getBalance(ethers.provider, estateForger.address, currencyContract)).to.equal(initEstateForgerBalances.get(currencyAddress)!.sub(valueInCurrency));
            }
            
            if (isERC20) {
                expect(await newCurrency!.balanceOf(seller.address)).to.equal(value.sub(fee));
                expect(await newCurrency!.balanceOf(feeReceiver.address)).to.equal(fee.sub(commissionAmount).sub(cashbackBaseAmount));
                if (commissionReceiverAddress !== ethers.constants.AddressZero) {
                    expect(await newCurrency!.balanceOf(commissionReceiverAddress)).to.equal(commissionAmount);
                }
                
            } else {
                expect(await ethers.provider.getBalance(seller.address)).to.equal(value.sub(fee));
                expect(await ethers.provider.getBalance(feeReceiver.address)).to.equal(fee.sub(commissionAmount).sub(cashbackBaseAmount));
                if (commissionReceiverAddress !== ethers.constants.AddressZero) {
                    expect(await ethers.provider.getBalance(commissionReceiverAddress)).to.equal(commissionAmount);
                }
            }

            expect(await estateToken.balanceOf(seller.address, currentEstateId)).to.equal(
                (totalSupply.sub(soldQuantity)).mul(ethers.BigNumber.from(10).pow(decimals))
            );
            expect(await estateToken.balanceOf(estateForger.address, currentEstateId)).to.equal(
                soldQuantity.mul(ethers.BigNumber.from(10).pow(decimals))
            );

            if (commissionReceiverAddress !== ethers.constants.AddressZero) {
                expect(await commissionToken.ownerOf(currentEstateId)).to.equal(commissionReceiverAddress);
                expect(await commissionToken.exists(currentEstateId)).to.equal(true);
            } else {
                expect(await commissionToken.exists(currentEstateId)).to.equal(false);
            }
        }

        it('4.21.1. confirm tokenization successfully (small test)', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleSellers: true,
                addEstateForgerToVault: true,
            });
            const {estateForger, admin, admins, depositor1, depositor2, depositor3, commissionToken, currencies} = fixture;
        
            await callEstateForger_UpdateBaseUnitPriceRange(
                estateForger,
                admins,
                ethers.BigNumber.from(0),
                ethers.constants.MaxUint256,
                await admin.nonce()
            );

            // Native token as main currency, ERC20 as extra currency
            await testConfirmTokenization(
                1,
                fixture,
                LandInitialization.ESTATE_FORGER_FeeRate,
                ethers.utils.parseEther("0.3"),
                (await commissionToken.getCommissionRate()).value,
                null,
                false,
                false,
                ethers.BigNumber.from(10),
                ethers.BigNumber.from(30),
                ethers.BigNumber.from(70),
                3,
                ethers.utils.parseEther('0.2'),
                ethers.BigNumber.from(5),
                ethers.utils.parseEther("0.001"),
                [currencies[0].address, currencies[1].address],
                [ethers.utils.parseEther('0.01'), ethers.utils.parseEther('0.02')],
                [
                    { depositor: depositor1, depositedValue: ethers.BigNumber.from(1) },
                    { depositor: depositor2, depositedValue: ethers.BigNumber.from(2) },
                    { depositor: depositor2, depositedValue: ethers.BigNumber.from(4) },
                    { depositor: depositor3, depositedValue: ethers.BigNumber.from(8) },
                ],
                true,
            );

            // ERC20 as main currency, native token as extra currency
            await testConfirmTokenization(
                2,
                fixture,
                LandInitialization.ESTATE_FORGER_FeeRate,
                ethers.utils.parseEther("0.3"),
                (await fixture.commissionToken.getCommissionRate()).value,
                currencies[1],
                true,
                true,
                ethers.BigNumber.from(200),
                ethers.BigNumber.from(1000),
                ethers.BigNumber.from(1000),
                0,
                ethers.utils.parseEther("0.02"),
                ethers.BigNumber.from(50),
                ethers.utils.parseEther("0.00001"),
                [currencies[1].address, ethers.constants.AddressZero],
                [ethers.utils.parseEther('0.01'), ethers.utils.parseEther('0.02')],                
                [{ depositor: depositor1, depositedValue: ethers.BigNumber.from(1000) }],
                true,
            );
        });

        it('4.21.2. confirm tokenization successfully with duplicated currency', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleSellers: true,
                addEstateForgerToVault: true,
            });
            const {estateForger, admin, admins, depositor1, depositor2, depositor3, commissionToken, currencies} = fixture;
        
            await callEstateForger_UpdateBaseUnitPriceRange(
                estateForger,
                admins,
                ethers.BigNumber.from(0),
                ethers.constants.MaxUint256,
                await admin.nonce()
            );

            // Native token as main currency and as extra currency
            await testConfirmTokenization(
                1,
                fixture,
                LandInitialization.ESTATE_FORGER_FeeRate,
                ethers.utils.parseEther("0.3"),
                (await commissionToken.getCommissionRate()).value,
                null,
                false,
                false,
                ethers.BigNumber.from(10),
                ethers.BigNumber.from(30),
                ethers.BigNumber.from(70),
                3,
                ethers.utils.parseEther('0.2'),
                ethers.BigNumber.from(5),
                ethers.utils.parseEther("0.001"),
                [currencies[0].address, ethers.constants.AddressZero],
                [ethers.utils.parseEther('0.01'), ethers.utils.parseEther('0.02')],
                [
                    { depositor: depositor1, depositedValue: ethers.BigNumber.from(1) },
                    { depositor: depositor2, depositedValue: ethers.BigNumber.from(2) },
                    { depositor: depositor2, depositedValue: ethers.BigNumber.from(4) },
                    { depositor: depositor3, depositedValue: ethers.BigNumber.from(8) },
                ],
                true,
            );

            // ERC20 as main currency, native token as extra currency
            await testConfirmTokenization(
                2,
                fixture,
                LandInitialization.ESTATE_FORGER_FeeRate,
                ethers.utils.parseEther("0.3"),
                (await fixture.commissionToken.getCommissionRate()).value,
                currencies[0],
                true,
                true,
                ethers.BigNumber.from(200),
                ethers.BigNumber.from(1000),
                ethers.BigNumber.from(1000),
                0,
                ethers.utils.parseEther("0.02"),
                ethers.BigNumber.from(50),
                ethers.utils.parseEther("0.00001"),
                [ethers.constants.AddressZero, currencies[0].address],
                [ethers.utils.parseEther('0.01'), ethers.utils.parseEther('0.02')],                
                [{ depositor: fixture.depositor1, depositedValue: ethers.BigNumber.from(1000) }],
                true,
            );
        });

        it('4.21.3. confirm tokenization successfully in all cases', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleSellers: true,
                addEstateForgerToVault: true,
            });
            const {estateForger, admin, admins, depositor1, depositor2, depositor3, commissionToken, currencies} = fixture;
        
            await callEstateForger_UpdateBaseUnitPriceRange(
                estateForger,
                admins,
                ethers.BigNumber.from(0),
                ethers.constants.MaxUint256,
                await admin.nonce()
            );

            let currentRequestId = 0;
            for (const isERC20 of [false, true]) {
                for (const isExclusive of [false, true]) {
                    if (isExclusive && !isERC20) continue;
                    await testConfirmTokenization(
                        ++currentRequestId,
                        fixture,
                        LandInitialization.ESTATE_FORGER_FeeRate,
                        ethers.utils.parseEther("0.3"),
                        (await commissionToken.getCommissionRate()).value,
                        null,
                        isERC20,
                        isExclusive,
                        ethers.BigNumber.from(10),
                        ethers.BigNumber.from(30),
                        ethers.BigNumber.from(70),
                        5,
                        ethers.utils.parseEther("0.1"),
                        ethers.BigNumber.from(5),
                        ethers.utils.parseEther("0.001"),
                        [currencies[1].address, ethers.constants.AddressZero],
                        [ethers.utils.parseEther('0.01'), ethers.utils.parseEther('0.02')],                
                        [
                            { depositor: depositor1, depositedValue: ethers.BigNumber.from(1) },
                            { depositor: depositor2, depositedValue: ethers.BigNumber.from(2) },
                            { depositor: depositor2, depositedValue: ethers.BigNumber.from(4) },
                            { depositor: depositor3, depositedValue: ethers.BigNumber.from(8) },
                        ],
                        true,
                    );
                }
            }
        });

        it('4.21.4. confirm tokenization successfully with very large deposition', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleSellers: true,
                addEstateForgerToVault: true,
            });
            const {estateForger, admin, admins, depositor1, currencies} = fixture;
        
            await callEstateForger_UpdateBaseUnitPriceRange(
                estateForger,
                admins,
                ethers.BigNumber.from(0),
                ethers.constants.MaxUint256,
                await admin.nonce()
            );

            let currentRequestId = 0;
            for (const isERC20 of [false, true]) {
                for (const isExclusive of [false, true]) {
                    if (isExclusive && !isERC20) continue;

                    await testConfirmTokenization(
                        ++currentRequestId,
                        fixture,
                        ethers.utils.parseEther("0.9"),
                        ethers.utils.parseEther("0.9"),
                        ethers.utils.parseEther("0.9"),
                        null,
                        isERC20,
                        isExclusive,
                        ethers.BigNumber.from(2).pow(255).div(Constant.COMMON_RATE_MAX_FRACTION),
                        ethers.BigNumber.from(2).pow(256).sub(1).div(Constant.COMMON_RATE_MAX_FRACTION),
                        ethers.BigNumber.from(2).pow(256).sub(1).div(Constant.COMMON_RATE_MAX_FRACTION),
                        0,
                        ethers.BigNumber.from(1),
                        ethers.BigNumber.from(1000),
                        ethers.utils.parseEther("0.99"),
                        [currencies[0].address, ethers.constants.AddressZero],
                        [ethers.utils.parseEther('0.01'), ethers.utils.parseEther('0.02')],                
                        [
                            { depositor: depositor1, depositedValue: ethers.BigNumber.from(2).pow(255).div(Constant.COMMON_RATE_MAX_FRACTION) },
                        ],
                        true,
                    );
                }
            }
        });

        it('4.21.5. confirm tokenization successfully in 100 random test cases', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleSellers: true,
                addEstateForgerToVault: true,
            });
            const {estateForger, admin, admins, depositor1, commissionToken, currencies} = fixture;
        
            await callEstateForger_UpdateBaseUnitPriceRange(
                estateForger,
                admins,
                ethers.BigNumber.from(0),
                ethers.constants.MaxUint256,
                await admin.nonce()
            );

            let currentRequestId = 0;
            for (let testcase = 0; testcase < 100; testcase++) {
                const hasCommissionReceiver = true;
                const isERC20 = Math.random() < 0.5;
                const isExclusive = Math.random() < 0.5;
                if (isExclusive && !isERC20) { --testcase; continue; }

                const feeRate = randomBigNumber(ethers.BigNumber.from(0), Constant.COMMON_RATE_MAX_FRACTION);
                const exclusiveRate = randomBigNumber(ethers.BigNumber.from(0), Constant.COMMON_RATE_MAX_FRACTION);
                const commissionRate = randomBigNumber(ethers.BigNumber.from(0), Constant.COMMON_RATE_MAX_FRACTION);

                const randomNums = []
                const decimals = randomInt(0, 19);
                for (let i = 0; i < 3; ++i) {
                    const maxSupply = ethers.BigNumber.from(2).pow(256).sub(1).div(ethers.BigNumber.from(10).pow(decimals)).div(Constant.COMMON_RATE_MAX_FRACTION);
                    randomNums.push(ethers.BigNumber.from(ethers.utils.randomBytes(32)).mod(maxSupply).add(1));
                }
                randomNums.sort((a, b) => a.sub(b).lt(0) ? -1 : 1);

                const minSellingAmount = randomNums[0];
                const maxSellingAmount = randomNums[1];
                const totalSupply = randomNums[2];

                const unitPrice = randomBigNumber(ethers.BigNumber.from(1), ethers.BigNumber.from(2).pow(256).sub(1).div(Constant.COMMON_RATE_MAX_FRACTION).div(totalSupply));
                const deposits = [
                    { depositor: depositor1, depositedValue: randomBigNumber(minSellingAmount, maxSellingAmount) },
                ];

                await testConfirmTokenization(
                    ++currentRequestId,
                    fixture,
                    feeRate,
                    exclusiveRate,
                    commissionRate,
                    null,
                    isERC20,
                    isExclusive,
                    minSellingAmount,
                    maxSellingAmount,
                    totalSupply,
                    decimals,
                    unitPrice,
                    ethers.BigNumber.from(1000),
                    ethers.utils.parseEther("0.001"),
                    [currencies[0].address, currencies[1].address, ethers.constants.AddressZero],
                    [ethers.utils.parseEther('0.01'), ethers.utils.parseEther('0.02'), ethers.utils.parseEther('0.04')],                
                    deposits,
                    hasCommissionReceiver,
                );
            }
        });

        it('4.17.5. confirm tokenization unsuccessfully when paused', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
            });
            const {estateForger, admin, admins, estateToken, manager, user, moderator, commissionReceiver} = fixture;

            await callEstateForger_Pause(estateForger, admins, await admin.nonce());

            await expect(estateForger.connect(manager).confirm(1, commissionReceiver.address)).to.be.revertedWith("Pausable: paused");
            await expect(estateForger.connect(manager).confirm(2, commissionReceiver.address)).to.be.revertedWith("Pausable: paused");
        });

        it('4.17.6. confirm tokenization unsuccessfully by non-manager', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
            });
            
            const {estateForger, user, moderator, commissionReceiver} = fixture;
            
            await expect(estateForger.connect(user).confirm(
                1, commissionReceiver.address,
            )).to.be.revertedWithCustomError(estateForger, "Unauthorized");

            await expect(estateForger.connect(moderator).confirm(
                1, commissionReceiver.address,
            )).to.be.revertedWithCustomError(estateForger, "Unauthorized");

        });

        it('4.17.7. confirm tokenization unsuccessfully with invalid request id', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
            });
            const {estateForger, manager, commissionReceiver} = fixture;
            
            await expect(estateForger.connect(manager).confirm(
                0, commissionReceiver.address,
            )).to.be.revertedWithCustomError(estateForger, "InvalidRequestId");

            await expect(estateForger.connect(manager).confirm(
                100, commissionReceiver.address,
            )).to.be.revertedWithCustomError(estateForger, "InvalidRequestId");
        });

        it('4.17.8. confirm tokenization unsuccessfully with cancelled request id', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleSellers: true,
                addSampleRequests: true,
            });
            const {estateForger, manager, commissionReceiver} = fixture;

            await callTransaction(estateForger.connect(manager).cancel(1));
            await callTransaction(estateForger.connect(manager).cancel(2));

            await expect(estateForger.connect(manager).confirm(
                1, commissionReceiver.address,
            )).to.be.revertedWithCustomError(estateForger, "Cancelled");

            await expect(estateForger.connect(manager).confirm(
                2, commissionReceiver.address,
            )).to.be.revertedWithCustomError(estateForger, "Cancelled");
        });

        it('4.17.9. confirm tokenization unsuccessfully with tokenized request id', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
                confirmRequests: true,
            });
            const {estateForger, manager, commissionReceiver} = fixture;

            await expect(estateForger.connect(manager).confirm(
                1, commissionReceiver.address,
            )).to.be.revertedWithCustomError(estateForger, "Tokenized");

            await expect(estateForger.connect(manager).confirm(
                2, commissionReceiver.address,
            )).to.be.revertedWithCustomError(estateForger, "Tokenized");
        });

        it('4.17.10. confirm tokenization successfully within 60 days after public sale ends', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
            });
            const {estateForger, manager, commissionReceiver} = fixture;

            const confirmationTimeLimit = 60 * 24 * 60 * 60; // 60 days

            const request = await estateForger.getRequest(1);
            const publicSaleEndsAt = request.publicSaleEndsAt;
            await time.setNextBlockTimestamp(publicSaleEndsAt + confirmationTimeLimit - 1);

            await callTransaction(estateForger.connect(manager).confirm(
                1, commissionReceiver.address
            ));
        });

        it('4.17.11. confirm tokenization unsuccessfully after 60 days after public sale ends', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
            });
            const {estateForger, manager, commissionReceiver} = fixture;

            const confirmationTimeLimit = 60 * 24 * 60 * 60; // 60 days

            const request = await estateForger.getRequest(1);
            const publicSaleEndsAt = request.publicSaleEndsAt;
            await time.setNextBlockTimestamp(publicSaleEndsAt + confirmationTimeLimit);

            await expect(estateForger.connect(manager).confirm(
                1, commissionReceiver.address
            )).to.be.revertedWithCustomError(estateForger, "FailedOwnershipTransfer");
        });

        it('4.17.12. confirm tokenization unsuccessfully when sold amount is less than min selling amount', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
            });
            const {estateForger, manager, commissionReceiver, depositor1} = fixture;
            
            const privateSaleEndsAt1 = (await estateForger.getRequest(1)).privateSaleEndsAt;
            await time.setNextBlockTimestamp(privateSaleEndsAt1);
            await callTransaction(estateForger.connect(depositor1).deposit(1, 9, { value: ethers.utils.parseEther("100") }));

            const privateSaleEndsAt2 = (await estateForger.getRequest(2)).privateSaleEndsAt;
            await time.setNextBlockTimestamp(privateSaleEndsAt2);
            await callTransaction(estateForger.connect(depositor1).deposit(2, 199));

            await expect(estateForger.connect(manager).confirm(
                1, commissionReceiver.address
            )).to.be.revertedWithCustomError(estateForger, "NotEnoughSoldAmount");
        });

        it('4.17.13. confirm tokenization unsuccessfully when native token transfer to requester failed', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleSellers: true,
            });
            const {estateForger, zone1, manager, commissionReceiver, depositor1, deployer, baseTimestamp, admin, admins} = fixture;

            await callEstateForger_UpdateBaseUnitPriceRange(
                estateForger,
                admins,
                ethers.BigNumber.from(0),
                ethers.constants.MaxUint256,
                await admin.nonce()
            );

            const failReceiver = await deployFailReceiver(deployer);

            await estateForger.connect(manager).activateSellerIn(
                zone1,
                [failReceiver.address],
                true
            );

            const receipt = await callTransaction(estateForger.connect(manager).requestTokenizationWithDuration(
                failReceiver.address,
                zone1,
                "uri",
                70,
                10,
                20,
                1000000,
                ethers.constants.AddressZero,
                3,
                baseTimestamp + 1e9,
                1000,
                2000,
            ));

            const requestId = receipt.events!.filter(e => e.event === "NewRequest")[0].args![0];

            const privateSaleEndsAt = (await estateForger.getRequest(requestId)).privateSaleEndsAt;
            await time.setNextBlockTimestamp(privateSaleEndsAt);

            await callTransaction(estateForger.connect(depositor1).deposit(requestId, 10, { value: ethers.utils.parseEther("100") }));

            await expect(estateForger.connect(manager).confirm(
                requestId, commissionReceiver.address
            )).to.be.revertedWithCustomError(estateForger, "FailedTransfer");
        });

        it('4.17.14. confirm tokenization unsuccessfully when native token transfer to fee receiver failed', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
            });
            const {estateForger, zone1, manager, commissionReceiver, depositor1, deployer, baseTimestamp, admin, admins} = fixture;

            const failReceiver = await deployFailReceiver(deployer);

            await callTransaction(estateForger.setFeeReceiver(failReceiver.address));

            await expect(estateForger.connect(manager).confirm(
                1, commissionReceiver.address
            )).to.be.revertedWithCustomError(estateForger, "FailedTransfer");
        });

        it('4.17.15. confirm tokenization unsuccessfully when native token transfer to commission receiver failed', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleSellers: true,
            });
            const {estateForger, zone1, manager, depositor1, deployer, baseTimestamp, admin, admins, seller1} = fixture;

            await callEstateForger_UpdateBaseUnitPriceRange(
                estateForger,
                admins,
                ethers.BigNumber.from(0),
                ethers.constants.MaxUint256,
                await admin.nonce()
            );

            const failReceiver = await deployFailReceiver(deployer);

            const receipt = await callTransaction(estateForger.connect(manager).requestTokenizationWithDuration(
                seller1.address,
                zone1,
                "uri",
                70,
                10,
                20,
                1000000,
                ethers.constants.AddressZero,
                3,
                baseTimestamp + 1e9,
                1000,
                2000,
            ));

            const requestId = receipt.events!.filter(e => e.event === "NewRequest")[0].args![0];

            const privateSaleEndsAt = (await estateForger.getRequest(requestId)).privateSaleEndsAt;
            await time.setNextBlockTimestamp(privateSaleEndsAt);

            await callTransaction(estateForger.connect(depositor1).deposit(requestId, 10, { value: ethers.utils.parseEther("100") }));

            await expect(estateForger.connect(manager).confirm(
                requestId, failReceiver.address
            )).to.be.revertedWithCustomError(estateForger, "FailedTransfer");
        });

        it('4.17.16. confirm tokenization unsuccessfully when this contract is reentered', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
            });
            const {estateForger, zone1, manager, commissionReceiver, depositor1, deployer, baseTimestamp, admin, admins} = fixture;

            let reentrancy = await deployReentrancyERC1155Holder(deployer);

            await callAdmin_AuthorizeManagers(admin, admins, [reentrancy.address], true, await admin.nonce());
            await callAdmin_ActivateIn(admin, admins, zone1, [reentrancy.address], true, await admin.nonce());

            const requestId = 1;

            let reentrancyData = estateForger.interface.encodeFunctionData('confirm', [requestId, reentrancy.address]);

            await callTransaction(reentrancy.updateReentrancyPlan(estateForger.address, reentrancyData));

            let message = estateForger.interface.encodeFunctionData('confirm', [requestId, reentrancy.address]);

            await testReentrancy_estateForger(
                estateForger,
                reentrancy,
                async () => {
                    await expect(reentrancy.call(estateForger.address, message))
                        .to.be.revertedWithCustomError(estateForger, "FailedTransfer");
                }
            );
        });
    });

    describe('4.18. safeConfirm(uint256, address, string)', async () => {
        async function testSafeConfirmTokenization(
            currentRequestId: number,
            fixture: EstateForgerFixture,
            feeRate: BigNumber,
            exclusiveRate: BigNumber,
            commissionRate: BigNumber,
            isERC20: boolean,
            isExclusive: boolean,
            minSellingAmount: BigNumber,
            maxSellingAmount: BigNumber,
            totalSupply: BigNumber,
            decimals: number,
            unitPrice: BigNumber,
            deposits: any[],
            hasCommissionReceiver: boolean,
        ) {
            const { admin, admins, zone1, deployer, manager, estateForger, depositor1, depositor2, depositor3, seller1, estateToken, feeReceiver, commissionToken, mockCurrencyExclusiveRate, commissionReceiver, currency } = fixture;

            const currentTimestamp = await time.latest() + 1000;

            const zone = zone1;
            const seller = seller1;

            let newCurrency: Currency | undefined;
            let newCurrencyAddress: string;
            if (isERC20) {
                newCurrency = await deployCurrency(
                    deployer.address,
                    `NewMockCurrency_${currentRequestId}`,
                    `NMC_${currentRequestId}`
                ) as Currency;
                await callTransaction(newCurrency.setExclusiveDiscount(exclusiveRate, Constant.COMMON_RATE_DECIMALS));
                newCurrencyAddress = newCurrency.address;
            } else {
                newCurrencyAddress = ethers.constants.AddressZero;
            }

            const commissionReceiverAddress = hasCommissionReceiver ? commissionReceiver.address : ethers.constants.AddressZero;

            const currentEstateId = currentRequestId;

            await addCurrencyToEstateForger(
                admin,
                estateForger,
                admins,
                [newCurrencyAddress],
                [true],
                [isExclusive],
                [ethers.constants.AddressZero],
                [100],
                [100],
                [0],
            );

            await callTransaction(estateForger.connect(manager).requestTokenizationWithDuration(
                seller.address,
                zone,
                `Token_${currentRequestId}`,
                totalSupply,
                minSellingAmount,
                maxSellingAmount,
                unitPrice,
                newCurrencyAddress,
                decimals,
                currentTimestamp + 1e9,
                5,
                1e9,
            ));

            await time.setNextBlockTimestamp(await time.latest() + 5);

            await callEstateForger_UpdateFeeRate(estateForger, admins, feeRate, await admin.nonce());

            commissionToken.setVariable("commissionRate", commissionRate);

            for (const record of deposits) {
                const value = record.depositedValue.mul(unitPrice);
                let ethValue = ethers.BigNumber.from(0);
                await prepareNativeToken(ethers.provider, deployer, [record.depositor], ethers.utils.parseEther("1.0"));
                if (isERC20) {
                    await prepareERC20(newCurrency!, [record.depositor], [estateForger], value);
                } else {
                    ethValue = value;
                    await prepareNativeToken(ethers.provider, deployer, [record.depositor], value);
                }

                await callTransaction(estateForger.connect(record.depositor).deposit(
                    currentRequestId,
                    record.depositedValue,
                    { value: ethValue }
                ));
            }
            
            const walletToReset = [seller, feeReceiver];
            if (hasCommissionReceiver) {
                walletToReset.push(commissionReceiver);
            }

            if (isERC20) {
                await resetERC20(newCurrency!, walletToReset);
            } else {
                await resetNativeToken(ethers.provider, walletToReset);
            }

            const anchor = (await estateForger.getRequest(currentRequestId)).uri;

            await time.setNextBlockTimestamp(currentTimestamp);
            const tx = await estateForger.connect(manager).safeConfirm(currentRequestId, commissionReceiverAddress, anchor);
            await tx.wait();

            const request = await estateForger.getRequest(currentRequestId);
            expect(request.estateId).to.equal(currentEstateId);

            const soldAmount = request.soldAmount;

            let value = ethers.BigNumber.from(soldAmount).mul(unitPrice);
            let fee = value.mul(feeRate).div(Constant.COMMON_RATE_MAX_FRACTION);
            if (isExclusive) {
                fee = fee.sub(fee.mul(exclusiveRate).div(Constant.COMMON_RATE_MAX_FRACTION));
            }
            let commissionAmount = ethers.BigNumber.from(0);
            if (commissionReceiverAddress !== ethers.constants.AddressZero) {
                commissionAmount = fee.mul(commissionRate).div(Constant.COMMON_RATE_MAX_FRACTION);
            }

            await expect(tx).to
                .emit(estateForger, 'RequestConfirmation')
                .withArgs(
                    currentRequestId,
                    currentEstateId,
                    soldAmount,
                    value,
                    fee,
                    commissionReceiverAddress,
                    commissionAmount,
                )

            expect(estateToken.tokenizeEstate).to.have.been.calledWith(
                request.totalSupply.mul(ethers.BigNumber.from(10).pow(decimals)),
                request.zone,
                currentRequestId,
                request.uri,
                request.expireAt,
                request.decimals,
                commissionReceiverAddress,
            );
            if (isERC20) {
                expect(await newCurrency!.balanceOf(seller.address)).to.equal(value.sub(fee));
                expect(await newCurrency!.balanceOf(feeReceiver.address)).to.equal(fee.sub(commissionAmount));
                if (commissionReceiverAddress !== ethers.constants.AddressZero) {
                    expect(await newCurrency!.balanceOf(commissionReceiverAddress)).to.equal(commissionAmount);
                }
            } else {
                expect(await ethers.provider.getBalance(seller.address)).to.equal(value.sub(fee));
                expect(await ethers.provider.getBalance(feeReceiver.address)).to.equal(fee.sub(commissionAmount));
                if (commissionReceiverAddress !== ethers.constants.AddressZero) {
                    expect(await ethers.provider.getBalance(commissionReceiverAddress)).to.equal(commissionAmount);
                }
            }

            expect(await estateToken.balanceOf(seller.address, currentEstateId)).to.equal(
                (totalSupply.sub(soldAmount)).mul(ethers.BigNumber.from(10).pow(decimals))
            );
            expect(await estateToken.balanceOf(estateForger.address, currentEstateId)).to.equal(
                soldAmount.mul(ethers.BigNumber.from(10).pow(decimals))
            );

            if (commissionReceiverAddress !== ethers.constants.AddressZero) {
                expect(await commissionToken.ownerOf(currentEstateId)).to.equal(commissionReceiverAddress);
                expect(await commissionToken.exists(currentEstateId)).to.equal(true);
            } else {
                expect(await commissionToken.exists(currentEstateId)).to.equal(false);
            }
        }

        it('4.18.1. confirm tokenization successfully (small test)', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleSellers: true,
            });
            const {estateForger, admin, admins, depositor1, depositor2, depositor3, mockCurrencyExclusiveRate, commissionToken} = fixture;
        
            await callEstateForger_UpdateBaseUnitPriceRange(
                estateForger,
                admins,
                ethers.BigNumber.from(0),
                ethers.constants.MaxUint256,
                await admin.nonce()
            );

            await testSafeConfirmTokenization(
                1,
                fixture,
                LandInitialization.ESTATE_FORGER_FeeRate,
                mockCurrencyExclusiveRate,
                (await commissionToken.getCommissionRate()).value,
                false,
                false,
                ethers.BigNumber.from(10),
                ethers.BigNumber.from(30),
                ethers.BigNumber.from(70),
                3,
                ethers.BigNumber.from(1000),
                [
                    { depositor: depositor1, depositedValue: ethers.BigNumber.from(2) },
                    { depositor: depositor2, depositedValue: ethers.BigNumber.from(3) },
                    { depositor: depositor3, depositedValue: ethers.BigNumber.from(5) },
                ],
                false,
            );

            await testSafeConfirmTokenization(
                2,
                fixture,
                LandInitialization.ESTATE_FORGER_FeeRate,
                fixture.mockCurrencyExclusiveRate,
                (await fixture.commissionToken.getCommissionRate()).value,
                true,
                true,
                ethers.BigNumber.from(200),
                ethers.BigNumber.from(1000),
                ethers.BigNumber.from(1000),
                0,
                ethers.BigNumber.from(20000),
                [{ depositor: fixture.depositor1, depositedValue: ethers.BigNumber.from(1000) }],
                true,
            );
        });

        it('4.18.2. confirm tokenization successfully in all cases', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleSellers: true,
            });
            const {estateForger, admin, admins, depositor1, depositor2, depositor3, mockCurrencyExclusiveRate, commissionToken} = fixture;
        
            await callEstateForger_UpdateBaseUnitPriceRange(
                estateForger,
                admins,
                ethers.BigNumber.from(0),
                ethers.constants.MaxUint256,
                await admin.nonce()
            );

            let currentRequestId = 0;
            for (const hasCommissionReceiver of [false, true]) {
                for (const isERC20 of [false, true]) {
                    for (const isExclusive of [false, true]) {
                        if (isExclusive && !isERC20) continue;

                        await testSafeConfirmTokenization(
                            ++currentRequestId,
                            fixture,
                            LandInitialization.ESTATE_FORGER_FeeRate,
                            mockCurrencyExclusiveRate,
                            (await commissionToken.getCommissionRate()).value,
                            isERC20,
                            isExclusive,
                            ethers.BigNumber.from(10),
                            ethers.BigNumber.from(30),
                            ethers.BigNumber.from(70),
                            3,
                            ethers.BigNumber.from(1000),
                            [
                                { depositor: depositor1, depositedValue: ethers.BigNumber.from(2) },
                                { depositor: depositor2, depositedValue: ethers.BigNumber.from(3) },
                                { depositor: depositor3, depositedValue: ethers.BigNumber.from(5) },
                            ],
                            hasCommissionReceiver,
                        );
                    }
                }
            }
        });

        it('4.18.3. confirm tokenization successfully with very large deposition', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleSellers: true,
            });
            const {estateForger, admin, admins, depositor1, depositor2, depositor3, mockCurrencyExclusiveRate, commissionToken} = fixture;
        
            await callEstateForger_UpdateBaseUnitPriceRange(
                estateForger,
                admins,
                ethers.BigNumber.from(0),
                ethers.constants.MaxUint256,
                await admin.nonce()
            );

            let currentRequestId = 0;
            for (const hasCommissionReceiver of [false, true]) {
                for (const isERC20 of [false, true]) {
                    for (const isExclusive of [false, true]) {
                        if (isExclusive && !isERC20) continue;

                        await testSafeConfirmTokenization(
                            ++currentRequestId,
                            fixture,
                            ethers.utils.parseEther("0.9"),
                            ethers.utils.parseEther("0.9"),
                            ethers.utils.parseEther("0.9"),
                            isERC20,
                            isExclusive,
                            ethers.BigNumber.from(2).pow(255).div(Constant.COMMON_RATE_MAX_FRACTION),
                            ethers.BigNumber.from(2).pow(256).sub(1).div(Constant.COMMON_RATE_MAX_FRACTION),
                            ethers.BigNumber.from(2).pow(256).sub(1).div(Constant.COMMON_RATE_MAX_FRACTION),
                            0,
                            ethers.BigNumber.from(1),
                            [
                                { depositor: depositor1, depositedValue: ethers.BigNumber.from(2).pow(255).div(Constant.COMMON_RATE_MAX_FRACTION) },
                            ],
                            hasCommissionReceiver,
                        );
                    }
                }
            }
        });

        it('4.18.4. confirm tokenization successfully in 100 random test cases', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleSellers: true,
            });
            const {estateForger, admin, admins, depositor1, depositor2, depositor3, mockCurrencyExclusiveRate, commissionToken} = fixture;
        
            await callEstateForger_UpdateBaseUnitPriceRange(
                estateForger,
                admins,
                ethers.BigNumber.from(0),
                ethers.constants.MaxUint256,
                await admin.nonce()
            );

            let currentRequestId = 0;
            for (let testcase = 0; testcase < 100; testcase++) {
                const hasCommissionReceiver = Math.random() < 0.5;
                const isERC20 = Math.random() < 0.5;
                const isExclusive = Math.random() < 0.5;
                if (isExclusive && !isERC20) { --testcase; continue; }

                const feeRate = randomBigNumber(ethers.BigNumber.from(0), Constant.COMMON_RATE_MAX_FRACTION);
                const exclusiveRate = randomBigNumber(ethers.BigNumber.from(0), Constant.COMMON_RATE_MAX_FRACTION);
                const commissionRate = randomBigNumber(ethers.BigNumber.from(0), Constant.COMMON_RATE_MAX_FRACTION);

                const randomNums = []
                const decimals = randomInt(0, 19);
                for (let i = 0; i < 3; ++i) {
                    const maxSupply = ethers.BigNumber.from(2).pow(256).sub(1).div(ethers.BigNumber.from(10).pow(decimals)).div(Constant.COMMON_RATE_MAX_FRACTION);
                    randomNums.push(ethers.BigNumber.from(ethers.utils.randomBytes(32)).mod(maxSupply).add(1));
                }
                randomNums.sort((a, b) => a.sub(b).lt(0) ? -1 : 1);

                const minSellingAmount = randomNums[0];
                const maxSellingAmount = randomNums[1];
                const totalSupply = randomNums[2];

                const unitPrice = randomBigNumber(ethers.BigNumber.from(1), ethers.BigNumber.from(2).pow(256).sub(1).div(Constant.COMMON_RATE_MAX_FRACTION).div(totalSupply));
                const deposits = [
                    { depositor: depositor1, depositedValue: randomBigNumber(minSellingAmount, maxSellingAmount) },
                ];

                await testSafeConfirmTokenization(
                    ++currentRequestId,
                    fixture,
                    feeRate,
                    exclusiveRate,
                    commissionRate,
                    isERC20,
                    isExclusive,
                    minSellingAmount,
                    maxSellingAmount,
                    totalSupply,
                    decimals,
                    unitPrice,
                    deposits,
                    hasCommissionReceiver,
                );
            }
        });

        it('4.18.5. confirm tokenization unsuccessfully when paused', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
            });
            const {estateForger, admin, admins, estateToken, manager, user, moderator, commissionReceiver} = fixture;

            await callEstateForger_Pause(estateForger, admins, await admin.nonce());

            const anchor1 = (await estateForger.getRequest(1)).uri;
            const anchor2 = (await estateForger.getRequest(2)).uri;

            await expect(estateForger.connect(manager).safeConfirm(1, commissionReceiver.address, anchor1)).to.be.revertedWith("Pausable: paused");
            await expect(estateForger.connect(manager).safeConfirm(2, commissionReceiver.address, anchor2)).to.be.revertedWith("Pausable: paused");
        });

        it('4.18.6. confirm tokenization unsuccessfully by non-manager', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
            });
            
            const {estateForger, user, moderator, commissionReceiver} = fixture;
            
            const anchor = (await estateForger.getRequest(1)).uri;

            await expect(estateForger.connect(user).safeConfirm(
                1, commissionReceiver.address, anchor
            )).to.be.revertedWithCustomError(estateForger, "Unauthorized");

            await expect(estateForger.connect(moderator).safeConfirm(
                1, commissionReceiver.address, anchor
            )).to.be.revertedWithCustomError(estateForger, "Unauthorized");

        });

        it('4.18.7. confirm tokenization unsuccessfully with invalid request id', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
            });
            const {estateForger, manager, commissionReceiver} = fixture;
            
            await expect(estateForger.connect(manager).safeConfirm(
                0, commissionReceiver.address, ""
            )).to.be.revertedWithCustomError(estateForger, "InvalidRequestId");

            await expect(estateForger.connect(manager).safeConfirm(
                100, commissionReceiver.address, ""
            )).to.be.revertedWithCustomError(estateForger, "InvalidRequestId");
        });

        it('4.18.8. confirm tokenization unsuccessfully with incorrect anchor', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
            });
            const {estateForger, manager, commissionReceiver} = fixture;
            
            const incorrectAnchor = "TestAnchor";

            await expect(estateForger.connect(manager).safeConfirm(
                1, commissionReceiver.address, incorrectAnchor
            )).to.be.revertedWithCustomError(estateForger, "BadAnchor");

            await expect(estateForger.connect(manager).safeConfirm(
                2, commissionReceiver.address, incorrectAnchor
            )).to.be.revertedWithCustomError(estateForger, "BadAnchor");
        });

        it('4.18.9. confirm tokenization unsuccessfully with cancelled request id', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleSellers: true,
                addSampleRequests: true,
            });
            const {estateForger, manager, commissionReceiver} = fixture;

            await callTransaction(estateForger.connect(manager).cancel(1));
            await callTransaction(estateForger.connect(manager).cancel(2));

            const anchor1 = (await estateForger.getRequest(1)).uri;
            const anchor2 = (await estateForger.getRequest(2)).uri;

            await expect(estateForger.connect(manager).safeConfirm(
                1, commissionReceiver.address, anchor1
            )).to.be.revertedWithCustomError(estateForger, "Cancelled");

            await expect(estateForger.connect(manager).safeConfirm(
                2, commissionReceiver.address, anchor2
            )).to.be.revertedWithCustomError(estateForger, "Cancelled");
        });

        it('4.18.10. confirm tokenization unsuccessfully with tokenized request id', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
                confirmRequests: true,
            });
            const {estateForger, manager, commissionReceiver} = fixture;

            const anchor1 = (await estateForger.getRequest(1)).uri;
            const anchor2 = (await estateForger.getRequest(2)).uri;

            await expect(estateForger.connect(manager).safeConfirm(
                1, commissionReceiver.address, anchor1
            )).to.be.revertedWithCustomError(estateForger, "Tokenized");

            await expect(estateForger.connect(manager).safeConfirm(
                2, commissionReceiver.address, anchor2
            )).to.be.revertedWithCustomError(estateForger, "Tokenized");
        });

        it('4.18.11. confirm tokenization successfully within 60 days after public sale ends', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
            });
            const {estateForger, manager, commissionReceiver} = fixture;

            const confirmationTimeLimit = 60 * 24 * 60 * 60; // 60 days

            const request = await estateForger.getRequest(1);
            const publicSaleEndsAt = request.publicSaleEndsAt;
            await time.setNextBlockTimestamp(publicSaleEndsAt + confirmationTimeLimit - 1);

            const anchor = request.uri;

            await callTransaction(estateForger.connect(manager).safeConfirm(
                1, commissionReceiver.address, anchor
            ));
        });

        it('4.18.12. confirm tokenization unsuccessfully after 60 days after public sale ends', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
            });
            const {estateForger, manager, commissionReceiver} = fixture;

            const confirmationTimeLimit = 60 * 24 * 60 * 60; // 60 days

            const request = await estateForger.getRequest(1);
            const publicSaleEndsAt = request.publicSaleEndsAt;
            await time.setNextBlockTimestamp(publicSaleEndsAt + confirmationTimeLimit);

            const anchor = request.uri;

            await expect(estateForger.connect(manager).safeConfirm(
                1, commissionReceiver.address, anchor
            )).to.be.revertedWithCustomError(estateForger, "FailedOwnershipTransfer");
        });

        it('4.18.13. confirm tokenization unsuccessfully when sold amount is less than min selling amount', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
            });
            const {estateForger, manager, commissionReceiver, depositor1} = fixture;
            
            const privateSaleEndsAt1 = (await estateForger.getRequest(1)).privateSaleEndsAt;
            await time.setNextBlockTimestamp(privateSaleEndsAt1);
            await callTransaction(estateForger.connect(depositor1).deposit(1, 9, { value: ethers.utils.parseEther("100") }));

            const privateSaleEndsAt2 = (await estateForger.getRequest(2)).privateSaleEndsAt;
            await time.setNextBlockTimestamp(privateSaleEndsAt2);
            await callTransaction(estateForger.connect(depositor1).deposit(2, 199));

            const anchor = (await estateForger.getRequest(1)).uri;

            await expect(estateForger.connect(manager).safeConfirm(
                1, commissionReceiver.address, anchor
            )).to.be.revertedWithCustomError(estateForger, "NotEnoughSoldAmount");
        });

        it('4.18.14. confirm tokenization unsuccessfully when native token transfer to requester failed', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleSellers: true,
            });
            const {estateForger, zone1, manager, commissionReceiver, depositor1, deployer, baseTimestamp, admin, admins} = fixture;

            await callEstateForger_UpdateBaseUnitPriceRange(
                estateForger,
                admins,
                ethers.BigNumber.from(0),
                ethers.constants.MaxUint256,
                await admin.nonce()
            );

            const failReceiver = await deployFailReceiver(deployer);

            await estateForger.connect(manager).activateSellerIn(
                zone1,
                [failReceiver.address],
                true
            );

            const receipt = await callTransaction(estateForger.connect(manager).requestTokenizationWithDuration(
                failReceiver.address,
                zone1,
                "uri",
                70,
                10,
                20,
                1000000,
                ethers.constants.AddressZero,
                3,
                baseTimestamp + 1e9,
                1000,
                2000,
            ));

            const requestId = receipt.events!.filter(e => e.event === "NewRequest")[0].args![0];

            const privateSaleEndsAt = (await estateForger.getRequest(requestId)).privateSaleEndsAt;
            await time.setNextBlockTimestamp(privateSaleEndsAt);

            await callTransaction(estateForger.connect(depositor1).deposit(requestId, 10, { value: ethers.utils.parseEther("100") }));

            const anchor = (await estateForger.getRequest(requestId)).uri;

            await expect(estateForger.connect(manager).safeConfirm(
                requestId, commissionReceiver.address, anchor
            )).to.be.revertedWithCustomError(estateForger, "FailedTransfer");
        });

        it('4.18.15. confirm tokenization unsuccessfully when native token transfer to fee receiver failed', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
            });
            const {estateForger, zone1, manager, commissionReceiver, depositor1, deployer, baseTimestamp, admin, admins} = fixture;

            const failReceiver = await deployFailReceiver(deployer);

            await callTransaction(estateForger.setFeeReceiver(failReceiver.address));

            const anchor = (await estateForger.getRequest(1)).uri;

            await expect(estateForger.connect(manager).safeConfirm(
                1, commissionReceiver.address, anchor
            )).to.be.revertedWithCustomError(estateForger, "FailedTransfer");
        });

        it('4.18.16. confirm tokenization unsuccessfully when native token transfer to commission receiver failed', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleSellers: true,
            });
            const {estateForger, zone1, manager, depositor1, deployer, baseTimestamp, admin, admins, seller1} = fixture;

            await callEstateForger_UpdateBaseUnitPriceRange(
                estateForger,
                admins,
                ethers.BigNumber.from(0),
                ethers.constants.MaxUint256,
                await admin.nonce()
            );

            const failReceiver = await deployFailReceiver(deployer);

            const receipt = await callTransaction(estateForger.connect(manager).requestTokenizationWithDuration(
                seller1.address,
                zone1,
                "uri",
                70,
                10,
                20,
                1000000,
                ethers.constants.AddressZero,
                3,
                baseTimestamp + 1e9,
                1000,
                2000,
            ));

            const requestId = receipt.events!.filter(e => e.event === "NewRequest")[0].args![0];

            const privateSaleEndsAt = (await estateForger.getRequest(requestId)).privateSaleEndsAt;
            await time.setNextBlockTimestamp(privateSaleEndsAt);

            await callTransaction(estateForger.connect(depositor1).deposit(requestId, 10, { value: ethers.utils.parseEther("100") }));

            const anchor = (await estateForger.getRequest(requestId)).uri;

            await expect(estateForger.connect(manager).safeConfirm(
                requestId, failReceiver.address, anchor
            )).to.be.revertedWithCustomError(estateForger, "FailedTransfer");
        });

        it('4.18.17. confirm tokenization unsuccessfully when this contract is reentered', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
            });
            const {estateForger, zone1, manager, commissionReceiver, depositor1, deployer, baseTimestamp, admin, admins} = fixture;

            let reentrancy = await deployReentrancyERC1155Holder(deployer);

            await callAdmin_AuthorizeManagers(admin, admins, [reentrancy.address], true, await admin.nonce());
            await callAdmin_ActivateIn(admin, admins, zone1, [reentrancy.address], true, await admin.nonce());

            const requestId = 1;
            const anchor = (await estateForger.getRequest(requestId)).uri;
            let reentrancyData = estateForger.interface.encodeFunctionData('safeConfirm', [requestId, reentrancy.address, anchor]);

            await callTransaction(reentrancy.updateReentrancyPlan(estateForger.address, reentrancyData));

            let message = estateForger.interface.encodeFunctionData('safeConfirm', [requestId, reentrancy.address, anchor]);

            await testReentrancy_estateForger(
                estateForger,
                reentrancy,
                async () => {
                    await expect(reentrancy.call(estateForger.address, message))
                        .to.be.revertedWithCustomError(estateForger, "FailedTransfer");
                }
            );
        });
    });

    describe("4.19. withdrawDeposit(uint256)", () => {
        it("4.19.1. withdraw deposit successfully when request is cancelled", async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
            });
            const {estateForger, zone1, manager, commissionReceiver, depositor1, depositor2, deployer, baseTimestamp, admin, admins, currency} = fixture;

            await callTransaction(estateForger.connect(manager).cancel(1));
            await callTransaction(estateForger.connect(manager).cancel(2));

            let depositAmount = await estateForger.deposits(1, depositor1.address);
            let request = await estateForger.getRequest(1);

            const depositor1InitBalance = await ethers.provider.getBalance(depositor1.address);
            const depositor2InitCurrencyBalance = await currency.balanceOf(depositor2.address);

            let tx = await estateForger.connect(depositor1).withdrawDeposit(1);
            let receipt = await tx.wait();

            let value = depositAmount.mul(request.unitPrice);
            await expect(tx)
                .emit(estateForger, "DepositWithdrawal")
                .withArgs(1, depositor1.address, depositAmount, value);

            expect(await estateForger.hasWithdrawn(1, depositor1.address)).to.be.equal(true);

            expect(await ethers.provider.getBalance(depositor1.address))
                .to.be.equal(depositor1InitBalance.sub(receipt.gasUsed.mul(receipt.effectiveGasPrice)).add(value));

            depositAmount = await estateForger.deposits(2, depositor2.address);
            request = await estateForger.getRequest(2);

            tx = await estateForger.connect(depositor2).withdrawDeposit(2);
            receipt = await tx.wait();

            value = depositAmount.mul(request.unitPrice);
            await expect(tx)
                .emit(estateForger, "DepositWithdrawal")
                .withArgs(2, depositor2.address, depositAmount, value);

            expect(await estateForger.hasWithdrawn(2, depositor2.address)).to.be.equal(true);

            expect(await currency.balanceOf(depositor2.address))
                .to.be.equal(depositor2InitCurrencyBalance.add(value));
        });

        it("4.19.2. withdraw deposit successfully when request is not confirmable (sold amount is less than minimum selling amount)", async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleSellers: true,
                addSampleRequests: true,
            });
            const {estateForger, depositor1, depositor2} = fixture;

            const request1 = await estateForger.getRequest(1);
            await time.setNextBlockTimestamp(request1.publicSaleEndsAt + 1);
            await callTransaction(estateForger.connect(depositor1).withdrawDeposit(1));

            const request2 = await estateForger.getRequest(2);
            await time.setNextBlockTimestamp(request2.publicSaleEndsAt + 1);
            await callTransaction(estateForger.connect(depositor2).withdrawDeposit(2));
        });

        it("4.19.3. withdraw deposit successfully after request is no longer confirmable (60 days after public sale ended)", async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
            });
            const {estateForger, depositor1, depositor2} = fixture;

            const request1 = await estateForger.getRequest(1);
            const request2 = await estateForger.getRequest(2);

            const days_60 = 60 * 24 * 60 * 60;

            await time.setNextBlockTimestamp(request1.publicSaleEndsAt + days_60 + 1);
            await callTransaction(estateForger.connect(depositor1).withdrawDeposit(1));

            await time.setNextBlockTimestamp(request2.publicSaleEndsAt + days_60 + 1);
            await callTransaction(estateForger.connect(depositor2).withdrawDeposit(2));
        });

        it("4.19.4. withdraw deposit unsuccessfully when paused", async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
                pause: true,
            });
            const {estateForger, manager, depositor1, depositor2} = fixture;

            await expect(estateForger.connect(depositor1).withdrawDeposit(1))
                .to.be.revertedWith("Pausable: paused");
            await expect(estateForger.connect(depositor2).withdrawDeposit(2))
                .to.be.revertedWith("Pausable: paused");
        });

        it("4.19.5. withdraw deposit unsuccessfully with invalid request id", async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
            });
            const {estateForger, manager, depositor1, depositor2} = fixture;

            await callTransaction(estateForger.connect(manager).cancel(1));
            await callTransaction(estateForger.connect(manager).cancel(2));

            await expect(estateForger.connect(depositor1).withdrawDeposit(0))
                .to.be.revertedWithCustomError(estateForger, "InvalidRequestId");
            await expect(estateForger.connect(depositor2).withdrawDeposit(100))
                .to.be.revertedWithCustomError(estateForger, "InvalidRequestId");
        });

        it("4.19.6. withdraw deposit unsuccessfully with tokenized request", async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
                confirmRequests: true,
            });
            const {estateForger, depositor1, depositor2} = fixture;

            await expect(estateForger.connect(depositor1).withdrawDeposit(1))
                .to.be.revertedWithCustomError(estateForger, "Tokenized");
            await expect(estateForger.connect(depositor2).withdrawDeposit(2))
                .to.be.revertedWithCustomError(estateForger, "Tokenized");
        });

        it("4.19.7. withdraw deposit unsuccessfully when public sale not ended", async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
            });
            const {estateForger, depositor1, depositor2} = fixture;

            await expect(estateForger.connect(depositor1).withdrawDeposit(1))
                .to.be.revertedWithCustomError(estateForger, "StillSelling");
            await expect(estateForger.connect(depositor2).withdrawDeposit(2))
                .to.be.revertedWithCustomError(estateForger, "StillSelling");
        });

        it("4.19.8. withdraw deposit unsuccessfully with confirmable request", async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
            });
            const {estateForger, depositor1, depositor2} = fixture;

            const request1 = await estateForger.getRequest(1);
            const request2 = await estateForger.getRequest(2);

            await time.setNextBlockTimestamp(request1.publicSaleEndsAt + 1);
            await expect(estateForger.connect(depositor1).withdrawDeposit(1))
                .to.be.revertedWithCustomError(estateForger, "InvalidWithdrawing");

            await time.setNextBlockTimestamp(request2.publicSaleEndsAt + 1);
            await expect(estateForger.connect(depositor2).withdrawDeposit(2))
                .to.be.revertedWithCustomError(estateForger, "InvalidWithdrawing");
        });

        it("4.19.9. withdraw deposit unsuccessfully by already withdrawn user", async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
            });
            const {estateForger, manager, depositor1, depositor2} = fixture;

            await callTransaction(estateForger.connect(manager).cancel(1));
            await callTransaction(estateForger.connect(manager).cancel(2));

            await callTransaction(estateForger.connect(depositor1).withdrawDeposit(1));
            await callTransaction(estateForger.connect(depositor1).withdrawDeposit(2));
            await callTransaction(estateForger.connect(depositor2).withdrawDeposit(1));
            await callTransaction(estateForger.connect(depositor2).withdrawDeposit(2));

            await expect(estateForger.connect(depositor1).withdrawDeposit(1))
                .to.be.revertedWithCustomError(estateForger, "AlreadyWithdrawn");
            await expect(estateForger.connect(depositor1).withdrawDeposit(2))
                .to.be.revertedWithCustomError(estateForger, "AlreadyWithdrawn");
            await expect(estateForger.connect(depositor2).withdrawDeposit(1))
                .to.be.revertedWithCustomError(estateForger, "AlreadyWithdrawn");
            await expect(estateForger.connect(depositor2).withdrawDeposit(2))
                .to.be.revertedWithCustomError(estateForger, "AlreadyWithdrawn");
        });

        it("4.19.10. withdraw deposit unsuccessfully when native transfer to sender failed", async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
            });
            const {estateForger, deployer, manager} = fixture;

            const request = await estateForger.getRequest(1);

            const failedReceiver = await deployFailReceiver(deployer);

            let message = estateForger.interface.encodeFunctionData("deposit", [1, 5]);

            await callTransaction(failedReceiver.call(estateForger.address, message, { value: request.unitPrice.mul(5) }));

            await callTransaction(estateForger.connect(manager).cancel(1));

            message = estateForger.interface.encodeFunctionData("withdrawDeposit", [1]);

            await expect(failedReceiver.call(estateForger.address, message))
                .to.be.revertedWithCustomError(estateForger, "FailedTransfer");
        });

        it("4.19.11. withdraw deposit unsuccessfully when this contract is reentered", async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
            });
            const {estateForger, deployer, manager} = fixture;

            const reentrancy = await deployReentrancy(deployer);

            let message = estateForger.interface.encodeFunctionData("deposit", [1, 10]);

            await callTransaction(reentrancy.call(estateForger.address, message, { value: ethers.utils.parseEther("100") }));

            await callTransaction(estateForger.connect(manager).cancel(1));

            message = estateForger.interface.encodeFunctionData("withdrawDeposit", [1]);
            await callTransaction(reentrancy.updateReentrancyPlan(estateForger.address, message));

            await testReentrancy_estateForger(
                estateForger,
                reentrancy,
                async () => {
                    await expect(reentrancy.call(estateForger.address, message))
                        .to.be.revertedWithCustomError(estateForger, "FailedTransfer");
                }
            );
        });
    });

    describe("4.20. withdrawToken(uint256)", () => {
        it("4.20.1. withdraw token successfully after request is confirmed", async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
                confirmRequests: true,
            });
            const {estateForger, estateToken, depositor1, depositor2, depositor3} = fixture;

            let tx = await estateForger.connect(depositor1).withdrawToken(1);
            await expect(tx)
                .emit(estateForger, "TokenWithdrawal")
                .withArgs(1, depositor1.address, 2_000);
            expect(await estateForger.hasWithdrawn(1, depositor1.address)).to.be.equal(true);
            expect(await estateToken.balanceOf(depositor1.address, 1)).to.be.equal(2_000);
            expect(await estateToken.balanceOf(estateForger.address, 1)).to.be.equal(8_000);
            expect(await estateToken.balanceOf(estateForger.address, 2)).to.be.equal(1000);

            tx = await estateForger.connect(depositor2).withdrawToken(1);
            await expect(tx)
                .emit(estateForger, "TokenWithdrawal")
                .withArgs(1, depositor2.address, 3_000);
            expect(await estateForger.hasWithdrawn(1, depositor2.address)).to.be.equal(true);
            expect(await estateToken.balanceOf(depositor2.address, 1)).to.be.equal(3_000);
            expect(await estateToken.balanceOf(estateForger.address, 1)).to.be.equal(5_000);
            expect(await estateToken.balanceOf(estateForger.address, 2)).to.be.equal(1000);

            tx = await estateForger.connect(depositor3).withdrawToken(1);
            await expect(tx)
                .emit(estateForger, "TokenWithdrawal")
                .withArgs(1, depositor3.address, 5_000);
            expect(await estateForger.hasWithdrawn(1, depositor3.address)).to.be.equal(true);
            expect(await estateToken.balanceOf(depositor3.address, 1)).to.be.equal(5_000);
            expect(await estateToken.balanceOf(estateForger.address, 1)).to.be.equal(0);
            expect(await estateToken.balanceOf(estateForger.address, 2)).to.be.equal(1000);

            tx = await estateForger.connect(depositor1).withdrawToken(2);
            expect(tx)
                .emit(estateForger, "TokenWithdrawal")
                .withArgs(2, depositor1.address, 200);
            expect(await estateForger.hasWithdrawn(2, depositor1.address)).to.be.equal(true);
            expect(await estateToken.balanceOf(depositor1.address, 2)).to.be.equal(200);
            expect(await estateToken.balanceOf(estateForger.address, 1)).to.be.equal(0);
            expect(await estateToken.balanceOf(estateForger.address, 2)).to.be.equal(800);

            tx = await estateForger.connect(depositor2).withdrawToken(2);
            await expect(tx)
                .emit(estateForger, "TokenWithdrawal")
                .withArgs(2, depositor2.address, 300);
            expect(await estateForger.hasWithdrawn(2, depositor2.address)).to.be.equal(true);
            expect(await estateToken.balanceOf(depositor2.address, 2)).to.be.equal(300);
            expect(await estateToken.balanceOf(estateForger.address, 1)).to.be.equal(0);
            expect(await estateToken.balanceOf(estateForger.address, 2)).to.be.equal(500);

            tx = await estateForger.connect(depositor3).withdrawToken(2);
            await expect(tx)
                .emit(estateForger, "TokenWithdrawal")
                .withArgs(2, depositor3.address, 500);
            expect(await estateForger.hasWithdrawn(2, depositor3.address)).to.be.equal(true);
            expect(await estateToken.balanceOf(depositor3.address, 2)).to.be.equal(500);
            expect(await estateToken.balanceOf(estateForger.address, 1)).to.be.equal(0);
            expect(await estateToken.balanceOf(estateForger.address, 2)).to.be.equal(0);
        });

        it("4.20.2. withdraw token unsuccessfully when paused", async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
                confirmRequests: true,
                pause: true,
            });
            
            const {estateForger, depositor1, depositor2} = fixture;
            
            await expect(estateForger.connect(depositor1).withdrawToken(1))
                .to.be.revertedWith("Pausable: paused");
            await expect(estateForger.connect(depositor2).withdrawToken(2))
                .to.be.revertedWith("Pausable: paused");
        });

        it("4.20.3. withdraw token unsuccessfully with invalid request id", async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
                confirmRequests: true,
            });
            const {estateForger, depositor1, depositor2} = fixture;

            await expect(estateForger.connect(depositor1).withdrawToken(0))
                .to.be.revertedWithCustomError(estateForger, "InvalidRequestId");
            await expect(estateForger.connect(depositor2).withdrawToken(100))
                .to.be.revertedWithCustomError(estateForger, "InvalidRequestId");
        });

        it("4.20.4. withdraw token unsuccessfully with unconfirmed request", async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
            });
            const {estateForger, depositor1, depositor2} = fixture;

            await expect(estateForger.connect(depositor1).withdrawToken(1))
                .to.be.revertedWithCustomError(estateForger, "InvalidWithdrawing");
        });

        it("4.20.5. withdraw token unsuccessfully when sender is already withdrawn", async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
                confirmRequests: true,
            });

            const {estateForger, depositor1, depositor2} = fixture;

            await callTransaction(estateForger.connect(depositor1).withdrawToken(1));
            await callTransaction(estateForger.connect(depositor1).withdrawToken(2));
            await callTransaction(estateForger.connect(depositor2).withdrawToken(1));
            await callTransaction(estateForger.connect(depositor2).withdrawToken(2));

            await expect(estateForger.connect(depositor1).withdrawToken(1))
                .to.be.revertedWithCustomError(estateForger, "AlreadyWithdrawn");
            await expect(estateForger.connect(depositor1).withdrawToken(2))
                .to.be.revertedWithCustomError(estateForger, "AlreadyWithdrawn");
            await expect(estateForger.connect(depositor2).withdrawToken(1))
                .to.be.revertedWithCustomError(estateForger, "AlreadyWithdrawn");
            await expect(estateForger.connect(depositor2).withdrawToken(2))
                .to.be.revertedWithCustomError(estateForger, "AlreadyWithdrawn");
        });
    });

    describe('4.21. allocationOfAt(uint256, address, uint256)', () => {
        it('4.21.1. succeed with existing estate id', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
                confirmRequests: true,
            });

            const { estateForger, depositor1, depositor2 } = fixture;

            const publicSaleEndsAt1 = (await estateForger.getRequest(1)).publicSaleEndsAt;

            const estate1deposit1 = 2_000;
            expect(await estateForger.allocationOfAt(1, depositor1.address, publicSaleEndsAt1 - 1)).to.be.equal(0);
            expect(await estateForger.allocationOfAt(1, depositor1.address, publicSaleEndsAt1)).to.be.equal(estate1deposit1);
            expect(await estateForger.allocationOfAt(1, depositor1.address, publicSaleEndsAt1 + 1)).to.be.equal(estate1deposit1);

            const estate1deposit2 = 3_000;
            expect(await estateForger.allocationOfAt(1, depositor2.address, publicSaleEndsAt1 - 1)).to.be.equal(0);
            expect(await estateForger.allocationOfAt(1, depositor2.address, publicSaleEndsAt1)).to.be.equal(estate1deposit2);
            expect(await estateForger.allocationOfAt(1, depositor2.address, publicSaleEndsAt1 + 1)).to.be.equal(estate1deposit2);

            const publicSaleEndsAt2 = (await estateForger.getRequest(2)).publicSaleEndsAt;

            const estate2deposit1 = 200;
            expect(await estateForger.allocationOfAt(2, depositor1.address, publicSaleEndsAt2 - 1)).to.be.equal(0);
            expect(await estateForger.allocationOfAt(2, depositor1.address, publicSaleEndsAt2)).to.be.equal(estate2deposit1);
            expect(await estateForger.allocationOfAt(2, depositor1.address, publicSaleEndsAt2 + 1)).to.be.equal(estate2deposit1);

            const estate2deposit2 = 300;
            expect(await estateForger.allocationOfAt(2, depositor2.address, publicSaleEndsAt2 - 1)).to.be.equal(0);
            expect(await estateForger.allocationOfAt(2, depositor2.address, publicSaleEndsAt2)).to.be.equal(estate2deposit2);
            expect(await estateForger.allocationOfAt(2, depositor2.address, publicSaleEndsAt2 + 1)).to.be.equal(estate2deposit2);
        });

        it('4.21.2. return 0 with unconfirmed request', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
            });

            const { estateForger, depositor1, depositor2 } = fixture;

            const publicSaleEndsAt1 = (await estateForger.getRequest(1)).publicSaleEndsAt;

            expect(await estateForger.allocationOfAt(1, depositor1.address, publicSaleEndsAt1 - 1)).to.be.equal(0);
            expect(await estateForger.allocationOfAt(1, depositor1.address, publicSaleEndsAt1)).to.be.equal(0);
            expect(await estateForger.allocationOfAt(1, depositor1.address, publicSaleEndsAt1 + 1)).to.be.equal(0);

            expect(await estateForger.allocationOfAt(1, depositor2.address, publicSaleEndsAt1 - 1)).to.be.equal(0);
            expect(await estateForger.allocationOfAt(1, depositor2.address, publicSaleEndsAt1)).to.be.equal(0);
            expect(await estateForger.allocationOfAt(1, depositor2.address, publicSaleEndsAt1 + 1)).to.be.equal(0);

            const publicSaleEndsAt2 = (await estateForger.getRequest(2)).publicSaleEndsAt;

            expect(await estateForger.allocationOfAt(2, depositor1.address, publicSaleEndsAt2 - 1)).to.be.equal(0);
            expect(await estateForger.allocationOfAt(2, depositor1.address, publicSaleEndsAt2)).to.be.equal(0);
            expect(await estateForger.allocationOfAt(2, depositor1.address, publicSaleEndsAt2 + 1)).to.be.equal(0);

            expect(await estateForger.allocationOfAt(2, depositor2.address, publicSaleEndsAt2 - 1)).to.be.equal(0);
            expect(await estateForger.allocationOfAt(2, depositor2.address, publicSaleEndsAt2)).to.be.equal(0);
            expect(await estateForger.allocationOfAt(2, depositor2.address, publicSaleEndsAt2 + 1)).to.be.equal(0);
        });

        it('4.21.3. revert with non-existing estate id', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
                confirmRequests: true,
            });
            const { estateForger, depositor1 } = fixture;

            await expect(estateForger.allocationOfAt(0, depositor1.address, 0))
                .to.be.revertedWithCustomError(estateForger, "InvalidRequestId");
            await expect(estateForger.allocationOfAt(3, depositor1.address, 0))
                .to.be.revertedWithCustomError(estateForger, "InvalidRequestId");
            await expect(estateForger.allocationOfAt(100, depositor1.address, 0))
                .to.be.revertedWithCustomError(estateForger, "InvalidRequestId");
        });
    });

    describe('4.22. supportsInterface(bytes4)', () => {
        it('4.22.1. return true for appropriate interface', async () => {
            const fixture = await beforeEstateForgerTest();
            const { estateForger } = fixture;

            const ICommon = ICommon__factory.createInterface();
            const IERC1155ReceiverUpgradeable = IERC1155ReceiverUpgradeable__factory.createInterface();
            const IEstateTokenReceiver = IEstateTokenReceiver__factory.createInterface();
            const IEstateTokenizer = IEstateTokenizer__factory.createInterface();

            const IEstateTokenReceiverInterfaceId = getInterfaceID(IEstateTokenReceiver, [IERC1155ReceiverUpgradeable])
            const IEstateTokenizerInterfaceId = getInterfaceID(IEstateTokenizer, [ICommon, IEstateTokenReceiver])

            expect(await estateForger.supportsInterface(getBytes4Hex(IEstateTokenReceiverInterfaceId))).to.equal(true);
            expect(await estateForger.supportsInterface(getBytes4Hex(IEstateTokenizerInterfaceId))).to.equal(true);
        });
    });
});
