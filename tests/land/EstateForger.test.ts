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
} from '@typechain-types';
import { callTransaction, getSignatures, prepareERC20, prepareNativeToken, randomWallet, resetERC20, resetNativeToken, testReentrancy } from '@utils/blockchain';
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
} from '@utils/callWithSignatures/admin';
import {
    callEstateToken_UpdateCommissionToken,
    callEstateToken_Pause,
    callEstateToken_AuthorizeTokenizers,
} from '@utils/callWithSignatures/estateToken';
import { BigNumber, BigNumberish, Contract } from 'ethers';
import { randomInt } from 'crypto';
import { getBytes4Hex, getInterfaceID, randomBigNumber, scale } from '@utils/utils';
import { OrderedMap } from '@utils/utils';
import { deployEstateForger } from '@utils/deployments/land/estateForger';
import { addCurrencyToEstateForger } from '@utils/callWithSignatures/common';
import { callEstateForger_Pause, callEstateForger_UpdateBaseUnitPriceRange, callEstateForger_UpdateFeeRate, callEstateForger_Whitelist } from '@utils/callWithSignatures/estateForger';
import { deployMockPriceFeed } from '@utils/deployments/mocks/mockPriceFeed';
import { deployFailReceiver } from '@utils/deployments/mocks/failReceiver';
import { deployReentrancy } from '@utils/deployments/mocks/mockReentrancy/reentrancy';
import { deployEstateToken } from '@utils/deployments/land/estateToken';
import { deployMockEstateForger } from '@utils/deployments/mocks/mockEstateForger';
import { deployReentrancyERC1155Holder } from '@utils/deployments/mocks/mockReentrancy/reentrancyERC1155Holder';
import { request } from 'http';
import { Initialization as LandInitialization } from '@tests/land/test.initialization';

chai.use(smock.matchers);

interface EstateForgerFixture {
    admin: Admin;
    feeReceiver: FeeReceiver;
    currency: Currency;
    estateToken: MockContract<EstateToken>;
    commissionToken: MockContract<CommissionToken>;
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

    zone1: any, zone2: any;

    sampleRequests: any[];
    baseTimestamp: number;
    mockCurrencyExclusiveRate: BigNumber;
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
        const currency = await SmockCurrencyFactory.deploy();
        await callTransaction(currency.initialize('MockCurrency', 'MCK'));

        const mockCurrencyExclusiveRate = ethers.utils.parseEther('0.3');
        await callTransaction(currency.setExclusiveDiscount(mockCurrencyExclusiveRate, Constant.COMMON_RATE_DECIMALS));

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

        const estateForger = await deployMockEstateForger(
            deployer,
            admin.address,
            estateToken.address,
            commissionToken.address,
            feeReceiver.address,
            LandInitialization.ESTATE_FORGER_FeeRate,
            LandInitialization.ESTATE_FORGER_BaseMinUnitPrice,
            LandInitialization.ESTATE_FORGER_BaseMaxUnitPrice
        ) as MockEstateForger;

        const zone1 = ethers.utils.formatBytes32String("TestZone1");
        const zone2 = ethers.utils.formatBytes32String("TestZone2");

