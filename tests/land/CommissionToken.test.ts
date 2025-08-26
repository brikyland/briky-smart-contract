import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import {
    Admin,
    CommissionToken,
    Currency,
    FeeReceiver,
    IERC165Upgradeable__factory,
    IERC2981Upgradeable__factory,
    MockEstateToken,
    IERC4906Upgradeable__factory,
    IERC721Upgradeable__factory,
    IRoyaltyRateProposer__factory,
    ICommon__factory,
    IERC721MetadataUpgradeable__factory,
} from '@typechain-types';
import { callTransaction, callTransactionAtTimestamp, getSignatures } from '@utils/blockchain';
import { Constant } from '@tests/test.constant';
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployFeeReceiver } from '@utils/deployments/common/feeReceiver';
import { deployCurrency } from '@utils/deployments/common/currency';
import { deployMockEstateToken } from '@utils/deployments/mock/mockEstateToken';
import { deployCommissionToken } from '@utils/deployments/land/commissionToken';
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

import {
    getBytes4Hex,
    getInterfaceID,
    structToObject,
    getEventsFromReceipt,
} from '@utils/utils';
import { scale } from "@utils/formula";
import { scaleRate } from "@utils/formula";
import { Initialization as LandInitialization } from '@tests/land/test.initialization';
import { callCommissionToken_Pause } from '@utils/callWithSignatures/commissionToken';
import { MockValidator } from '@utils/mockValidator';
import { callAdmin_ActivateIn, callAdmin_AuthorizeManagers, callAdmin_AuthorizeModerators, callAdmin_DeclareZones } from '@utils/callWithSignatures/admin';
import { getActivateBrokerTx, getMintTx, getRegisterBrokerTx } from '@utils/transaction/CommissionToken';
import { ActivateBrokerParams, MintParams, RegisterBrokerParams } from '@utils/models/CommissionToken';
import { BigNumber } from 'ethers';
import { TransactionReceipt } from '@ethersproject/abstract-provider';

interface CommissionTokenFixture {
    admin: Admin;
    feeReceiver: FeeReceiver;
    currency: Currency;
    estateToken: MockEstateToken;
    commissionToken: CommissionToken;
    validator: MockValidator;

    deployer: any;
    admins: any[];
    manager: any;
    moderator: any;
    user: any;
    broker1: any, broker2: any;

    zone1: string, zone2: string;
}

