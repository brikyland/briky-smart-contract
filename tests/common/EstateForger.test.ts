import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import {
    Admin,
    CommissionToken,
    Currency,
    EstateToken,
    FeeReceiver,
    IERC165Upgradeable__factory,
    IERC2981Upgradeable__factory,
    MockEstateToken,
    MockEstateForger__factory,
    EstateForger,
    MockPriceFeed,
} from '@typechain-types';
import { callTransaction, getSignatures, prepareNativeToken, randomWallet } from '@utils/blockchain';
import { Constant } from '@tests/test.constant';
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployFeeReceiver } from '@utils/deployments/common/feeReceiver';
import { deployCurrency } from '@utils/deployments/common/currency';
import { deployMockEstateToken } from '@utils/deployments/mocks/mockEstateToken';
import { deployCommissionToken } from '@utils/deployments/land/commissionToken';
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

import { smock } from '@defi-wonderland/smock';

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
import { BigNumber, BigNumberish } from 'ethers';
import { randomInt } from 'crypto';
import { getInterfaceID, randomBigNumber } from '@utils/utils';
import { OrderedMap } from '@utils/utils';
import { deployEstateForger } from '@utils/deployments/land/estateForger';
import { addCurrency } from '@utils/callWithSignatures/common';
import { callEstateForger_Pause } from '@utils/callWithSignatures/estateForger';
import { deployMockPriceFeed } from '@utils/deployments/mocks/mockPriceFeed';


interface EstateForgerFixture {
    admin: Admin;
    feeReceiver: FeeReceiver;
    currency: Currency;
    estateToken: MockEstateToken;
    commissionToken: CommissionToken;
    estateForger: EstateForger;
    nativePriceFeed: MockPriceFeed;
    currencyPriceFeed: MockPriceFeed;
    
    deployer: any;
    admins: any[];

    manager: any;
    moderator: any;
    user: any;
    requester1: any, requester2: any;
    commissionReceiver: any;
    depositor1: any, depositor2: any, depositor3: any;
    depositors: any[];

    zone1: any, zone2: any;

    sampleRequests: any[];
    baseTimestamp: number;
}