        return {
            admin,
            feeReceiver,
            currency,
            estateToken,
            commissionToken,
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
            sampleRequests: [],
            baseTimestamp: 0,
            mockCurrencyExclusiveRate,
        };
    };

    async function beforeEstateForgerTest({
        listSampleCurrencies = false,
        fundERC20ForDepositors = false,
        addZoneForExecutive = false,
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
            currency,
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

            await addCurrencyToEstateForger(
                admin,
                estateForger,
                admins,
                [ethers.constants.AddressZero],
                [true],
                [false],
                [nativePriceFeed.address],
                [3600],
                [10000_000],
                [3],
            );
            
            await addCurrencyToEstateForger(
                admin,
                estateForger,
                admins,
                [currency.address],
                [true],
                [true],
                [currencyPriceFeed.address],
                [24 * 3600],
                [50_000],
                [3],
            );
        }

        if (fundERC20ForDepositors) {
            await prepareERC20(currency, [depositor1, depositor2, depositor3], [estateForger], ethers.utils.parseEther('1000000000'));
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
        let sampleRequests: any[] = [];

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
                zone1,
                'TestingURI1',
                70,
                10,
                30,
                ethers.utils.parseEther('0.2'),
                ethers.constants.AddressZero,                
                3,
                baseTimestamp + 1e9,
                1000,
                2000,
            ));

            await callTransaction(estateForger.connect(manager).requestTokenizationWithDuration(                
                seller2.address,
                zone2,
                'TestingURI2',
                1000,
                200,
                1000,
                ethers.utils.parseEther('100'),
                currency.address,
                0,
                baseTimestamp + 1e9,
                2000,
                4000
            ));
        }

        if (addDepositions) {
            let timestamp = Math.max(
                (await estateForger.getRequest(1)).privateSaleEndsAt,
                (await estateForger.getRequest(2)).privateSaleEndsAt,
            )
            await time.setNextBlockTimestamp(timestamp);

            await callTransaction(estateForger.connect(depositor1).deposit(1, 2, { value: ethers.utils.parseEther('10') }));
            await callTransaction(estateForger.connect(depositor2).deposit(1, 3, { value: ethers.utils.parseEther('10') }));
            await callTransaction(estateForger.connect(depositor3).deposit(1, 5, { value: ethers.utils.parseEther('10') }));

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

        return {
            ...fixture,
            baseTimestamp,
        }
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

            // TODO: test ERC1155Holder
        });

        it('4.1.2. revert with invalid fee rate', async () => {
            const { admin, feeReceiver, estateToken, commissionToken } = await beforeEstateForgerTest({});
            const EstateForger = await ethers.getContractFactory("EstateForger");

            await expect(upgrades.deployProxy(EstateForger, [
                admin.address,
                estateToken.address,
                commissionToken.address,
                feeReceiver.address,
                Constant.COMMON_RATE_MAX_FRACTION.add(1),
                LandInitialization.ESTATE_FORGER_BaseMinUnitPrice,
                LandInitialization.ESTATE_FORGER_BaseMaxUnitPrice
            ])).to.be.reverted;
        });
    });

    describe('4.2. pause(bytes[])', async () => {
        it('4.2.1. pause successfully with valid signatures', async () => {
            const { deployer, admin, admins, estateForger } = await beforeEstateForgerTest({});
            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string"],
                [estateForger.address, "pause"]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await estateForger.pause(signatures);
            await tx.wait();

            expect(await estateForger.paused()).to.equal(true);

            await expect(tx).to
                .emit(estateForger, 'Paused')
                .withArgs(deployer.address);
        });

        it('4.2.2. pause unsuccessfully with invalid signatures', async () => {
            const { admin, admins, estateForger } = await beforeEstateForgerTest({});
            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string"],
                [estateForger.address, "pause"]
            );
            let invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(estateForger.pause(invalidSignatures)).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('4.2.3. pause unsuccessfully when already paused', async () => {
            const { admin, admins, estateForger } = await beforeEstateForgerTest({});
            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string"],
                [estateForger.address, "pause"]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            await callTransaction(estateForger.pause(signatures));

            signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(estateForger.pause(signatures)).to.be.revertedWith('Pausable: paused');
        });
    });

    describe('4.3. unpause(bytes[])', async () => {
        it('4.3.1. unpause successfully with valid signatures', async () => {
            const { deployer, admin, admins, estateForger } = await beforeEstateForgerTest({
                pause: true,
            });
            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string"],
                [estateForger.address, "unpause"]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await estateForger.unpause(signatures);
            await tx.wait();

            await expect(tx).to
                .emit(estateForger, 'Unpaused')
                .withArgs(deployer.address);
        });

        it('4.3.2. unpause unsuccessfully with invalid signatures', async () => {
            const { admin, admins, estateForger } = await beforeEstateForgerTest({
                pause: true,
            });
            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string"],
                [estateForger.address, "unpause"]
            );
            const invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(estateForger.unpause(invalidSignatures)).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('4.3.3. unpause unsuccessfully when not paused', async () => {
            const { admin, admins, estateForger } = await beforeEstateForgerTest({
                pause: true,
            });
            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string"],
                [estateForger.address, "unpause"]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            await callTransaction(estateForger.unpause(signatures));

            signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(estateForger.unpause(signatures)).to.be.revertedWith('Pausable: not paused');
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

    describe('4.6. updatePriceFeeds(uint256, uint256, bytes[])', async () => {
        it('4.6.1. updatePriceFeeds successfully with valid signatures', async () => {
            const { admin, admins, estateForger, currency } = await beforeEstateForgerTest();
            
            const currencyAddresses = [];
            const priceFeeds = [];
            for (let i = 0; i < 5; ++i) {
                currencyAddresses.push(ethers.utils.computeAddress(ethers.utils.id(`currency_${i}`)));
                priceFeeds.push(ethers.utils.computeAddress(ethers.utils.id(`priceFeed_${i}`)));
            }
            const heartbeats = [40, 50, 60, 70, 80];

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'address[]', 'uint40[]'],
                [estateForger.address, 'updatePriceFeeds', currencyAddresses, priceFeeds, heartbeats]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await estateForger.updatePriceFeeds(
                currencyAddresses,
                priceFeeds,
                heartbeats,
                signatures
            );
            await tx.wait();

            for (let i = 0; i < currencyAddresses.length; ++i) {
                await expect(tx).to
                    .emit(estateForger, 'PriceFeedUpdate')
                    .withArgs(currencyAddresses[i], priceFeeds[i], heartbeats[i]);
                    
                const priceFeed = await estateForger.getPriceFeed(currencyAddresses[i]);
                expect(priceFeed.feed).to.equal(priceFeeds[i]);
                expect(priceFeed.heartbeat).to.equal(heartbeats[i]);
            }
        });

        it('4.6.2. updatePriceFeeds unsuccessfully with invalid signatures', async () => {
            const { admin, admins, estateForger } = await beforeEstateForgerTest({});
            const currencyAddresses = [];
            const priceFeeds = [];
            for (let i = 0; i < 5; ++i) {
                currencyAddresses.push(ethers.utils.computeAddress(ethers.utils.id(`currency_${i}`)));
                priceFeeds.push(ethers.utils.computeAddress(ethers.utils.id(`priceFeed_${i}`)));
            }
            const heartbeats = [40, 50, 60, 70, 80];

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'address[]', 'uint40[]'],
                [estateForger.address, 'updatePriceFeeds', currencyAddresses, priceFeeds, heartbeats]
            );
            const invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(estateForger.updatePriceFeeds(
                currencyAddresses,
                priceFeeds,
                heartbeats,
                invalidSignatures
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('4.6.3. updatePriceFeeds unsuccessfully with invalid heartbeat', async () => {
            const { admin, admins, estateForger } = await beforeEstateForgerTest({});
            const currencyAddresses = [];
            const priceFeeds = [];
            for (let i = 0; i < 5; ++i) {
                currencyAddresses.push(ethers.utils.computeAddress(ethers.utils.id(`currency_${i}`)));
                priceFeeds.push(ethers.utils.computeAddress(ethers.utils.id(`priceFeed_${i}`)));
            }
            const heartbeats = [40, 50, 0, 70, 80];

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'address[]', 'uint40[]'],
                [estateForger.address, 'updatePriceFeeds', currencyAddresses, priceFeeds, heartbeats]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(estateForger.updatePriceFeeds(
                currencyAddresses,
                priceFeeds,
                heartbeats,
                signatures
            )).to.be.revertedWithCustomError(estateForger, 'InvalidInput');
        });

        it('4.6.4. updatePriceFeeds unsuccessfully with conflicting params length', async () => {
            const { admin, admins, estateForger } = await beforeEstateForgerTest({});

            async function testForInvalidInput(currencyAddresses: string[], priceFeeds: string[], heartbeats: number[]) {
                const message = ethers.utils.defaultAbiCoder.encode(
                    ['address', 'string', 'address[]', 'address[]', 'uint40[]'],
                    [estateForger.address, 'updatePriceFeeds', currencyAddresses, priceFeeds, heartbeats]
                );
                const signatures = await getSignatures(message, admins, await admin.nonce());
    
                await expect(estateForger.updatePriceFeeds(
                    currencyAddresses,
                    priceFeeds,
                    heartbeats,
                    signatures
                )).to.be.revertedWithCustomError(estateForger, 'InvalidInput');
            }

            const currencyAddresses = [];
            const priceFeeds = [];
            for (let i = 0; i < 5; ++i) {
                currencyAddresses.push(ethers.utils.computeAddress(ethers.utils.id(`currency_${i}`)));
                priceFeeds.push(ethers.utils.computeAddress(ethers.utils.id(`priceFeed_${i}`)));
            }
            const heartbeats = [40, 50, 60, 70, 80];

            await testForInvalidInput(currencyAddresses.slice(0, 4), priceFeeds, heartbeats);
            await testForInvalidInput(currencyAddresses, priceFeeds.slice(0, 4), heartbeats);
            await testForInvalidInput(currencyAddresses, priceFeeds, heartbeats.slice(0, 4));
        });
    });

    describe('4.7. updateDefaultRates(address[], uint256[], uint8[], bytes[])', async () => {
        it('4.7.1. updateDefaultRates successfully with valid signatures', async () => {
            const { admin, admins, estateForger, currency } = await beforeEstateForgerTest();
            
            const currencyAddresses = [];
            for (let i = 0; i < 5; ++i) {
                currencyAddresses.push(ethers.utils.computeAddress(ethers.utils.id(`currency_${i}`)));
            }
            const values = [10, 20_0, 30_00, 40_000, 50_0000];
            const decimals = [0, 1, 2, 3, 4];

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'uint256[]', 'uint8[]'],
                [estateForger.address, 'updateDefaultRates', currencyAddresses, values, decimals]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await estateForger.updateDefaultRates(
                currencyAddresses,
                values,
                decimals,
                signatures
            );
            await tx.wait();

            for (let i = 0; i < currencyAddresses.length; ++i) {
                await expect(tx).to
                    .emit(estateForger, 'DefaultRateUpdate')
                    .withArgs(currencyAddresses[i], values[i], decimals[i]);
                    
                const defaultRate = await estateForger.getDefaultRate(currencyAddresses[i]);
                expect(defaultRate.value).to.equal(values[i]);
                expect(defaultRate.decimals).to.equal(decimals[i]);
            }
        });

        it('4.7.2. updateDefaultRates unsuccessfully with invalid signatures', async () => {
            const { admin, admins, estateForger } = await beforeEstateForgerTest({});
            const currencyAddresses = [];
            for (let i = 0; i < 5; ++i) {
                currencyAddresses.push(ethers.utils.computeAddress(ethers.utils.id(`currency_${i}`)));
            }
            const values = [10, 20_0, 30_00, 40_000, 50_0000];
            const decimals = [0, 1, 2, 3, 4];

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'uint256[]', 'uint8[]'],
                [estateForger.address, 'updateDefaultRates', currencyAddresses, values, decimals]
            );
            const invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(estateForger.updateDefaultRates(
                currencyAddresses,
                values,
                decimals,
                invalidSignatures
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('4.7.3. updateDefaultRates unsuccessfully with invalid decimals', async () => {
            const { admin, admins, estateForger } = await beforeEstateForgerTest({});
            const currencyAddresses = [];
            for (let i = 0; i < 5; ++i) {
                currencyAddresses.push(ethers.utils.computeAddress(ethers.utils.id(`currency_${i}`)));
            }
            const values = [10, 20_0, 30_00, 40_000, 50_0000];
            const decimals = [0, 1, 19, 3, 4];

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'uint256[]', 'uint8[]'],
                [estateForger.address, 'updateDefaultRates', currencyAddresses, values, decimals]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(estateForger.updateDefaultRates(
                currencyAddresses,
                values,
                decimals,
                signatures
            )).to.be.revertedWithCustomError(estateForger, 'InvalidInput');
        });

        it('4.7.4. updateDefaultRates unsuccessfully with conflicting params length', async () => {
            const { admin, admins, estateForger } = await beforeEstateForgerTest({});

            async function testForInvalidInput(currencyAddresses: string[], values: number[], decimals: number[]) {
                const message = ethers.utils.defaultAbiCoder.encode(
                    ['address', 'string', 'address[]', 'uint256[]', 'uint8[]'],
                    [estateForger.address, 'updateDefaultRates', currencyAddresses, values, decimals]
                );
                const signatures = await getSignatures(message, admins, await admin.nonce());
    
                await expect(estateForger.updateDefaultRates(
                    currencyAddresses,
                    values,
                    decimals,
                    signatures
                )).to.be.revertedWithCustomError(estateForger, 'InvalidInput');
            }

            const currencyAddresses = [];
            for (let i = 0; i < 5; ++i) {
                currencyAddresses.push(ethers.utils.computeAddress(ethers.utils.id(`currency_${i}`)));
            }
            const values = [10, 20_0, 30_00, 40_000, 50_0000];
            const decimals = [0, 1, 2, 3, 4];

            await testForInvalidInput(currencyAddresses.slice(0, 4), values, decimals);
            await testForInvalidInput(currencyAddresses, values.slice(0, 4), decimals);
            await testForInvalidInput(currencyAddresses, values, decimals.slice(0, 4));
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

    describe('4.10. requestTokenizationWithDuration(address, bytes32, string, uint256, uint256, uint256, uint256, address, uint8, uint40, uint40, uint40)', async () => {
        interface RequestTokenizationWithDurationData {
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
            privateSaleDuration: number;
            publicSaleDuration: number;
        }
        
        async function beforeRequestTokenizationTest(
            seller1: any,
            zone1: string,
            currency: any,
            baseTimestamp: number
        ): Promise<{data: RequestTokenizationWithDurationData}> {
            const defaultParams: RequestTokenizationWithDurationData = {
                seller: seller1.address,
                zone: zone1,
                uri: 'TestingURI',
                totalSupply: 70,
                minSellingAmount: 10,
                maxSellingAmount: 30,
                unitPrice: ethers.utils.parseEther('100'),
                currencyAddress: currency.address,
                decimals: 3,
                expireAt: baseTimestamp + 1e9,
                privateSaleDuration: 1000,
                publicSaleDuration: 2000,
            }

            return { data: defaultParams };
        }

        async function expectRevertWithCustomError(estateForger: EstateForger, manager: any, data: RequestTokenizationWithDurationData, error: string) {
            await expect(estateForger.connect(manager).requestTokenizationWithDuration(
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
                data.privateSaleDuration,
                data.publicSaleDuration,
            )).to.be.revertedWithCustomError(estateForger, error);
        }

        it('4.10.1. requestTokenizationWithDuration successfully with currency having price feed', async () => {
            const { seller1, manager, zone1, currency, baseTimestamp, estateForger, currencyPriceFeed } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
            });

            const { data } = await beforeRequestTokenizationTest(
                seller1,
                zone1,
                currency,
                baseTimestamp
            );
    
            let currentTimestamp = await time.latest() + 1000;
            await time.setNextBlockTimestamp(currentTimestamp);

            const tx = await estateForger.connect(manager).requestTokenizationWithDuration(
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
                data.privateSaleDuration,
                data.publicSaleDuration,
            );
            await tx.wait();

            const priceRate = await currencyPriceFeed.getRoundData(1);

            await expect(tx).to
                .emit(estateForger, 'NewRequest')
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
                    currentTimestamp + data.privateSaleDuration,
                    currentTimestamp + data.privateSaleDuration + data.publicSaleDuration,
                )

            await expect(tx).to
                .emit(estateForger, 'UnitPriceValidation')
                .withArgs(
                    data.unitPrice,
                    data.currencyAddress,
                    priceRate.answer,
                    await currencyPriceFeed.decimals(),
                );

            const tokenizationRequestNumber = await estateForger.requestNumber();
            expect(tokenizationRequestNumber).to.equal(1);

            const tokenizationRequest = await estateForger.getRequest(tokenizationRequestNumber);
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
            expect(tokenizationRequest.privateSaleEndsAt).to.equal(currentTimestamp + data.privateSaleDuration);
            expect(tokenizationRequest.publicSaleEndsAt).to.equal(currentTimestamp + data.privateSaleDuration + data.publicSaleDuration);
            expect(tokenizationRequest.seller).to.equal(data.seller);
        });

        it('4.10.2. requestTokenizationWithDuration successfully with currency having default price', async () => {
            const { admin, deployer, admins, seller1, manager, zone1, currency, baseTimestamp, estateForger } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
            });

            const newCurrency = await deployCurrency(
                deployer,
                "NewCurrency",
                "NC",
            );

            await addCurrencyToEstateForger(
                admin,
                estateForger,
                admins,
                [newCurrency.address],
                [true],
                [false],
                [ethers.constants.AddressZero],
                [3600],
                [2_0000],
                [4]
            );

            const { data } = await beforeRequestTokenizationTest(
                seller1,
                zone1,
                currency,
                baseTimestamp
            );
    
            let currentTimestamp = await time.latest() + 1000;
            await time.setNextBlockTimestamp(currentTimestamp);

            const tx = await estateForger.connect(manager).requestTokenizationWithDuration(
                data.seller,
                data.zone,
                data.uri,
                data.totalSupply,
                data.minSellingAmount,
                data.maxSellingAmount,
                data.unitPrice,
                newCurrency.address,
                data.decimals,
                data.expireAt,
                data.privateSaleDuration,
                data.publicSaleDuration,
            );
            await tx.wait();

            await expect(tx).to
                .emit(estateForger, 'NewRequest')
                .withArgs(
                    1,
                    data.seller,
                    data.zone,
                    data.uri,
                    data.totalSupply,
                    data.minSellingAmount,
                    data.maxSellingAmount,
                    data.unitPrice,
                    newCurrency.address,
                    data.decimals,
                    data.expireAt,
                    currentTimestamp + data.privateSaleDuration,
                    currentTimestamp + data.privateSaleDuration + data.publicSaleDuration,
                );

            await expect(tx).to
                .emit(estateForger, 'UnitPriceValidation')
                .withArgs(
                    data.unitPrice,
                    newCurrency.address,
                    2_0000,
                    4,
                );

            const tokenizationRequestNumber = await estateForger.requestNumber();
            expect(tokenizationRequestNumber).to.equal(1);

            const tokenizationRequest = await estateForger.getRequest(tokenizationRequestNumber);
            expect(tokenizationRequest.estateId).to.equal(0);
            expect(tokenizationRequest.zone).to.equal(data.zone);
            expect(tokenizationRequest.uri).to.equal(data.uri);
            expect(tokenizationRequest.totalSupply).to.equal(data.totalSupply);
            expect(tokenizationRequest.minSellingAmount).to.equal(data.minSellingAmount);
            expect(tokenizationRequest.maxSellingAmount).to.equal(data.maxSellingAmount);
            expect(tokenizationRequest.soldAmount).to.equal(0);
            expect(tokenizationRequest.unitPrice).to.equal(data.unitPrice);
            expect(tokenizationRequest.currency).to.equal(newCurrency.address);
            expect(tokenizationRequest.decimals).to.equal(data.decimals);
            expect(tokenizationRequest.expireAt).to.equal(data.expireAt);
            expect(tokenizationRequest.privateSaleEndsAt).to.equal(currentTimestamp + data.privateSaleDuration);
            expect(tokenizationRequest.publicSaleEndsAt).to.equal(currentTimestamp + data.privateSaleDuration + data.publicSaleDuration);
            expect(tokenizationRequest.seller).to.equal(data.seller);
        });

        it('4.10.3. requestTokenizationWithDuration unsuccessfully by non-executive', async () => {
            const { seller1, user, zone1, currency, baseTimestamp, estateForger, currencyPriceFeed } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
            });
            const { data } = await beforeRequestTokenizationTest(
                seller1,
                zone1,
                currency,
                baseTimestamp
            );

            await expectRevertWithCustomError(estateForger, user, data, 'Unauthorized');
        });

        it('4.10.4. requestTokenizationWithDuration unsuccessfully with inactive zone', async () => {
            const { admin, admins, seller1, moderator, manager, zone1, currency, baseTimestamp, estateForger } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
            });

            await callAdmin_DeclareZones(
                admin,
                admins,
                [zone1],
                false,
                await admin.nonce()
            );
            const { data } = await beforeRequestTokenizationTest(
                seller1,
                zone1,
                currency,
                baseTimestamp
            );

            await expectRevertWithCustomError(estateForger, moderator, data, 'Unauthorized');
            await expectRevertWithCustomError(estateForger, manager, data, 'Unauthorized');
        });

        it('4.10.5. requestTokenizationWithDuration unsuccessfully by inactive executive in zone', async () => {
            const { admin, admins, seller1, moderator, manager, zone1, currency, baseTimestamp, estateForger } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
            });

            await callAdmin_ActivateIn(
                admin,
                admins,
                zone1,
                [manager.address],
                false,
                await admin.nonce(),
            )
            const { data } = await beforeRequestTokenizationTest(
                seller1,
                zone1,
                currency,
                baseTimestamp
            );

            await expectRevertWithCustomError(estateForger, moderator, data, 'Unauthorized');
            await expectRevertWithCustomError(estateForger, manager, data, 'Unauthorized');
        });

        it('4.10.6. requestTokenizationWithDuration unsuccessfully with invalid private sale duration', async () => {
            const { seller1, manager, zone1, currency, baseTimestamp, estateForger, currencyPriceFeed } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
            });
            const { data } = await beforeRequestTokenizationTest(
                seller1,
                zone1,
                currency,
                baseTimestamp
            );

            await expectRevertWithCustomError(estateForger, manager, {
                ...data,
                privateSaleDuration: 0,
            }, 'InvalidInput');
        });

        it('4.10.7. requestTokenizationWithDuration unsuccessfully with invalid public sale duration', async () => {
            const { seller1, manager, zone1, currency, baseTimestamp, estateForger, currencyPriceFeed } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
            });
            const { data } = await beforeRequestTokenizationTest(
                seller1,
                zone1,
                currency,
                baseTimestamp
            );

            await expectRevertWithCustomError(estateForger, manager, {
                ...data,
                publicSaleDuration: 0,
            }, 'InvalidInput');
        });

        it('4.10.8. requestTokenizationWithDuration unsuccessfully with unavailable currency', async () => {
            const { admin, admins, seller1, manager, zone1, currency, baseTimestamp, estateForger } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
            });
            const { data } = await beforeRequestTokenizationTest(
                seller1,
                zone1,
                currency,
                baseTimestamp
            );

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

        it('4.10.9. requestTokenizationWithDuration unsuccessfully with missing currency rate', async () => {
            const { admin, admins, seller1, manager, zone1, currency, baseTimestamp, estateForger } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
            });
            const { data } = await beforeRequestTokenizationTest(
                seller1,
                zone1,
                currency,
                baseTimestamp
            );

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
        
        it('4.10.10. requestTokenizationWithDuration unsuccessfully with stale price feed', async () => {
            const { seller1, manager, zone1, currency, baseTimestamp, estateForger } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
            });
            const { data } = await beforeRequestTokenizationTest(
                seller1,
                zone1,
                currency,
                baseTimestamp
            );

            const heartbeat = (await estateForger.getPriceFeed(currency.address)).heartbeat;
            await time.setNextBlockTimestamp(baseTimestamp + heartbeat + 1);

            await expectRevertWithCustomError(estateForger, manager, data, 'StalePriceFeed');
        });

        it('4.10.11. requestTokenizationWithDuration unsuccessfully with invalid unit price', async () => {
            const { seller1, manager, zone1, currency, baseTimestamp, estateForger } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
            });
            const { data } = await beforeRequestTokenizationTest(
                seller1,
                zone1,
                currency,
                baseTimestamp
            );

            await expectRevertWithCustomError(estateForger, manager, {
                ...data,
                unitPrice: ethers.utils.parseEther('19'),
            }, 'InvalidUnitPrice');

            await expectRevertWithCustomError(estateForger, manager, {
                ...data,
                unitPrice: ethers.utils.parseEther('201'),
            }, 'InvalidUnitPrice');
        });

        it('4.10.12. requestTokenizationWithDuration unsuccessfully with zero address requester', async () => {
            const { seller1, manager, zone1, currency, baseTimestamp, estateForger } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
            });
            const { data } = await beforeRequestTokenizationTest(
                seller1,
                zone1,
                currency,
                baseTimestamp
            );
            await expectRevertWithCustomError(estateForger, manager, {
                ...data,
                seller: ethers.constants.AddressZero,
            }, 'InvalidInput');
        });

        it('4.10.13. requestTokenizationWithDuration unsuccessfully with inactive seller in zone', async () => {
            const { seller1, manager, zone1, currency, baseTimestamp, estateForger } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
            });
            const { data } = await beforeRequestTokenizationTest(
                seller1,
                zone1,
                currency,
                baseTimestamp
            );
            await expectRevertWithCustomError(estateForger, manager, data, 'InvalidInput');
        });

        it('4.10.14. requestTokenizationWithDuration unsuccessfully when minimum selling amount exceeds maximum', async () => {
            const { seller1, manager, zone1, currency, baseTimestamp, estateForger } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
            });
            const { data } = await beforeRequestTokenizationTest(
                seller1,
                zone1,
                currency,
                baseTimestamp
            );
            await expectRevertWithCustomError(estateForger, manager, {
                ...data,
                minSellingAmount: Number(data.maxSellingAmount) + 1,
            }, 'InvalidInput');
        });

        it('4.10.15. requestTokenizationWithDuration unsuccessfully when maximum selling amount exceeds total supply', async () => {
            const { seller1, manager, zone1, currency, baseTimestamp, estateForger } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
            });
            const { data } = await beforeRequestTokenizationTest(
                seller1,
                zone1,
                currency,
                baseTimestamp
            );
            await expectRevertWithCustomError(estateForger, manager, {
                ...data,
                maxSellingAmount: Number(data.totalSupply) + 1,
            }, 'InvalidInput');
        });

        it('4.10.16. requestTokenizationWithDuration unsuccessfully when estate token supply overflows uint256', async () => {
            const { seller1, manager, zone1, currency, baseTimestamp, estateForger } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
            });
            const { data } = await beforeRequestTokenizationTest(
                seller1,
                zone1,
                currency,
                baseTimestamp
            );
            await expectRevertWithCustomError(estateForger, manager, {
                ...data,
                decimals: 18,
                totalSupply: ethers.BigNumber.from(2).pow(256).sub(1),
            }, 'InvalidInput');
        });

        it('4.10.17. requestTokenizationWithDuration unsuccessfully with invalid decimals', async () => {
            const { seller1, manager, zone1, currency, baseTimestamp, estateForger } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
            });
            const { data } = await beforeRequestTokenizationTest(
                seller1,
                zone1,
                currency,
                baseTimestamp
            );
            await expectRevertWithCustomError(estateForger, manager, {
                ...data,
                decimals: 19,
            }, 'InvalidInput');
        });

        it('4.10.18. requestTokenizationWithDuration unsuccessfully with expired estate', async () => {
            const { seller1, manager, zone1, currency, baseTimestamp, estateForger } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
            });
            const { data } = await beforeRequestTokenizationTest(
                seller1,
                zone1,
                currency,
                baseTimestamp
            );
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
    });

    describe('4.11. requestTokenizationWithTimestamp(address, bytes32, string, uint256, uint256, uint256, uint256, address, uint8, uint40, uint40, uint40)', async () => {
        interface RequestTokenizationWithTimestampData {
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
        
        async function beforeRequestTokenizationTest(
            seller1: any,
            zone1: string,
            currency: any,
            baseTimestamp: number
        ): Promise<{data: RequestTokenizationWithTimestampData}> {
            const defaultParams: RequestTokenizationWithTimestampData = {
                seller: seller1.address,
                zone: zone1,
                uri: 'TestingURI',
                totalSupply: 70,
                minSellingAmount: 10,
                maxSellingAmount: 30,
                unitPrice: ethers.utils.parseEther('100'),
                currencyAddress: currency.address,
                decimals: 3,
                expireAt: baseTimestamp + 1e9,
                privateSaleEndsAt: baseTimestamp + 1e6,
                publicSaleEndsAt: baseTimestamp + 3e6,
            }

            return { data: defaultParams };
        }

        async function expectRevertWithCustomError(estateForger: EstateForger, manager: any, data: RequestTokenizationWithTimestampData, error: string) {
            await expect(estateForger.connect(manager).requestTokenizationWithTimestamp(
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

        it('4.11.1. requestTokenizationWithTimestamp successfully with currency having price feed', async () => {
            const { seller1, manager, zone1, currency, baseTimestamp, estateForger, currencyPriceFeed } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
            });

            const { data } = await beforeRequestTokenizationTest(
                seller1,
                zone1,
                currency,
                baseTimestamp
            );
    
            let currentTimestamp = await time.latest() + 1000;
            await time.setNextBlockTimestamp(currentTimestamp);

            const tx = await estateForger.connect(manager).requestTokenizationWithTimestamp(
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

            const priceRate = await currencyPriceFeed.getRoundData(1);

            await expect(tx).to
                .emit(estateForger, 'NewRequest')
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

            await expect(tx).to
                .emit(estateForger, 'UnitPriceValidation')
                .withArgs(
                    data.unitPrice,
                    data.currencyAddress,
                    priceRate.answer,
                    await currencyPriceFeed.decimals(),
                );

            const tokenizationRequestNumber = await estateForger.requestNumber();
            expect(tokenizationRequestNumber).to.equal(1);

            const tokenizationRequest = await estateForger.getRequest(tokenizationRequestNumber);
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

        it('4.11.2. requestTokenizationWithTimestamp successfully with currency having default price', async () => {
            const { admin, deployer, admins, seller1, manager, zone1, currency, baseTimestamp, estateForger } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
            });

            const newCurrency = await deployCurrency(
                deployer,
                "NewCurrency",
                "NC",
            );

            await addCurrencyToEstateForger(
                admin,
                estateForger,
                admins,
                [newCurrency.address],
                [true],
                [false],
                [ethers.constants.AddressZero],
                [3600],
                [2_0000],
                [4]
            );

            const { data } = await beforeRequestTokenizationTest(
                seller1,
                zone1,
                currency,
                baseTimestamp
            );
    
            let currentTimestamp = await time.latest() + 1000;
            await time.setNextBlockTimestamp(currentTimestamp);

            const tx = await estateForger.connect(manager).requestTokenizationWithTimestamp(
                data.seller,
                data.zone,
                data.uri,
                data.totalSupply,
                data.minSellingAmount,
                data.maxSellingAmount,
                data.unitPrice,
                newCurrency.address,
                data.decimals,
                data.expireAt,
                data.privateSaleEndsAt,
                data.publicSaleEndsAt,
            );
            await tx.wait();

            await expect(tx).to
                .emit(estateForger, 'NewRequest')
                .withArgs(
                    1,
                    data.seller,
                    data.zone,
                    data.uri,
                    data.totalSupply,
                    data.minSellingAmount,
                    data.maxSellingAmount,
                    data.unitPrice,
                    newCurrency.address,
                    data.decimals,
                    data.expireAt,
                    data.privateSaleEndsAt,
                    data.publicSaleEndsAt,
                );

            await expect(tx).to
                .emit(estateForger, 'UnitPriceValidation')
                .withArgs(
                    data.unitPrice,
                    newCurrency.address,
                    2_0000,
                    4,
                );

            const tokenizationRequestNumber = await estateForger.requestNumber();
            expect(tokenizationRequestNumber).to.equal(1);

            const tokenizationRequest = await estateForger.getRequest(tokenizationRequestNumber);
            expect(tokenizationRequest.estateId).to.equal(0);
            expect(tokenizationRequest.zone).to.equal(data.zone);
            expect(tokenizationRequest.uri).to.equal(data.uri);
            expect(tokenizationRequest.totalSupply).to.equal(data.totalSupply);
            expect(tokenizationRequest.minSellingAmount).to.equal(data.minSellingAmount);
            expect(tokenizationRequest.maxSellingAmount).to.equal(data.maxSellingAmount);
            expect(tokenizationRequest.soldAmount).to.equal(0);
            expect(tokenizationRequest.unitPrice).to.equal(data.unitPrice);
            expect(tokenizationRequest.currency).to.equal(newCurrency.address);
            expect(tokenizationRequest.decimals).to.equal(data.decimals);
            expect(tokenizationRequest.expireAt).to.equal(data.expireAt);
            expect(tokenizationRequest.privateSaleEndsAt).to.equal(data.privateSaleEndsAt);
            expect(tokenizationRequest.publicSaleEndsAt).to.equal(data.publicSaleEndsAt);
            expect(tokenizationRequest.seller).to.equal(data.seller);
        });

        it('4.11.3. requestTokenizationWithTimestamp unsuccessfully by non-executive', async () => {
            const { seller1, user, zone1, currency, baseTimestamp, estateForger, currencyPriceFeed } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
            });
            const { data } = await beforeRequestTokenizationTest(
                seller1,
                zone1,
                currency,
                baseTimestamp
            );

            await expectRevertWithCustomError(estateForger, user, data, 'Unauthorized');
        });

        it('4.11.4. requestTokenizationWithTimestamp unsuccessfully with inactive zone', async () => {
            const { admin, admins, seller1, moderator, manager, zone1, currency, baseTimestamp, estateForger } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
            });
            
            await callAdmin_DeclareZones(
                admin,
                admins,
                [zone1],
                false,
                await admin.nonce(),
            )
            const { data } = await beforeRequestTokenizationTest(
                seller1,
                zone1,
                currency,
                baseTimestamp
            );

            await expectRevertWithCustomError(estateForger, moderator, data, 'Unauthorized');
            await expectRevertWithCustomError(estateForger, manager, data, 'Unauthorized');
        });

        it('4.11.5. requestTokenizationWithTimestamp unsuccessfully by inactive executive in zone', async () => {
            const { admin, admins, seller1, moderator, manager, zone1, currency, baseTimestamp, estateForger } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
            });
            
            await callAdmin_ActivateIn(
                admin,
                admins,
                zone1,
                [moderator.address, manager.address],
                false,
                await admin.nonce(),
            )
            const { data } = await beforeRequestTokenizationTest(
                seller1,
                zone1,
                currency,
                baseTimestamp
            );

            await expectRevertWithCustomError(estateForger, moderator, data, 'Unauthorized');
            await expectRevertWithCustomError(estateForger, manager, data, 'Unauthorized');
        });

        it('4.11.6. requestTokenizationWithTimestamp unsuccessfully with invalid private sale timestamp', async () => {
            const { seller1, manager, zone1, currency, baseTimestamp, estateForger, currencyPriceFeed } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
            });
            const { data } = await beforeRequestTokenizationTest(
                seller1,
                zone1,
                currency,
                baseTimestamp
            );

            let timestamp = baseTimestamp + 1000;
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

        it('4.11.7. requestTokenizationWithTimestamp unsuccessfully with invalid public sale timestamp', async () => {
            const { seller1, manager, zone1, currency, baseTimestamp, estateForger, currencyPriceFeed } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
            });
            const { data } = await beforeRequestTokenizationTest(
                seller1,
                zone1,
                currency,
                baseTimestamp
            );

            let timestamp = baseTimestamp + 1000;
            await time.setNextBlockTimestamp(timestamp);

            await expectRevertWithCustomError(estateForger, manager, {
                ...data,
                privateSaleEndsAt: timestamp + 100,
                publicSaleEndsAt: timestamp + 99,
            }, 'InvalidInput');
            await expectRevertWithCustomError(estateForger, manager, {
                ...data,
                privateSaleEndsAt: timestamp + 100,
                publicSaleEndsAt: timestamp + 100,
            }, 'InvalidInput');
        });

        it('4.11.8. requestTokenizationWithTimestamp unsuccessfully with unavailable currency', async () => {
            const { admin, admins, seller1, manager, zone1, currency, baseTimestamp, estateForger } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
            });
            const { data } = await beforeRequestTokenizationTest(
                seller1,
                zone1,
                currency,
                baseTimestamp
            );

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

        it('4.11.9. requestTokenizationWithTimestamp unsuccessfully with missing currency rate', async () => {
            const { admin, admins, seller1, manager, zone1, currency, baseTimestamp, estateForger } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
            });
            const { data } = await beforeRequestTokenizationTest(
                seller1,
                zone1,
                currency,
                baseTimestamp
            );

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
        
        it('4.11.10. requestTokenizationWithTimestamp unsuccessfully with stale price feed', async () => {
            const { seller1, manager, zone1, currency, baseTimestamp, estateForger } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
            });
            const { data } = await beforeRequestTokenizationTest(
                seller1,
                zone1,
                currency,
                baseTimestamp
            );

            const heartbeat = (await estateForger.getPriceFeed(currency.address)).heartbeat;
            await time.setNextBlockTimestamp(baseTimestamp + heartbeat + 1);

            await expectRevertWithCustomError(estateForger, manager, data, 'StalePriceFeed');
        });

        it('4.11.11. requestTokenizationWithTimestamp unsuccessfully with invalid unit price', async () => {
            const { seller1, manager, zone1, currency, baseTimestamp, estateForger } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
            });
            const { data } = await beforeRequestTokenizationTest(
                seller1,
                zone1,
                currency,
                baseTimestamp
            );

            await expectRevertWithCustomError(estateForger, manager, {
                ...data,
                unitPrice: ethers.utils.parseEther('19'),
            }, 'InvalidUnitPrice');

            await expectRevertWithCustomError(estateForger, manager, {
                ...data,
                unitPrice: ethers.utils.parseEther('201'),
            }, 'InvalidUnitPrice');
        });

        it('4.11.12. requestTokenizationWithTimestamp unsuccessfully with zero address requester', async () => {
            const { seller1, manager, zone1, currency, baseTimestamp, estateForger } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
            });
            const { data } = await beforeRequestTokenizationTest(
                seller1,
                zone1,
                currency,
                baseTimestamp
            );
            await expectRevertWithCustomError(estateForger, manager, {
                ...data,
                seller: ethers.constants.AddressZero,
            }, 'InvalidInput');
        });

        it('4.11.13. requestTokenizationWithTimestamp unsuccessfully with inactive seller', async () => {
            const { seller1, manager, zone1, currency, baseTimestamp, estateForger } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
            });
            const { data } = await beforeRequestTokenizationTest(
                seller1,
                zone1,
                currency,
                baseTimestamp
            );
            await expectRevertWithCustomError(estateForger, manager, data, 'InvalidInput');
        });

        it('4.11.14. requestTokenizationWithTimestamp unsuccessfully when minimum selling amount exceeds maximum', async () => {
            const { seller1, manager, zone1, currency, baseTimestamp, estateForger } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
            });
            const { data } = await beforeRequestTokenizationTest(
                seller1,
                zone1,
                currency,
                baseTimestamp
            );
            await expectRevertWithCustomError(estateForger, manager, {
                ...data,
                minSellingAmount: Number(data.maxSellingAmount) + 1,
            }, 'InvalidInput');
        });

        it('4.11.15. requestTokenizationWithTimestamp unsuccessfully when maximum selling amount exceeds total supply', async () => {
            const { seller1, manager, zone1, currency, baseTimestamp, estateForger } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
            });
            const { data } = await beforeRequestTokenizationTest(
                seller1,
                zone1,
                currency,
                baseTimestamp
            );
            await expectRevertWithCustomError(estateForger, manager, {
                ...data,
                maxSellingAmount: Number(data.totalSupply) + 1,
            }, 'InvalidInput');
        });

        it('4.11.16. requestTokenizationWithTimestamp unsuccessfully when total estate tokensupply exceeds max uint256', async () => {
            const { seller1, manager, zone1, currency, baseTimestamp, estateForger } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
            });
            const { data } = await beforeRequestTokenizationTest(
                seller1,
                zone1,
                currency,
                baseTimestamp
            );
            await expectRevertWithCustomError(estateForger, manager, {
                ...data,
                decimals: 18,
                totalSupply: ethers.BigNumber.from(2).pow(256).sub(1),
            }, 'InvalidInput');
        });

        it('4.11.17. requestTokenizationWithTimestamp unsuccessfully with invalid decimals', async () => {
            const { seller1, manager, zone1, currency, baseTimestamp, estateForger } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
            });
            const { data } = await beforeRequestTokenizationTest(
                seller1,
                zone1,
                currency,
                baseTimestamp
            );
            await expectRevertWithCustomError(estateForger, manager, {
                ...data,
                decimals: 19,
            }, 'InvalidInput');
        });

        it('4.11.18. requestTokenizationWithTimestamp unsuccessfully with expired estate', async () => {
            const { seller1, manager, zone1, currency, baseTimestamp, estateForger } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
            });
            const { data } = await beforeRequestTokenizationTest(
                seller1,
                zone1,
                currency,
                baseTimestamp
            );
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

            await expect(tx).to
                .emit(estateForger, 'UnitPriceValidation')
                .withArgs(
                    data.unitPrice,
                    data.currencyAddress,
                    priceRate.answer,
                    await newCurrencyPriceFeed.decimals(),
                );

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

    describe('4.13. updateRequestURI(uint256, string)', async () => {
        interface UpdateRequestURIData {
            requestId: number;
            uri: string;
        }

        async function beforeUpdateRequestURITest(
            fixture: EstateForgerFixture,
        ): Promise<{data: UpdateRequestURIData}> {
            const defaultParams: UpdateRequestURIData = {
                requestId: 1,
                uri: 'NewTestingURI',
            }
            return { data: defaultParams };
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
            });
            const { manager, estateForger } = fixture;
            const { data } = await beforeUpdateRequestURITest(fixture);
    
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

            const tokenizationRequest = await estateForger.getRequest(1);
            expect(tokenizationRequest.estateId).to.equal(0);
            expect(tokenizationRequest.uri).to.equal(data.uri);
        });

        it('4.13.2. update tokenization request URI unsuccessfully by non-executive', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
            });
            const { manager, estateForger, user } = fixture;
            const { data } = await beforeUpdateRequestURITest(fixture);
    
            await expectRevertWithCustomError(estateForger, user, data, 'Unauthorized');
        });

        it('4.13.3. update tokenization request URI unsuccessfully with invalid request id', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
            });
            const { manager, estateForger } = fixture;
            const { data } = await beforeUpdateRequestURITest(fixture);

            await expectRevertWithCustomError(estateForger, manager, { ...data, requestId: 0 }, 'InvalidRequestId');
            await expectRevertWithCustomError(estateForger, manager, { ...data, requestId: 100 }, 'InvalidRequestId');
        });

        it('4.13.4. update tokenization request URI unsuccessfully with inactive zone', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
            });
            const { manager, estateForger, admin, admins } = fixture;
            const { data } = await beforeUpdateRequestURITest(fixture);

            const zone = (await estateForger.getRequest(data.requestId)).zone;
            await callAdmin_DeclareZones(
                admin,
                admins,
                [zone],
                false,
                await admin.nonce()
            );

            await expectRevertWithCustomError(estateForger, manager, data, 'Unauthorized');
        });

        it('4.13.5. update tokenization request URI unsuccessfully by inactive manager in zone', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
            });
            const { manager, estateForger, admin, admins } = fixture;
            const { data } = await beforeUpdateRequestURITest(fixture);

            const zone = (await estateForger.getRequest(data.requestId)).zone;
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

        it('4.13.6. update tokenization request URI unsuccessfully with cancelled request', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
            });
            const { manager, estateForger } = fixture;
            const { data } = await beforeUpdateRequestURITest(fixture);

            await estateForger.connect(manager).cancel(data.requestId);

            await expectRevertWithCustomError(estateForger, manager, data, 'Cancelled');
        });

        it('4.13.7. update tokenization request URI unsuccessfully with tokenized request', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
                confirmRequests: true,
            });
            const { manager, estateForger } = fixture;
            const { data } = await beforeUpdateRequestURITest(fixture);

            await expectRevertWithCustomError(estateForger, manager, data, 'Tokenized');
        });
    });

    describe('4.14. deposit(uint256, uint256)', async () => {
        it('4.14.1. deposit tokenization successfully and correctly refund native currency', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
            });
            const { admin, admins, manager, estateForger, depositor1, depositor2, currency } = fixture;

            const initBalance1 = await ethers.provider.getBalance(depositor1.address);
            const initBalance2 = await ethers.provider.getBalance(depositor2.address);

            await callEstateForger_Whitelist(
                estateForger,
                admins,
                [depositor1.address],
                true,
                await admin.nonce()
            )

            // During private sale
            const requestId = 1;
            let value1 = (await estateForger.getRequest(requestId)).unitPrice.mul(2);

            let tx = await estateForger.connect(depositor1).deposit(
                requestId, 2, { value: value1.mul(10) }
            );
            await tx.wait();

            await expect(tx).to
                .emit(estateForger, 'Deposit')
                .withArgs(requestId, depositor1.address, 2, value1);

            let receipt = await tx.wait();

            expect(await ethers.provider.getBalance(depositor1.address)).to.equal(
                initBalance1.sub(receipt.effectiveGasPrice.mul(receipt.gasUsed)).sub(value1)
            );
            expect(await ethers.provider.getBalance(estateForger.address)).to.equal(value1);

            let tokenizationRequest = await estateForger.getRequest(requestId);
            expect(tokenizationRequest.soldAmount).to.equal(2);
            expect(await estateForger.deposits(requestId, depositor1.address)).to.equal(2);

            // During public sale
            const timestamp = (await estateForger.getRequest(requestId)).privateSaleEndsAt;
            await time.setNextBlockTimestamp(timestamp);

            let value2 = (await estateForger.getRequest(requestId)).unitPrice.mul(4);

            tx = await estateForger.connect(depositor2).deposit(
                requestId, 4, { value: value2.mul(10) }
            );
            receipt = await tx.wait();

            await expect(tx).to
                .emit(estateForger, 'Deposit')
                .withArgs(requestId, depositor2.address, 4, value2);

            expect(await ethers.provider.getBalance(depositor2.address)).to.equal(
                initBalance2.sub(receipt.effectiveGasPrice.mul(receipt.gasUsed)).sub(value2)
            );
            expect(await ethers.provider.getBalance(estateForger.address)).to.equal(value1.add(value2));

            tokenizationRequest = await estateForger.getRequest(requestId);
            expect(tokenizationRequest.soldAmount).to.equal(6);
            expect(await estateForger.deposits(requestId, depositor2.address)).to.equal(4);
        });

        it('4.14.2. deposit tokenization successfully with ERC20 currency', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
            });
            const { admin, admins, manager, estateForger, depositor1, depositor2, currency } = fixture;
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

            let value1 = (await estateForger.getRequest(requestId)).unitPrice.mul(100);

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
            expect(tokenizationRequest.soldAmount).to.equal(100);
            expect(await estateForger.deposits(requestId, depositor1.address)).to.equal(100);

            // During public sale
            const timestamp = (await estateForger.getRequest(requestId)).privateSaleEndsAt;
            await time.setNextBlockTimestamp(timestamp);

            let value2 = (await estateForger.getRequest(requestId)).unitPrice.mul(200);

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
            expect(tokenizationRequest.soldAmount).to.equal(300);
            expect(await estateForger.deposits(requestId, depositor2.address)).to.equal(200);
        });

        it('4.14.3. deposit tokenization unsuccessfully when paused', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                whitelistDepositors: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                pause: true,
            });
            const { manager, estateForger, depositor1 } = fixture;

            await expect(estateForger.connect(depositor1).deposit(
                1, 2, { value: ethers.utils.parseEther('100') },
            )).to.be.revertedWith("Pausable: paused");

            await expect(estateForger.connect(depositor1).deposit(
                2, 100,
            )).to.be.revertedWith("Pausable: paused");
        });

        it('4.14.4. deposit tokenization unsuccessfully with invalid request id', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                whitelistDepositors: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
            });
            const { manager, estateForger, depositor1 } = fixture;

            await expect(estateForger.connect(depositor1).deposit(
                0, 2,
            )).to.be.revertedWithCustomError(estateForger, "InvalidRequestId");

            await expect(estateForger.connect(depositor1).deposit(
                100, 2,
            )).to.be.revertedWithCustomError(estateForger, "InvalidRequestId");
        });

        it('4.14.5. deposit tokenization unsuccessfully with cancelled request', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                whitelistDepositors: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
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

        it('4.14.6. deposit tokenization unsuccessfully with tokenized request', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                whitelistDepositors: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
                confirmRequests: true,
            });
            const { manager, estateForger, depositor1 } = fixture;

            await expect(estateForger.connect(depositor1).deposit(
                1, 2, { value: 1e9 },
            )).to.be.revertedWithCustomError(estateForger, "Tokenized");

            await expect(estateForger.connect(depositor1).deposit(
                2, 100,
            )).to.be.revertedWithCustomError(estateForger, "Tokenized");
        });

        it('4.14.7. deposit tokenization unsuccessfully by unwhitelisted account before public sale start', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
            });
            const { manager, estateForger, depositor1 } = fixture;

            const anchor1 = (await estateForger.getRequest(1)).uri;

            await expect(estateForger.connect(depositor1).safeDeposit(
                1, 2, anchor1, { value: ethers.utils.parseEther('100') },
            )).to.be.revertedWithCustomError(estateForger, "InvalidDepositing");

            const privateSaleEndsAt = (await estateForger.getRequest(1)).privateSaleEndsAt;
            await time.setNextBlockTimestamp(privateSaleEndsAt - 1);

            await expect(estateForger.connect(depositor1).safeDeposit(
                1, 2, anchor1, { value: ethers.utils.parseEther('100') },
            )).to.be.revertedWithCustomError(estateForger, "InvalidDepositing");
        });

        it('4.14.8. deposit tokenization unsuccessfully after public sale ended', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                whitelistDepositors: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
            });
            const { manager, estateForger, depositor1 } = fixture;

            const publicSaleEndsAt1 = (await estateForger.getRequest(1)).publicSaleEndsAt;
            await time.setNextBlockTimestamp(publicSaleEndsAt1);

            const anchor1 = (await estateForger.getRequest(1)).uri;
            const anchor2 = (await estateForger.getRequest(2)).uri;

            await expect(estateForger.connect(depositor1).safeDeposit(
                1, 2, anchor1, { value: ethers.utils.parseEther('100') },
            )).to.be.revertedWithCustomError(estateForger, "InvalidDepositing");

            await callTransaction(estateForger.connect(depositor1).safeDeposit(
                2, 100, anchor2
            ));

            const publicSaleEndsAt2 = (await estateForger.getRequest(2)).publicSaleEndsAt;
            await time.setNextBlockTimestamp(publicSaleEndsAt2);

            await expect(estateForger.connect(depositor1).safeDeposit(
                1, 2, anchor1, { value: ethers.utils.parseEther('100') },
            )).to.be.revertedWithCustomError(estateForger, "InvalidDepositing");

            await expect(estateForger.connect(depositor1).safeDeposit(
                2, 100, anchor2
            )).to.be.revertedWithCustomError(estateForger, "InvalidDepositing");
        });

        it('4.14.9. deposit tokenization unsuccessfully with max selling amount exceeded', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                whitelistDepositors: true,
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
            )).to.be.revertedWithCustomError(estateForger, "MaxSellingAmountExceeded");

            await expect(estateForger.connect(depositor1).deposit(
                2, 901,
            )).to.be.revertedWithCustomError(estateForger, "MaxSellingAmountExceeded");
        });

        it('4.14.10. deposit tokenization request unsuccessfully with insufficient native token', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                whitelistDepositors: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
            });
            const { manager, estateForger, depositor1 } = fixture;

            await expect(estateForger.connect(depositor1).deposit(
                1, 2,
            )).to.be.reverted;
        });

        it('4.14.11. deposit tokenization request unsuccessfully with insufficient ERC20 token allowance', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                whitelistDepositors: true,
                listSampleSellers: true,
                addSampleRequests: true,
            });
            const { manager, estateForger, depositor1, currency } = fixture;

            await expect(estateForger.connect(depositor1).deposit(
                2, 100,
            )).to.be.revertedWith("ERC20: insufficient allowance");
        });

        it('4.14.12. deposit tokenization request unsuccessfully when refunding failed', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                whitelistDepositors: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
            });
            const { deployer, manager, estateForger, depositor1, currency } = fixture;

            const failReceiver = await deployFailReceiver(deployer);

            const message = estateForger.interface.encodeFunctionData('deposit', [1, 2]);

            const privateSaleEndsAt = (await estateForger.getRequest(1)).privateSaleEndsAt;
            await time.setNextBlockTimestamp(privateSaleEndsAt);

            await expect(failReceiver.call(estateForger.address, message, { value: ethers.utils.parseEther('100') }))
                .to.be.revertedWithCustomError(estateForger, "FailedRefund");
        });

        it('4.14.13. deposit tokenization request unsuccessfully when this contract is reentered', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
            });
            const { deployer, manager, estateForger, depositor1, currency } = fixture;

            let reentrancyData = estateForger.interface.encodeFunctionData('deposit', [1, 2]);

            let reentrancy = await deployReentrancy(deployer);
            await callTransaction(reentrancy.updateReentrancyPlan(estateForger.address, reentrancyData));

            let message = estateForger.interface.encodeFunctionData('deposit', [1, 2]);

            const privateSaleEndsAt = (await estateForger.getRequest(1)).privateSaleEndsAt;
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

    describe('4.15. safeDeposit(uint256, uint256, string)', async () => {
        it('4.15.1. deposit tokenization successfully and correctly refund native currency', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
            });
            const { admin, admins, manager, estateForger, depositor1, depositor2, currency } = fixture;

            // During private sale
            await callEstateForger_Whitelist(
                estateForger,
                admins,
                [depositor1.address],
                true,
                await admin.nonce()
            )

            const initBalance1 = await ethers.provider.getBalance(depositor1.address);
            const initBalance2 = await ethers.provider.getBalance(depositor2.address);
            const requestId = 1;
            let value1 = (await estateForger.getRequest(requestId)).unitPrice.mul(2);

            const anchor = (await estateForger.getRequest(requestId)).uri;        
            let tx = await estateForger.connect(depositor1).safeDeposit(
                requestId, 2, anchor, { value: value1.mul(10) }
            );
            await tx.wait();

            await expect(tx).to
                .emit(estateForger, 'Deposit')
                .withArgs(requestId, depositor1.address, 2, value1);

            let receipt = await tx.wait();

            expect(await ethers.provider.getBalance(depositor1.address)).to.equal(
                initBalance1.sub(receipt.effectiveGasPrice.mul(receipt.gasUsed)).sub(value1)
            );
            expect(await ethers.provider.getBalance(estateForger.address)).to.equal(value1);

            let tokenizationRequest = await estateForger.getRequest(requestId);
            expect(tokenizationRequest.soldAmount).to.equal(2);
            expect(await estateForger.deposits(requestId, depositor1.address)).to.equal(2);

            // During public sale
            const timestamp = (await estateForger.getRequest(requestId)).privateSaleEndsAt;
            await time.setNextBlockTimestamp(timestamp);

            let value2 = (await estateForger.getRequest(requestId)).unitPrice.mul(4);

            tx = await estateForger.connect(depositor2).safeDeposit(
                requestId, 4, anchor, { value: value2.mul(10) }
            );
            receipt = await tx.wait();

            await expect(tx).to
                .emit(estateForger, 'Deposit')
                .withArgs(requestId, depositor2.address, 4, value2);

            expect(await ethers.provider.getBalance(depositor2.address)).to.equal(
                initBalance2.sub(receipt.effectiveGasPrice.mul(receipt.gasUsed)).sub(value2)
            );
            expect(await ethers.provider.getBalance(estateForger.address)).to.equal(value1.add(value2));

            tokenizationRequest = await estateForger.getRequest(requestId);
            expect(tokenizationRequest.soldAmount).to.equal(6);
            expect(await estateForger.deposits(requestId, depositor2.address)).to.equal(4);
        });

        it('4.15.2. deposit tokenization successfully with ERC20 currency', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
            });
            const { admin, admins, manager, estateForger, depositor1, depositor2, currency } = fixture;
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

            let value1 = (await estateForger.getRequest(requestId)).unitPrice.mul(100);

            const anchor = (await estateForger.getRequest(requestId)).uri;

            let tx = await estateForger.connect(depositor1).safeDeposit(requestId, 100, anchor);
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
            expect(tokenizationRequest.soldAmount).to.equal(100);
            expect(await estateForger.deposits(requestId, depositor1.address)).to.equal(100);

            // During public sale
            const timestamp = (await estateForger.getRequest(requestId)).privateSaleEndsAt;
            await time.setNextBlockTimestamp(timestamp);

            let value2 = (await estateForger.getRequest(requestId)).unitPrice.mul(200);

            tx = await estateForger.connect(depositor2).safeDeposit(
                requestId, 200, anchor
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
            expect(tokenizationRequest.soldAmount).to.equal(300);
            expect(await estateForger.deposits(requestId, depositor2.address)).to.equal(200);
        });

        it('4.15.3. deposit tokenization unsuccessfully when paused', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                whitelistDepositors: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                pause: true,
            });
            const { manager, estateForger, depositor1 } = fixture;

            await expect(estateForger.connect(depositor1).deposit(
                1, 2, { value: ethers.utils.parseEther('100') },
            )).to.be.revertedWith("Pausable: paused");

            await expect(estateForger.connect(depositor1).deposit(
                2, 100,
            )).to.be.revertedWith("Pausable: paused");
        });

        it('4.15.4. deposit tokenization unsuccessfully with invalid request id', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                whitelistDepositors: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
            });
            const { manager, estateForger, depositor1 } = fixture;

            await expect(estateForger.connect(depositor1).safeDeposit(
                0, 2, ""
            )).to.be.revertedWithCustomError(estateForger, "InvalidRequestId");

            await expect(estateForger.connect(depositor1).safeDeposit(
                100, 2, ""
            )).to.be.revertedWithCustomError(estateForger, "InvalidRequestId");
        });

        it('4.15.5. deposit tokenization unsuccessfully with cancelled request', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                whitelistDepositors: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
            });
            const { manager, estateForger, depositor1 } = fixture;

            await callTransaction(estateForger.connect(manager).cancel(1));

            const anchor1 = (await estateForger.getRequest(1)).uri;
            const anchor2 = (await estateForger.getRequest(2)).uri;

            await expect(estateForger.connect(depositor1).safeDeposit(
                1, 2, anchor1, { value: ethers.utils.parseEther('100') },
            )).to.be.revertedWithCustomError(estateForger, "Cancelled");

            await callTransaction(estateForger.connect(depositor1).safeDeposit(
                2, 100, anchor2
            ));

            await callTransaction(estateForger.connect(manager).cancel(2));

            await expect(estateForger.connect(depositor1).safeDeposit(
                1, 2, anchor1, { value: ethers.utils.parseEther('100') },
            )).to.be.revertedWithCustomError(estateForger, "Cancelled");

            await expect(estateForger.connect(depositor1).safeDeposit(
                2, 100, anchor2
            )).to.be.revertedWithCustomError(estateForger, "Cancelled");
        });

        it('4.15.6. deposit tokenization unsuccessfully with tokenized request', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                whitelistDepositors: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
                confirmRequests: true,
            });
            const { manager, estateForger, depositor1 } = fixture;

            const anchor1 = (await estateForger.getRequest(1)).uri;
            const anchor2 = (await estateForger.getRequest(2)).uri;

            await expect(estateForger.connect(depositor1).safeDeposit(
                1, 2, anchor1, { value: 1e9 },
            )).to.be.revertedWithCustomError(estateForger, "Tokenized");

            await expect(estateForger.connect(depositor1).safeDeposit(
                2, 100, anchor2
            )).to.be.revertedWithCustomError(estateForger, "Tokenized");
        });

        it('4.15.7. deposit tokenization request unsuccessfully with incorrect anchor', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                whitelistDepositors: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
                confirmRequests: true,
            });
            const { manager, estateForger, depositor1 } = fixture;

            const incorrectAnchor = "TestAnchor";
            
            await expect(estateForger.connect(depositor1).safeDeposit(
                1, 2, incorrectAnchor, { value: 1e9 },
            )).to.be.revertedWithCustomError(estateForger, "BadAnchor");

            await expect(estateForger.connect(depositor1).safeDeposit(
                2, 100, incorrectAnchor
            )).to.be.revertedWithCustomError(estateForger, "BadAnchor");
        });

        it('4.15.8. deposit tokenization unsuccessfully by unwhitelisted account before public sale start', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
            });
            const { manager, estateForger, depositor1 } = fixture;

            const anchor1 = (await estateForger.getRequest(1)).uri;

            await expect(estateForger.connect(depositor1).safeDeposit(
                1, 2, anchor1, { value: ethers.utils.parseEther('100') },
            )).to.be.revertedWithCustomError(estateForger, "InvalidDepositing");

            const privateSaleEndsAt = (await estateForger.getRequest(1)).privateSaleEndsAt;
            await time.setNextBlockTimestamp(privateSaleEndsAt - 1);

            await expect(estateForger.connect(depositor1).safeDeposit(
                1, 2, anchor1, { value: ethers.utils.parseEther('100') },
            )).to.be.revertedWithCustomError(estateForger, "InvalidDepositing");
        });

        it('4.15.9. deposit tokenization unsuccessfully after public sale ended', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                whitelistDepositors: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
            });
            const { manager, estateForger, depositor1 } = fixture;

            const publicSaleEndsAt1 = (await estateForger.getRequest(1)).publicSaleEndsAt;
            await time.setNextBlockTimestamp(publicSaleEndsAt1);

            const anchor1 = (await estateForger.getRequest(1)).uri;
            const anchor2 = (await estateForger.getRequest(2)).uri;

            await expect(estateForger.connect(depositor1).safeDeposit(
                1, 2, anchor1, { value: ethers.utils.parseEther('100') },
            )).to.be.revertedWithCustomError(estateForger, "InvalidDepositing");

            await callTransaction(estateForger.connect(depositor1).safeDeposit(
                2, 100, anchor2
            ));

            const publicSaleEndsAt2 = (await estateForger.getRequest(2)).publicSaleEndsAt;
            await time.setNextBlockTimestamp(publicSaleEndsAt2);

            await expect(estateForger.connect(depositor1).safeDeposit(
                1, 2, anchor1, { value: ethers.utils.parseEther('100') },
            )).to.be.revertedWithCustomError(estateForger, "InvalidDepositing");

            await expect(estateForger.connect(depositor1).safeDeposit(
                2, 100, anchor2
            )).to.be.revertedWithCustomError(estateForger, "InvalidDepositing");
        });

        it('4.15.10. deposit tokenization unsuccessfully with max selling amount exceeded', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                whitelistDepositors: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
            });
            const { manager, estateForger, depositor1, depositor2 } = fixture;

            const anchor1 = (await estateForger.getRequest(1)).uri;
            const anchor2 = (await estateForger.getRequest(2)).uri;

            await callTransaction(estateForger.connect(depositor1).safeDeposit(
                1, 10, anchor1, { value: ethers.utils.parseEther('100') },
            ));
            await callTransaction(estateForger.connect(depositor2).safeDeposit(
                2, 100, anchor2, { value: ethers.utils.parseEther('100') }
            ));
            
            await expect(estateForger.connect(depositor1).safeDeposit(
                1, 41, anchor1, { value: ethers.utils.parseEther('100') }
            )).to.be.revertedWithCustomError(estateForger, "MaxSellingAmountExceeded");

            await expect(estateForger.connect(depositor1).safeDeposit(
                2, 901, anchor2
            )).to.be.revertedWithCustomError(estateForger, "MaxSellingAmountExceeded");
        });

        it('4.15.11. deposit tokenization request unsuccessfully with insufficient native token', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                whitelistDepositors: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
            });
            const { manager, estateForger, depositor1 } = fixture;

            const anchor = (await estateForger.getRequest(1)).uri;

            await expect(estateForger.connect(depositor1).safeDeposit(
                1, 2, anchor
            )).to.be.reverted;
        });

        it('4.15.12. deposit tokenization request unsuccessfully with insufficient ERC20 token allowance', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                whitelistDepositors: true,
                listSampleSellers: true,
                addSampleRequests: true,
            });
            const { manager, estateForger, depositor1, currency } = fixture;

            const anchor = (await estateForger.getRequest(2)).uri;

            await expect(estateForger.connect(depositor1).safeDeposit(
                2, 100, anchor
            )).to.be.revertedWith("ERC20: insufficient allowance");
        });

        it('4.15.13. deposit tokenization request unsuccessfully when refunding failed', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
            });
            const { deployer, manager, estateForger, depositor1, currency } = fixture;

            const failReceiver = await deployFailReceiver(deployer);

            const anchor = (await estateForger.getRequest(1)).uri;

            const message = estateForger.interface.encodeFunctionData('safeDeposit', [1, 2, anchor]);

            const privateSaleEndsAt = (await estateForger.getRequest(1)).privateSaleEndsAt;
            await time.setNextBlockTimestamp(privateSaleEndsAt);

            await expect(failReceiver.call(estateForger.address, message, { value: ethers.utils.parseEther('100') }))
                .to.be.revertedWithCustomError(estateForger, "FailedRefund");
        });

        it('4.15.14. deposit tokenization request unsuccessfully when this contract is reentered', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
            });
            const { deployer, manager, estateForger, depositor1, currency } = fixture;

            const anchor = (await estateForger.getRequest(1)).uri;
            const reentrancyData = estateForger.interface.encodeFunctionData('safeDeposit', [1, 2, anchor]);

            const reentrancy = await deployReentrancy(deployer);
            await callTransaction(reentrancy.updateReentrancyPlan(estateForger.address, reentrancyData));

            const message = estateForger.interface.encodeFunctionData('safeDeposit', [1, 2, anchor]);

            const privateSaleEndsAt = (await estateForger.getRequest(1)).privateSaleEndsAt;
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

    describe('4.16. cancel(uint256)', async () => {
        it('4.16.1. cancel tokenization successfully', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
            });
            const { manager, estateForger, depositor1 } = fixture;

            for (let requestId = 1; requestId <= 2; requestId++) {
                const tx = await estateForger.connect(manager).cancel(requestId);
                await tx.wait();

                await expect(tx).to
                    .emit(estateForger, 'RequestCancellation')
                    .withArgs(requestId);

                const request = await estateForger.getRequest(requestId);
                expect(request.estateId).to.equal(0);
                expect(request.totalSupply).to.equal(0);
            }
        });

        it('4.16.2. cancel tokenization unsuccessfully by non-manager', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
            });
            const { manager, estateForger, depositor1, moderator } = fixture;

            await expect(estateForger.connect(depositor1).cancel(1))
                .to.be.revertedWithCustomError(estateForger, "Unauthorized");

            await expect(estateForger.connect(moderator).cancel(2))
                .to.be.revertedWithCustomError(estateForger, "Unauthorized");
        });

        it('4.16.3. cancel tokenization unsuccessfully with invalid request id', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
            });
            const { manager, estateForger, depositor1 } = fixture;

            await expect(estateForger.connect(manager).cancel(0))
                .to.be.revertedWithCustomError(estateForger, "InvalidRequestId");

            await expect(estateForger.connect(manager).cancel(100))
                .to.be.revertedWithCustomError(estateForger, "InvalidRequestId");
        });

        it('4.16.4. cancel tokenization unsuccessfully when zone is not declared', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
            });
            const { manager, estateForger, admin, admins } = fixture;

            const zone = (await estateForger.getRequest(1)).zone;
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

        it('4.16.5. cancel tokenization unsuccessfully by inactive manager in zone', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
            });
            const { manager, estateForger, admin, admins } = fixture;
            
            const zone = (await estateForger.getRequest(1)).zone;
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

        it('4.16.6. cancel tokenization unsuccessfully with cancelled request', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
            });
            const { manager, estateForger, depositor1 } = fixture;

            await estateForger.connect(manager).cancel(1);
            await expect(estateForger.connect(manager).cancel(1))
                .to.be.revertedWithCustomError(estateForger, "Cancelled");

            await estateForger.connect(manager).cancel(2);

            await expect(estateForger.connect(manager).cancel(2))
                .to.be.revertedWithCustomError(estateForger, "Cancelled");
        });

        it('4.16.7. cancel tokenization unsuccessfully with tokenized request', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleSellers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
                confirmRequests: true,
            });
            const { manager, estateForger, depositor1 } = fixture;

            await expect(estateForger.connect(manager).cancel(1))
                .to.be.revertedWithCustomError(estateForger, "Tokenized");
        });
        
    });

    describe('4.17. confirm(uint256, address)', async () => {
        async function testConfirmTokenization(
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

            await time.setNextBlockTimestamp(currentTimestamp);
            const tx = await estateForger.connect(manager).confirm(currentRequestId, commissionReceiverAddress);
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

        it('4.17.1. confirm tokenization successfully (small test)', async () => {
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

            await testConfirmTokenization(
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

            await testConfirmTokenization(
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

        it('4.17.2. confirm tokenization successfully in all cases', async () => {
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

                        await testConfirmTokenization(
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

        it('4.17.3. confirm tokenization successfully with very large deposition', async () => {
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

                        await testConfirmTokenization(
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

        it('4.17.4. confirm tokenization successfully in 100 random test cases', async () => {
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

                await testConfirmTokenization(
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