describe('2.1. CommissionToken', async () => {
    async function commissionTokenFixture(): Promise<CommissionTokenFixture> {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        const admins = [];
        for (let i = 1; i <= Constant.ADMIN_NUMBER; ++i) admins.push(accounts[i]);
        const manager = accounts[Constant.ADMIN_NUMBER + 1];
        const moderator = accounts[Constant.ADMIN_NUMBER + 2];
        const user = accounts[Constant.ADMIN_NUMBER + 3];
        const broker1 = accounts[Constant.ADMIN_NUMBER + 4];
        const broker2 = accounts[Constant.ADMIN_NUMBER + 5];
        
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

        const validator = new MockValidator(deployer as any);

        const estateToken = await deployMockEstateToken(
            deployer.address,
            admin.address,
            feeReceiver.address,
            validator.getAddress(),
            LandInitialization.ESTATE_TOKEN_BaseURI,
        ) as MockEstateToken;        

        const commissionToken = await deployCommissionToken(
            deployer.address,
            admin.address,
            estateToken.address,
            feeReceiver.address,
            LandInitialization.COMMISSION_TOKEN_Name,
            LandInitialization.COMMISSION_TOKEN_Symbol,
            LandInitialization.COMMISSION_TOKEN_BaseURI,
            LandInitialization.COMMISSION_TOKEN_RoyaltyRate,
        ) as CommissionToken;

        const zone1 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('TestZone1'));
        const zone2 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('TestZone2'));

        return {
            admin,
            feeReceiver,
            currency,
            estateToken,
            commissionToken,
            validator,
            deployer,
            admins,
            manager,
            moderator,
            user,
            broker1,
            broker2,
            zone1,
            zone2,
        };
    };

    async function beforeCommissionTokenTest({
        skipActivateExecutiveInZone = false,
        registerSampleBrokers = false,
        mintSampleTokens = false,
        pause = false,
    } = {}): Promise<CommissionTokenFixture> {
        const fixture = await loadFixture(commissionTokenFixture);
        const { admin, admins, commissionToken, estateToken, manager, moderator, broker1, broker2, zone1, zone2 } = fixture;

        await callAdmin_AuthorizeManagers(
            admin,
            admins,
            [manager.address],
            true,
            await admin.nonce(),
        )
        await callAdmin_AuthorizeModerators(
            admin,
            admins,
            [moderator.address],
            true,
            await admin.nonce(),
        )

        await callAdmin_DeclareZones(
            admin,
            admins,
            [zone1, zone2],
            true,
            await admin.nonce(),
        )

        if (!skipActivateExecutiveInZone) {
            for (const zone of [zone1, zone2]) {
                await callAdmin_ActivateIn(
                    admin,
                    admins,
                    zone,
                    [manager.address, moderator.address],
                    true,
                    await admin.nonce(),
                )
            }
        }

        if (registerSampleBrokers) {
            await callTransaction(getRegisterBrokerTx(
                commissionToken,
                manager,
                {
                    zone: zone1,
                    broker: broker1.address,
                    commissionRate: ethers.utils.parseEther('0.1'),
                },
            ));

            await callTransaction(getRegisterBrokerTx(
                commissionToken,
                manager,
                {
                    zone: zone2,
                    broker: broker2.address,
                    commissionRate: ethers.utils.parseEther('0.2'),
                },                
            ));
        }

        if (mintSampleTokens) {
            await callTransaction(getMintTx(
                commissionToken,
                estateToken,
                {
                    zone: zone1,
                    broker: broker1.address,
                    tokenId: ethers.BigNumber.from(1),
                },
            ));

            await callTransaction(getMintTx(
                commissionToken,
                estateToken,
                {
                    zone: zone2,
                    broker: broker2.address,
                    tokenId: ethers.BigNumber.from(2),
                },
            ));
        }

        if (pause) {
            await callCommissionToken_Pause(
                commissionToken,
                admins,
                await admin.nonce(),
            )
        }

        return {
            ...fixture,
        }
    }

    describe('2.1.1. initialize(address, address, address)', async () => {
        it('2.1.1.1. Deploy successfully', async () => {
            const { admin, estateToken, feeReceiver, commissionToken } = await beforeCommissionTokenTest();

            expect(await commissionToken.admin()).to.equal(admin.address);
            expect(await commissionToken.estateToken()).to.equal(estateToken.address);
            expect(await commissionToken.feeReceiver()).to.equal(feeReceiver.address);

            const royaltyRate = await commissionToken.getRoyaltyRate(0);
            expect(structToObject(royaltyRate)).to.deep.equal({
                value: LandInitialization.COMMISSION_TOKEN_RoyaltyRate,
                decimals: Constant.COMMON_RATE_DECIMALS,
            });

            expect(await commissionToken.totalSupply()).to.equal(0);

            const tx = commissionToken.deployTransaction;
            const receipt = await tx.wait();
            await expect(tx).to
                .emit(commissionToken, 'BaseURIUpdate').withArgs(LandInitialization.COMMISSION_TOKEN_BaseURI);
            
            const royaltyRateEvent = getEventsFromReceipt(commissionToken, receipt, 'RoyaltyRateUpdate')[0];
            expect(structToObject(royaltyRateEvent.args!.newValue)).to.deep.equal({
                value: LandInitialization.COMMISSION_TOKEN_RoyaltyRate,
                decimals: Constant.COMMON_RATE_DECIMALS,
            });
        });

        it('2.1.1.2. Deploy unsuccessfully with invalid royalty rate', async () => {
            const { deployer, admin, estateToken, feeReceiver } = await beforeCommissionTokenTest();

            const CommissionToken = await ethers.getContractFactory('CommissionToken', deployer);

            await expect(upgrades.deployProxy(CommissionToken, [
                admin.address,
                estateToken.address,
                feeReceiver.address,
                LandInitialization.COMMISSION_TOKEN_Name,
                LandInitialization.COMMISSION_TOKEN_Symbol,
                LandInitialization.COMMISSION_TOKEN_BaseURI,
                Constant.COMMON_RATE_MAX_FRACTION.add(1),
            ])).to.be.reverted;
        });
    });

    describe('2.1.2. updateBaseURI(string, bytes[])', async () => {
        it('2.1.2.1. updateBaseURI successfully with valid signatures', async () => {
            const { commissionToken, admin, admins } = await beforeCommissionTokenTest({});

            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "string"],
                [commissionToken.address, "updateBaseURI", "NewBaseURI:"]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await commissionToken.updateBaseURI("NewBaseURI:", signatures);
            await tx.wait();

            await expect(tx).to
                .emit(commissionToken, 'BaseURIUpdate')
                .withArgs("NewBaseURI:");

            expect(await commissionToken.tokenURI(1)).to.equal("NewBaseURI:");
            expect(await commissionToken.tokenURI(2)).to.equal("NewBaseURI:");
        });

        it('2.1.2.2. updateBaseURI unsuccessfully with invalid signatures', async () => {
            const { commissionToken, admin, admins } = await beforeCommissionTokenTest({});

            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "string"],
                [commissionToken.address, "updateBaseURI", "NewBaseURI:"]
            );
            const invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(commissionToken.updateBaseURI(
                "NewBaseURI:",
                invalidSignatures
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });
    });

    describe('2.1.3. updateRoyaltyRate(uint256, bytes[])', async () => {
        it('2.1.3.1. updateRoyaltyRate successfully with valid signatures', async () => {
            const { commissionToken, admin, admins } = await beforeCommissionTokenTest({});

            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256"],
                [commissionToken.address, "updateRoyaltyRate", ethers.utils.parseEther('0.2')]
            );

            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await commissionToken.updateRoyaltyRate(ethers.utils.parseEther('0.2'), signatures);
            const receipt = await tx.wait();

            const event = receipt.events?.find(e => e.event === 'RoyaltyRateUpdate')!;
            expect(structToObject(event.args!.newValue)).to.deep.equal({
                value: ethers.utils.parseEther('0.2'),
                decimals: Constant.COMMON_RATE_DECIMALS,
            });

            const royaltyRate = await commissionToken.getRoyaltyRate(0);
            expect(royaltyRate.value).to.equal(ethers.utils.parseEther('0.2'));
            expect(royaltyRate.decimals).to.equal(Constant.COMMON_RATE_DECIMALS);
        });

        it('2.1.3.2. updateRoyaltyRate unsuccessfully with invalid signatures', async () => {
            const { commissionToken, admin, admins } = await beforeCommissionTokenTest({});

            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256"],
                [commissionToken.address, "updateRoyaltyRate", ethers.utils.parseEther('0.2')]
            );
            const invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(commissionToken.updateRoyaltyRate(
                ethers.utils.parseEther('0.2'),
                invalidSignatures
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('2.1.3.3. updateRoyaltyRate unsuccessfully with invalid rate', async () => {
            const { commissionToken, admin, admins } = await beforeCommissionTokenTest({});

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256"],
                [commissionToken.address, "updateRoyaltyRate", Constant.COMMON_RATE_MAX_FRACTION.add(1)]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(commissionToken.updateRoyaltyRate(
                Constant.COMMON_RATE_MAX_FRACTION.add(1),
                signatures
            )).to.be.revertedWithCustomError(commissionToken, 'InvalidRate');
        });
    });

    describe('2.1.4. getBrokerCommissionRate(bytes32, address)', async () => {
        it('2.1.4.1. return correct broker registry for registered broker', async () => {
            const { commissionToken, broker1, zone1, manager } = await beforeCommissionTokenTest();

            let timestamp = await time.latest() + 100;

            await callTransactionAtTimestamp(
                getRegisterBrokerTx(commissionToken, manager, {
                    zone: zone1,
                    broker: broker1.address,
                    commissionRate: ethers.utils.parseEther('0.1'),
                }),
                timestamp,
            );

            const brokerCommissionRate = await commissionToken.getBrokerCommissionRate(zone1, broker1.address);
            expect(structToObject(brokerCommissionRate)).to.deep.equal({
                value: ethers.utils.parseEther('0.1'),
                decimals: Constant.COMMON_RATE_DECIMALS,
            });
        });

        it('2.1.4.2. revert with invalid zone', async () => {
            const { commissionToken, broker1, zone1, admin, admins } = await beforeCommissionTokenTest({
                registerSampleBrokers: true,
            });

            await callAdmin_DeclareZones(
                admin,
                admins,
                [zone1],
                false,
                await admin.nonce(),
            )

            await expect(commissionToken.getBrokerCommissionRate(zone1, broker1.address))
                .to.be.revertedWithCustomError(commissionToken, 'InvalidZone');
        });

        it('2.1.4.3. revert when broker is not active in zone', async () => {
            const { commissionToken, broker1, zone1, manager } = await beforeCommissionTokenTest({
                registerSampleBrokers: true,
            });

            await callTransaction(getActivateBrokerTx(commissionToken, manager, {
                zone: zone1,
                broker: broker1.address,
                isActive: false,
            }));

            await expect(commissionToken.getBrokerCommissionRate(zone1, broker1.address))
                .to.be.revertedWithCustomError(commissionToken, 'NotActive');
        });
    });

    describe('2.1.5. getCommissionRate(uint256)', async () => {
        it('2.1.5.1. return correct commission rate of minted tokens', async () => {
            const { commissionToken } = await beforeCommissionTokenTest({
                registerSampleBrokers: true,
                mintSampleTokens: true,
            });

            const commissionRate1 = await commissionToken.getCommissionRate(1);
            expect(structToObject(commissionRate1)).to.deep.equal({
                value: ethers.utils.parseEther("0.1"),
                decimals: Constant.COMMON_RATE_DECIMALS,
            });

            const commissionRate2 = await commissionToken.getCommissionRate(2);
            expect(structToObject(commissionRate2)).to.deep.equal({
                value: ethers.utils.parseEther("0.2"),
                decimals: Constant.COMMON_RATE_DECIMALS,
            });
        });

        it('2.1.5.2. return default value for unminted token', async () => {
            const { commissionToken } = await beforeCommissionTokenTest();

            const commissionRate1 = await commissionToken.getCommissionRate(0);
            expect(structToObject(commissionRate1)).to.deep.equal({
                value: ethers.constants.Zero,
                decimals: 0,
            });

            const commissionRate2 = await commissionToken.getCommissionRate(100);
            expect(structToObject(commissionRate2)).to.deep.equal({
                value: ethers.constants.Zero,
                decimals: 0,
            });
        });
    });

    describe('2.1.7. commissionInfo(uint256, uint256)', async() => {
        it('2.1.7.1. return correct commission info for minted token', async () => {
            const { commissionToken, broker1, broker2 } = await beforeCommissionTokenTest({
                registerSampleBrokers: true,
                mintSampleTokens: true,
            });

            const value1 = ethers.utils.parseEther('100');
            const commissionInfo1 = await commissionToken.commissionInfo(1, value1);
            expect(commissionInfo1[0]).to.equal(broker1.address);
            expect(commissionInfo1[1]).to.equal(value1.mul(ethers.utils.parseEther("0.1")).div(Constant.COMMON_RATE_MAX_FRACTION));

            const value2 = ethers.utils.parseEther('20');
            const commissionInfo2 = await commissionToken.commissionInfo(2, value2);
            expect(commissionInfo2[0]).to.equal(broker2.address);
            expect(commissionInfo2[1]).to.equal(value2.mul(ethers.utils.parseEther("0.2")).div(Constant.COMMON_RATE_MAX_FRACTION));
        });

        it('2.1.7.2. return default value info for unminted token', async () => {
            const { commissionToken } = await beforeCommissionTokenTest({
                registerSampleBrokers: true,
                mintSampleTokens: true,
            });

            const value1 = ethers.utils.parseEther('100');
            const commissionInfo1 = await commissionToken.commissionInfo(0, value1);
            expect(commissionInfo1[0]).to.equal(ethers.constants.AddressZero);
            expect(commissionInfo1[1]).to.equal(ethers.constants.Zero);

            const value2 = ethers.utils.parseEther('20');
            const commissionInfo2 = await commissionToken.commissionInfo(100, value2);
            expect(commissionInfo2[0]).to.equal(ethers.constants.AddressZero);
            expect(commissionInfo2[1]).to.equal(ethers.constants.Zero);
        });
    });

    describe('2.1.8. registerBroker(bytes32, address, uint256)', async () => {
        async function beforeRegisterBrokerTest(fixture: CommissionTokenFixture): Promise<{
            defaultParams: RegisterBrokerParams,
        }> {
            const { zone1, broker1 } = fixture;

            const params: RegisterBrokerParams = {
                zone: zone1,
                broker: broker1.address,
                commissionRate: ethers.utils.parseEther('0.1'),
            }

            return {
                defaultParams: params,
            }
        }

        it('2.1.8.1. register broker successfully by manager', async () => {
            const fixture = await beforeCommissionTokenTest();

            const { commissionToken, manager, zone1, zone2, broker1, broker2 } = fixture;
            
            // Register broker 1 in zone 1
            let timestamp = await time.latest() + 100;
            const params1: RegisterBrokerParams = {
                zone: zone1,
                broker: broker1.address,
                commissionRate: ethers.utils.parseEther('0.1'),
            }

            await time.setNextBlockTimestamp(timestamp);
            const tx1 = await getRegisterBrokerTx(commissionToken, manager, params1);
            const receipt1 = await tx1.wait();

            const expectedRate1 = {
                value: params1.commissionRate,
                decimals: Constant.COMMON_RATE_DECIMALS,
            }

            const eventArgs1 = receipt1.events?.find(e => e.event === 'BrokerRegistration')!.args!;
            expect(eventArgs1.zone).to.equal(params1.zone);
            expect(eventArgs1.broker).to.equal(params1.broker);
            expect(structToObject(eventArgs1.commissionRate)).to.deep.equal(expectedRate1);

            const brokerCommissionRate1 = await commissionToken.getBrokerCommissionRate(zone1, broker1.address);
            expect(structToObject(brokerCommissionRate1)).to.deep.equal(expectedRate1);

            // Register broker 1 in zone 2
            timestamp += 10;
            const params2: RegisterBrokerParams = {
                zone: zone2,
                broker: broker1.address,
                commissionRate: ethers.utils.parseEther('0.2'),
            }
            
            await time.setNextBlockTimestamp(timestamp);
            const tx2 = await getRegisterBrokerTx(commissionToken, manager, params2);
            const receipt2 = await tx2.wait();

            const expectedRate2 = {
                value: params2.commissionRate,
                decimals: Constant.COMMON_RATE_DECIMALS,
            }

            const eventArgs2 = receipt2.events?.find(e => e.event === 'BrokerRegistration')!.args!;
            expect(eventArgs2.zone).to.equal(params2.zone);
            expect(eventArgs2.broker).to.equal(params2.broker);
            expect(structToObject(eventArgs2.commissionRate)).to.deep.equal(expectedRate2);

            const brokerCommissionRate2 = await commissionToken.getBrokerCommissionRate(zone2, broker1.address);
            expect(structToObject(brokerCommissionRate2)).to.deep.equal(expectedRate2);

            // Register broker 2 in zone 1
            timestamp += 10;
            const params3: RegisterBrokerParams = {
                zone: zone1,
                broker: broker2.address,
                commissionRate: ethers.utils.parseEther('0.3'),
            }

            await time.setNextBlockTimestamp(timestamp);
            const tx3 = await getRegisterBrokerTx(commissionToken, manager, params3);
            const receipt3 = await tx3.wait();

            const expectedRate3 = {
                value: params3.commissionRate,
                decimals: Constant.COMMON_RATE_DECIMALS,
            }

            const eventArgs3 = receipt3.events?.find(e => e.event === 'BrokerRegistration')!.args!;
            expect(eventArgs3.zone).to.equal(params3.zone);
            expect(eventArgs3.broker).to.equal(params3.broker);
            expect(structToObject(eventArgs3.commissionRate)).to.deep.equal(expectedRate3);

            const brokerCommissionRate3 = await commissionToken.getBrokerCommissionRate(zone1, broker2.address);
            expect(structToObject(brokerCommissionRate3)).to.deep.equal(expectedRate3);
        });

        it('2.1.8.3. register broker unsuccessfully by non-manager', async () => {
            const fixture = await beforeCommissionTokenTest();

            const { commissionToken, moderator, user } = fixture;

            const { defaultParams: params } = await beforeRegisterBrokerTest(fixture);
            
            await expect(getRegisterBrokerTx(commissionToken, moderator, params))
                .to.be.revertedWithCustomError(commissionToken, 'Unauthorized');

            await expect(getRegisterBrokerTx(commissionToken, user, params))
                .to.be.revertedWithCustomError(commissionToken, 'Unauthorized');
        });

        it('2.1.8.4. register broker unsuccessfully with inactive zone', async () => {
            const fixture = await beforeCommissionTokenTest();

            const { commissionToken, manager, zone1, admin, admins } = fixture;

            await callAdmin_DeclareZones(
                admin,
                admins,
                [zone1],
                false,
                await admin.nonce(),
            )

            const { defaultParams: params } = await beforeRegisterBrokerTest(fixture);

            await expect(getRegisterBrokerTx(commissionToken, manager, params))
                .to.be.revertedWithCustomError(commissionToken, 'Unauthorized');
        });

        it('2.1.8.5. register broker unsuccessfully by inactive manager in zone', async () => {
            const fixture = await beforeCommissionTokenTest();

            const { commissionToken, manager, zone1, admin, admins } = fixture;

            await callAdmin_ActivateIn(
                admin,
                admins,
                zone1,
                [manager.address],
                false,
                await admin.nonce(),
            )

            const { defaultParams: params } = await beforeRegisterBrokerTest(fixture);

            await expect(getRegisterBrokerTx(commissionToken, manager, params))
                .to.be.revertedWithCustomError(commissionToken, 'Unauthorized');
        });

        it('2.1.8.6. register broker unsuccessfully with invalid commission rate', async () => {
            const fixture = await beforeCommissionTokenTest();

            const { commissionToken, manager } = fixture;

            const { defaultParams } = await beforeRegisterBrokerTest(fixture);

            const params = {
                ...defaultParams,
                commissionRate: Constant.COMMON_RATE_MAX_FRACTION.add(1),
            }
            await expect(getRegisterBrokerTx(commissionToken, manager, params))
                .to.be.revertedWithCustomError(commissionToken, 'InvalidRate');
        });

        it('2.1.8.8. register broker unsuccessfully when broker is already registered', async () => {
            const fixture = await beforeCommissionTokenTest({
                registerSampleBrokers: true,
            });

            const { commissionToken, manager } = fixture;

            const { defaultParams: params } = await beforeRegisterBrokerTest(fixture);

            await expect(getRegisterBrokerTx(commissionToken, manager, params))
                .to.be.revertedWithCustomError(commissionToken, 'AlreadyRegistered');
        });
    });

    describe('2.1.9. activateBroker(bytes32, address, bool)', async () => {
        async function beforeActivateBrokerTest(fixture: CommissionTokenFixture): Promise<{
            defaultParams: ActivateBrokerParams,
        }> {
            const { zone1, broker1 } = fixture;

            const params: ActivateBrokerParams = {
                zone: zone1,
                broker: broker1.address,
                isActive: true,
            }

            return {
                defaultParams: params,
            }
        }

        it('2.1.9.1. deactivate/activate broker successfully by manager', async () => {
            const fixture = await beforeCommissionTokenTest({
                registerSampleBrokers: true,
            });

            const { commissionToken, manager, zone1, zone2, broker1, broker2 } = fixture;
            
            // Deactivate broker
            const params1: ActivateBrokerParams = {
                zone: zone1,
                broker: broker1.address,
                isActive: false,
            }
            
            const tx1 = await getActivateBrokerTx(commissionToken, manager, params1);
            await tx1.wait();

            await expect(tx1).to.emit(commissionToken, 'BrokerDeactivation').withArgs(
                zone1,
                broker1.address
            );
            
            expect(await commissionToken.isActiveIn(zone1, broker1.address)).to.equal(false);
            expect(await commissionToken.isActiveIn(zone2, broker2.address)).to.equal(true);

            // Activate broker
            const params2: ActivateBrokerParams = {
                zone: zone1,
                broker: broker1.address,
                isActive: true,
            }
            
            const tx2 = await getActivateBrokerTx(commissionToken, manager, params2);
            await tx2.wait();

            await expect(tx2).to.emit(commissionToken, 'BrokerActivation').withArgs(
                zone1,
                broker1.address
            );
            
            expect(await commissionToken.isActiveIn(zone1, broker1.address)).to.equal(true);
            expect(await commissionToken.isActiveIn(zone2, broker2.address)).to.equal(true);
        });

        it('2.1.9.2. activate broker unsuccessfully by non-manager', async () => {
            const fixture = await beforeCommissionTokenTest();

            const { commissionToken, moderator, user } = fixture;

            const { defaultParams: params } = await beforeActivateBrokerTest(fixture);

            await expect(getActivateBrokerTx(commissionToken, moderator, params))
                .to.be.revertedWithCustomError(commissionToken, 'Unauthorized');

            await expect(getActivateBrokerTx(commissionToken, user, params))
                .to.be.revertedWithCustomError(commissionToken, 'Unauthorized');
        });

        it('2.1.9.3. activate broker unsuccessfully with inactive zone', async () => {
            const fixture = await beforeCommissionTokenTest();

            const { commissionToken, manager, zone1, admin, admins } = fixture;

            await callAdmin_DeclareZones(
                admin,
                admins,
                [zone1],
                false,
                await admin.nonce(),
            )

            const { defaultParams: params } = await beforeActivateBrokerTest(fixture);

            await expect(getActivateBrokerTx(commissionToken, manager, params))
                .to.be.revertedWithCustomError(commissionToken, 'Unauthorized');
        });

        it('2.1.9.4. activate broker unsuccessfully by inactive manager in zone', async () => {
            const fixture = await beforeCommissionTokenTest();

            const { commissionToken, manager, zone1, admin, admins } = fixture;

            await callAdmin_ActivateIn(
                admin,
                admins,
                zone1,
                [manager.address],
                false,
                await admin.nonce(),
            )

            const { defaultParams: params } = await beforeActivateBrokerTest(fixture);

            await expect(getActivateBrokerTx(commissionToken, manager, params))
                .to.be.revertedWithCustomError(commissionToken, 'Unauthorized');
        });
    });

    describe('2.1.10. mint(bytes32, address, uint256)', async () => {
        async function beforeMintTest(fixture: CommissionTokenFixture): Promise<{
            defaultParams: MintParams,
        }> {
            const { zone1, broker1 } = fixture;

            const params: MintParams = {
                zone: zone1,
                broker: broker1.address,
                tokenId: BigNumber.from(1),
            }

            return {
                defaultParams: params,
            }
        }

        it('2.1.10.1. mint successfully by estateToken contract', async () => {
            const { estateToken, commissionToken, zone1, zone2, broker1, broker2 } = await beforeCommissionTokenTest({
                registerSampleBrokers: true,
            });

            // Mint for broker 1 in zone 1
            const tx1 = await getMintTx(commissionToken, estateToken, {
                zone: zone1,
                broker: broker1.address,
                tokenId: BigNumber.from(1),
            });
            await tx1.wait();
            await expect(tx1).to.emit(commissionToken, 'NewToken').withArgs(
                BigNumber.from(1),
                zone1,
                broker1.address
            );

            const commissionRate1 = await commissionToken.getBrokerCommissionRate(zone1, broker1.address);

            expect(await commissionToken.totalSupply()).to.equal(1);

            expect(await commissionToken.ownerOf(1)).to.equal(broker1.address);
            expect(await commissionToken.tokenURI(1)).to.equal(LandInitialization.COMMISSION_TOKEN_BaseURI);

            expect(structToObject(await commissionToken.getCommissionRate(1))).to.deep.equal(
                structToObject(commissionRate1)
            );

            // Mint for broker 2 in zone 2
            const commissionRate2 = await commissionToken.getBrokerCommissionRate(zone2, broker2.address);

            const tx2 = await getMintTx(commissionToken, estateToken, {
                zone: zone2,
                broker: broker2.address,
                tokenId: BigNumber.from(2),
            });
            await tx2.wait();
            await expect(tx2).to.emit(commissionToken, 'NewToken').withArgs(
                BigNumber.from(2),
                zone2,
                broker2.address
            );

            expect(await commissionToken.totalSupply()).to.equal(2);

            expect(await commissionToken.ownerOf(2)).to.equal(broker2.address);
            expect(await commissionToken.tokenURI(2)).to.equal(LandInitialization.COMMISSION_TOKEN_BaseURI);

            expect(structToObject(await commissionToken.getCommissionRate(2))).to.deep.equal(
                structToObject(commissionRate2)
            );
        });

        it('2.1.10.2. mint unsuccessfully when sender is not estateToken contract', async () => {
            const fixture = await beforeCommissionTokenTest({
                registerSampleBrokers: true,
            });

            const { commissionToken, manager, moderator, user } = fixture;

            const { defaultParams: params } = await beforeMintTest(fixture);

            await expect(commissionToken.connect(manager).mint(
                params.zone,
                params.broker,
                params.tokenId
            )).to.be.revertedWithCustomError(commissionToken, 'Unauthorized');

            await expect(commissionToken.connect(moderator).mint(
                params.zone,
                params.broker,
                params.tokenId
            )).to.be.revertedWithCustomError(commissionToken, 'Unauthorized');

            await expect(commissionToken.connect(user).mint(
                params.zone,
                params.broker,
                params.tokenId
            )).to.be.revertedWithCustomError(commissionToken, 'Unauthorized');
        });

        it('2.1.10.3. mint unsuccessfully when already minted', async () => {
            const fixture = await beforeCommissionTokenTest({
                registerSampleBrokers: true,
            });

            const { commissionToken, estateToken, zone1, zone2, broker1, broker2 } = fixture;

            const params1: MintParams = {
                zone: zone1,
                broker: broker1.address,
                tokenId: BigNumber.from(1),
            }
            await callTransaction(getMintTx(commissionToken, estateToken, params1));
            await expect(getMintTx(commissionToken, estateToken, params1))
                .to.be.revertedWithCustomError(commissionToken, 'AlreadyMinted');

            const params2: MintParams = {
                zone: zone2,
                broker: broker2.address,
                tokenId: BigNumber.from(2),
            }
            await callTransaction(getMintTx(commissionToken, estateToken, params2));
            await expect(getMintTx(commissionToken, estateToken, params2))
                .to.be.revertedWithCustomError(commissionToken, 'AlreadyMinted');
        });

        it('2.1.10.4. mint unsuccessfully when zone is inactive', async () => {
            const fixture = await beforeCommissionTokenTest({
                registerSampleBrokers: true,
            });

            const { commissionToken, estateToken, admin, admins } = fixture;

            const { defaultParams: params } = await beforeMintTest(fixture);

            await callAdmin_DeclareZones(
                admin,
                admins,
                [params.zone],
                false,
                await admin.nonce(),
            )

            await expect(getMintTx(commissionToken, estateToken, params))
                .to.be.revertedWithCustomError(commissionToken, 'InvalidZone');
        });

        it('2.1.10.5. mint unsuccessfully when broker not registered', async () => {
            const fixture = await beforeCommissionTokenTest();

            const { commissionToken, estateToken } = fixture;

            const { defaultParams: params } = await beforeMintTest(fixture);

            await expect(getMintTx(commissionToken, estateToken, params))
                .to.be.revertedWithCustomError(commissionToken, 'InvalidBroker');
        });

        it('2.1.10.6. mint unsuccessfully when broker is deactivated', async () => {
            const fixture = await beforeCommissionTokenTest({
                registerSampleBrokers: true,
            });

            const { commissionToken, estateToken, manager } = fixture;

            const { defaultParams: params } = await beforeMintTest(fixture);

            await callTransaction(getActivateBrokerTx(commissionToken, manager, {
                zone: params.zone,
                broker: params.broker,
                isActive: false,
            }));

            await expect(getMintTx(commissionToken, estateToken, params))
                .to.be.revertedWithCustomError(commissionToken, 'InvalidBroker');
        });
    });

    describe('2.1.11. getRoyaltyRate(uint256)', async () => {
        it('2.1.11.1. return fixed royalty rate for all token', async () => {
            const { commissionToken } = await beforeCommissionTokenTest({
                registerSampleBrokers: true,
                mintSampleTokens: true,
            });

            const royaltyRate = {
                value: LandInitialization.COMMISSION_TOKEN_RoyaltyRate,
                decimals: Constant.COMMON_RATE_DECIMALS,
            }

            expect(structToObject(await commissionToken.getRoyaltyRate(1))).to.deep.equal(
                royaltyRate
            );
            expect(structToObject(await commissionToken.getRoyaltyRate(2))).to.deep.equal(
                royaltyRate
            );
        });
    });

    describe('2.1.12. royaltyInfo(uint256, uint256)', async () => {
        it('2.1.12.1. return correct royalty info', async () => {
            const { commissionToken, feeReceiver } = await beforeCommissionTokenTest({
                registerSampleBrokers: true,
                mintSampleTokens: true,
            });

            const royaltyRate = {
                value: LandInitialization.COMMISSION_TOKEN_RoyaltyRate,
                decimals: Constant.COMMON_RATE_DECIMALS,
            }
            
            const value1 = ethers.utils.parseEther("100");
            const royaltyInfo = await commissionToken.royaltyInfo(1, value1);
            expect(royaltyInfo[0]).to.deep.equal(feeReceiver.address);
            expect(royaltyInfo[1]).to.deep.equal(scaleRate(value1, royaltyRate));

            const value2 = ethers.utils.parseEther("20");
            const royaltyInfo2 = await commissionToken.royaltyInfo(2, value2);
            expect(royaltyInfo2[0]).to.deep.equal(feeReceiver.address);
            expect(royaltyInfo2[1]).to.deep.equal(scaleRate(value2, royaltyRate));
        });
    });

    describe('2.1.13. supportsInterface(bytes4)', async () => {
        it('2.1.13.1. return true for appropriate interface', async () => {
            const { commissionToken } = await beforeCommissionTokenTest();

            const IERC4906Upgradeable = IERC4906Upgradeable__factory.createInterface();
            const IERC165Upgradeable = IERC165Upgradeable__factory.createInterface();
            const IERC721Upgradeable = IERC721Upgradeable__factory.createInterface();
            const IERC2981Upgradeable = IERC2981Upgradeable__factory.createInterface();
            const IERC721MetadataUpgradeable = IERC721MetadataUpgradeable__factory.createInterface();

            const ICommon = ICommon__factory.createInterface();
            const IRoyaltyRateProposer = IRoyaltyRateProposer__factory.createInterface();

            const IERC2981UpgradeableInterfaceId = getInterfaceID(IERC2981Upgradeable, [IERC165Upgradeable]);
            const IERC4906UpgradeableInterfaceId = getInterfaceID(IERC4906Upgradeable, [IERC165Upgradeable, IERC721Upgradeable])
            const IRoyaltyRateProposerInterfaceId = getInterfaceID(IRoyaltyRateProposer, [ICommon, IERC165Upgradeable, IERC2981Upgradeable]);
            const IERC721UpgradeableInterfaceId = getInterfaceID(IERC721Upgradeable, [IERC165Upgradeable]);
            const IERC721MetadataUpgradeableInterfaceId = getInterfaceID(IERC721MetadataUpgradeable, [IERC721Upgradeable]);

            expect(await commissionToken.supportsInterface(getBytes4Hex(IERC2981UpgradeableInterfaceId))).to.equal(true);
            expect(await commissionToken.supportsInterface(getBytes4Hex(IERC4906UpgradeableInterfaceId))).to.equal(true);
            expect(await commissionToken.supportsInterface(getBytes4Hex(IERC721UpgradeableInterfaceId))).to.equal(true);
            expect(await commissionToken.supportsInterface(getBytes4Hex(IERC721MetadataUpgradeableInterfaceId))).to.equal(true);
            expect(await commissionToken.supportsInterface(getBytes4Hex(IRoyaltyRateProposerInterfaceId))).to.equal(true);
        });
    });
});