describe('4. EstateForger', async () => {
    async function estateForgerFixture(): Promise<EstateForgerFixture> {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        const admins = [];
        for (let i = 1; i <= Constant.ADMIN_NUMBER; ++i) admins.push(accounts[i]);
        const governorHub = accounts[Constant.ADMIN_NUMBER + 1];
        const user = accounts[Constant.ADMIN_NUMBER + 2];
        const manager = accounts[Constant.ADMIN_NUMBER + 3];
        const moderator = accounts[Constant.ADMIN_NUMBER + 4];
        const requester1 = accounts[Constant.ADMIN_NUMBER + 5];
        const requester2 = accounts[Constant.ADMIN_NUMBER + 6];
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

        const currency = await deployCurrency(
            deployer.address,
            'MockCurrency',
            'MCK'
        ) as Currency;

        const nativePriceFeed = await deployMockPriceFeed(deployer.address, 0, 0) as MockPriceFeed;
        const currencyPriceFeed = await deployMockPriceFeed(deployer.address, 0, 0) as MockPriceFeed;

        const estateToken = await deployMockEstateToken(
            deployer.address,
            admin.address,
            feeReceiver.address,
            Constant.ESTATE_TOKEN_INITIAL_BaseURI,
            Constant.ESTATE_TOKEN_INITIAL_RoyaltyRate,
        ) as MockEstateToken;        

        const commissionToken = await deployCommissionToken(
            deployer.address,
            admin.address,
            estateToken.address,
            feeReceiver.address,
            Constant.COMMISSION_TOKEN_INITIAL_Name,
            Constant.COMMISSION_TOKEN_INITIAL_Symbol,
            Constant.COMMISSION_TOKEN_INITIAL_BaseURI,
            Constant.COMMISSION_TOKEN_INITIAL_RoyaltyRate,
        ) as CommissionToken;

        const estateForger = await deployEstateForger(
            deployer,
            admin.address,
            estateToken.address,
            commissionToken.address,
            feeReceiver.address,
            Constant.ESTATE_FORGER_INITIAL_FeeRate,
            Constant.ESTATE_FORGER_INITIAL_ExclusiveRate,
            Constant.ESTATE_FORGER_INITIAL_CommissionRate,
            Constant.ESTATE_FORGER_INITIAL_BaseMinUnitPrice,
            Constant.ESTATE_FORGER_INITIAL_BaseMaxUnitPrice
        ) as EstateForger;

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
            requester1,
            requester2,
            commissionReceiver,
            depositor1,
            depositor2,
            depositor3,
            depositors,
            zone1,
            zone2,
            sampleRequests: [],
            baseTimestamp: 0,
        };
    };

    async function beforeEstateForgerTest({
        listSampleCurrencies = false,
        addZoneForExecutive = false,
        pause = false,
        addSampleRequests = false,
        mintCurrencyForDepositors = false,
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
            zone1,
            zone2,
            requester1,
            requester2,
        } = fixture;

        await callAdmin_AuthorizeManagers(
            admin,
            admins,
            [manager.address],
            true,
            await fixture.admin.nonce()
        );

        await callAdmin_AuthorizeModerators(
            admin,
            admins,
            [moderator.address],
            true,
            await fixture.admin.nonce()
        );

        if (listSampleCurrencies) {
            await nativePriceFeed.updateData(1000_00000000, 8);
            await currencyPriceFeed.updateData(5_00000000, 8);

            await addCurrency(
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
            
            await addCurrency(
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

        if (pause) {
            await callEstateForger_Pause(
                estateForger,
                admins,
                await fixture.admin.nonce()
            );
        }

        await callAdmin_DeclareZones(
            admin,
            admins,
            [zone1],
            true,
            await fixture.admin.nonce()
        );

        await callAdmin_DeclareZones(
            admin,
            admins,
            [zone2],
            true,
            await fixture.admin.nonce()
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
                await fixture.admin.nonce()
            );
            await callAdmin_ActivateIn(
                admin,
                admins,
                zone2,
                [manager.address, moderator.address],
                true,
                await fixture.admin.nonce()
            );
        }

        if (addSampleRequests) {
            await callTransaction(estateForger.connect(manager).requestTokenization(                
                requester1.address,
                zone1,
                'TestingURI1',
                70,
                10,
                30,
                ethers.utils.parseEther('0.2'),
                ethers.constants.AddressZero,                
                3,
                baseTimestamp + 1e9,
                1000
            ));

            await callTransaction(estateForger.connect(manager).requestTokenization(                
                requester2.address,
                zone2,
                'TestingURI2',
                1000,
                200,
                1000,
                ethers.utils.parseEther('100'),
                currency.address,
                0,
                baseTimestamp + 1e9,
                1000
            ));
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

            expect(await estateForger.commissionRate()).to.equal(Constant.ESTATE_FORGER_INITIAL_CommissionRate);
            expect(await estateForger.exclusiveRate()).to.equal(Constant.ESTATE_FORGER_INITIAL_ExclusiveRate);
            expect(await estateForger.feeRate()).to.equal(Constant.ESTATE_FORGER_INITIAL_FeeRate);

            expect(await estateForger.baseMinUnitPrice()).to.equal(Constant.ESTATE_FORGER_INITIAL_BaseMinUnitPrice);
            expect(await estateForger.baseMaxUnitPrice()).to.equal(Constant.ESTATE_FORGER_INITIAL_BaseMaxUnitPrice);

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
                100_01,
                Constant.ESTATE_FORGER_INITIAL_ExclusiveRate,
                Constant.ESTATE_FORGER_INITIAL_CommissionRate,
                Constant.ESTATE_FORGER_INITIAL_BaseMinUnitPrice,
                Constant.ESTATE_FORGER_INITIAL_BaseMaxUnitPrice
            ])).to.be.reverted;
        });

        it('4.1.3. revert with invalid exclusive rate', async () => {
            const { admin, feeReceiver, estateToken, commissionToken } = await beforeEstateForgerTest({});
            const EstateForger = await ethers.getContractFactory("EstateForger");

            await expect(upgrades.deployProxy(EstateForger, [
                admin.address,
                estateToken.address,
                commissionToken.address,
                feeReceiver.address,
                Constant.ESTATE_FORGER_INITIAL_FeeRate,
                100_01,
                Constant.ESTATE_FORGER_INITIAL_CommissionRate,
                Constant.ESTATE_FORGER_INITIAL_BaseMinUnitPrice,
                Constant.ESTATE_FORGER_INITIAL_BaseMaxUnitPrice
            ])).to.be.reverted;
        });

        it('4.1.4. revert with invalid commission rate', async () => {
            const { admin, feeReceiver, estateToken, commissionToken } = await beforeEstateForgerTest({});
            const EstateForger = await ethers.getContractFactory("EstateForger");

            await expect(upgrades.deployProxy(EstateForger, [
                admin.address,
                estateToken.address,
                commissionToken.address,
                feeReceiver.address,
                Constant.ESTATE_FORGER_INITIAL_FeeRate,
                Constant.ESTATE_FORGER_INITIAL_ExclusiveRate,
                100_01,
                Constant.ESTATE_FORGER_INITIAL_BaseMinUnitPrice,
                Constant.ESTATE_FORGER_INITIAL_BaseMaxUnitPrice
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
            let invalidSignatures = await getSignatures(message, admins, await admin.nonce() + 1);

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

        it('4.3.3. pause unsuccessfully when already paused', async () => {
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
                [estateForger.address, "updateFeeRate", 20_00]
            );

            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await estateForger.updateFeeRate(20_00, signatures);
            await tx.wait();

            await expect(tx).to
                .emit(estateForger, 'FeeRateUpdate')
                .withArgs(20_00);

            expect(await estateForger.feeRate()).to.equal(20_00);
        });

        it('4.4.2. updateFeeRate unsuccessfully with invalid signatures', async () => {
            const { admin, admins, estateForger } = await beforeEstateForgerTest({});

            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256"],
                [estateForger.address, "updateFeeRate", 20_00]
            );
            const invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(estateForger.updateFeeRate(
                20_00,
                invalidSignatures
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('4.4.3. updateFeeRate unsuccessfully with invalid rate', async () => {
            const { admin, admins, estateForger } = await beforeEstateForgerTest({});
            
            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256"],
                [estateForger.address, "updateFeeRate", 100_01]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(estateForger.updateFeeRate(
                100_01,
                signatures
            )).to.be.revertedWithCustomError(estateForger, 'InvalidPercentage');
        });
    });

    describe('4.5. updateExclusiveRate(uint256, bytes[])', async () => {
        it('4.5.1. updateExclusiveRate successfully with valid signatures', async () => {
            const { admin, admins, estateForger } = await beforeEstateForgerTest({});
            
            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256"],
                [estateForger.address, "updateExclusiveRate", 20_00]
            );

            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await estateForger.updateExclusiveRate(20_00, signatures);
            await tx.wait();

            await expect(tx).to
                .emit(estateForger, 'ExclusiveRateUpdate')
                .withArgs(20_00);

            expect(await estateForger.exclusiveRate()).to.equal(20_00);
        });

        it('4.5.2. updateExclusiveRate unsuccessfully with invalid signatures', async () => {
            const { admin, admins, estateForger } = await beforeEstateForgerTest({});
            
            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256"],
                [estateForger.address, "updateExclusiveRate", 20_00]
            );
            const invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(estateForger.updateExclusiveRate(
                20_00,
                invalidSignatures
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('4.5.3. updateExclusiveRate unsuccessfully with invalid rate', async () => {
            const { admin, admins, estateForger } = await beforeEstateForgerTest({});
            
            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256"],
                [estateForger.address, "updateExclusiveRate", 100_01]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(estateForger.updateExclusiveRate(
                100_01,
                signatures
            )).to.be.revertedWithCustomError(estateForger, 'InvalidPercentage');
        });
    });

    describe('4.6. updateCommissionRate(uint256, bytes[])', async () => {
        it('4.6.1. updateCommissionRate successfully with valid signatures', async () => {
            const { admin, admins, estateForger } = await beforeEstateForgerTest({});
            
            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256"],
                [estateForger.address, "updateCommissionRate", 20_00]
            );

            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await estateForger.updateCommissionRate(20_00, signatures);
            await tx.wait();

            await expect(tx).to
                .emit(estateForger, 'CommissionRateUpdate')
                .withArgs(20_00);

            expect(await estateForger.commissionRate()).to.equal(20_00);
        });

        it('4.6.2. updateCommissionRate unsuccessfully with invalid signatures', async () => {
            const { admin, admins, estateForger } = await beforeEstateForgerTest({});
            
            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256"],
                [estateForger.address, "updateCommissionRate", 20_00]
            );
            const invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(estateForger.updateCommissionRate(
                20_00,
                invalidSignatures
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('4.6.3. updateCommissionRate unsuccessfully with invalid rate', async () => {
            const { admin, admins, estateForger } = await beforeEstateForgerTest({});
            
            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256"],
                [estateForger.address, "updateCommissionRate", 100_01]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(estateForger.updateCommissionRate(
                100_01,
                signatures
            )).to.be.revertedWithCustomError(estateForger, 'InvalidPercentage');
        });
    });

    describe('4.7. updateBaseUnitPriceRange(uint256, uint256, bytes[])', async () => {
        it('4.7.1. updateBaseUnitPriceRange successfully with valid signatures', async () => {
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

        it('4.7.2. updateBaseUnitPriceRange unsuccessfully with invalid signatures', async () => {
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

        it('4.7.3. updateBaseUnitPriceRange unsuccessfully with invalid min unit price', async () => {
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

    describe('4.8. updatePriceFeeds(uint256, uint256, bytes[])', async () => {
        it('4.8.1. updatePriceFeeds successfully with valid signatures', async () => {
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

        it('4.8.2. updatePriceFeeds unsuccessfully with invalid signatures', async () => {
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

        it('4.8.3. updatePriceFeeds unsuccessfully with invalid heartbeat', async () => {
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

        it('4.8.4. updatePriceFeeds unsuccessfully with conflicting array length', async () => {
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

    describe('4.9. updateDefaultRates(address[], uint256[], uint8[], bytes[])', async () => {
        it('4.9.1. updateDefaultRates successfully with valid signatures', async () => {
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

        it('4.9.2. updateDefaultRates unsuccessfully with invalid signatures', async () => {
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

        it('4.9.3. updateDefaultRates unsuccessfully with invalid decimals', async () => {
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

        it('4.9.4. updateDefaultRates unsuccessfully with conflicting array length', async () => {
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

    describe('4.10. requestTokenization(address, bytes32, string, uint256, uint256, uint256, uint256, address, uint8, uint40, uint40)', async () => {
        interface RequestTokenizationData {
            requester: string;
            zone: string;
            uri: string;
            totalSupply: BigNumberish;
            minSellingAmount: BigNumberish;
            maxSellingAmount: BigNumberish;
            unitPrice: BigNumberish;
            currencyAddress: string;
            decimals: number;
            expireAt: number;
            duration: number;
        }
        
        async function beforeRequestTokenizationTest(
            requester1: any,
            zone1: string,
            currency: any,
            baseTimestamp: number
        ): Promise<{data: RequestTokenizationData}> {
            const defaultParams: RequestTokenizationData = {
                requester: requester1.address,
                zone: zone1,
                uri: 'TestingURI',
                totalSupply: 70,
                minSellingAmount: 10,
                maxSellingAmount: 30,
                unitPrice: ethers.utils.parseEther('100'),
                currencyAddress: currency.address,
                decimals: 3,
                expireAt: baseTimestamp + 1e9,
                duration: 1000,
            }

            return { data: defaultParams };
        }

        async function expectRevertWithCustomError(estateForger: EstateForger, manager: any, data: RequestTokenizationData, error: string) {
            await expect(estateForger.connect(manager).requestTokenization(
                data.requester,
                data.zone,
                data.uri,
                data.totalSupply,
                data.minSellingAmount,
                data.maxSellingAmount,
                data.unitPrice,
                data.currencyAddress,
                data.decimals,
                data.expireAt,
                data.duration,
            )).to.be.revertedWithCustomError(estateForger, error);
        }

        it('4.10.1. requestTokenization successfully with currency having price feed', async () => {
            const { requester1, manager, zone1, currency, baseTimestamp, estateForger, currencyPriceFeed } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
            });

            const { data } = await beforeRequestTokenizationTest(
                requester1,
                zone1,
                currency,
                baseTimestamp
            );
    
            let currentTimestamp = await time.latest() + 1000;
            await time.setNextBlockTimestamp(currentTimestamp);

            const tx = await estateForger.connect(manager).requestTokenization(
                data.requester,
                data.zone,
                data.uri,
                data.totalSupply,
                data.minSellingAmount,
                data.maxSellingAmount,
                data.unitPrice,
                data.currencyAddress,
                data.decimals,
                data.expireAt,
                data.duration,
            );
            await tx.wait();

            const priceRate = await currencyPriceFeed.getRoundData(1);

            await expect(tx).to
                .emit(estateForger, 'NewRequest')
                .withArgs(
                    1,
                    data.requester,
                    data.zone,
                    data.uri,
                    data.totalSupply,
                    data.minSellingAmount,
                    data.maxSellingAmount,
                    data.unitPrice,
                    data.currencyAddress,
                    data.decimals,
                    data.expireAt,
                    currentTimestamp + data.duration,
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
            expect(tokenizationRequest.closeAt).to.equal(currentTimestamp + data.duration);
            expect(tokenizationRequest.requester).to.equal(data.requester);
        });

        it('4.10.2. requestTokenization successfully with currency having default price', async () => {
            const { admin, deployer, admins, requester1, manager, zone1, currency, baseTimestamp, estateForger } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
            });

            const newCurrency = await deployCurrency(
                deployer,
                "NewCurrency",
                "NC",
            );

            await addCurrency(
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
                requester1,
                zone1,
                currency,
                baseTimestamp
            );
    
            let currentTimestamp = await time.latest() + 1000;
            await time.setNextBlockTimestamp(currentTimestamp);

            const tx = await estateForger.connect(manager).requestTokenization(
                data.requester,
                data.zone,
                data.uri,
                data.totalSupply,
                data.minSellingAmount,
                data.maxSellingAmount,
                data.unitPrice,
                newCurrency.address,
                data.decimals,
                data.expireAt,
                data.duration,
            );
            await tx.wait();

            await expect(tx).to
                .emit(estateForger, 'NewRequest')
                .withArgs(
                    1,
                    data.requester,
                    data.zone,
                    data.uri,
                    data.totalSupply,
                    data.minSellingAmount,
                    data.maxSellingAmount,
                    data.unitPrice,
                    newCurrency.address,
                    data.decimals,
                    data.expireAt,
                    currentTimestamp + data.duration,
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
            expect(tokenizationRequest.closeAt).to.equal(currentTimestamp + data.duration);
            expect(tokenizationRequest.requester).to.equal(data.requester);
        });

        it('4.10.3. requestTokenization unsuccessfully by non-executive', async () => {
            const { requester1, user, zone1, currency, baseTimestamp, estateForger, currencyPriceFeed } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
            });
            const { data } = await beforeRequestTokenizationTest(
                requester1,
                zone1,
                currency,
                baseTimestamp
            );

            await expect(estateForger.connect(user).requestTokenization(
                data.requester,
                data.zone,
                data.uri,
                data.totalSupply,
                data.minSellingAmount,
                data.maxSellingAmount,
                data.unitPrice,
                data.currencyAddress,
                data.decimals,
                data.expireAt,
                data.duration,
            )).to.be.revertedWithCustomError(estateForger, 'Unauthorized');
        });

        it('4.10.4. requestTokenization unsuccessfully by non-active manager in zone', async () => {
            const { requester1, manager, zone1, currency, baseTimestamp, estateForger, currencyPriceFeed } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
            });
            const { data } = await beforeRequestTokenizationTest(
                requester1,
                zone1,
                currency,
                baseTimestamp
            );

            await expect(estateForger.connect(manager).requestTokenization(
                data.requester,
                data.zone,
                data.uri,
                data.totalSupply,
                data.minSellingAmount,
                data.maxSellingAmount,
                data.unitPrice,
                data.currencyAddress,
                data.decimals,
                data.expireAt,
                data.duration,
            )).to.be.revertedWithCustomError(estateForger, 'Unauthorized');
        });

        it('4.10.5. requestTokenization unsuccessfully with unavailable currency', async () => {
            const { admin, admins, requester1, manager, zone1, currency, baseTimestamp, estateForger } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
            });
            const { data } = await beforeRequestTokenizationTest(
                requester1,
                zone1,
                currency,
                baseTimestamp
            );

            const unavailableCurrency = randomWallet();

            await addCurrency(
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

        it('4.10.6. requestTokenization unsuccessfully with missing currency rate', async () => {
            const { admin, admins, requester1, manager, zone1, currency, baseTimestamp, estateForger } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
            });
            const { data } = await beforeRequestTokenizationTest(
                requester1,
                zone1,
                currency,
                baseTimestamp
            );

            const unavailableCurrency = randomWallet();

            await addCurrency(
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
        
        it('4.10.7. requestTokenization unsuccessfully with stale price feed', async () => {
            const { requester1, manager, zone1, currency, baseTimestamp, estateForger } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
            });
            const { data } = await beforeRequestTokenizationTest(
                requester1,
                zone1,
                currency,
                baseTimestamp
            );

            const heartbeat = (await estateForger.getPriceFeed(currency.address)).heartbeat;
            await time.setNextBlockTimestamp(baseTimestamp + heartbeat + 1);

            await expectRevertWithCustomError(estateForger, manager, data, 'StalePriceFeed');
        });

        it('4.10.8. requestTokenization unsuccessfully with invalid unit price', async () => {
            const { requester1, manager, zone1, currency, baseTimestamp, estateForger } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
            });
            const { data } = await beforeRequestTokenizationTest(
                requester1,
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

        it('4.10.9. requestTokenization unsuccessfully with zero address requester', async () => {
            const { requester1, manager, zone1, currency, baseTimestamp, estateForger } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
            });
            const { data } = await beforeRequestTokenizationTest(
                requester1,
                zone1,
                currency,
                baseTimestamp
            );
            await expectRevertWithCustomError(estateForger, manager, {
                ...data,
                requester: ethers.constants.AddressZero,
            }, 'InvalidInput');
        });

        it('4.10.10. requestTokenization unsuccessfully when minimum selling amount exceeds maximum', async () => {
            const { requester1, manager, zone1, currency, baseTimestamp, estateForger } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
            });
            const { data } = await beforeRequestTokenizationTest(
                requester1,
                zone1,
                currency,
                baseTimestamp
            );
            await expectRevertWithCustomError(estateForger, manager, {
                ...data,
                minSellingAmount: Number(data.maxSellingAmount) + 1,
            }, 'InvalidInput');
        });

        it('4.10.11. requestTokenization unsuccessfully when maximum selling amount exceeds total supply', async () => {
            const { requester1, manager, zone1, currency, baseTimestamp, estateForger } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
            });
            const { data } = await beforeRequestTokenizationTest(
                requester1,
                zone1,
                currency,
                baseTimestamp
            );
            await expectRevertWithCustomError(estateForger, manager, {
                ...data,
                maxSellingAmount: Number(data.totalSupply) + 1,
            }, 'InvalidInput');
        });

        it('4.10.12. requestTokenization unsuccessfully when total estate tokensupply exceeds max uint256', async () => {
            const { requester1, manager, zone1, currency, baseTimestamp, estateForger } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
            });
            const { data } = await beforeRequestTokenizationTest(
                requester1,
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

        it('4.10.13. requestTokenization unsuccessfully with invalid decimals', async () => {
            const { requester1, manager, zone1, currency, baseTimestamp, estateForger } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
            });
            const { data } = await beforeRequestTokenizationTest(
                requester1,
                zone1,
                currency,
                baseTimestamp
            );
            await expectRevertWithCustomError(estateForger, manager, {
                ...data,
                decimals: 19,
            }, 'InvalidInput');
        });

        it('4.10.14. requestTokenization unsuccessfully with expired timestamp', async () => {
            const { requester1, manager, zone1, currency, baseTimestamp, estateForger } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
            });
            const { data } = await beforeRequestTokenizationTest(
                requester1,
                zone1,
                currency,
                baseTimestamp
            );
            await time.setNextBlockTimestamp(baseTimestamp);

            await expectRevertWithCustomError(estateForger, manager, {
                ...data,
                expireAt: baseTimestamp - 1,
            }, 'InvalidInput');
        });
    });

    describe('4.11. updateRequest(uint256, address, bytes32, string, uint256, uint256, uint256, uint256, address, uint8, uint40, uint40)', async () => {
        interface UpdateRequestData {
            requestId: number;
            requester: string;
            zone: string;
            uri: string;
            totalSupply: BigNumberish;
            minSellingAmount: BigNumberish;
            maxSellingAmount: BigNumberish;
            unitPrice: BigNumberish;
            currencyAddress: string;
            decimals: number;
            expireAt: number;
            closeAt: number;
        }
        
        async function beforeUpdateRequestTest(
            admin: Admin,
            estateForger: EstateForger,
            admins: any[],
            deployer: any,
            requester: any,
            zone: string,
            baseTimestamp: number
        ): Promise<{data: UpdateRequestData, newCurrency: Currency, newCurrencyPriceFeed: MockPriceFeed}> {
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

            await addCurrency(
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
                requester: requester.address,
                zone: zone,
                uri: 'NewTestingURI',
                totalSupply: 71,
                minSellingAmount: 11,
                maxSellingAmount: 31,
                unitPrice: ethers.utils.parseEther('11'),
                currencyAddress: newCurrency.address,
                decimals: 2,
                expireAt: baseTimestamp + 1e9 + 1,
                closeAt: baseTimestamp + 1001,
            }

            return { data: defaultParams, newCurrency, newCurrencyPriceFeed };
        }

        async function expectRevertWithInvalidInput(estateForger: EstateForger, manager: any, data: UpdateRequestData, error: string) {
            await expect(estateForger.connect(manager).updateRequest(
                data.requestId,
                data.requester,
                data.zone,
                data.uri,
                data.totalSupply,
                data.minSellingAmount,
                data.maxSellingAmount,
                data.unitPrice,
                data.currencyAddress,
                data.decimals,
                data.expireAt,
                data.closeAt,
            )).to.be.revertedWithCustomError(estateForger, error);
        }

        it('4.11.1. update tokenization request successfully', async () => {            
            const { admin, deployer, requester2, zone2, manager, currency, baseTimestamp, estateForger, currencyPriceFeed, admins } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                addSampleRequests: true,
            });

            const { data, newCurrency, newCurrencyPriceFeed } = await beforeUpdateRequestTest(
                admin,
                estateForger,
                admins,
                deployer,
                requester2,
                zone2,
                baseTimestamp
            );
    
            let currentTimestamp = await time.latest() + 1000;
            await time.setNextBlockTimestamp(currentTimestamp);

            const tx = await estateForger.connect(manager).updateRequest(
                data.requestId,
                data.requester,
                data.zone,
                data.uri,
                data.totalSupply,
                data.minSellingAmount,
                data.maxSellingAmount,
                data.unitPrice,
                data.currencyAddress,
                data.decimals,
                data.expireAt,
                data.closeAt,
            );
            await tx.wait();

            const priceRate = await newCurrencyPriceFeed.getRoundData(1);

            await expect(tx).to
                .emit(estateForger, 'RequestUpdate')
                .withArgs(
                    1,
                    data.requester,
                    data.zone,
                    data.uri,
                    data.totalSupply,
                    data.minSellingAmount,
                    data.maxSellingAmount,
                    data.unitPrice,
                    data.currencyAddress,
                    data.decimals,
                    data.expireAt,
                    data.closeAt,
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
            expect(tokenizationRequest.closeAt).to.equal(data.closeAt);
            expect(tokenizationRequest.requester).to.equal(data.requester);
        });

        it('4.11.2. update tokenization request unsuccessfully by non-executive', async () => {
            const { admin, deployer, requester2, zone2, user, currency, baseTimestamp, estateForger, currencyPriceFeed, admins } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                addSampleRequests: true,
            });

            const { data, newCurrency, newCurrencyPriceFeed } = await beforeUpdateRequestTest(
                admin,
                estateForger,
                admins,
                deployer,
                requester2,
                zone2,
                baseTimestamp
            );
    
            let currentTimestamp = await time.latest() + 1000;
            await time.setNextBlockTimestamp(currentTimestamp);

            await expectRevertWithInvalidInput(estateForger, user, data, 'Unauthorized');
        });

        it('4.11.3. update tokenization request unsuccessfully with invalid request id', async () => {
            const { admin, deployer, requester2, zone2, manager, user, currency, baseTimestamp, estateForger, currencyPriceFeed, admins } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                addSampleRequests: true,
            });

            const { data, newCurrency, newCurrencyPriceFeed } = await beforeUpdateRequestTest(
                admin,
                estateForger,
                admins,
                deployer,
                requester2,
                zone2,
                baseTimestamp
            );

            await expectRevertWithInvalidInput(estateForger, manager, { ...data, requestId: 0 }, 'InvalidRequestId');
            await expectRevertWithInvalidInput(estateForger, manager, { ...data, requestId: 100 }, 'InvalidRequestId');
        });

        it('4.11.4. update tokenization request unsuccessfully by non-active manager in zone', async () => {
            const { admin, deployer, requester2, zone2, manager, user, currency, baseTimestamp, estateForger, currencyPriceFeed, admins } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                addSampleRequests: true,
            });

            const { data, newCurrency, newCurrencyPriceFeed } = await beforeUpdateRequestTest(
                admin,
                estateForger,
                admins,
                deployer,
                requester2,
                zone2,
                baseTimestamp
            );

            await callAdmin_ActivateIn(
                admin,
                admins,
                zone2,
                [manager.address],
                false,
                await admin.nonce()
            );

            await expectRevertWithInvalidInput(estateForger, manager, data, 'Unauthorized');
        });

        it('4.11.5. update tokenization request unsuccessfully by non-active manager in zone', async () => {
            const { admin, deployer, requester2, zone2, manager, user, currency, baseTimestamp, estateForger, currencyPriceFeed, admins } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                addSampleRequests: true,
            });

            const { data, newCurrency, newCurrencyPriceFeed } = await beforeUpdateRequestTest(
                admin,
                estateForger,
                admins,
                deployer,
                requester2,
                zone2,
                baseTimestamp
            );

            await callAdmin_ActivateIn(
                admin,
                admins,
                zone2,
                [manager.address],
                false,
                await admin.nonce()
            );

            await expectRevertWithInvalidInput(estateForger, manager, data, 'Unauthorized');
        });

        it('4.11.6. update tokenization request unsuccessfully with cancelled request', async () => {
            const { admin, deployer, requester2, zone2, manager, user, currency, baseTimestamp, estateForger, currencyPriceFeed, admins } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                addSampleRequests: true,
            });

            const { data, newCurrency, newCurrencyPriceFeed } = await beforeUpdateRequestTest(
                admin,
                estateForger,
                admins,
                deployer,
                requester2,
                zone2,
                baseTimestamp
            );

            await expectRevertWithInvalidInput(estateForger, manager, data, 'Cancelled');
        });

        it('4.11.7. update tokenization request unsuccessfully with tokenized request', async () => {
            const { admin, deployer, requester2, zone2, manager, user, currency, baseTimestamp, estateForger, currencyPriceFeed, admins } = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                addSampleRequests: true,
            });
        });


        it('3.13.7. update tokenization request unsuccessfully with zero address requester', async () => {
            await expectRevertWithInvalidInput({
                ...defaultParams,
                requester: ethers.constants.AddressZero,
            });
        });

        it('3.13.8. update tokenization request unsuccessfully when min selling amount exceeds max', async () => {
            await expectRevertWithInvalidInput({
                ...defaultParams,
                minSellingAmount: defaultParams.maxSellingAmount + 1,
            });
        });

        it('3.13.9. update tokenization request unsuccessfully when max selling amount exceeds total supply', async () => {
            await expectRevertWithInvalidInput({
                ...defaultParams,
                maxSellingAmount: defaultParams.totalSupply + 1,
            });
        });

        it('3.13.10. update tokenization request unsuccessfully when total estate token supply exceeds max uint256', async () => {
            await expectRevertWithInvalidInput({
                ...defaultParams,
                decimals: 18,
                totalSupply: ethers.BigNumber.from(2).pow(256).sub(1),
            });
        });

        it('3.13.10. update tokenization request unsuccessfully with unavailable currency', async () => {
            await expectRevertWithInvalidInput({
                ...defaultParams,
                currencyAddress: ethers.constants.AddressZero,
            });

            const unavailableCurrency = randomWallet();
            nonce = await addCurrency(
                admin,
                estateToken,
                admins,
                [unavailableCurrency.address],
                [false],
                [false],
                [500],
                [5000],
                nonce,
            );

            await expectRevertWithInvalidInput({
                ...defaultParams,
                currencyAddress: unavailableCurrency.address,
            });
        });

        it('3.13.11. update tokenization request unsuccessfully with invalid unit price', async () => {
            await expectRevertWithInvalidInput({
                ...defaultParams,
                unitPrice: 499,
            });

            await expectRevertWithInvalidInput({
                ...defaultParams,
                unitPrice: 5001,
            });
        });

        it('3.13.12. update tokenization request unsuccessfully with invalid decimals', async () => {
            await expectRevertWithInvalidInput({
                ...defaultParams,
                decimals: 19,
            });
        });

        it('3.13.13. update tokenization request unsuccessfully with expired timestamp', async () => {
            await expectRevertWithInvalidInput({
                ...defaultParams,
                expireAt: baseTimestamp - 1,
            });
        });

        it('3.13.14. update tokenization request unsuccessfully with invalid public sale end time', async () => {
            await expectRevertWithInvalidInput({
                ...defaultParams,
                publicSaleEndAt: baseTimestamp - 1,
            });
        });
    });

    describe('3.14. updateTokenizationURI(uint256, string)', async () => {
        let baseTimestamp: number;
        let newRequester: any;
        let newCurrency: any;

        beforeEach(async () => {
            baseTimestamp = await time.latest() + 1000;

            newRequester = randomWallet();

            await callEstateToken_UpdateCommissionToken(
                estateToken,
                admins,
                commissionToken.address,
                nonce++
            );

            nonce = await addCurrency(
                admin,
                estateToken,
                admins,
                [currency.address],
                [true],
                [false],
                [500],
                [5000],
                nonce,
            );

            newCurrency = await deployCurrency(
                deployer.address,
                'NewMockCurrency',
                'NMC'
            ) as Currency;

            nonce = await addCurrency(
                admin,
                estateToken,
                admins,
                [newCurrency.address],
                [true],
                [false],
                [500],
                [5000],
                nonce,
            );

            await time.setNextBlockTimestamp(baseTimestamp);

            await estateToken.requestTokenization(
                requester1.address,
                'Token1_URI',
                70,
                10,
                30,
                1000,
                currency.address,
                3,
                baseTimestamp + 1e9,
                1000,
            );

            await time.setNextBlockTimestamp(baseTimestamp + 100);

            await estateToken.requestTokenization(
                requester2.address,
                'Token2_URI',
                9000,
                2000,
                5000,
                1000,
                currency.address,
                0,
                baseTimestamp + 1e9,
                1000,
            );
        });

        it('3.14.1. update tokenization request URI successfully', async () => {
            let tx = await estateToken.updateTokenizationURI(
                1,
                'Token1_URI_New',
            );
            await tx.wait();

            expect(tx).to
                .emit(estateToken, 'TokenizationURIUpdated')
                .withArgs(
                    1,
                    'Token1_URI_New',
                );

            let tokenizationRequest = await estateToken.getTokenizationRequest(1);
            expect(tokenizationRequest.estateId).to.equal(0);
            expect(tokenizationRequest.uri).to.equal('Token1_URI_New');
            expect(tokenizationRequest.totalSupply).to.equal(70);
            expect(tokenizationRequest.minSellingAmount).to.equal(10);
            expect(tokenizationRequest.maxSellingAmount).to.equal(30);
            expect(tokenizationRequest.unitPrice).to.equal(1000);
            expect(tokenizationRequest.currency).to.equal(currency.address);
            expect(tokenizationRequest.decimals).to.equal(3);
            expect(tokenizationRequest.expireAt).to.equal(baseTimestamp + 1e9);
            expect(tokenizationRequest.publicSaleEndsAt).to.equal(baseTimestamp + 1000);
            expect(tokenizationRequest.requester).to.equal(requester1.address);

            tx = await estateToken.updateTokenizationURI(
                2,
                'Token2_URI_New',
            );
            await tx.wait();

            expect(tx).to
                .emit(estateToken, 'TokenizationURIUpdated')
                .withArgs(
                    2,
                    'Token2_URI_New',
                );

            tokenizationRequest = await estateToken.getTokenizationRequest(2);
            expect(tokenizationRequest.estateId).to.equal(0);
            expect(tokenizationRequest.uri).to.equal('Token2_URI_New');
            expect(tokenizationRequest.totalSupply).to.equal(9000);
            expect(tokenizationRequest.minSellingAmount).to.equal(2000);
            expect(tokenizationRequest.maxSellingAmount).to.equal(5000);
            expect(tokenizationRequest.unitPrice).to.equal(1000);
            expect(tokenizationRequest.currency).to.equal(currency.address);
            expect(tokenizationRequest.decimals).to.equal(0);
            expect(tokenizationRequest.expireAt).to.equal(baseTimestamp + 1e9);
            expect(tokenizationRequest.publicSaleEndsAt).to.equal(baseTimestamp + 1100);
            expect(tokenizationRequest.requester).to.equal(requester2.address);
        });

        it('3.14.2. update tokenization request URI unsuccessfully by non-moderator sender', async () => {
            await expect(estateToken.connect(user).updateTokenizationURI(
                1,
                'Token1_URI_New',
            )).to.be.revertedWithCustomError(estateToken, 'Unauthorized');
        });

        it('3.14.3. update tokenization request URI unsuccessfully with invalid request id', async () => {
            await expect(estateToken.updateTokenizationURI(
                0,
                'Token1_URI_New',
            )).to.be.revertedWithCustomError(estateToken, 'InvalidRequestId');

            await expect(estateToken.updateTokenizationURI(
                100,
                'Token1_URI_New',
            )).to.be.revertedWithCustomError(estateToken, 'InvalidRequestId');
        });
    });

    describe('3.15. depositTokenization(uint256, uint256)', async () => {
        let baseTimestamp: number;

        beforeEach(async () => {
            baseTimestamp = await time.latest() + 1000;

            await callEstateToken_UpdateCommissionToken(
                estateToken,
                admins,
                commissionToken.address,
                nonce++
            );

            nonce = await addCurrency(
                admin,
                estateToken,
                admins,
                [ethers.constants.AddressZero],
                [true],
                [false],
                [0],
                [10000],
                nonce,
            );

            nonce = await addCurrency(
                admin,
                estateToken,
                admins,
                [currency.address],
                [true],
                [false],
                [0],
                [10000],
                nonce,
            );

            await time.setNextBlockTimestamp(baseTimestamp);

            await estateToken.requestTokenization(
                requester1.address,
                'Token1_URI',
                70,
                10,
                30,
                500,
                ethers.constants.AddressZero,
                3,
                baseTimestamp + 1e9,
                1000,
            );

            await time.setNextBlockTimestamp(baseTimestamp + 100);

            await estateToken.requestTokenization(
                requester2.address,
                'Token2_URI',
                900,
                200,
                500,
                20,
                currency.address,
                0,
                baseTimestamp + 1e9,
                1000,
            );
        });

        it('3.15.1. deposit tokenization successfully and correctly refund native currency', async () => {
            const initBalance1 = await ethers.provider.getBalance(depositor1.address);
            const initBalance2 = await ethers.provider.getBalance(depositor2.address);

            let tx = await estateToken.connect(depositor1).depositTokenization(
                1, 2, { value: 1000 }
            );
            await tx.wait();

            await expect(tx).to
                .emit(estateToken, 'TokenizationDeposit')
                .withArgs(1, depositor1.address, 2, 1000);

            let receipt = await tx.wait();

            expect(await ethers.provider.getBalance(depositor1.address)).to.equal(
                initBalance1.sub(receipt.effectiveGasPrice.mul(receipt.gasUsed)).sub(1000)
            );
            expect(await ethers.provider.getBalance(estateToken.address)).to.equal(1000);

            let tokenizationRequest = await estateToken.getTokenizationRequest(1);
            expect(tokenizationRequest.soldAmount).to.equal(2);
            expect(await estateToken.deposits(1, depositor1.address)).to.equal(2);

            tx = await estateToken.connect(depositor2).depositTokenization(
                1, 4, { value: 1e9 }
            );
            receipt = await tx.wait();

            expect(tx).to
                .emit(estateToken, 'DepositTokenized')
                .withArgs(1, depositor2.address, 4, 2000);

            expect(await ethers.provider.getBalance(depositor2.address)).to.equal(
                initBalance2.sub(receipt.effectiveGasPrice.mul(receipt.gasUsed)).sub(2000)
            );
            expect(await ethers.provider.getBalance(estateToken.address)).to.equal(3000);

            tokenizationRequest = await estateToken.getTokenizationRequest(1);
            expect(tokenizationRequest.soldAmount).to.equal(6);
            expect(await estateToken.deposits(1, depositor2.address)).to.equal(4);
        });

        it('3.15.2. deposit tokenization successfully with ERC20 currency', async () => {
            const initBalance1 = await currency.balanceOf(depositor1.address);
            const initBalance2 = await currency.balanceOf(depositor2.address);
            const initNativeBalance1 = await ethers.provider.getBalance(depositor1.address);
            const initNativeBalance2 = await ethers.provider.getBalance(depositor2.address);

            let tx = await estateToken.connect(depositor1).depositTokenization(
                2, 100, { value: 1e9 }
            );
            await tx.wait();

            expect(tx).to
                .emit(estateToken, 'TokenizationDeposit')
                .withArgs(2, depositor1.address, 100, 2000);

            expect(await currency.balanceOf(depositor1.address)).to.equal(
                initBalance1.sub(2000)
            );
            expect(await currency.balanceOf(estateToken.address)).to.equal(2000);

            let receipt = await tx.wait();
            expect(await ethers.provider.getBalance(depositor1.address)).to.equal(
                initNativeBalance1.sub(receipt.effectiveGasPrice.mul(receipt.gasUsed))
            );
            expect(await ethers.provider.getBalance(estateToken.address)).to.equal(0);

            let tokenizationRequest = await estateToken.getTokenizationRequest(2);
            expect(tokenizationRequest.soldAmount).to.equal(100);
            expect(await estateToken.deposits(2, depositor1.address)).to.equal(100);

            tx = await estateToken.connect(depositor2).depositTokenization(
                2, 200,
            );
            await tx.wait();

            expect(tx).to
                .emit(estateToken, 'TokenizationDeposit')
                .withArgs(2, depositor2.address, 200, 4000);

            expect(await currency.balanceOf(depositor2.address)).to.equal(
                initBalance2.sub(4000)
            );
            expect(await currency.balanceOf(estateToken.address)).to.equal(6000);

            receipt = await tx.wait();
            expect(await ethers.provider.getBalance(depositor2.address)).to.equal(
                initNativeBalance2.sub(receipt.effectiveGasPrice.mul(receipt.gasUsed))
            );
            expect(await ethers.provider.getBalance(estateToken.address)).to.equal(0);

            tokenizationRequest = await estateToken.getTokenizationRequest(2);
            expect(tokenizationRequest.soldAmount).to.equal(300);
            expect(await estateToken.deposits(2, depositor2.address)).to.equal(200);
        });

        it('3.15.3. deposit tokenization unsuccessfully when paused', async () => {
            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string"],
                [estateToken.address, "pause"]
            );
            const signatures = await getSignatures(message, admins, nonce++);
            await callTransaction(estateToken.pause(signatures));

            await expect(estateToken.connect(depositor1).depositTokenization(
                1, 2, { value: 1e9 },
            )).to.be.revertedWith("Pausable: paused");

            await expect(estateToken.connect(depositor1).depositTokenization(
                2, 100,
            )).to.be.revertedWith("Pausable: paused");
        });

        it('3.15.4. deposit tokenization unsuccessfully with invalid request id', async () => {
            await expect(estateToken.connect(depositor1).depositTokenization(
                0, 2,
            )).to.be.revertedWithCustomError(estateToken, "InvalidRequestId");

            await expect(estateToken.connect(depositor1).depositTokenization(
                100, 2,
            )).to.be.revertedWithCustomError(estateToken, "InvalidRequestId");
        });

        it('3.15.5. deposit tokenization unsuccessfully with cancelled request', async () => {
            await callTransaction(estateToken.cancelTokenization(1));

            await expect(estateToken.connect(depositor1).depositTokenization(
                1, 2, { value: 1e9 },
            )).to.be.revertedWithCustomError(estateToken, "Cancelled");

            await callTransaction(estateToken.connect(depositor1).depositTokenization(
                2, 100,
            ));

            await callTransaction(estateToken.cancelTokenization(2));

            await expect(estateToken.connect(depositor1).depositTokenization(
                1, 2, { value: 1e9 },
            )).to.be.revertedWithCustomError(estateToken, "Cancelled");

            await expect(estateToken.connect(depositor1).depositTokenization(
                2, 100,
            )).to.be.revertedWithCustomError(estateToken, "Cancelled");
        });

        it('3.15.6. deposit tokenization unsuccessfully with tokenized request', async () => {
            await callTransaction(estateToken.connect(depositor1).depositTokenization(1, 20, { value: 1e9 }));
            await callTransaction(estateToken.confirmTokenization(1, commissionReceiver.address));

            await expect(estateToken.connect(depositor1).depositTokenization(
                1, 2, { value: 1e9 },
            )).to.be.revertedWithCustomError(estateToken, "Tokenized");

            await callTransaction(estateToken.connect(depositor1).depositTokenization(
                2, 100,
            ));
        });

        it('3.15.7. deposit tokenization unsuccessfully with public sale ended', async () => {
            await time.setNextBlockTimestamp(baseTimestamp + 1001);

            await expect(estateToken.connect(depositor1).depositTokenization(
                1, 2, { value: 1e9 },
            )).to.be.revertedWithCustomError(estateToken, "PublicSaleEnded");

            await callTransaction(estateToken.connect(depositor1).depositTokenization(
                2, 100,
            ));

            await time.setNextBlockTimestamp(baseTimestamp + 2000);

            await expect(estateToken.connect(depositor1).depositTokenization(
                1, 2, { value: 1e9 },
            )).to.be.revertedWithCustomError(estateToken, "PublicSaleEnded");

            await expect(estateToken.connect(depositor1).depositTokenization(
                2, 100,
            )).to.be.revertedWithCustomError(estateToken, "PublicSaleEnded");
        });

        it('3.15.8. deposit tokenization unsuccessfully with max selling amount exceeded', async () => {
            await callTransaction(estateToken.connect(depositor1).depositTokenization(
                1, 10, { value: 1e9 },
            ));
            await callTransaction(estateToken.connect(depositor2).depositTokenization(
                1, 20, { value: 1e9 }
            ));
            await expect(estateToken.connect(depositor1).depositTokenization(
                1, 41, { value: 1e9 }
            )).to.be.revertedWithCustomError(estateToken, "MaxSellingAmountExceeded");

            await expect(estateToken.connect(depositor1).depositTokenization(
                2, 901,
            )).to.be.revertedWithCustomError(estateToken, "MaxSellingAmountExceeded");
        });

        it('3.15.9. deposit tokenization request unsuccessfully when sender does not send enough native token', async () => {
            await expect(estateToken.connect(depositor1).depositTokenization(
                1, 2,
            )).to.be.reverted;
        });

        it('3.15.10. deposit tokenization request unsuccessfully with insufficient ERC20 token allowance', async () => {
            await callTransaction(currency.connect(depositor1).decreaseAllowance(estateToken.address, 1e9));

            await expect(estateToken.connect(depositor1).depositTokenization(
                2, 100,
            )).to.be.revertedWith("ERC20: insufficient allowance");
        });

        it('3.15.11. deposit tokenization request unsuccessfully when refunding failed', async () => {
            const failReceiver = await deployFailReceiver(deployer);

            const message = estateToken.interface.encodeFunctionData('depositTokenization', [1, 2]);

            await expect(failReceiver.call(estateToken.address, message, { value: 1e9 }))
                .to.be.revertedWithCustomError(estateToken, "FailedRefund");
        });

        it('3.15.12. deposit tokenization request unsuccessfully when sender reenter this function', async () => {
            let reentrancyData = estateToken.interface.encodeFunctionData('depositTokenization', [1, 2]);

            let reentrancy = await deployReentrancy(deployer);
            await callTransaction(reentrancy.updateReentrancyPlan(estateToken.address, reentrancyData));

            let message = estateToken.interface.encodeFunctionData('depositTokenization', [1, 2]);

            await expect(reentrancy.call(estateToken.address, message, { value: 1e9 }))
                .to.be.revertedWithCustomError(estateToken, "FailedRefund");

            reentrancyData = estateToken.interface.encodeFunctionData('depositTokenization', [2, 100]);

            message = estateToken.interface.encodeFunctionData('depositTokenization', [2, 100]);

            await callTransaction(reentrancy.updateReentrancyPlan(estateToken.address, reentrancyData));

            await expect(reentrancy.call(estateToken.address, message, { value: 1e9 }))
                .to.be.revertedWithCustomError(estateToken, "FailedRefund");
        });

        // TODO: fix this test
        it('3.15.13. deposit tokenization request unsuccessfully when sender reenter this function with ERC20', async () => {
            let reentrancyData = estateToken.interface.encodeFunctionData('depositTokenization', [3, 2]);

            let reentrancyERC20 = await deployReentrancyERC20(deployer);
            await callTransaction(reentrancyERC20.updateReentrancyPlan(estateToken.address, reentrancyData));

            nonce = await addCurrency(
                admin,
                estateToken,
                admins,
                [reentrancyERC20.address],
                [true],
                [false],
                [0],
                [10000],
                nonce,
            );

            await callTransaction(estateToken.requestTokenization(
                requester1.address,
                'ReentrancyERC20_URI',
                70,
                10,
                30,
                500,
                reentrancyERC20.address,
                3,
                baseTimestamp + 1e9,
                1000,
            ));


            let message = estateToken.interface.encodeFunctionData('depositTokenization', [3, 2]);

            await expect(reentrancyERC20.call(estateToken.address, message))
                .to.be.revertedWith("ReentrancyGuard: reentrant call");
        });
    });

    describe('3.16. cancelTokenization(uint256)', async () => {
        let baseTimestamp: number;

        beforeEach(async () => {
            baseTimestamp = await time.latest() + 1000;

            await callEstateToken_UpdateCommissionToken(
                estateToken,
                admins,
                commissionToken.address,
                nonce++
            );

            nonce = await addCurrency(
                admin,
                estateToken,
                admins,
                [ethers.constants.AddressZero],
                [true],
                [false],
                [0],
                [10000],
                nonce,
            );

            nonce = await addCurrency(
                admin,
                estateToken,
                admins,
                [currency.address],
                [true],
                [false],
                [0],
                [10000],
                nonce,
            );

            await time.setNextBlockTimestamp(baseTimestamp);

            await estateToken.requestTokenization(
                requester1.address,
                'Token1_URI',
                70,
                10,
                30,
                500,
                ethers.constants.AddressZero,
                3,
                baseTimestamp + 1e9,
                1000,
            );

            await time.setNextBlockTimestamp(baseTimestamp + 100);

            await estateToken.requestTokenization(
                requester2.address,
                'Token2_URI',
                900,
                200,
                500,
                20,
                currency.address,
                0,
                baseTimestamp + 1e9,
                1000,
            );
        });

        it('3.16.1. cancel tokenization successfully', async () => {
            for (let requestId = 1; requestId <= 2; requestId++) {
                const tx = await estateToken.connect(manager).cancelTokenization(requestId);
                await tx.wait();

                expect(tx).to
                    .emit(estateToken, 'TokenizationCancellation')
                    .withArgs(requestId);

                const tokenizationRequest = await estateToken.getTokenizationRequest(requestId);
                expect(tokenizationRequest.estateId).to.equal(0);
                expect(tokenizationRequest.totalSupply).to.equal(0);
            }
        });

        it('3.16.2. cancel tokenization unsuccessfully by non-manager sender', async () => {
            await expect(estateToken.connect(user).cancelTokenization(1))
                .to.be.revertedWithCustomError(estateToken, "Unauthorized");

            await expect(estateToken.connect(moderator).cancelTokenization(2))
                .to.be.revertedWithCustomError(estateToken, "Unauthorized");
        });

        it('3.16.3. cancel tokenization unsuccessfully with invalid request id', async () => {
            await expect(estateToken.connect(manager).cancelTokenization(0))
                .to.be.revertedWithCustomError(estateToken, "InvalidRequestId");

            await expect(estateToken.connect(manager).cancelTokenization(100))
                .to.be.revertedWithCustomError(estateToken, "InvalidRequestId");
        });

        it('3.16.4. cancel tokenization unsuccessfully with cancelled request', async () => {
            await estateToken.connect(manager).cancelTokenization(1);

            await expect(estateToken.connect(manager).cancelTokenization(1))
                .to.be.revertedWithCustomError(estateToken, "Cancelled");

            await estateToken.connect(manager).cancelTokenization(2);

            await expect(estateToken.connect(manager).cancelTokenization(2))
                .to.be.revertedWithCustomError(estateToken, "Cancelled");
        });

        it('3.16.5. cancel tokenization unsuccessfully with tokenized request', async () => {
            await callTransaction(estateToken.connect(depositor1).depositTokenization(1, 20, { value: 1e9 }));
            await callTransaction(estateToken.confirmTokenization(1, commissionReceiver.address));

            await expect(estateToken.connect(manager).cancelTokenization(1))
                .to.be.revertedWithCustomError(estateToken, "Tokenized");
        });
    });

    describe('3.17. confirmTokenization(uint256, address)', async () => {
        let baseTimestamp: number;
        let currentRequestId: number;
        let currentEstateId: number;
        let blockTimestamp: number;

        beforeEach(async () => {
            baseTimestamp = await time.latest() + 1000;

            await callEstateToken_UpdateCommissionToken(
                estateToken,
                admins,
                commissionToken.address,
                nonce++
            );

            nonce = await addCurrency(
                admin,
                estateToken,
                admins,
                [ethers.constants.AddressZero],
                [true],
                [false],
                [0],
                [1e9],
                nonce,
            );

            nonce = await addCurrency(
                admin,
                estateToken,
                admins,
                [currency.address],
                [true],
                [true],
                [0],
                [1e9],
                nonce,
            );

            await time.setNextBlockTimestamp(baseTimestamp);

            await estateToken.requestTokenization(
                requester1.address,
                'Token1_URI',
                70,
                10,
                30,
                500,
                ethers.constants.AddressZero,
                3,
                baseTimestamp + 1e9,
                1000,
            );

            await time.setNextBlockTimestamp(baseTimestamp + 100);

            await estateToken.requestTokenization(
                requester2.address,
                'Token2_URI',
                1000,
                200,
                1000,
                20000,
                currency.address,
                0,
                baseTimestamp + 1e9,
                1000,
            );

            currentRequestId = 2;
            currentEstateId = 0;
            blockTimestamp = baseTimestamp + 100;
        });

        it('3.17.1. confirm tokenization successfully (manual check)', async () => {
            async function testcase1() {
                await estateToken.connect(depositor1).depositTokenization(1, 2, { value: 1e9 });
                await estateToken.connect(depositor2).depositTokenization(1, 3, { value: 1e9 });
                await estateToken.connect(depositor3).depositTokenization(1, 5, { value: 1e9 });

                await time.setNextBlockTimestamp(baseTimestamp + 110);

                const requester1InitBalance = await ethers.provider.getBalance(requester1.address);

                let tx = await estateToken.connect(manager).confirmTokenization(1, ethers.constants.AddressZero);
                await tx.wait();

                const tokenizationRequest = await estateToken.getTokenizationRequest(1);
                expect(tokenizationRequest.estateId).to.equal(1);

                const soldAmount = tokenizationRequest.soldAmount;
                const decimals = tokenizationRequest.decimals;

                let value = 10 * 500; // 5000
                let fee = value * Constant.ESTATE_TOKEN_INITIAL_FeeRate / Constant.COMMON_PERCENTAGE_DENOMINATOR; // 5
                let commissionAmount = 0;

                expect(tx).to
                    .emit(estateToken, 'TokenizationConfirmation')
                    .withArgs(
                        1,
                        1,
                        soldAmount,
                        value,
                        fee,
                        ethers.constants.AddressZero,
                        commissionAmount,
                    )
                    .emit(estateToken, 'NewToken')
                    .withArgs(
                        1,
                        1,
                        tokenizationRequest.uri,
                        decimals,
                        baseTimestamp + 110,
                        tokenizationRequest.expireAt,
                    );


                let estate = await estateToken.getEstate(1);
                expect(estate.tokenizationRequestId).to.equal(1);
                expect(estate.decimals).to.equal(3);
                expect(estate.createAt).to.equal(baseTimestamp + 110);
                expect(estate.expireAt).to.equal(baseTimestamp + 1e9);
                expect(estate.isDeprecated).to.equal(false);

                expect(await estateToken.balanceOf(requester1.address, 1)).to.equal(60_000);
                expect(await estateToken.balanceOf(estateToken.address, 1)).to.equal(10_000);

                expect(await ethers.provider.getBalance(requester1.address)).to.equal(requester1InitBalance.add(value - fee)); // 4995
                expect(await ethers.provider.getBalance(feeReceiver.address)).to.equal(fee); // 5

                expect(await estateToken.uri(1)).to.equal("TestBaseURI:Token1_URI");

                expect(await commissionToken.exists(1)).to.equal(false);
            }

            async function testcase2() {
                await estateToken.connect(depositor1).depositTokenization(2, 1000, { value: 1e9 });

                await time.setNextBlockTimestamp(baseTimestamp + 120);

                const tx = await estateToken.connect(manager).confirmTokenization(2, commissionReceiver.address);
                await tx.wait();

                const tokenizationRequest = await estateToken.getTokenizationRequest(2);
                expect(tokenizationRequest.estateId).to.equal(2);

                const soldAmount = tokenizationRequest.soldAmount;
                const decimals = tokenizationRequest.decimals;

                let value = 1000 * 20000; // 20000000
                let fee = value * Constant.ESTATE_TOKEN_INITIAL_FeeRate / Constant.COMMON_PERCENTAGE_DENOMINATOR; // 20000
                fee = fee * Constant.ESTATE_TOKEN_INITIAL_ExclusiveRate / Constant.COMMON_PERCENTAGE_DENOMINATOR; // 16000
                let commissionAmount = fee * Constant.ESTATE_TOKEN_INITIAL_CommissionRate / Constant.COMMON_PERCENTAGE_DENOMINATOR; // 6400

                expect(tx).to
                    .emit(estateToken, 'TokenizationConfirmation')
                    .withArgs(
                        2,
                        2,
                        soldAmount,
                        value,
                        fee,
                        commissionReceiver,
                        commissionAmount,
                    )
                    .emit(estateToken, 'NewToken')
                    .withArgs(
                        2,
                        2,
                        tokenizationRequest.uri,
                        decimals,
                        baseTimestamp + 120,
                        tokenizationRequest.expireAt,
                    );


                let estate = await estateToken.getEstate(2);
                expect(estate.tokenizationRequestId).to.equal(2);
                expect(estate.decimals).to.equal(0);
                expect(estate.createAt).to.equal(baseTimestamp + 120);
                expect(estate.expireAt).to.equal(baseTimestamp + 1e9);
                expect(estate.isDeprecated).to.equal(false);

                expect(await estateToken.balanceOf(requester2.address, 2)).to.equal(0);
                expect(await estateToken.balanceOf(estateToken.address, 2)).to.equal(1000);

                expect(await currency.balanceOf(requester2.address)).to.equal(19984000); // value - fee
                expect(await currency.balanceOf(feeReceiver.address)).to.equal(9600); // fee - commissionAmount
                expect(await currency.balanceOf(commissionReceiver.address)).to.equal(6400); // commissionAmount

                expect(await estateToken.uri(2)).to.equal("TestBaseURI:Token2_URI");

                expect(await commissionToken.ownerOf(2)).to.equal(commissionReceiver.address);
                expect(await commissionToken.exists(2)).to.equal(true);
                expect(await commissionToken.balanceOf(commissionReceiver.address)).to.equal(1);
            }

            await testcase1();
            await testcase2();
        });

        async function testConfirmTokenization(
            feeRate: number,
            exclusiveRate: number,
            commissionRate: number,
            isERC20: boolean,
            isExclusive: boolean,
            minSellingAmount: BigNumber,
            maxSellingAmount: BigNumber,
            totalSupply: BigNumber,
            decimals: number,
            unitPrice: BigNumber,
            deposits: any[],
            commissionReceiver: string,
        ) {
            let newCurrency: Currency | undefined;
            let newCurrencyAddress: string;
            if (isERC20) {
                newCurrency = await deployCurrency(
                    deployer.address,
                    `NewMockCurrency_${currentRequestId}`,
                    `NMC_${currentRequestId}`
                ) as Currency;
                newCurrencyAddress = newCurrency.address;
            } else {
                newCurrencyAddress = ethers.constants.AddressZero;
            }

            nonce = await addCurrency(
                admin,
                estateToken,
                admins,
                [newCurrencyAddress],
                [true],
                [isExclusive],
                [0],
                [unitPrice],
                nonce,
            );

            ++currentRequestId;
            ++currentEstateId;
            await callTransaction(estateToken.requestTokenization(
                requester1.address,
                `Token_${currentRequestId}`,
                totalSupply,
                minSellingAmount,
                maxSellingAmount,
                unitPrice,
                newCurrencyAddress,
                decimals,
                blockTimestamp + 1e9,
                1e9,
            ));

            await callEstateToken_UpdateFeeRate(estateToken, admins, feeRate, nonce++);
            await callEstateToken_UpdateExclusiveRate(estateToken, admins, exclusiveRate, nonce++);
            await callEstateToken_UpdateCommissionRate(estateToken, admins, commissionRate, nonce++);

            for (const record of deposits) {
                const value = record.depositedValue.mul(unitPrice);
                let ethValue = 0;
                if (isERC20) {
                    await callTransaction(newCurrency!.mint(record.depositor.address, value));
                    await callTransaction(newCurrency!.connect(record.depositor).increaseAllowance(estateToken.address, value));
                } else {
                    const deployerBalance = await ethers.provider.getBalance(deployer.address);
                    await ethers.provider.send("hardhat_setBalance", [
                        deployer.address,
                        ethers.utils.hexValue(deployerBalance.add(value).add(ethers.utils.parseEther("1.0")))
                    ]);
                    await callTransaction(deployer.sendTransaction({
                        to: record.depositor.address,
                        value: value.add(ethers.utils.parseEther("1.0")),
                    }));
                    ethValue = value;
                }

                await callTransaction(estateToken.connect(record.depositor).depositTokenization(
                    currentRequestId,
                    record.depositedValue,
                    { value: ethValue }
                ));
            }

            if (isERC20) {
                await callTransaction(newCurrency!.burn(requester1.address, newCurrency!.balanceOf(requester1.address)));
                await callTransaction(newCurrency!.burn(feeReceiver.address, newCurrency!.balanceOf(feeReceiver.address)));
                if (commissionReceiver !== ethers.constants.AddressZero) {
                    await callTransaction(newCurrency!.burn(commissionReceiver, newCurrency!.balanceOf(commissionReceiver)));
                }
            } else {
                await ethers.provider.send("hardhat_setBalance", [feeReceiver.address, ethers.utils.hexValue(0)]);
                if (commissionReceiver !== ethers.constants.AddressZero) {
                    await ethers.provider.send("hardhat_setBalance", [commissionReceiver, ethers.utils.hexValue(0)]);
                }
                await ethers.provider.send("hardhat_setBalance", [requester1.address, ethers.utils.hexValue(0)]);
            }

            blockTimestamp += 100;
            await time.setNextBlockTimestamp(blockTimestamp);
            const tx = await estateToken.connect(manager).confirmTokenization(currentRequestId, commissionReceiver);
            await tx.wait();

            const tokenizationRequest = await estateToken.getTokenizationRequest(currentRequestId);
            expect(tokenizationRequest.estateId).to.equal(currentEstateId);

            const soldAmount = tokenizationRequest.soldAmount;

            let value = ethers.BigNumber.from(soldAmount).mul(unitPrice);
            let fee = value.mul(feeRate).div(Constant.COMMON_PERCENTAGE_DENOMINATOR);
            if (isExclusive) {
                fee = fee.mul(exclusiveRate).div(Constant.COMMON_PERCENTAGE_DENOMINATOR);
            }
            let commissionAmount = ethers.BigNumber.from(0);
            if (commissionReceiver !== ethers.constants.AddressZero) {
                commissionAmount = fee.mul(commissionRate).div(Constant.COMMON_PERCENTAGE_DENOMINATOR);
            }

            expect(tx).to
                .emit(estateToken, 'TokenizationConfirmation')
                .withArgs(
                    currentRequestId,
                    currentEstateId,
                    soldAmount,
                    value,
                    fee,
                    commissionReceiver,
                    commissionAmount,
                )
                .emit(estateToken, 'NewToken')
                .withArgs(
                    currentEstateId,
                    currentRequestId,
                    tokenizationRequest.uri,
                    decimals,
                    blockTimestamp,
                    tokenizationRequest.expireAt,
                );


            let estate = await estateToken.getEstate(currentEstateId);
            expect(estate.tokenizationRequestId).to.equal(currentRequestId);
            expect(estate.decimals).to.equal(tokenizationRequest.decimals);
            expect(estate.createAt).to.equal(blockTimestamp);
            expect(estate.expireAt).to.equal(tokenizationRequest.expireAt);
            expect(estate.isDeprecated).to.equal(false);

            if (isERC20) {
                expect(await newCurrency!.balanceOf(requester1.address)).to.equal(value.sub(fee));
                expect(await newCurrency!.balanceOf(feeReceiver.address)).to.equal(fee.sub(commissionAmount));
                if (commissionReceiver !== ethers.constants.AddressZero) {
                    expect(await newCurrency!.balanceOf(commissionReceiver)).to.equal(commissionAmount);
                }
            } else {
                expect(await ethers.provider.getBalance(requester1.address)).to.equal(value.sub(fee));
                expect(await ethers.provider.getBalance(feeReceiver.address)).to.equal(fee.sub(commissionAmount));
                if (commissionReceiver !== ethers.constants.AddressZero) {
                    expect(await ethers.provider.getBalance(commissionReceiver)).to.equal(commissionAmount);
                }
            }

            expect(await estateToken.balanceOf(requester1.address, currentEstateId)).to.equal(
                (totalSupply.sub(soldAmount)).mul(ethers.BigNumber.from(10).pow(decimals))
            );
            expect(await estateToken.balanceOf(estateToken.address, currentEstateId)).to.equal(
                soldAmount.mul(ethers.BigNumber.from(10).pow(decimals))
            );

            expect(await estateToken.uri(currentEstateId)).to.equal(Constant.ESTATE_TOKEN_INITIAL_BaseURI + tokenizationRequest.uri);

            if (commissionReceiver !== ethers.constants.AddressZero) {
                expect(await commissionToken.ownerOf(currentEstateId)).to.equal(commissionReceiver);
                expect(await commissionToken.exists(currentEstateId)).to.equal(true);
            } else {
                expect(await commissionToken.exists(currentEstateId)).to.equal(false);
            }
        }

        it('3.17.2. confirm tokenization successfully (automatic check)', async () => {
            await testConfirmTokenization(
                Constant.ESTATE_TOKEN_INITIAL_FeeRate,
                Constant.ESTATE_TOKEN_INITIAL_ExclusiveRate,
                Constant.ESTATE_TOKEN_INITIAL_CommissionRate,
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
                ethers.constants.AddressZero,
            );

            await testConfirmTokenization(
                Constant.ESTATE_TOKEN_INITIAL_FeeRate,
                Constant.ESTATE_TOKEN_INITIAL_ExclusiveRate,
                Constant.ESTATE_TOKEN_INITIAL_CommissionRate,
                true,
                true,
                ethers.BigNumber.from(200),
                ethers.BigNumber.from(1000),
                ethers.BigNumber.from(1000),
                0,
                ethers.BigNumber.from(20000),
                [{ depositor: depositor1, depositedValue: ethers.BigNumber.from(1000) }],
                ethers.constants.AddressZero,
            );
        });

        it('3.17.3. confirm tokenization successfully in all flows', async () => {
            for (const commissionReceiverAddress of [ethers.constants.AddressZero, commissionReceiver.address]) {
                for (const isERC20 of [false, true]) {
                    for (const isExclusive of [false, true]) {
                        await testConfirmTokenization(
                            Constant.ESTATE_TOKEN_INITIAL_FeeRate,
                            Constant.ESTATE_TOKEN_INITIAL_ExclusiveRate,
                            Constant.ESTATE_TOKEN_INITIAL_CommissionRate,
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
                            commissionReceiverAddress,
                        );
                    }
                }
            }
        });

        it('3.17.4. confirm tokenization successfully with very large deposition', async () => {
            for (const commissionReceiverAddress of [ethers.constants.AddressZero, commissionReceiver.address]) {
                for (const isERC20 of [false, true]) {
                    for (const isExclusive of [false, true]) {
                        await testConfirmTokenization(
                            90_00,
                            90_00,
                            90_00,
                            isERC20,
                            isExclusive,
                            ethers.BigNumber.from(2).pow(255),
                            ethers.BigNumber.from(2).pow(256).sub(1),
                            ethers.BigNumber.from(2).pow(256).sub(1),
                            0,
                            ethers.BigNumber.from(1),
                            [
                                { depositor: depositor1, depositedValue: ethers.BigNumber.from(2).pow(255) },
                            ],
                            commissionReceiverAddress,
                        );
                    }
                }
            }
        });

        it('3.17.5. confirm tokenization successfully in 100 random test cases', async () => {
            for (let testcase = 0; testcase < 100; testcase++) {
                const commissionReceiverAddress = Math.random() < 0.5 ? ethers.constants.AddressZero : commissionReceiver.address;
                const isERC20 = Math.random() < 0.5;
                const isExclusive = Math.random() < 0.5;
                const feeRate = Math.floor(Math.random() * 100_00);
                const exclusiveRate = Math.floor(Math.random() * 100_00);
                const commissionRate = Math.floor(Math.random() * 100_00);

                const randomNums = []
                const decimals = randomInt(0, 19);
                for (let i = 0; i < 3; ++i) {
                    const maxSupply = ethers.BigNumber.from(2).pow(256).sub(1).div(ethers.BigNumber.from(10).pow(decimals));
                    randomNums.push(ethers.BigNumber.from(ethers.utils.randomBytes(32)).mod(maxSupply).add(1));
                }
                randomNums.sort((a, b) => a.sub(b).lt(0) ? -1 : 1);

                const minSellingAmount = randomNums[0];
                const maxSellingAmount = randomNums[1];
                const totalSupply = randomNums[2];

                const unitPrice = randomBigNumber(ethers.BigNumber.from(1), ethers.BigNumber.from(2).pow(256).sub(1).div(totalSupply));
                const deposits = [
                    { depositor: depositor1, depositedValue: randomBigNumber(minSellingAmount, maxSellingAmount) },
                ];

                await testConfirmTokenization(
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
                    commissionReceiverAddress,
                );
            }
        });

        it('3.17.6. confirm tokenization unsuccessfully when paused', async () => {
            await callTransaction(estateToken.connect(depositor1).depositTokenization(1, 20, { value: 1e9 }));
            await callTransaction(estateToken.connect(depositor2).depositTokenization(2, 500));

            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string"],
                [estateToken.address, "pause"]
            );
            const signatures = await getSignatures(message, admins, nonce++);
            await callTransaction(estateToken.pause(signatures));

            await expect(estateToken.connect(manager).confirmTokenization(
                1, commissionReceiver.address,
            )).to.be.revertedWith("Pausable: paused");

            await expect(estateToken.connect(manager).confirmTokenization(
                2, commissionReceiver.address,
            )).to.be.revertedWith("Pausable: paused");
        });

        it('3.17.7. confirm tokenization unsuccessfully by non-sender manager', async () => {
            await callTransaction(estateToken.connect(depositor1).depositTokenization(1, 20, { value: 1e9 }));

            await expect(estateToken.connect(user).confirmTokenization(
                1, commissionReceiver.address,
            )).to.be.revertedWithCustomError(estateToken, "Unauthorized");

            await expect(estateToken.connect(moderator).confirmTokenization(
                1, commissionReceiver.address,
            )).to.be.revertedWithCustomError(estateToken, "Unauthorized");

        });

        it('3.17.8. confirm tokenization unsuccessfully with invalid request id', async () => {
            await expect(estateToken.connect(manager).confirmTokenization(
                0, commissionReceiver.address,
            )).to.be.revertedWithCustomError(estateToken, "InvalidRequestId");

            await expect(estateToken.connect(manager).confirmTokenization(
                100, commissionReceiver.address,
            )).to.be.revertedWithCustomError(estateToken, "InvalidRequestId");
        });

        it('3.17.9. confirm tokenization unsuccessfully with cancelled request id', async () => {
            await callTransaction(estateToken.connect(depositor1).depositTokenization(1, 20, { value: 1e9 }));
            await callTransaction(estateToken.connect(depositor1).depositTokenization(2, 500));

            await callTransaction(estateToken.connect(manager).cancelTokenization(1));

            await expect(estateToken.connect(manager).confirmTokenization(
                1, commissionReceiver.address,
            )).to.be.revertedWithCustomError(estateToken, "Cancelled");

            await callTransaction(estateToken.connect(manager).confirmTokenization(
                2, commissionReceiver.address
            ));
        });

        it('3.17.10. confirm tokenization unsuccessfully with tokenized request id', async () => {
            await callTransaction(estateToken.connect(depositor1).depositTokenization(1, 20, { value: 1e9 }));
            await callTransaction(estateToken.connect(depositor1).depositTokenization(2, 500));

            await callTransaction(estateToken.connect(manager).confirmTokenization(
                1, commissionReceiver.address
            ));
            await callTransaction(estateToken.connect(manager).confirmTokenization(
                2, commissionReceiver.address
            ));

            await expect(estateToken.connect(manager).confirmTokenization(
                1, commissionReceiver.address,
            )).to.be.revertedWithCustomError(estateToken, "Tokenized");

            await expect(estateToken.connect(manager).confirmTokenization(
                2, commissionReceiver.address,
            )).to.be.revertedWithCustomError(estateToken, "Tokenized");
        });

        it('3.17.11. confirm tokenization successfully within 30 days before public sale ends', async () => {
            await callTransaction(estateToken.connect(depositor1).depositTokenization(1, 20, { value: 1e9 }));

            const confirmationTimeLimit = 30 * 24 * 60 * 60; // 30 days

            const tokenizationRequest = await estateToken.getTokenizationRequest(1);
            const publicSaleEndsAt = tokenizationRequest.publicSaleEndsAt;
            await time.setNextBlockTimestamp(publicSaleEndsAt + confirmationTimeLimit);

            await callTransaction(estateToken.connect(manager).confirmTokenization(
                1, commissionReceiver.address
            ));
        });

        it('3.17.12. confirm tokenization unsuccessfully when 30 days after public sale ends', async () => {
            await callTransaction(estateToken.connect(depositor1).depositTokenization(1, 20, { value: 1e9 }));

            const confirmationTimeLimit = 30 * 24 * 60 * 60; // 30 days

            const tokenizationRequest = await estateToken.getTokenizationRequest(1);
            const publicSaleEndsAt = tokenizationRequest.publicSaleEndsAt;
            await time.setNextBlockTimestamp(publicSaleEndsAt + confirmationTimeLimit + 1);

            await expect(estateToken.connect(manager).confirmTokenization(
                1, commissionReceiver.address
            )).to.be.revertedWithCustomError(estateToken, "FailedOwnershipTransferring");
        });

        it('3.17.13. confirm tokenization unsuccessfully when sold amount is less than min selling amount', async () => {
            await callTransaction(estateToken.connect(depositor1).depositTokenization(1, 9, { value: 1e9 }));
            await callTransaction(estateToken.connect(depositor1).depositTokenization(2, 199));

            await expect(estateToken.connect(manager).confirmTokenization(
                1, commissionReceiver.address
            )).to.be.revertedWithCustomError(estateToken, "NotEnoughSoldAmount");
        });

        it('3.17.14. confirm tokenization unsuccessfully when native token transfer to requester failed', async () => {
            const failReceiver = await deployFailReceiver(deployer);

            const receipt = await callTransaction(estateToken.connect(manager).requestTokenization(
                failReceiver.address,
                "uri",
                70,
                10,
                20,
                1000000,
                ethers.constants.AddressZero,
                3,
                baseTimestamp + 1e9,
                1000,
            ));

            const requestId = receipt.events![0].args![0];

            await callTransaction(estateToken.connect(depositor1).depositTokenization(requestId, 10, { value: 1e9 }));

            await expect(estateToken.connect(manager).confirmTokenization(
                requestId, ethers.constants.AddressZero
            )).to.be.revertedWithCustomError(estateToken, "FailedTransfer");
        });

        it('3.17.15. confirm tokenization unsuccessfully when native token transfer to fee receiver failed', async () => {
            const failReceiver = await deployFailReceiver(deployer);

            estateToken = await deployEstateToken(
                deployer.address,
                admin.address,
                failReceiver.address,
                Constant.ESTATE_TOKEN_INITIAL_BaseURI,
                Constant.ESTATE_TOKEN_INITIAL_RoyaltyRate,
                Constant.ESTATE_TOKEN_INITIAL_FeeRate,
                Constant.ESTATE_TOKEN_INITIAL_ExclusiveRate,
                Constant.ESTATE_TOKEN_INITIAL_CommissionRate,
            ) as EstateToken;

            await callEstateToken_UpdateUnitPriceBoundaries(
                estateToken,
                admins,
                [ethers.constants.AddressZero],
                [0],
                [1e9],
                nonce++
            )

            await callEstateToken_UpdateUnitPriceBoundaries(
                estateToken,
                admins,
                [currency.address],
                [0],
                [1e9],
                nonce++
            )

            const receipt = await callTransaction(estateToken.connect(manager).requestTokenization(
                requester1.address,
                "uri",
                70,
                10,
                20,
                1000000,
                ethers.constants.AddressZero,
                3,
                baseTimestamp + 1e9,
                1000,
            ));

            const requestId = receipt.events![0].args![0];

            await callTransaction(estateToken.connect(depositor1).depositTokenization(requestId, 10, { value: 1e9 }));

            await expect(estateToken.connect(manager).confirmTokenization(
                requestId, ethers.constants.AddressZero
            )).to.be.revertedWithCustomError(estateToken, "FailedTransfer");
        });

        it('3.17.16. confirm tokenization unsuccessfully when native token transfer to commission receiver failed', async () => {
            const failReceiver = await deployFailReceiver(deployer);

            const receipt = await callTransaction(estateToken.connect(manager).requestTokenization(
                requester1.address,
                "uri",
                70,
                10,
                20,
                1000000,
                ethers.constants.AddressZero,
                3,
                baseTimestamp + 1e9,
                1000,
            ));

            const requestId = receipt.events![0].args![0];

            await callTransaction(estateToken.connect(depositor1).depositTokenization(requestId, 10, { value: 1e9 }));

            await expect(estateToken.connect(manager).confirmTokenization(
                requestId, failReceiver.address
            )).to.be.revertedWithCustomError(estateToken, "FailedTransfer");
        });

        it('3.17.17. confirm tokenization unsuccessfully when requester reenter this function', async () => {
            let reentrancy = await deployReentrancyERC1155Holder(deployer);

            await callAdmin_AuthorizeManagers(admin, admins, [reentrancy.address], nonce++);

            const receipt = await callTransaction(estateToken.connect(manager).requestTokenization(
                reentrancy.address,
                "uri",
                70,
                10,
                20,
                1000000,
                ethers.constants.AddressZero,
                3,
                baseTimestamp + 1e9,
                1000,
            ));

            const requestId = receipt.events![0].args![0];
            await callTransaction(estateToken.connect(depositor1).depositTokenization(requestId, 10, { value: 1e9 }));

            let reentrancyData = estateToken.interface.encodeFunctionData('confirmTokenization', [requestId, commissionReceiver.address]);

            await callTransaction(reentrancy.updateReentrancyPlan(estateToken.address, reentrancyData));

            let message = estateToken.interface.encodeFunctionData('confirmTokenization', [requestId, commissionReceiver.address]);

            await expect(reentrancy.call(estateToken.address, message))
                .to.be.revertedWithCustomError(estateToken, "FailedTransfer");
        });

        it('3.17.18. confirm tokenization unsuccessfully when feeReceiver reenter this function', async () => {
            let reentrancy = await deployReentrancyERC1155Holder(deployer);

            estateToken = await deployEstateToken(
                deployer.address,
                admin.address,
                reentrancy.address,
                Constant.ESTATE_TOKEN_INITIAL_BaseURI,
                Constant.ESTATE_TOKEN_INITIAL_RoyaltyRate,
                Constant.ESTATE_TOKEN_INITIAL_FeeRate,
                Constant.ESTATE_TOKEN_INITIAL_ExclusiveRate,
                Constant.ESTATE_TOKEN_INITIAL_CommissionRate,
            ) as EstateToken;

            await callEstateToken_UpdateUnitPriceBoundaries(
                estateToken,
                admins,
                [ethers.constants.AddressZero],
                [0],
                [1e9],
                nonce++
            )

            await callEstateToken_UpdateUnitPriceBoundaries(
                estateToken,
                admins,
                [currency.address],
                [0],
                [1e9],
                nonce++
            )

            const receipt = await callTransaction(estateToken.connect(manager).requestTokenization(
                requester1.address,
                "uri",
                70,
                10,
                20,
                1000000,
                ethers.constants.AddressZero,
                3,
                baseTimestamp + 1e9,
                1000,
            ));

            await callAdmin_AuthorizeManagers(admin, admins, [reentrancy.address], nonce++);

            const requestId = receipt.events![0].args![0];
            await callTransaction(estateToken.connect(depositor1).depositTokenization(requestId, 10, { value: 1e9 }));

            let reentrancyData = estateToken.interface.encodeFunctionData('confirmTokenization', [requestId, ethers.constants.AddressZero]);

            await callTransaction(reentrancy.updateReentrancyPlan(estateToken.address, reentrancyData));

            let message = estateToken.interface.encodeFunctionData('confirmTokenization', [requestId, ethers.constants.AddressZero]);

            await expect(reentrancy.call(estateToken.address, message))
                .to.be.revertedWithCustomError(estateToken, "FailedTransfer");
        });

        it('3.17.19. confirm tokenization unsuccessfully when commissionReceiver reenter this function', async () => {
            let reentrancy = await deployReentrancyERC1155Holder(deployer);

            await callAdmin_AuthorizeManagers(admin, admins, [reentrancy.address], nonce++);

            const receipt = await callTransaction(estateToken.connect(manager).requestTokenization(
                requester1.address,
                "uri",
                70,
                10,
                20,
                1000000,
                ethers.constants.AddressZero,
                3,
                baseTimestamp + 1e9,
                1000,
            ));

            const requestId = receipt.events![0].args![0];
            await callTransaction(estateToken.connect(depositor1).depositTokenization(requestId, 10, { value: 1e9 }));

            let reentrancyData = estateToken.interface.encodeFunctionData('confirmTokenization', [requestId, reentrancy.address]);

            await callTransaction(reentrancy.updateReentrancyPlan(estateToken.address, reentrancyData));

            let message = estateToken.interface.encodeFunctionData('confirmTokenization', [requestId, reentrancy.address]);

            await expect(reentrancy.call(estateToken.address, message))
                .to.be.revertedWithCustomError(estateToken, "FailedTransfer");
        });

        it('3.17.20. confirm tokenization when reentracy attack with ERC20 token', async () => {
            const reentrancy = await deployReentrancyERC20(
                deployer,
            ) as ReentrancyERC20;

            await callAdmin_AuthorizeManagers(admin, admins, [reentrancy.address], nonce++);

            nonce = await addCurrency(
                admin,
                estateToken,
                admins,
                [reentrancy.address],
                [true],
                [false],
                [0],
                [1e9],
                nonce,
            );

            const receipt = await callTransaction(estateToken.connect(manager).requestTokenization(
                depositor1.address,
                "uri",
                70,
                10,
                20,
                1000000,
                reentrancy.address,
                3,
                baseTimestamp + 1e9,
                1000,
            ));

            const requestId = receipt.events![0].args![0];
            await callTransaction(estateToken.connect(depositor1).depositTokenization(requestId, 10, { value: 1e9 }));

            let reentrancyData = estateToken.interface.encodeFunctionData('confirmTokenization', [requestId, commissionReceiver.address]);

            await callTransaction(reentrancy.updateReentrancyPlan(estateToken.address, reentrancyData));

            let message = estateToken.interface.encodeFunctionData('confirmTokenization', [requestId, commissionReceiver.address]);

            await expect(reentrancy.call(estateToken.address, message))
                .to.be.revertedWith("ReentrancyGuard: reentrant call");
        });

    });

    describe("3.18. withdrawDeposit(uint256)", () => {
        let baseTimestamp: number;

        beforeEach(async () => {
            baseTimestamp = await time.latest() + 1000;

            await callEstateToken_UpdateCommissionToken(
                estateToken,
                admins,
                commissionToken.address,
                nonce++
            );

            nonce = await addCurrency(
                admin,
                estateToken,
                admins,
                [ethers.constants.AddressZero],
                [true],
                [false],
                [0],
                [ethers.BigNumber.from(10).pow(18)],
                nonce,
            );

            nonce = await addCurrency(
                admin,
                estateToken,
                admins,
                [currency.address],
                [true],
                [false],
                [0],
                [ethers.BigNumber.from(10).pow(18)],
                nonce,
            );

            await time.setNextBlockTimestamp(baseTimestamp);

            await estateToken.requestTokenization(
                requester1.address,
                'Token1_URI',
                70,
                10,
                30,
                1000,
                ethers.constants.AddressZero,
                3,
                baseTimestamp + 1e9,
                1000,
            );

            await time.setNextBlockTimestamp(baseTimestamp + 100);

            await estateToken.requestTokenization(
                requester2.address,
                'Token2_URI',
                900,
                200,
                500,
                20,
                currency.address,
                0,
                baseTimestamp + 1e9,
                1000,
            );
        });

        it("3.18.1. withdraw deposit successfully when request is cancelled", async () => {
            await estateToken.connect(depositor1).depositTokenization(1, 10, { value: 1e9 });
            await estateToken.connect(depositor2).depositTokenization(2, 500);

            await estateToken.connect(manager).cancelTokenization(1);
            await estateToken.connect(manager).cancelTokenization(2);

            const depositor1InitBalance = await ethers.provider.getBalance(depositor1.address);
            const depositor2InitCurrencyBalance = await currency.balanceOf(depositor2.address);

            let tx = await estateToken.connect(depositor1).withdrawDeposit(1);
            let receipt = await tx.wait();

            let value = 10 * 1000;
            expect(tx)
                .emit(estateToken, "TokenizationDepositWithdrawal")
                .withArgs(1, depositor1.address, 10, value);

            expect(await estateToken.hasWithdrawn(1, depositor1.address)).to.be.equal(true);

            expect(await ethers.provider.getBalance(depositor1.address))
                .to.be.equal(depositor1InitBalance.sub(receipt.gasUsed.mul(receipt.effectiveGasPrice)).add(value));

            tx = await estateToken.connect(depositor2).withdrawDeposit(2);
            receipt = await tx.wait();

            value = 500 * 20;
            expect(tx)
                .emit(estateToken, "TokenizationDepositWithdrawal")
                .withArgs(2, depositor2.address, 100, value);

            expect(await estateToken.hasWithdrawn(2, depositor2.address)).to.be.equal(true);

            expect(await currency.balanceOf(depositor2.address))
                .to.be.equal(depositor2InitCurrencyBalance.add(value));
        });

        it("3.18.2. withdraw deposit successfully when public sale ended and sold amount is less than minimum selling amount", async () => {
            await estateToken.connect(depositor1).depositTokenization(1, 5, { value: 1e9 });
            await estateToken.connect(depositor2).depositTokenization(2, 100);

            const publicSaleEndsAt1 = (await estateToken.getTokenizationRequest(1)).publicSaleEndsAt;
            const publicSaleEndsAt2 = (await estateToken.getTokenizationRequest(2)).publicSaleEndsAt;

            const depositor1InitBalance = await ethers.provider.getBalance(depositor1.address);
            const depositor2InitBalance = await currency.balanceOf(depositor2.address);

            await time.setNextBlockTimestamp(publicSaleEndsAt1 + 1);
            let tx = await estateToken.connect(depositor1).withdrawDeposit(1);
            let receipt = await tx.wait();

            let value = 5 * 1000;
            expect(tx)
                .emit(estateToken, "TokenizationDepositWithdrawal")
                .withArgs(1, depositor1.address, 10, value);

            expect(await estateToken.hasWithdrawn(1, depositor1.address)).to.be.equal(true);

            expect(await ethers.provider.getBalance(depositor1.address))
                .to.be.equal(depositor1InitBalance.sub(receipt.gasUsed.mul(receipt.effectiveGasPrice)).add(value));

            await time.setNextBlockTimestamp(publicSaleEndsAt2 + 1);
            tx = await estateToken.connect(depositor2).withdrawDeposit(2);
            receipt = await tx.wait();

            value = 100 * 20;
            expect(tx)
                .emit(estateToken, "TokenizationDepositWithdrawal")
                .withArgs(2, depositor2.address, 100, value);

            expect(await estateToken.hasWithdrawn(2, depositor2.address)).to.be.equal(true);

            expect(await currency.balanceOf(depositor2.address))
                .to.be.equal(depositor2InitBalance.add(value));
        });

        it("3.18.3. withdraw deposit successfully when 30 days after public sale ended and request is not tokenized", async () => {
            await estateToken.connect(depositor1).depositTokenization(1, 10, { value: 1e9 });
            await estateToken.connect(depositor2).depositTokenization(2, 500);

            const days_30 = 30 * 24 * 60 * 60;
            const publicSaleEndsAt1 = (await estateToken.getTokenizationRequest(1)).publicSaleEndsAt;
            const publicSaleEndsAt2 = (await estateToken.getTokenizationRequest(2)).publicSaleEndsAt;

            const depositor1InitBalance = await ethers.provider.getBalance(depositor1.address);
            const depositor2InitBalance = await currency.balanceOf(depositor2.address);

            await time.setNextBlockTimestamp(publicSaleEndsAt1 + days_30 + 1);
            let tx = await estateToken.connect(depositor1).withdrawDeposit(1);
            let receipt = await tx.wait();

            let value = 10 * 1000;
            expect(tx)
                .emit(estateToken, "TokenizationDepositWithdrawal")
                .withArgs(1, depositor1.address, 10, value);

            expect(await estateToken.hasWithdrawn(1, depositor1.address)).to.be.equal(true);

            expect(await ethers.provider.getBalance(depositor1.address))
                .to.be.equal(depositor1InitBalance.sub(receipt.gasUsed.mul(receipt.effectiveGasPrice)).add(value));

            await time.setNextBlockTimestamp(publicSaleEndsAt2 + days_30 + 1);
            tx = await estateToken.connect(depositor2).withdrawDeposit(2);
            receipt = await tx.wait();

            value = 500 * 20;
            expect(tx)
                .emit(estateToken, "TokenizationDepositWithdrawal")
                .withArgs(2, depositor2.address, 100, value);

            expect(await estateToken.hasWithdrawn(2, depositor2.address)).to.be.equal(true);

            expect(await currency.balanceOf(depositor2.address))
                .to.be.equal(depositor2InitBalance.add(value));
        });

        it("3.18.4. withdraw deposit successfully when sender has no deposits", async () => {
            await estateToken.connect(manager).cancelTokenization(1);
            await estateToken.connect(manager).cancelTokenization(2);

            const depositor3InitBalance = await ethers.provider.getBalance(depositor3.address);
            const depositor3InitCurrencyBalance = await currency.balanceOf(depositor3.address);

            let tx = await estateToken.connect(depositor3).withdrawDeposit(1);
            let receipt = await tx.wait();

            expect(tx)
                .emit(estateToken, "TokenizationDepositWithdrawal")
                .withArgs(1, depositor3.address, 0, 0);

            expect(await estateToken.hasWithdrawn(1, depositor3.address)).to.be.equal(true);

            expect(await ethers.provider.getBalance(depositor3.address))
                .to.be.equal(depositor3InitBalance.sub(receipt.gasUsed.mul(receipt.effectiveGasPrice)));

            tx = await estateToken.connect(depositor3).withdrawDeposit(2);
            receipt = await tx.wait();

            expect(tx)
                .emit(estateToken, "TokenizationDepositWithdrawal")
                .withArgs(2, depositor3.address, 0, 0);

            expect(await estateToken.hasWithdrawn(1, depositor3.address)).to.be.equal(true);

            expect(await currency.balanceOf(depositor3.address))
                .to.be.equal(depositor3InitCurrencyBalance);
        });

        it("3.18.5. withdraw deposit unsuccessfully when paused", async () => {
            await estateToken.connect(depositor1).depositTokenization(1, 10, { value: 1e9 });
            await estateToken.connect(depositor2).depositTokenization(2, 500);

            await callEstateToken_Pause(estateToken, admins, nonce++);

            await expect(estateToken.connect(depositor1).withdrawDeposit(1))
                .to.be.revertedWith("Pausable: paused");
            await expect(estateToken.connect(depositor2).withdrawDeposit(2))
                .to.be.revertedWith("Pausable: paused");
        });

        it("3.18.6. withdraw deposit unsuccessfully with invalid request id", async () => {
            await expect(estateToken.connect(depositor1).withdrawDeposit(0))
                .to.be.revertedWithCustomError(estateToken, "InvalidRequestId");
            await expect(estateToken.connect(depositor2).withdrawDeposit(100))
                .to.be.revertedWithCustomError(estateToken, "InvalidRequestId");
        });

        it("3.18.7. withdraw deposit unsuccessfully with tokenized request", async () => {
            await estateToken.connect(depositor1).depositTokenization(1, 10, { value: 1e9 });
            await estateToken.connect(depositor2).depositTokenization(2, 500);

            await estateToken.connect(manager).confirmTokenization(1, ethers.constants.AddressZero);
            await estateToken.connect(manager).confirmTokenization(2, ethers.constants.AddressZero);

            await expect(estateToken.connect(depositor1).withdrawDeposit(1))
                .to.be.revertedWithCustomError(estateToken, "Tokenized");
            await expect(estateToken.connect(depositor2).withdrawDeposit(2))
                .to.be.revertedWithCustomError(estateToken, "Tokenized");
        });

        it("3.18.8. withdraw deposit unsuccessfully when public sale not ended", async () => {
            await estateToken.connect(depositor1).depositTokenization(1, 5, { value: 1e9 });
            await estateToken.connect(depositor2).depositTokenization(2, 100);

            await expect(estateToken.connect(depositor1).withdrawDeposit(1))
                .to.be.revertedWithCustomError(estateToken, "StillSelling");
            await expect(estateToken.connect(depositor2).withdrawDeposit(2))
                .to.be.revertedWithCustomError(estateToken, "StillSelling");
        });

        it("3.18.9. withdraw deposit unsuccessfully when 30 days before public sale ends and sold amount is sufficient", async () => {
            await estateToken.connect(depositor1).depositTokenization(1, 10, { value: 1e9 });
            await estateToken.connect(depositor2).depositTokenization(2, 500);

            const days_30 = 30 * 24 * 60 * 60;
            const publicSaleEndsAt1 = (await estateToken.getTokenizationRequest(1)).publicSaleEndsAt;
            const publicSaleEndsAt2 = (await estateToken.getTokenizationRequest(2)).publicSaleEndsAt;

            await time.setNextBlockTimestamp(publicSaleEndsAt1 + days_30);
            await expect(estateToken.connect(depositor1).withdrawDeposit(1))
                .to.be.revertedWithCustomError(estateToken, "InvalidWithdrawing");

            await time.setNextBlockTimestamp(publicSaleEndsAt2 + days_30);
            await expect(estateToken.connect(depositor2).withdrawDeposit(2))
                .to.be.revertedWithCustomError(estateToken, "InvalidWithdrawing");
        });

        it("3.18.10. withdraw deposit unsuccessfully when user already withdrawn", async () => {
            await callTransaction(estateToken.connect(depositor1).depositTokenization(1, 10, { value: 1e9 }));
            await callTransaction(estateToken.connect(depositor1).depositTokenization(2, 200));
            await callTransaction(estateToken.connect(depositor2).depositTokenization(1, 10, { value: 1e9 }));
            await callTransaction(estateToken.connect(depositor2).depositTokenization(2, 200));

            await callTransaction(estateToken.connect(manager).cancelTokenization(1));
            await callTransaction(estateToken.connect(manager).cancelTokenization(2));

            await callTransaction(estateToken.connect(depositor1).withdrawDeposit(1));
            await callTransaction(estateToken.connect(depositor1).withdrawDeposit(2));
            await callTransaction(estateToken.connect(depositor2).withdrawDeposit(1));
            await callTransaction(estateToken.connect(depositor2).withdrawDeposit(2));

            await expect(estateToken.connect(depositor1).withdrawDeposit(1))
                .to.be.revertedWithCustomError(estateToken, "AlreadyWithdrawn");
            await expect(estateToken.connect(depositor1).withdrawDeposit(2))
                .to.be.revertedWithCustomError(estateToken, "AlreadyWithdrawn");
            await expect(estateToken.connect(depositor2).withdrawDeposit(1))
                .to.be.revertedWithCustomError(estateToken, "AlreadyWithdrawn");
            await expect(estateToken.connect(depositor2).withdrawDeposit(2))
                .to.be.revertedWithCustomError(estateToken, "AlreadyWithdrawn");
        });

        it("3.18.11. withdraw deposit unsuccessfully when native transfer to sender failed", async () => {
            const failedReceiver = await deployFailReceiver(deployer);

            let message = estateToken.interface.encodeFunctionData("depositTokenization", [1, 10]);
            const value = 10 * 1000;

            await callTransaction(failedReceiver.call(estateToken.address, message, { value: value }));

            await callTransaction(estateToken.connect(manager).cancelTokenization(1));

            message = estateToken.interface.encodeFunctionData("withdrawDeposit", [1]);

            await expect(failedReceiver.call(estateToken.address, message))
                .to.be.revertedWithCustomError(estateToken, "FailedTransfer");
        });

        it("3.18.12. withdraw deposit unsuccessfully when sender reenter this function", async () => {
            const reentrancy = await deployReentrancy(deployer);

            let message = estateToken.interface.encodeFunctionData("depositTokenization", [1, 10]);
            const value = 10 * 1000;

            await callTransaction(reentrancy.call(estateToken.address, message, { value: value }));

            await callTransaction(estateToken.connect(manager).cancelTokenization(1));

            message = estateToken.interface.encodeFunctionData("withdrawDeposit", [1]);
            await callTransaction(reentrancy.updateReentrancyPlan(estateToken.address, message));

            await expect(reentrancy.call(estateToken.address, message))
                .to.be.revertedWithCustomError(estateToken, "FailedTransfer");
        });

        it("3.18.13. withdraw deposit unsuccessfully when ERC20.transfer reenter this function", async () => {
            const reentrancyERC20 = await deployReentrancyERC20(deployer);

            nonce = await addCurrency(
                admin,
                estateToken,
                admins,
                [reentrancyERC20.address],
                [true],
                [false],
                [0],
                [ethers.BigNumber.from(10).pow(18)],
                nonce
            );

            const receipt = await callTransaction(estateToken.connect(manager).requestTokenization(
                depositor1.address,
                "uri",
                70,
                10,
                20,
                1000,
                reentrancyERC20.address,
                3,
                baseTimestamp + 1e9,
                1000
            ));

            const requestId = receipt.events![0].args![0];

            const value = 10 * 1000;
            await callTransaction(estateToken.connect(depositor1).depositTokenization(requestId, 10, { value: value }));

            await callTransaction(estateToken.connect(manager).cancelTokenization(requestId));

            let message = estateToken.interface.encodeFunctionData("withdrawDeposit", [requestId]);
            await callTransaction(reentrancyERC20.updateReentrancyPlan(estateToken.address, message));

            await expect(reentrancyERC20.call(estateToken.address, message))
                .to.be.revertedWith("ReentrancyGuard: reentrant call");
        });
    });

    describe("3.19. withdrawToken(uint256)", () => {
        let baseTimestamp: number;

        beforeEach(async () => {
            baseTimestamp = await time.latest() + 1000;

            await callEstateToken_UpdateCommissionToken(
                estateToken,
                admins,
                commissionToken.address,
                nonce++
            );

            nonce = await addCurrency(
                admin,
                estateToken,
                admins,
                [ethers.constants.AddressZero],
                [true],
                [false],
                [0],
                [ethers.BigNumber.from(10).pow(18)],
                nonce,
            );

            nonce = await addCurrency(
                admin,
                estateToken,
                admins,
                [currency.address],
                [true],
                [false],
                [0],
                [ethers.BigNumber.from(10).pow(18)],
                nonce,
            );

            await time.setNextBlockTimestamp(baseTimestamp);

            await estateToken.requestTokenization(
                requester1.address,
                'Token1_URI',
                70,
                10,
                30,
                1000,
                ethers.constants.AddressZero,
                3,
                baseTimestamp + 1e9,
                1000,
            );

            await time.setNextBlockTimestamp(baseTimestamp + 100);

            await estateToken.requestTokenization(
                requester2.address,
                'Token2_URI',
                900,
                200,
                500,
                20,
                currency.address,
                0,
                baseTimestamp + 1e9,
                1000,
            );
        });

        it("3.19.1. withdraw token successfully after request is confirmed", async () => {
            await callTransaction(estateToken.connect(depositor1).depositTokenization(1, 2, { value: 1e9 }));
            await callTransaction(estateToken.connect(depositor2).depositTokenization(1, 3, { value: 1e9 }));
            await callTransaction(estateToken.connect(depositor3).depositTokenization(1, 5, { value: 1e9 }));
            await callTransaction(estateToken.connect(depositor1).depositTokenization(2, 100));
            await callTransaction(estateToken.connect(depositor2).depositTokenization(2, 400));

            await callTransaction(estateToken.connect(manager).confirmTokenization(1, ethers.constants.AddressZero));
            await callTransaction(estateToken.connect(manager).confirmTokenization(2, ethers.constants.AddressZero));

            let tx = await estateToken.connect(depositor1).withdrawToken(1);
            expect(tx)
                .emit(estateToken, "TokenizationTokenWithdrawal")
                .withArgs(1, depositor1.address, 2);
            expect(await estateToken.hasWithdrawn(1, depositor1.address)).to.be.equal(true);
            expect(await estateToken.balanceOf(depositor1.address, 1)).to.be.equal(2_000);
            expect(await estateToken.balanceOf(estateToken.address, 1)).to.be.equal(8_000);
            expect(await estateToken.balanceOf(estateToken.address, 2)).to.be.equal(500);

            tx = await estateToken.connect(depositor2).withdrawToken(1);
            expect(tx)
                .emit(estateToken, "TokenizationTokenWithdrawal")
                .withArgs(1, depositor2.address, 3);
            expect(await estateToken.hasWithdrawn(1, depositor2.address)).to.be.equal(true);
            expect(await estateToken.balanceOf(depositor2.address, 1)).to.be.equal(3_000);
            expect(await estateToken.balanceOf(estateToken.address, 1)).to.be.equal(5_000);
            expect(await estateToken.balanceOf(estateToken.address, 2)).to.be.equal(500);

            tx = await estateToken.connect(depositor3).withdrawToken(1);
            expect(tx)
                .emit(estateToken, "TokenizationTokenWithdrawal")
                .withArgs(1, depositor3.address, 5);
            expect(await estateToken.hasWithdrawn(1, depositor3.address)).to.be.equal(true);
            expect(await estateToken.balanceOf(depositor3.address, 1)).to.be.equal(5_000);
            expect(await estateToken.balanceOf(estateToken.address, 1)).to.be.equal(0);
            expect(await estateToken.balanceOf(estateToken.address, 2)).to.be.equal(500);

            tx = await estateToken.connect(depositor1).withdrawToken(2);
            expect(tx)
                .emit(estateToken, "TokenizationTokenWithdrawal")
                .withArgs(2, depositor1.address, 100);
            expect(await estateToken.hasWithdrawn(2, depositor1.address)).to.be.equal(true);
            expect(await estateToken.balanceOf(depositor1.address, 2)).to.be.equal(100);
            expect(await estateToken.balanceOf(estateToken.address, 1)).to.be.equal(0);
            expect(await estateToken.balanceOf(estateToken.address, 2)).to.be.equal(400);

            tx = await estateToken.connect(depositor2).withdrawToken(2);
            expect(tx)
                .emit(estateToken, "TokenizationTokenWithdrawal")
                .withArgs(2, depositor2.address, 400);
            expect(await estateToken.hasWithdrawn(2, depositor2.address)).to.be.equal(true);
            expect(await estateToken.balanceOf(depositor2.address, 2)).to.be.equal(400);
            expect(await estateToken.balanceOf(estateToken.address, 1)).to.be.equal(0);
            expect(await estateToken.balanceOf(estateToken.address, 2)).to.be.equal(0);
        });

        it("3.19.2. withdraw token successfully when sender has no deposits", async () => {
            await callTransaction(estateToken.connect(depositor1).depositTokenization(1, 10, { value: 1e9 }));
            await callTransaction(estateToken.connect(depositor2).depositTokenization(2, 500, { value: 1e9 }));

            await callTransaction(estateToken.connect(manager).confirmTokenization(1, ethers.constants.AddressZero));
            await callTransaction(estateToken.connect(manager).confirmTokenization(2, ethers.constants.AddressZero));

            let tx = await estateToken.connect(depositor3).withdrawToken(1);
            expect(tx)
                .emit(estateToken, "TokenizationTokenWithdrawal")
                .withArgs(1, depositor3.address, 0);
            expect(await estateToken.hasWithdrawn(1, depositor3.address)).to.be.equal(true);
            expect(await estateToken.balanceOf(depositor3.address, 1)).to.be.equal(0);
            expect(await estateToken.balanceOf(estateToken.address, 1)).to.be.equal(10_000);
            expect(await estateToken.balanceOf(estateToken.address, 2)).to.be.equal(500);

            tx = await estateToken.connect(depositor3).withdrawToken(2);
            expect(tx)
                .emit(estateToken, "TokenizationTokenWithdrawal")
                .withArgs(2, depositor3.address, 0);
            expect(await estateToken.hasWithdrawn(2, depositor3.address)).to.be.equal(true);
            expect(await estateToken.balanceOf(depositor3.address, 2)).to.be.equal(0);
            expect(await estateToken.balanceOf(estateToken.address, 1)).to.be.equal(10_000);
            expect(await estateToken.balanceOf(estateToken.address, 2)).to.be.equal(500);
        });

        it("3.19.3. withdraw token successfully when paused", async () => {
            await callTransaction(estateToken.connect(depositor1).depositTokenization(1, 10, { value: 1e9 }));
            await callTransaction(estateToken.connect(depositor2).depositTokenization(2, 500, { value: 1e9 }));

            await callTransaction(estateToken.connect(manager).confirmTokenization(1, ethers.constants.AddressZero));
            await callTransaction(estateToken.connect(manager).confirmTokenization(2, ethers.constants.AddressZero));

            await callEstateToken_Pause(estateToken, admins, nonce++);

            await expect(estateToken.connect(depositor1).withdrawToken(1))
                .to.be.revertedWith("Pausable: paused");
            await expect(estateToken.connect(depositor2).withdrawToken(2))
                .to.be.revertedWith("Pausable: paused");
        });

        it("3.19.4. withdraw token unsuccessfully with invalid request id", async () => {
            await callTransaction(estateToken.connect(depositor1).depositTokenization(1, 10, { value: 1e9 }));
            await callTransaction(estateToken.connect(depositor2).depositTokenization(2, 500, { value: 1e9 }));

            await callTransaction(estateToken.connect(manager).confirmTokenization(1, ethers.constants.AddressZero));
            await callTransaction(estateToken.connect(manager).confirmTokenization(2, ethers.constants.AddressZero));

            await expect(estateToken.connect(depositor1).withdrawToken(0))
                .to.be.revertedWithCustomError(estateToken, "InvalidRequestId");
            await expect(estateToken.connect(depositor2).withdrawToken(100))
                .to.be.revertedWithCustomError(estateToken, "InvalidRequestId");
        });

        it("3.19.5. withdraw token unsuccessfully with unconfirmed request", async () => {
            await callTransaction(estateToken.connect(depositor1).depositTokenization(1, 10, { value: 1e9 }));
            await callTransaction(estateToken.connect(depositor2).depositTokenization(2, 500, { value: 1e9 }));

            await expect(estateToken.connect(depositor1).withdrawToken(1))
                .to.be.revertedWithCustomError(estateToken, "InvalidWithdrawing");
            await expect(estateToken.connect(depositor2).withdrawToken(2))
                .to.be.revertedWithCustomError(estateToken, "InvalidWithdrawing");
        });

        it("3.19.6. withdraw token unsuccessfully when sender is already withdrawn", async () => {
            await callTransaction(estateToken.connect(depositor1).depositTokenization(1, 10, { value: 1e9 }));
            await callTransaction(estateToken.connect(depositor1).depositTokenization(2, 200));
            await callTransaction(estateToken.connect(depositor2).depositTokenization(1, 10, { value: 1e9 }));
            await callTransaction(estateToken.connect(depositor2).depositTokenization(2, 200));

            await callTransaction(estateToken.connect(manager).confirmTokenization(1, ethers.constants.AddressZero));
            await callTransaction(estateToken.connect(manager).confirmTokenization(2, ethers.constants.AddressZero));

            await callTransaction(estateToken.connect(depositor1).withdrawToken(1));
            await callTransaction(estateToken.connect(depositor1).withdrawToken(2));
            await callTransaction(estateToken.connect(depositor2).withdrawToken(1));
            await callTransaction(estateToken.connect(depositor2).withdrawToken(2));

            await expect(estateToken.connect(depositor1).withdrawToken(1))
                .to.be.revertedWithCustomError(estateToken, "AlreadyWithdrawn");
            await expect(estateToken.connect(depositor1).withdrawToken(2))
                .to.be.revertedWithCustomError(estateToken, "AlreadyWithdrawn");
            await expect(estateToken.connect(depositor2).withdrawToken(1))
                .to.be.revertedWithCustomError(estateToken, "AlreadyWithdrawn");
            await expect(estateToken.connect(depositor2).withdrawToken(2))
                .to.be.revertedWithCustomError(estateToken, "AlreadyWithdrawn");
        });
    });

    describe('3.20. getEstate(uint256)', () => {
        let baseTimestamp: number;

        beforeEach(async () => {
            baseTimestamp = await time.latest() + 1000;

            await callEstateToken_UpdateCommissionToken(
                estateToken,
                admins,
                commissionToken.address,
                nonce++
            );

            nonce = await addCurrency(
                admin,
                estateToken,
                admins,
                [ethers.constants.AddressZero],
                [true],
                [false],
                [0],
                [ethers.BigNumber.from(10).pow(18)],
                nonce,
            );

            nonce = await addCurrency(
                admin,
                estateToken,
                admins,
                [currency.address],
                [true],
                [false],
                [0],
                [ethers.BigNumber.from(10).pow(18)],
                nonce,
            );

            await time.setNextBlockTimestamp(baseTimestamp);

            await estateToken.requestTokenization(
                requester1.address,
                'Token1_URI',
                70,
                10,
                30,
                1000,
                ethers.constants.AddressZero,
                3,
                baseTimestamp + 1e9,
                1000,
            );

            await time.setNextBlockTimestamp(baseTimestamp + 100);

            await estateToken.requestTokenization(
                requester2.address,
                'Token2_URI',
                900,
                200,
                500,
                20,
                currency.address,
                0,
                baseTimestamp + 1e9,
                1000,
            );

            await callTransaction(estateToken.connect(depositor1).depositTokenization(1, 10, { value: 1e9 }));
            await callTransaction(estateToken.connect(depositor2).depositTokenization(2, 500, { value: 1e9 }));

            await estateToken.connect(manager).confirmTokenization(1, ethers.constants.AddressZero);
            await estateToken.connect(manager).confirmTokenization(2, ethers.constants.AddressZero);
        });

        it('3.20.1. succeed with existing estate id', async () => {
            await estateToken.getEstate(1);
            await estateToken.getEstate(2);
        });

        it('3.20.2. revert with non-existing estate id', async () => {
            await expect(estateToken.getEstate(0))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");

            await expect(estateToken.getEstate(3))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");

            await expect(estateToken.getEstate(100))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");
        });
    });


    describe('3.21. getTokenizationRequest(uint256)', () => {
        let baseTimestamp: number;

        beforeEach(async () => {
            baseTimestamp = await time.latest() + 1000;

            await callEstateToken_UpdateCommissionToken(
                estateToken,
                admins,
                commissionToken.address,
                nonce++
            );

            nonce = await addCurrency(
                admin,
                estateToken,
                admins,
                [ethers.constants.AddressZero],
                [true],
                [false],
                [0],
                [ethers.BigNumber.from(10).pow(18)],
                nonce,
            );

            nonce = await addCurrency(
                admin,
                estateToken,
                admins,
                [currency.address],
                [true],
                [false],
                [0],
                [ethers.BigNumber.from(10).pow(18)],
                nonce,
            );

            await time.setNextBlockTimestamp(baseTimestamp);

            await estateToken.requestTokenization(
                requester1.address,
                'Token1_URI',
                70,
                10,
                30,
                1000,
                ethers.constants.AddressZero,
                3,
                baseTimestamp + 1e9,
                1000,
            );

            await time.setNextBlockTimestamp(baseTimestamp + 100);

            await estateToken.requestTokenization(
                requester2.address,
                'Token2_URI',
                900,
                200,
                500,
                20,
                currency.address,
                0,
                baseTimestamp + 1e9,
                1000,
            );
        });

        it('3.21.1. succeed with valid request id', async () => {
            await estateToken.getTokenizationRequest(1);
            await estateToken.getTokenizationRequest(2);
        });

        it('3.21.2. revert with invalid request id', async () => {
            await expect(estateToken.getTokenizationRequest(0))
                .to.be.revertedWithCustomError(estateToken, "InvalidRequestId");

            await expect(estateToken.getTokenizationRequest(3))
                .to.be.revertedWithCustomError(estateToken, "InvalidRequestId");

            await expect(estateToken.getTokenizationRequest(100))
                .to.be.revertedWithCustomError(estateToken, "InvalidRequestId");
        });
    });

    describe('3.22. isAvailable(uint256)', () => {
        let baseTimestamp: number;

        beforeEach(async () => {
            baseTimestamp = await time.latest() + 1000;

            await callEstateToken_UpdateCommissionToken(
                estateToken,
                admins,
                commissionToken.address,
                nonce++
            );

            nonce = await addCurrency(
                admin,
                estateToken,
                admins,
                [ethers.constants.AddressZero],
                [true],
                [false],
                [0],
                [ethers.BigNumber.from(10).pow(18)],
                nonce,
            );

            nonce = await addCurrency(
                admin,
                estateToken,
                admins,
                [currency.address],
                [true],
                [false],
                [0],
                [ethers.BigNumber.from(10).pow(18)],
                nonce,
            );

            await time.setNextBlockTimestamp(baseTimestamp);

            await estateToken.requestTokenization(
                requester1.address,
                'Token1_URI',
                70,
                10,
                30,
                1000,
                ethers.constants.AddressZero,
                3,
                baseTimestamp + 1e9,
                1000,
            );

            await time.setNextBlockTimestamp(baseTimestamp + 100);

            await estateToken.requestTokenization(
                requester2.address,
                'Token2_URI',
                900,
                200,
                500,
                20,
                currency.address,
                0,
                baseTimestamp + 1e9 + 10,
                1000,
            );

            await callTransaction(estateToken.connect(depositor1).depositTokenization(1, 10, { value: 1e9 }));
            await callTransaction(estateToken.connect(depositor2).depositTokenization(2, 500, { value: 1e9 }));

            await estateToken.connect(manager).confirmTokenization(1, ethers.constants.AddressZero);
            await estateToken.connect(manager).confirmTokenization(2, ethers.constants.AddressZero);
        });

        it('3.22.1. return true for existing, not deprecated, and not expired estate', async () => {
            expect(await estateToken.isAvailable(1)).to.equal(true);
            expect(await estateToken.isAvailable(2)).to.equal(true);
        });

        it('3.22.2. return false for non-existing estate', async () => {
            expect(await estateToken.isAvailable(0)).to.equal(false);
            expect(await estateToken.isAvailable(3)).to.equal(false);
            expect(await estateToken.isAvailable(100)).to.equal(false);
        });

        it('3.22.3. return false for deprecated estate', async () => {
            await callTransaction(estateToken.connect(manager).deprecateEstate(1));
            expect(await estateToken.isAvailable(1)).to.equal(false);
            expect(await estateToken.isAvailable(2)).to.equal(true);

            await callTransaction(estateToken.connect(manager).deprecateEstate(2));
            expect(await estateToken.isAvailable(1)).to.equal(false);
            expect(await estateToken.isAvailable(2)).to.equal(false);
        });

        it('3.22.4. return false for expired estate', async () => {
            await time.increaseTo(baseTimestamp + 1e9);
            expect(await estateToken.isAvailable(1)).to.equal(true);
            expect(await estateToken.isAvailable(2)).to.equal(true);

            await time.increaseTo(baseTimestamp + 1e9 + 10);
            expect(await estateToken.isAvailable(1)).to.equal(false);
            expect(await estateToken.isAvailable(2)).to.equal(true);

            await time.increaseTo(baseTimestamp + 1e9 + 20);
            expect(await estateToken.isAvailable(1)).to.equal(false);
            expect(await estateToken.isAvailable(2)).to.equal(false);
        });
    });

    describe('3.23. deprecateEstate(uint256)', () => {
        let baseTimestamp: number;

        beforeEach(async () => {
            baseTimestamp = await time.latest() + 1000;

            await callEstateToken_UpdateCommissionToken(
                estateToken,
                admins,
                commissionToken.address,
                nonce++
            );

            await callEstateToken_UpdateGovernorHub(
                estateToken,
                admins,
                governorHub.address,
                nonce++,
            );

            nonce = await addCurrency(
                admin,
                estateToken,
                admins,
                [ethers.constants.AddressZero],
                [true],
                [false],
                [0],
                [ethers.BigNumber.from(10).pow(18)],
                nonce,
            );

            nonce = await addCurrency(
                admin,
                estateToken,
                admins,
                [currency.address],
                [true],
                [false],
                [0],
                [ethers.BigNumber.from(10).pow(18)],
                nonce,
            );

            await time.setNextBlockTimestamp(baseTimestamp);

            await estateToken.requestTokenization(
                requester1.address,
                'Token1_URI',
                70,
                10,
                30,
                1000,
                ethers.constants.AddressZero,
                3,
                baseTimestamp + 1e9,
                1000,
            );

            await time.setNextBlockTimestamp(baseTimestamp + 100);

            await estateToken.requestTokenization(
                requester2.address,
                'Token2_URI',
                900,
                200,
                500,
                20,
                currency.address,
                0,
                baseTimestamp + 1e9 + 10,
                1000,
            );

            await callTransaction(estateToken.connect(depositor1).depositTokenization(1, 10, { value: 1e9 }));
            await callTransaction(estateToken.connect(depositor2).depositTokenization(2, 500, { value: 1e9 }));

            await estateToken.connect(manager).confirmTokenization(1, ethers.constants.AddressZero);
            await estateToken.connect(manager).confirmTokenization(2, ethers.constants.AddressZero);
        });

        it('3.23.1. deprecate estate successfully by governorHub or manager', async () => {
            let tx = await estateToken.connect(governorHub).deprecateEstate(1);
            await tx.wait();

            expect(tx)
                .to.emit(estateToken, "EstateDeprecation")
                .withArgs(1);
            expect((await estateToken.getEstate(1)).isDeprecated).to.equal(true);

            tx = await estateToken.connect(manager).deprecateEstate(2);
            await tx.wait();

            expect(tx)
                .to.emit(estateToken, "EstateDeprecation")
                .withArgs(2);
            expect((await estateToken.getEstate(2)).isDeprecated).to.equal(true);
        });

        it('3.23.2. deprecate estate unsuccessfully with non-existing estate id', async () => {
            await expect(estateToken.connect(manager).deprecateEstate(0))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");

            await expect(estateToken.connect(manager).deprecateEstate(3))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");

            await expect(estateToken.connect(manager).deprecateEstate(100))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");
        });

        it('3.23.3. deprecate estate unsuccessfully with deprecated estate', async () => {
            await callTransaction(estateToken.connect(manager).deprecateEstate(1));
            await expect(estateToken.connect(manager).deprecateEstate(1))
                .to.be.revertedWithCustomError(estateToken, "Deprecated");

            await callTransaction(estateToken.connect(manager).deprecateEstate(2));
            await expect(estateToken.connect(manager).deprecateEstate(2))
                .to.be.revertedWithCustomError(estateToken, "Deprecated");
        });

        it('3.23.4. deprecate estate unsuccessfully by unauthorized sender', async () => {
            await expect(estateToken.connect(user).deprecateEstate(1))
                .to.be.revertedWithCustomError(estateToken, "Unauthorized");

            await expect(estateToken.connect(moderator).deprecateEstate(1))
                .to.be.revertedWithCustomError(estateToken, "Unauthorized");
        });
    });

    describe('3.24. extendEstateExpiration(uint256, uint40)', () => {
        let baseTimestamp: number;

        beforeEach(async () => {
            baseTimestamp = await time.latest() + 1000;

            await callEstateToken_UpdateCommissionToken(
                estateToken,
                admins,
                commissionToken.address,
                nonce++
            );

            nonce = await addCurrency(
                admin,
                estateToken,
                admins,
                [ethers.constants.AddressZero],
                [true],
                [false],
                [0],
                [ethers.BigNumber.from(10).pow(18)],
                nonce,
            );

            nonce = await addCurrency(
                admin,
                estateToken,
                admins,
                [currency.address],
                [true],
                [false],
                [0],
                [ethers.BigNumber.from(10).pow(18)],
                nonce,
            );

            await time.setNextBlockTimestamp(baseTimestamp);

            await estateToken.requestTokenization(
                requester1.address,
                'Token1_URI',
                70,
                10,
                30,
                1000,
                ethers.constants.AddressZero,
                3,
                baseTimestamp + 1000,
                1000,
            );

            await time.setNextBlockTimestamp(baseTimestamp + 100);

            await estateToken.requestTokenization(
                requester2.address,
                'Token2_URI',
                900,
                200,
                500,
                20,
                currency.address,
                0,
                baseTimestamp + 1000,
                1000,
            );

            await callTransaction(estateToken.connect(depositor1).depositTokenization(1, 10, { value: 1e9 }));
            await callTransaction(estateToken.connect(depositor2).depositTokenization(2, 500, { value: 1e9 }));

            await estateToken.connect(manager).confirmTokenization(1, ethers.constants.AddressZero);
            await estateToken.connect(manager).confirmTokenization(2, ethers.constants.AddressZero);
        });

        it('3.24.1. extend estate expiration successfully by manager with valid estate', async () => {
            let tx = await estateToken.connect(manager).extendEstateExpiration(1, baseTimestamp + 1e9);
            await tx.wait();

            expect(tx)
                .to.emit(estateToken, "EstateExpirationExtension")
                .withArgs(1, baseTimestamp + 1e9);

            expect((await estateToken.getEstate(1)).expireAt).to.equal(baseTimestamp + 1e9);

            tx = await estateToken.connect(manager).extendEstateExpiration(1, baseTimestamp + 1e9 + 10);
            await tx.wait();

            expect(tx)
                .to.emit(estateToken, "EstateExpirationExtension")
                .withArgs(1, baseTimestamp + 1e9 + 10);

            expect((await estateToken.getEstate(1)).expireAt).to.equal(baseTimestamp + 1e9 + 10);
        });

        it('3.24.2. extend estate expiration unsuccessfully with non-existing estate', async () => {
            await expect(estateToken.connect(manager).extendEstateExpiration(0, baseTimestamp + 1e9))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");

            await expect(estateToken.connect(manager).extendEstateExpiration(3, baseTimestamp + 1e9))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");

            await expect(estateToken.connect(manager).extendEstateExpiration(100, baseTimestamp + 1e9))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");
        });

        it('3.24.3. extend estate expiration unsuccessfully with deprecated estate', async () => {
            await callTransaction(estateToken.connect(manager).deprecateEstate(1));
            await expect(estateToken.connect(manager).extendEstateExpiration(1, baseTimestamp + 1e9))
                .to.be.revertedWithCustomError(estateToken, "Deprecated");
        });

        it('3.24.4. extend estate expiration unsuccessfully by non-manager sender', async () => {
            await expect(estateToken.connect(user).extendEstateExpiration(1, baseTimestamp + 1e9))
                .to.be.revertedWithCustomError(estateToken, "Unauthorized");

            await expect(estateToken.connect(moderator).extendEstateExpiration(1, baseTimestamp + 1e9))
                .to.be.revertedWithCustomError(estateToken, "Unauthorized");
        });
    });

    describe('3.25. updateEstateURI(uint256, string)', () => {
        let baseTimestamp: number;

        beforeEach(async () => {
            baseTimestamp = await time.latest() + 1000;

            await callEstateToken_UpdateCommissionToken(
                estateToken,
                admins,
                commissionToken.address,
                nonce++
            );

            nonce = await addCurrency(
                admin,
                estateToken,
                admins,
                [ethers.constants.AddressZero],
                [true],
                [false],
                [0],
                [ethers.BigNumber.from(10).pow(18)],
                nonce,
            );

            nonce = await addCurrency(
                admin,
                estateToken,
                admins,
                [currency.address],
                [true],
                [false],
                [0],
                [ethers.BigNumber.from(10).pow(18)],
                nonce,
            );

            await time.setNextBlockTimestamp(baseTimestamp);

            await estateToken.requestTokenization(
                requester1.address,
                'Token1_URI',
                70,
                10,
                30,
                1000,
                ethers.constants.AddressZero,
                3,
                baseTimestamp + 1000,
                1000,
            );

            await time.setNextBlockTimestamp(baseTimestamp + 100);

            await estateToken.requestTokenization(
                requester2.address,
                'Token2_URI',
                900,
                200,
                500,
                20,
                currency.address,
                0,
                baseTimestamp + 1000,
                1000,
            );

            await callTransaction(estateToken.connect(depositor1).depositTokenization(1, 10, { value: 1e9 }));
            await callTransaction(estateToken.connect(depositor2).depositTokenization(2, 500, { value: 1e9 }));

            await estateToken.connect(manager).confirmTokenization(1, ethers.constants.AddressZero);
            await estateToken.connect(manager).confirmTokenization(2, ethers.constants.AddressZero);
        });

        it('3.25.1. update estate URI successfully by manager with available estate', async () => {
            let tx = await estateToken.connect(manager).updateEstateURI(1, 'new_URI_1');
            await tx.wait();

            expect(tx)
                .to.emit(estateToken, "URI")
                .withArgs(1, 'new_URI_1');

            expect(await estateToken.uri(1)).to.equal(Constant.ESTATE_TOKEN_INITIAL_BaseURI + 'new_URI_1');

            tx = await estateToken.connect(manager).updateEstateURI(2, 'new_URI_2');
            await tx.wait();

            expect(tx)
                .to.emit(estateToken, "URI")
                .withArgs(2, 'new_URI_2');

            expect(await estateToken.uri(2)).to.equal(Constant.ESTATE_TOKEN_INITIAL_BaseURI + 'new_URI_2');
        });

        it('3.25.2. update estate URI unsuccessfully with unavailable estate', async () => {
            await expect(estateToken.connect(manager).updateEstateURI(0, 'new_URI_1'))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");

            await expect(estateToken.connect(manager).updateEstateURI(3, 'new_URI_1'))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");

            await callTransaction(estateToken.connect(manager).deprecateEstate(1));
            await expect(estateToken.connect(manager).updateEstateURI(1, 'new_URI_1'))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");
        });

        it('3.25.3. update estate URI unsuccessfully by non-manager sender', async () => {
            await expect(estateToken.connect(user).updateEstateURI(1, 'new_URI_1'))
                .to.be.revertedWithCustomError(estateToken, "Unauthorized");

            await expect(estateToken.connect(moderator).updateEstateURI(1, 'new_URI_1'))
                .to.be.revertedWithCustomError(estateToken, "Unauthorized");
        });
    });

    describe('3.26. balanceOf(address, uint256)', () => {
        let baseTimestamp: number;

        beforeEach(async () => {
            baseTimestamp = await time.latest() + 1000;

            await callEstateToken_UpdateCommissionToken(
                estateToken,
                admins,
                commissionToken.address,
                nonce++
            );

            nonce = await addCurrency(
                admin,
                estateToken,
                admins,
                [ethers.constants.AddressZero],
                [true],
                [false],
                [0],
                [ethers.BigNumber.from(10).pow(18)],
                nonce,
            );

            nonce = await addCurrency(
                admin,
                estateToken,
                admins,
                [currency.address],
                [true],
                [false],
                [0],
                [ethers.BigNumber.from(10).pow(18)],
                nonce,
            );

            await time.setNextBlockTimestamp(baseTimestamp);

            await estateToken.requestTokenization(
                requester1.address,
                'Token1_URI',
                70,
                10,
                30,
                1000,
                ethers.constants.AddressZero,
                3,
                baseTimestamp + 1000,
                1000,
            );

            await time.setNextBlockTimestamp(baseTimestamp + 100);

            await estateToken.requestTokenization(
                requester2.address,
                'Token2_URI',
                900,
                200,
                500,
                20,
                currency.address,
                0,
                baseTimestamp + 1000,
                1000,
            );
        });

        it('3.26.1. return correct estate token balance for available estate', async () => {
            await callTransaction(estateToken.connect(depositor1).depositTokenization(1, 10, { value: 1e9 }));
            await callTransaction(estateToken.connect(depositor2).depositTokenization(2, 500, { value: 1e9 }));

            await estateToken.connect(manager).confirmTokenization(1, ethers.constants.AddressZero);
            await estateToken.connect(manager).confirmTokenization(2, ethers.constants.AddressZero);

            await callTransaction(estateToken.connect(depositor1).withdrawToken(1));
            await callTransaction(estateToken.connect(depositor2).withdrawToken(2));

            expect(await estateToken.balanceOf(depositor1.address, 1)).to.equal(10_000);
            expect(await estateToken.balanceOf(depositor2.address, 2)).to.equal(500);
        });

        it('3.26.2. return correct estate token balance for invalid estate id', async () => {
            expect(await estateToken.balanceOf(depositor1.address, 1)).to.equal(0);
        });

        it('3.26.3. return correct estate token balance for deprecated estate', async () => {
            await callTransaction(estateToken.connect(depositor1).depositTokenization(1, 10, { value: 1e9 }));
            await callTransaction(estateToken.connect(depositor2).depositTokenization(2, 500, { value: 1e9 }));

            await estateToken.connect(manager).confirmTokenization(1, ethers.constants.AddressZero);
            await estateToken.connect(manager).confirmTokenization(2, ethers.constants.AddressZero);

            await callTransaction(estateToken.connect(depositor1).withdrawToken(1));
            await callTransaction(estateToken.connect(depositor2).withdrawToken(2));

            await callTransaction(estateToken.connect(manager).deprecateEstate(1));
            await callTransaction(estateToken.connect(manager).deprecateEstate(2));

            expect(await estateToken.balanceOf(depositor1.address, 1)).to.equal(0);
            expect(await estateToken.balanceOf(depositor2.address, 2)).to.equal(0);
        });

        it('3.26.4. return correct estate token balance for expired estate', async () => {
            await callTransaction(estateToken.connect(depositor1).depositTokenization(1, 10, { value: 1e9 }));
            await callTransaction(estateToken.connect(depositor2).depositTokenization(2, 500, { value: 1e9 }));

            await estateToken.connect(manager).confirmTokenization(1, ethers.constants.AddressZero);
            await estateToken.connect(manager).confirmTokenization(2, ethers.constants.AddressZero);

            await callTransaction(estateToken.connect(depositor1).withdrawToken(1));
            await callTransaction(estateToken.connect(depositor2).withdrawToken(2));

            await time.increaseTo(baseTimestamp + 1e9 + 10);

            expect(await estateToken.balanceOf(depositor1.address, 1)).to.equal(0);
            expect(await estateToken.balanceOf(depositor2.address, 2)).to.equal(0);
        });
    });

    describe('3.27. balanceOfAt(address, uint256, uint40)', () => {
        let baseTimestamp: number;
        let currentTimestamp: number;

        beforeEach(async () => {
            baseTimestamp = await time.latest() + 500;

            await callEstateToken_UpdateCommissionToken(
                estateToken,
                admins,
                commissionToken.address,
                nonce++
            );

            nonce = await addCurrency(
                admin,
                estateToken,
                admins,
                [ethers.constants.AddressZero],
                [true],
                [false],
                [0],
                [ethers.BigNumber.from(10).pow(18)],
                nonce,
            );

            nonce = await addCurrency(
                admin,
                estateToken,
                admins,
                [currency.address],
                [true],
                [false],
                [0],
                [ethers.BigNumber.from(10).pow(18)],
                nonce,
            );

            await time.setNextBlockTimestamp(baseTimestamp);

            await estateToken.requestTokenization(
                requester1.address,
                'Token1_URI',
                100,
                10,
                60,
                1000,
                ethers.constants.AddressZero,
                3,
                baseTimestamp + 1000,
                1000,
            );

            await estateToken.requestTokenization(
                requester2.address,
                'Token2_URI',
                900,
                200,
                600,
                20,
                currency.address,
                0,
                baseTimestamp + 1000,
                1000,
            );

            currentTimestamp = baseTimestamp;
        });

        it('3.27.1. return correct estate token balance for available estate', async () => {
            await callTransaction(estateToken.connect(depositor1).depositTokenization(1, 10, { value: 1e9 }));
            await callTransaction(estateToken.connect(depositor2).depositTokenization(1, 20, { value: 1e9 }));
            await callTransaction(estateToken.connect(depositor3).depositTokenization(1, 30, { value: 1e9 }));
            await callTransaction(estateToken.connect(depositor1).depositTokenization(2, 100));
            await callTransaction(estateToken.connect(depositor2).depositTokenization(2, 200));
            await callTransaction(estateToken.connect(depositor3).depositTokenization(2, 300));

            await time.setNextBlockTimestamp(baseTimestamp + 10);
            await estateToken.connect(manager).confirmTokenization(1, ethers.constants.AddressZero);
            await time.setNextBlockTimestamp(baseTimestamp + 20);
            await estateToken.connect(manager).confirmTokenization(2, ethers.constants.AddressZero);

            expect(await estateToken.balanceOfAt(estateToken.address, 1, baseTimestamp + 9)).to.equal(0);
            expect(await estateToken.balanceOfAt(estateToken.address, 1, baseTimestamp + 10)).to.equal(60_000);
            expect(await estateToken.balanceOfAt(requester1.address, 1, baseTimestamp + 9)).to.equal(0);
            expect(await estateToken.balanceOfAt(requester1.address, 1, baseTimestamp + 10)).to.equal(40_000);

            expect(await estateToken.balanceOfAt(estateToken.address, 2, baseTimestamp + 19)).to.equal(0);
            expect(await estateToken.balanceOfAt(estateToken.address, 2, baseTimestamp + 20)).to.equal(600);
            expect(await estateToken.balanceOfAt(requester2.address, 2, baseTimestamp + 19)).to.equal(0);
            expect(await estateToken.balanceOfAt(requester2.address, 2, baseTimestamp + 20)).to.equal(300);

            await time.setNextBlockTimestamp(baseTimestamp + 40);
            await callTransaction(estateToken.connect(depositor1).withdrawToken(1));
            await time.setNextBlockTimestamp(baseTimestamp + 50);
            await callTransaction(estateToken.connect(depositor2).withdrawToken(1));
            await time.setNextBlockTimestamp(baseTimestamp + 60);
            await callTransaction(estateToken.connect(depositor3).withdrawToken(1));
            await time.setNextBlockTimestamp(baseTimestamp + 70);
            await callTransaction(estateToken.connect(depositor1).withdrawToken(2));
            await time.setNextBlockTimestamp(baseTimestamp + 80);
            await callTransaction(estateToken.connect(depositor2).withdrawToken(2));
            await time.setNextBlockTimestamp(baseTimestamp + 90);
            await callTransaction(estateToken.connect(depositor3).withdrawToken(2));

            expect(await estateToken.balanceOfAt(depositor1.address, 1, baseTimestamp + 40)).to.equal(10_000);
            expect(await estateToken.balanceOfAt(depositor2.address, 1, baseTimestamp + 50)).to.equal(20_000);
            expect(await estateToken.balanceOfAt(depositor3.address, 1, baseTimestamp + 60)).to.equal(30_000);
            expect(await estateToken.balanceOfAt(depositor1.address, 2, baseTimestamp + 70)).to.equal(100);
            expect(await estateToken.balanceOfAt(depositor2.address, 2, baseTimestamp + 80)).to.equal(200);
            expect(await estateToken.balanceOfAt(depositor3.address, 2, baseTimestamp + 90)).to.equal(300);

            await time.setNextBlockTimestamp(baseTimestamp + 100);
            await callTransaction(estateToken.connect(depositor1).safeTransferFrom(
                depositor1.address, depositor2.address, 1, 3_000, ethers.utils.formatBytes32String("")
            ));

            await time.setNextBlockTimestamp(baseTimestamp + 110);
            await callTransaction(estateToken.connect(depositor2).safeTransferFrom(
                depositor2.address, depositor3.address, 1, 8_000, ethers.utils.formatBytes32String("")
            ));

            await time.setNextBlockTimestamp(baseTimestamp + 120);
            await callTransaction(estateToken.connect(depositor3).safeTransferFrom(
                depositor3.address, depositor1.address, 1, 30_000, ethers.utils.formatBytes32String("")
            ));

            expect(await estateToken.balanceOfAt(depositor1.address, 1, baseTimestamp + 99)).to.equal(10_000);
            expect(await estateToken.balanceOfAt(depositor1.address, 1, baseTimestamp + 100)).to.equal(7_000);
            expect(await estateToken.balanceOfAt(depositor1.address, 1, baseTimestamp + 119)).to.equal(7_000);
            expect(await estateToken.balanceOfAt(depositor1.address, 1, baseTimestamp + 120)).to.equal(37_000);

            expect(await estateToken.balanceOfAt(depositor2.address, 1, baseTimestamp + 99)).to.equal(20_000);
            expect(await estateToken.balanceOfAt(depositor2.address, 1, baseTimestamp + 100)).to.equal(23_000);
            expect(await estateToken.balanceOfAt(depositor2.address, 1, baseTimestamp + 109)).to.equal(23_000);
            expect(await estateToken.balanceOfAt(depositor2.address, 1, baseTimestamp + 110)).to.equal(15_000);

            expect(await estateToken.balanceOfAt(depositor3.address, 1, baseTimestamp + 109)).to.equal(30_000);
            expect(await estateToken.balanceOfAt(depositor3.address, 1, baseTimestamp + 110)).to.equal(38_000);
            expect(await estateToken.balanceOfAt(depositor3.address, 1, baseTimestamp + 119)).to.equal(38_000);
            expect(await estateToken.balanceOfAt(depositor3.address, 1, baseTimestamp + 120)).to.equal(8_000);
        });

        it('3.27.2. return zero balance when there is no snapshot', async () => {
            await callTransaction(estateToken.connect(depositor1).depositTokenization(1, 30, { value: 1e9 }));

            expect(await estateToken.balanceOfAt(estateToken.address, 1, baseTimestamp + 9)).to.equal(0);
            expect(await estateToken.balanceOfAt(estateToken.address, 1, baseTimestamp + 10)).to.equal(0);

            await time.setNextBlockTimestamp(baseTimestamp + 10);
            await estateToken.connect(manager).confirmTokenization(1, ethers.constants.AddressZero);

            expect(await estateToken.balanceOfAt(estateToken.address, 1, baseTimestamp + 9)).to.equal(0);
            expect(await estateToken.balanceOfAt(estateToken.address, 1, baseTimestamp + 10)).to.equal(30_000);
        });

        it('3.27.3. return correct estate token balance in random tests', async () => {
            async function randomTest() {
                let receipt = await callTransaction(estateToken.requestTokenization(
                    requester1.address,
                    'Token1_URI',
                    100,
                    30,
                    100,
                    1000,
                    ethers.constants.AddressZero,
                    3,
                    currentTimestamp + 1000,
                    1000,
                ));

                const requestId = receipt.events!.filter(e => e.event == "NewTokenizationRequest")[0].args![0];

                for (let id = 0; id < 3; ++id) {
                    await callTransaction(estateToken.connect(depositors[id]).depositTokenization(requestId, randomInt(10, 30 + 1), { value: 1e9 }));
                }
                receipt = await callTransaction(estateToken.connect(manager).confirmTokenization(requestId, ethers.constants.AddressZero));

                const estateId = receipt.events!.filter(e => e.event == "TokenizationConfirmation")[0].args![1];
                currentTimestamp += 100;

                const snapshots = [];
                for (let i = 0; i < 3; ++i) {
                    snapshots.push(new OrderedMap<number, BigNumber>(ethers.BigNumber.from(0)));
                }

                await time.setNextBlockTimestamp(currentTimestamp);
                for (let i = 0; i < 3; ++i) {
                    const receipt = await callTransaction(estateToken.connect(depositors[i]).withdrawToken(requestId));
                    const timestamp = (await ethers.provider.getBlock('latest')).timestamp;
                    const amount = receipt.events!.filter(e => e.event == "TokenizationTokenWithdrawal")[0].args![2];
                    snapshots[i].set(timestamp, amount);
                }

                await ethers.provider.send("evm_setAutomine", [false]);
                for (let iter = 0; iter < 20; ++iter) {
                    const initBalances: BigNumber[] = [];
                    for (let i = 0; i < 3; ++i) {
                        initBalances.push(await estateToken.balanceOf(depositors[i].address, estateId));
                    }

                    let balances = [...initBalances];
                    const txCount = 10;
                    const txs = [];
                    const records = [];

                    for (let i_tx = 0; i_tx < txCount; ++i_tx) {
                        let from = randomInt(0, 3);
                        let to = randomInt(0, 3);
                        if (from == to) { --i_tx; continue }

                        if (balances[from].eq(0)) { --i_tx; continue }

                        const amount = randomBigNumber(ethers.BigNumber.from(1), balances[from]);

                        const tx = await estateToken.connect(depositors[from]).safeTransferFrom(
                            depositors[from].address,
                            depositors[to].address,
                            estateId,
                            amount,
                            ethers.utils.formatBytes32String(""),
                            { gasLimit: 1e6 },
                        );
                        txs.push(tx);

                        balances[from] = balances[from].sub(amount);
                        balances[to] = balances[to].add(amount);
                        records.push({ from, to, amount });
                    }

                    await ethers.provider.send("evm_mine", []);

                    const receipts = await Promise.all(txs.map(tx => tx.wait()));
                    balances = [...initBalances];
                    for (const [i, receipt] of receipts.entries()) {
                        const { from, to, amount } = records[i];
                        const timestamp = (await ethers.provider.getBlock(receipt.blockNumber!)).timestamp;

                        balances[from] = balances[from].sub(amount);
                        balances[to] = balances[to].add(amount);

                        snapshots[from].set(timestamp, balances[from]);
                        snapshots[to].set(timestamp, balances[to]);
                    }

                    const lastTimestamp = (await ethers.provider.getBlock('latest')).timestamp;
                    for (let t = currentTimestamp - 1; t <= lastTimestamp; ++t) {
                        for (let i = 0; i < 3; ++i) {
                            const expectedBalance = snapshots[i].get(t);
                            const actualBalance = await estateToken.balanceOfAt(depositors[i].address, estateId, t);
                            expect(actualBalance).to.equal(expectedBalance);
                        }
                    }
                }

                const lastTimestamp = (await ethers.provider.getBlock('latest')).timestamp;

                currentTimestamp = lastTimestamp;

                await ethers.provider.send("evm_setAutomine", [true]);
            }

            for (let iTest = 0; iTest < 1; ++iTest) {
                await randomTest();
            }
        });
    });

    describe('3.28. royaltyInfo(uint256, uint256)', () => {
        it('3.28.1. return correct royalty info', async () => {
            const royaltyInfo = await estateToken.royaltyInfo(1, 1e6);
            const royaltyFee = 1e6 * Constant.ESTATE_TOKEN_INITIAL_RoyaltyRate / Constant.COMMON_PERCENTAGE_DENOMINATOR;
            expect(royaltyInfo[0]).to.equal(feeReceiver.address);
            expect(royaltyInfo[1]).to.equal(royaltyFee);
        });
    });

    describe('3.29. supportsInterface(bytes4)', () => {
        it('3.29.1. return true for IERC2981Upgradeable interface', async () => {
            const IERC165UpgradeableInterface = IERC165Upgradeable__factory.createInterface();
            const IERC165UpgradeableInterfaceId = getInterfaceID(IERC165UpgradeableInterface);

            const IERC2981UpgradeableInterface = IERC2981Upgradeable__factory.createInterface();
            const IERC2981UpgradeableInterfaceId = getInterfaceID(IERC2981UpgradeableInterface).xor(IERC165UpgradeableInterfaceId);

            expect(await estateToken.supportsInterface(IERC2981UpgradeableInterfaceId._hex)).to.equal(true);
        });
    });

    describe('3.30. safeTransferFrom(address, address, uint256, uint256, bytes)', () => {
        let baseTimestamp: number;

        beforeEach(async () => {
            baseTimestamp = await time.latest() + 1000;

            await callEstateToken_UpdateCommissionToken(
                estateToken,
                admins,
                commissionToken.address,
                nonce++
            );

            nonce = await addCurrency(
                admin,
                estateToken,
                admins,
                [ethers.constants.AddressZero],
                [true],
                [false],
                [0],
                [ethers.BigNumber.from(10).pow(18)],
                nonce,
            );

            nonce = await addCurrency(
                admin,
                estateToken,
                admins,
                [currency.address],
                [true],
                [false],
                [0],
                [ethers.BigNumber.from(10).pow(18)],
                nonce,
            );

            await time.setNextBlockTimestamp(baseTimestamp);

            await estateToken.requestTokenization(
                requester1.address,
                'Token1_URI',
                70,
                10,
                30,
                1000,
                ethers.constants.AddressZero,
                3,
                baseTimestamp + 1000,
                1000,
            );

            await time.setNextBlockTimestamp(baseTimestamp + 100);

            await estateToken.requestTokenization(
                requester2.address,
                'Token2_URI',
                900,
                200,
                500,
                20,
                currency.address,
                0,
                baseTimestamp + 1000,
                1000,
            );
        });

        it('3.30.1. transfer unsuccessfully when the token is deprecated', async () => {
            await callTransaction(estateToken.connect(depositor1).depositTokenization(1, 10, { value: 1e9 }));
            await callTransaction(estateToken.connect(depositor1).depositTokenization(2, 500));

            await callTransaction(estateToken.connect(manager).confirmTokenization(1, ethers.constants.AddressZero));
            await callTransaction(estateToken.connect(manager).confirmTokenization(2, ethers.constants.AddressZero));

            await callTransaction(estateToken.connect(manager).deprecateEstate(1));

            await expect(estateToken.connect(depositor1).safeBatchTransferFrom(
                depositor1.address,
                depositor2.address,
                [1, 2],
                [10_000, 500],
                ethers.utils.formatBytes32String(""),
            )).to.be.revertedWith("estateToken: Token is unavailable");
        });

        it('3.30.2. transfer unsuccessfully when the token is expired', async () => {
            await callTransaction(estateToken.connect(depositor1).depositTokenization(1, 10, { value: 1e9 }));
            await callTransaction(estateToken.connect(depositor1).depositTokenization(2, 500));

            await callTransaction(estateToken.connect(manager).confirmTokenization(1, ethers.constants.AddressZero));
            await callTransaction(estateToken.connect(manager).confirmTokenization(2, ethers.constants.AddressZero));

            await time.increaseTo(baseTimestamp + 1100);

            await expect(estateToken.connect(depositor1).safeBatchTransferFrom(
                depositor1.address,
                depositor2.address,
                [1, 2],
                [10_000, 500],
                ethers.utils.formatBytes32String(""),
            )).to.be.revertedWith("estateToken: Token is unavailable");
        });
    });
});
