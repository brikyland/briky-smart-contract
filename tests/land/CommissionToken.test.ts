import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import { BigNumber } from 'ethers';

// @nomicfoundation/hardhat-network-helpers
import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';

// @tests
import {
    IERC165UpgradeableInterfaceId,
    IERC721UpgradeableInterfaceId,
    IERC721MetadataUpgradeableInterfaceId,
    IERC2981UpgradeableInterfaceId,
    IERC4906UpgradeableInterfaceId,
} from '@tests/interfaces';
import { Constant } from '@tests/test.constant';

// @tests/land
import { Initialization as LandInitialization } from '@tests/land/test.initialization';

// @typechain-types
import { Admin, CommissionToken, Currency, FeeReceiver, MockEstateToken } from '@typechain-types';

// @utils
import { callTransaction, callTransactionAtTimestamp } from '@utils/blockchain';
import { scaleRate } from '@utils/formula';
import { MockValidator } from '@utils/mockValidator';
import { getBytes4Hex, structToObject } from '@utils/utils';

// @utils/deployments/common
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployFeeReceiver } from '@utils/deployments/common/feeReceiver';
import { deployCurrency } from '@utils/deployments/common/currency';

// @utils/deployments/mock
import { deployMockEstateToken } from '@utils/deployments/mock/land/mockEstateToken';
import { deployCommissionToken } from '@utils/deployments/land/commissionToken';

// @utils/models/land
import {
    ActivateBrokerParams,
    MintParams,
    RegisterBrokerParams,
    UpdateBaseURIParams,
    UpdateBaseURIParamsInput,
    UpdateRoyaltyRateParams,
    UpdateRoyaltyRateParamsInput,
} from '@utils/models/land/commissionToken';

// @utils/signatures/land
import { getUpdateBaseURISignatures, getUpdateRoyaltyRateSignatures } from '@utils/signatures/land/commissionToken';

// @utils/transaction/common
import {
    getAdminTxByInput_ActivateIn,
    getAdminTxByInput_AuthorizeManagers,
    getAdminTxByInput_AuthorizeModerators,
    getAdminTxByInput_DeclareZone,
} from '@utils/transaction/common/admin';
import { getPausableTxByInput_Pause } from '@utils/transaction/common/pausable';

// @utils/transaction/land
import {
    getCommissionTokenTx_ActivateBroker,
    getCallCommissionTokenTx_Mint,
    getCommissionTokenTx_RegisterBroker,
    getCommissionTokenTx_UpdateBaseURI,
    getCommissionTokenTxByInput_UpdateBaseURI,
    getCommissionTokenTx_UpdateRoyaltyRate,
    getCommissionTokenTxByInput_UpdateRoyaltyRate,
    getCommissionTokenTx_Mint,
} from '@utils/transaction/land/commissionToken';

interface CommissionTokenFixture {
    deployer: any;
    admins: any[];
    manager: any;
    moderator: any;
    user: any;
    broker1: any;
    broker2: any;

    validator: MockValidator;

    admin: Admin;
    currency: Currency;
    feeReceiver: FeeReceiver;
    estateToken: MockEstateToken;
    commissionToken: CommissionToken;

    zone1: string;
    zone2: string;
}

describe('2.1. CommissionToken', async () => {
    async function commissionTokenFixture(): Promise<CommissionTokenFixture> {
        const [deployer, admin1, admin2, admin3, admin4, admin5, manager, moderator, user, broker1, broker2] =
            await ethers.getSigners();
        const admins = [admin1, admin2, admin3, admin4, admin5];

        const validator = new MockValidator(deployer as any);

        const adminAddresses: string[] = admins.map((signer) => signer.address);
        const admin = (await deployAdmin(
            deployer.address,
            adminAddresses[0],
            adminAddresses[1],
            adminAddresses[2],
            adminAddresses[3],
            adminAddresses[4]
        )) as Admin;

        const currency = (await deployCurrency(deployer.address, 'MockCurrency', 'MCK')) as Currency;

        const feeReceiver = (await deployFeeReceiver(deployer.address, admin.address)) as FeeReceiver;

        const estateToken = (await deployMockEstateToken(
            deployer.address,
            admin.address,
            feeReceiver.address,
            validator.getAddress(),
            LandInitialization.ESTATE_TOKEN_BaseURI
        )) as MockEstateToken;

        const commissionToken = (await deployCommissionToken(
            deployer.address,
            admin.address,
            estateToken.address,
            feeReceiver.address,
            LandInitialization.COMMISSION_TOKEN_Name,
            LandInitialization.COMMISSION_TOKEN_Symbol,
            LandInitialization.COMMISSION_TOKEN_BaseURI,
            LandInitialization.COMMISSION_TOKEN_RoyaltyRate
        )) as CommissionToken;

        const zone1 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('TestZone1'));
        const zone2 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('TestZone2'));

        return {
            deployer,
            admins,
            manager,
            moderator,
            user,
            broker1,
            broker2,
            validator,
            admin,
            currency,
            feeReceiver,
            estateToken,
            commissionToken,
            zone1,
            zone2,
        };
    }

    async function beforeCommissionTokenTest({
        skipDeclareZone = false,
        skipActivateExecutiveInZone = false,
        registerSampleBrokers = false,
        mintSampleTokens = false,
        pause = false,
    } = {}): Promise<CommissionTokenFixture> {
        const fixture = await loadFixture(commissionTokenFixture);
        const {
            deployer,
            admin,
            admins,
            commissionToken,
            estateToken,
            manager,
            moderator,
            broker1,
            broker2,
            zone1,
            zone2,
        } = fixture;

        await callTransaction(
            getAdminTxByInput_AuthorizeManagers(
                admin,
                deployer,
                {
                    accounts: [manager.address],
                    isManager: true,
                },
                admins
            )
        );
        await callTransaction(
            getAdminTxByInput_AuthorizeModerators(
                admin,
                deployer,
                {
                    accounts: [moderator.address],
                    isModerator: true,
                },
                admins
            )
        );

        if (!skipDeclareZone) {
            for (const zone of [zone1, zone2]) {
                await callTransaction(getAdminTxByInput_DeclareZone(admin, deployer, { zone }, admins));
            }

            if (!skipActivateExecutiveInZone) {
                for (const zone of [zone1, zone2]) {
                    await callTransaction(
                        getAdminTxByInput_ActivateIn(
                            admin,
                            deployer,
                            {
                                zone,
                                accounts: [manager.address, moderator.address],
                                isActive: true,
                            },
                            admins
                        )
                    );
                }
            }
        }

        if (registerSampleBrokers) {
            await callTransaction(
                getCommissionTokenTx_RegisterBroker(commissionToken, manager, {
                    zone: zone1,
                    broker: broker1.address,
                    commissionRate: ethers.utils.parseEther('0.1'),
                })
            );

            await callTransaction(
                getCommissionTokenTx_RegisterBroker(commissionToken, manager, {
                    zone: zone2,
                    broker: broker2.address,
                    commissionRate: ethers.utils.parseEther('0.2'),
                })
            );
        }

        if (mintSampleTokens) {
            await callTransaction(
                getCallCommissionTokenTx_Mint(commissionToken, estateToken, {
                    zone: zone1,
                    broker: broker1.address,
                    tokenId: ethers.BigNumber.from(1),
                })
            );

            await callTransaction(
                getCallCommissionTokenTx_Mint(commissionToken, estateToken, {
                    zone: zone2,
                    broker: broker2.address,
                    tokenId: ethers.BigNumber.from(2),
                })
            );
        }

        if (pause) {
            await callTransaction(getPausableTxByInput_Pause(commissionToken, deployer, admin, admins));
        }

        return fixture;
    }

    /* --- Initialization --- */
    describe('2.1.1. initialize(address,address,address,string,string,string,uint256)', async () => {
        it('2.1.1.1. Deploy successfully', async () => {
            const { admin, feeReceiver, estateToken, commissionToken } = await beforeCommissionTokenTest();

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
            await expect(tx)
                .to.emit(commissionToken, 'BaseURIUpdate')
                .withArgs(LandInitialization.COMMISSION_TOKEN_BaseURI)
                .emit(commissionToken, 'RoyaltyRateUpdate')
                .withArgs((rate: any) => {
                    expect(structToObject(rate)).to.deep.equal({
                        value: LandInitialization.COMMISSION_TOKEN_RoyaltyRate,
                        decimals: Constant.COMMON_RATE_DECIMALS,
                    });
                    return true;
                });
        });

        it('2.1.1.2. Deploy unsuccessfully with invalid royalty rate', async () => {
            const { deployer, admin, estateToken, feeReceiver } = await beforeCommissionTokenTest();

            const CommissionToken = await ethers.getContractFactory('CommissionToken', deployer);

            await expect(
                upgrades.deployProxy(CommissionToken, [
                    admin.address,
                    estateToken.address,
                    feeReceiver.address,
                    LandInitialization.COMMISSION_TOKEN_Name,
                    LandInitialization.COMMISSION_TOKEN_Symbol,
                    LandInitialization.COMMISSION_TOKEN_BaseURI,
                    Constant.COMMON_RATE_MAX_FRACTION.add(1),
                ])
            ).to.be.reverted;
        });
    });

    /* --- Administration --- */
    describe('2.1.2. updateBaseURI(string,bytes[])', async () => {
        it('2.1.2.1. Update base URI successfully with valid signatures', async () => {
            const { deployer, admins, admin, commissionToken } = await beforeCommissionTokenTest({
                registerSampleBrokers: true,
                mintSampleTokens: true,
            });

            const paramsInput: UpdateBaseURIParamsInput = {
                uri: 'NewBaseURI:',
            };
            const tx = await getCommissionTokenTxByInput_UpdateBaseURI(
                commissionToken,
                deployer,
                paramsInput,
                admin,
                admins
            );
            await tx.wait();

            await expect(tx).to.emit(commissionToken, 'BaseURIUpdate').withArgs('NewBaseURI:');

            expect(await commissionToken.tokenURI(1)).to.equal('NewBaseURI:1');
            expect(await commissionToken.tokenURI(2)).to.equal('NewBaseURI:2');
        });

        it('2.1.2.2. Update base URI unsuccessfully with invalid signatures', async () => {
            const { deployer, admins, admin, commissionToken } = await beforeCommissionTokenTest({
                registerSampleBrokers: true,
                mintSampleTokens: true,
            });

            const paramsInput: UpdateBaseURIParamsInput = {
                uri: 'NewBaseURI:',
            };
            const params: UpdateBaseURIParams = {
                ...paramsInput,
                signatures: await getUpdateBaseURISignatures(commissionToken, paramsInput, admin, admins, false),
            };
            await expect(
                getCommissionTokenTx_UpdateBaseURI(commissionToken, deployer, params)
            ).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });
    });

    describe('2.1.3. updateRoyaltyRate(uint256,bytes[])', async () => {
        it('2.1.3.1. Update royalty rate successfully with valid signatures', async () => {
            const { deployer, admins, admin, commissionToken } = await beforeCommissionTokenTest({});

            const paramsInput: UpdateRoyaltyRateParamsInput = {
                royaltyRate: ethers.utils.parseEther('0.2'),
            };
            const tx = await getCommissionTokenTxByInput_UpdateRoyaltyRate(
                commissionToken,
                deployer,
                paramsInput,
                admin,
                admins
            );
            await tx.wait();

            await expect(tx)
                .to.emit(commissionToken, 'RoyaltyRateUpdate')
                .withArgs((rate: any) => {
                    expect(structToObject(rate)).to.deep.equal({
                        value: ethers.utils.parseEther('0.2'),
                        decimals: Constant.COMMON_RATE_DECIMALS,
                    });
                    return true;
                });

            const royaltyRate = await commissionToken.getRoyaltyRate(0);
            expect(structToObject(royaltyRate)).to.deep.equal({
                value: ethers.utils.parseEther('0.2'),
                decimals: Constant.COMMON_RATE_DECIMALS,
            });
        });

        it('2.1.3.2. Update royalty rate unsuccessfully with invalid signatures', async () => {
            const { deployer, admins, admin, commissionToken } = await beforeCommissionTokenTest({});

            const paramsInput: UpdateRoyaltyRateParamsInput = {
                royaltyRate: ethers.utils.parseEther('0.2'),
            };
            const params: UpdateRoyaltyRateParams = {
                ...paramsInput,
                signatures: await getUpdateRoyaltyRateSignatures(commissionToken, paramsInput, admin, admins, false),
            };
            await expect(
                getCommissionTokenTx_UpdateRoyaltyRate(commissionToken, deployer, params)
            ).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('2.1.3.3. Update royalty rate unsuccessfully with invalid rate', async () => {
            const { deployer, admins, admin, commissionToken } = await beforeCommissionTokenTest({});

            await expect(
                getCommissionTokenTxByInput_UpdateRoyaltyRate(
                    commissionToken,
                    deployer,
                    { royaltyRate: Constant.COMMON_RATE_MAX_FRACTION.add(1) },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(commissionToken, 'InvalidRate');
        });
    });

    /* --- Query --- */
    describe('2.1.4. getCommissionRate(uint256)', async () => {
        it('2.1.4.1. Return correct commission rate of minted tokens', async () => {
            const { commissionToken } = await beforeCommissionTokenTest({
                registerSampleBrokers: true,
                mintSampleTokens: true,
            });

            const commissionRate1 = await commissionToken.getCommissionRate(1);
            expect(structToObject(commissionRate1)).to.deep.equal({
                value: ethers.utils.parseEther('0.1'),
                decimals: Constant.COMMON_RATE_DECIMALS,
            });

            const commissionRate2 = await commissionToken.getCommissionRate(2);
            expect(structToObject(commissionRate2)).to.deep.equal({
                value: ethers.utils.parseEther('0.2'),
                decimals: Constant.COMMON_RATE_DECIMALS,
            });
        });

        it('2.1.4.2. Return default value for unminted token', async () => {
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

    describe('2.1.5. getBrokerCommissionRate(bytes32,address)', async () => {
        it('2.1.5.1. Return correct broker registry for registered broker', async () => {
            const { broker1, manager, commissionToken, zone1 } = await beforeCommissionTokenTest();

            let timestamp = (await time.latest()) + 100;

            await callTransactionAtTimestamp(
                getCommissionTokenTx_RegisterBroker(commissionToken, manager, {
                    zone: zone1,
                    broker: broker1.address,
                    commissionRate: ethers.utils.parseEther('0.1'),
                }),
                timestamp
            );

            const brokerCommissionRate = await commissionToken.getBrokerCommissionRate(zone1, broker1.address);
            expect(structToObject(brokerCommissionRate)).to.deep.equal({
                value: ethers.utils.parseEther('0.1'),
                decimals: Constant.COMMON_RATE_DECIMALS,
            });
        });

        it('2.1.5.2. Revert with invalid zone', async () => {
            const { broker1, commissionToken } = await beforeCommissionTokenTest({
                registerSampleBrokers: true,
            });

            const invalidZone = ethers.utils.formatBytes32String('InvalidZone');
            await expect(
                commissionToken.getBrokerCommissionRate(invalidZone, broker1.address)
            ).to.be.revertedWithCustomError(commissionToken, 'InvalidZone');
        });

        it('2.1.5.3. Revert when broker is not active in zone', async () => {
            const { broker1, manager, commissionToken, zone1 } = await beforeCommissionTokenTest({
                registerSampleBrokers: true,
            });

            await callTransaction(
                getCommissionTokenTx_ActivateBroker(commissionToken, manager, {
                    zone: zone1,
                    broker: broker1.address,
                    isActive: false,
                })
            );

            await expect(commissionToken.getBrokerCommissionRate(zone1, broker1.address)).to.be.revertedWithCustomError(
                commissionToken,
                'NotActive'
            );
        });
    });

    describe('2.1.6. commissionInfo(uint256,uint256)', async () => {
        it('2.1.6.1. Return correct commission info for minted token', async () => {
            const { broker1, broker2, commissionToken } = await beforeCommissionTokenTest({
                registerSampleBrokers: true,
                mintSampleTokens: true,
            });

            const value1 = ethers.utils.parseEther('100');
            const commissionInfo1 = await commissionToken.commissionInfo(1, value1);
            expect(commissionInfo1[0]).to.equal(broker1.address);
            expect(commissionInfo1[1]).to.equal(
                value1.mul(ethers.utils.parseEther('0.1')).div(Constant.COMMON_RATE_MAX_FRACTION)
            );

            const value2 = ethers.utils.parseEther('20');
            const commissionInfo2 = await commissionToken.commissionInfo(2, value2);
            expect(commissionInfo2[0]).to.equal(broker2.address);
            expect(commissionInfo2[1]).to.equal(
                value2.mul(ethers.utils.parseEther('0.2')).div(Constant.COMMON_RATE_MAX_FRACTION)
            );
        });

        it('2.1.6.2. Return default value info for unminted token', async () => {
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

    describe('2.1.7. getRoyaltyRate(uint256)', async () => {
        it('2.1.7.1. Return fixed royalty rate for all token', async () => {
            const { commissionToken } = await beforeCommissionTokenTest({
                registerSampleBrokers: true,
                mintSampleTokens: true,
            });

            const royaltyRate = {
                value: LandInitialization.COMMISSION_TOKEN_RoyaltyRate,
                decimals: Constant.COMMON_RATE_DECIMALS,
            };

            expect(structToObject(await commissionToken.getRoyaltyRate(1))).to.deep.equal(royaltyRate);
            expect(structToObject(await commissionToken.getRoyaltyRate(2))).to.deep.equal(royaltyRate);
        });
    });

    describe('2.1.8. royaltyInfo(uint256,uint256)', async () => {
        it('2.1.8.1. Return correct royalty info', async () => {
            const { commissionToken, feeReceiver } = await beforeCommissionTokenTest({
                registerSampleBrokers: true,
                mintSampleTokens: true,
            });

            const royaltyRate = {
                value: LandInitialization.COMMISSION_TOKEN_RoyaltyRate,
                decimals: Constant.COMMON_RATE_DECIMALS,
            };

            const value1 = ethers.utils.parseEther('100');
            const royaltyInfo = await commissionToken.royaltyInfo(1, value1);
            expect(royaltyInfo[0]).to.deep.equal(feeReceiver.address);
            expect(royaltyInfo[1]).to.deep.equal(scaleRate(value1, royaltyRate));

            const value2 = ethers.utils.parseEther('20');
            const royaltyInfo2 = await commissionToken.royaltyInfo(2, value2);
            expect(royaltyInfo2[0]).to.deep.equal(feeReceiver.address);
            expect(royaltyInfo2[1]).to.deep.equal(scaleRate(value2, royaltyRate));
        });
    });

    describe('2.1.9. supportsInterface(bytes4)', async () => {
        it('2.1.9.1. Return true for appropriate interface', async () => {
            const { commissionToken } = await beforeCommissionTokenTest();

            expect(await commissionToken.supportsInterface(getBytes4Hex(IERC165UpgradeableInterfaceId))).to.equal(true);
            expect(await commissionToken.supportsInterface(getBytes4Hex(IERC721UpgradeableInterfaceId))).to.equal(true);
            expect(
                await commissionToken.supportsInterface(getBytes4Hex(IERC721MetadataUpgradeableInterfaceId))
            ).to.equal(true);
            expect(await commissionToken.supportsInterface(getBytes4Hex(IERC2981UpgradeableInterfaceId))).to.equal(
                true
            );
            expect(await commissionToken.supportsInterface(getBytes4Hex(IERC4906UpgradeableInterfaceId))).to.equal(
                true
            );
        });
    });

    /* --- Command --- */
    describe('2.1.10. registerBroker(bytes32,address,uint256)', async () => {
        async function beforeRegisterBrokerTest(fixture: CommissionTokenFixture): Promise<{
            defaultParams: RegisterBrokerParams;
        }> {
            const { broker1, zone1 } = fixture;

            const params: RegisterBrokerParams = {
                zone: zone1,
                broker: broker1.address,
                commissionRate: ethers.utils.parseEther('0.1'),
            };

            return { defaultParams: params };
        }

        it('2.1.10.1. Register broker successfully by manager', async () => {
            const fixture = await beforeCommissionTokenTest();

            const { manager, broker1, broker2, commissionToken, zone1, zone2 } = fixture;

            // Register broker 1 in zone 1
            let timestamp = (await time.latest()) + 100;
            const params1: RegisterBrokerParams = {
                zone: zone1,
                broker: broker1.address,
                commissionRate: ethers.utils.parseEther('0.1'),
            };

            await time.setNextBlockTimestamp(timestamp);
            const tx1 = await getCommissionTokenTx_RegisterBroker(commissionToken, manager, params1);
            const receipt1 = await tx1.wait();

            const expectedRate1 = {
                value: params1.commissionRate,
                decimals: Constant.COMMON_RATE_DECIMALS,
            };

            const eventArgs1 = receipt1.events?.find((e) => e.event === 'BrokerRegistration')!.args!;
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
            };

            await time.setNextBlockTimestamp(timestamp);
            const tx2 = await getCommissionTokenTx_RegisterBroker(commissionToken, manager, params2);
            const receipt2 = await tx2.wait();

            const expectedRate2 = {
                value: params2.commissionRate,
                decimals: Constant.COMMON_RATE_DECIMALS,
            };

            const eventArgs2 = receipt2.events?.find((e) => e.event === 'BrokerRegistration')!.args!;
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
            };

            await time.setNextBlockTimestamp(timestamp);
            const tx3 = await getCommissionTokenTx_RegisterBroker(commissionToken, manager, params3);
            const receipt3 = await tx3.wait();

            const expectedRate3 = {
                value: params3.commissionRate,
                decimals: Constant.COMMON_RATE_DECIMALS,
            };

            const eventArgs3 = receipt3.events?.find((e) => e.event === 'BrokerRegistration')!.args!;
            expect(eventArgs3.zone).to.equal(params3.zone);
            expect(eventArgs3.broker).to.equal(params3.broker);
            expect(structToObject(eventArgs3.commissionRate)).to.deep.equal(expectedRate3);

            const brokerCommissionRate3 = await commissionToken.getBrokerCommissionRate(zone1, broker2.address);
            expect(structToObject(brokerCommissionRate3)).to.deep.equal(expectedRate3);
        });

        it('2.1.10.2. Register broker unsuccessfully when paused', async () => {
            const fixture = await beforeCommissionTokenTest({
                pause: true,
            });

            const { manager, commissionToken } = fixture;

            const { defaultParams: params } = await beforeRegisterBrokerTest(fixture);

            await expect(getCommissionTokenTx_RegisterBroker(commissionToken, manager, params)).to.be.revertedWith(
                'Pausable: paused'
            );
        });

        it('2.1.10.3. Register broker unsuccessfully by non-manager', async () => {
            const fixture = await beforeCommissionTokenTest();

            const { moderator, user, commissionToken } = fixture;

            const { defaultParams: params } = await beforeRegisterBrokerTest(fixture);

            await expect(
                getCommissionTokenTx_RegisterBroker(commissionToken, moderator, params)
            ).to.be.revertedWithCustomError(commissionToken, 'Unauthorized');

            await expect(
                getCommissionTokenTx_RegisterBroker(commissionToken, user, params)
            ).to.be.revertedWithCustomError(commissionToken, 'Unauthorized');
        });

        it('2.1.10.4. Register broker unsuccessfully with inactive zone', async () => {
            const fixture = await beforeCommissionTokenTest({
                skipDeclareZone: true,
            });

            const { manager, commissionToken } = fixture;

            const { defaultParams: params } = await beforeRegisterBrokerTest(fixture);

            await expect(
                getCommissionTokenTx_RegisterBroker(commissionToken, manager, params)
            ).to.be.revertedWithCustomError(commissionToken, 'Unauthorized');
        });

        it('2.1.10.5. Register broker unsuccessfully by inactive manager in zone', async () => {
            const fixture = await beforeCommissionTokenTest();

            const { deployer, commissionToken, manager, zone1, admin, admins } = fixture;

            await callTransaction(
                getAdminTxByInput_ActivateIn(
                    admin,
                    deployer,
                    {
                        zone: zone1,
                        accounts: [manager.address],
                        isActive: false,
                    },
                    admins
                )
            );

            const { defaultParams: params } = await beforeRegisterBrokerTest(fixture);

            await expect(
                getCommissionTokenTx_RegisterBroker(commissionToken, manager, params)
            ).to.be.revertedWithCustomError(commissionToken, 'Unauthorized');
        });

        it('2.1.10.6. Register broker unsuccessfully with invalid commission rate', async () => {
            const fixture = await beforeCommissionTokenTest();

            const { commissionToken, manager } = fixture;

            const { defaultParams } = await beforeRegisterBrokerTest(fixture);

            await expect(
                getCommissionTokenTx_RegisterBroker(commissionToken, manager, {
                    ...defaultParams,
                    commissionRate: Constant.COMMON_RATE_MAX_FRACTION.add(1),
                })
            ).to.be.revertedWithCustomError(commissionToken, 'InvalidRate');
        });

        it('2.1.10.7. Register broker unsuccessfully with already registered broker', async () => {
            const fixture = await beforeCommissionTokenTest({
                registerSampleBrokers: true,
            });

            const { commissionToken, manager } = fixture;

            const { defaultParams: params } = await beforeRegisterBrokerTest(fixture);

            await expect(
                getCommissionTokenTx_RegisterBroker(commissionToken, manager, params)
            ).to.be.revertedWithCustomError(commissionToken, 'AlreadyRegistered');
        });
    });

    describe('2.1.11. activateBroker(bytes32,address,bool)', async () => {
        async function beforeActivateBrokerTest(fixture: CommissionTokenFixture): Promise<{
            defaultParams: ActivateBrokerParams;
        }> {
            const { zone1, broker1 } = fixture;

            const params: ActivateBrokerParams = {
                zone: zone1,
                broker: broker1.address,
                isActive: true,
            };

            return { defaultParams: params };
        }

        it('2.1.11.1. Deactivate/activate broker successfully by manager', async () => {
            const fixture = await beforeCommissionTokenTest({
                registerSampleBrokers: true,
            });

            const { commissionToken, manager, zone1, zone2, broker1, broker2 } = fixture;

            // Deactivate broker
            const params1: ActivateBrokerParams = {
                zone: zone1,
                broker: broker1.address,
                isActive: false,
            };
            const tx1 = await getCommissionTokenTx_ActivateBroker(commissionToken, manager, params1);
            await tx1.wait();

            await expect(tx1).to.emit(commissionToken, 'BrokerDeactivation').withArgs(zone1, broker1.address);

            expect(await commissionToken.isActiveIn(zone1, broker1.address)).to.equal(false);
            expect(await commissionToken.isActiveIn(zone2, broker2.address)).to.equal(true);

            // Activate broker
            const params2: ActivateBrokerParams = {
                zone: zone1,
                broker: broker1.address,
                isActive: true,
            };
            const tx2 = await getCommissionTokenTx_ActivateBroker(commissionToken, manager, params2);
            await tx2.wait();

            await expect(tx2).to.emit(commissionToken, 'BrokerActivation').withArgs(zone1, broker1.address);

            expect(await commissionToken.isActiveIn(zone1, broker1.address)).to.equal(true);
            expect(await commissionToken.isActiveIn(zone2, broker2.address)).to.equal(true);
        });

        it('2.1.11.2. Activate broker unsuccessfully when paused', async () => {
            const fixture = await beforeCommissionTokenTest({
                pause: true,
            });

            const { commissionToken, manager } = fixture;

            const { defaultParams: params } = await beforeActivateBrokerTest(fixture);

            await expect(getCommissionTokenTx_ActivateBroker(commissionToken, manager, params)).to.be.revertedWith(
                'Pausable: paused'
            );
        });

        it('2.1.11.3. Activate broker unsuccessfully by non-manager', async () => {
            const fixture = await beforeCommissionTokenTest();

            const { commissionToken, moderator, user } = fixture;

            const { defaultParams: params } = await beforeActivateBrokerTest(fixture);

            await expect(
                getCommissionTokenTx_ActivateBroker(commissionToken, moderator, params)
            ).to.be.revertedWithCustomError(commissionToken, 'Unauthorized');

            await expect(
                getCommissionTokenTx_ActivateBroker(commissionToken, user, params)
            ).to.be.revertedWithCustomError(commissionToken, 'Unauthorized');
        });

        it('2.1.11.4. Activate broker unsuccessfully with inactive zone', async () => {
            const fixture = await beforeCommissionTokenTest({
                skipDeclareZone: true,
            });

            const { commissionToken, manager } = fixture;

            const { defaultParams: params } = await beforeActivateBrokerTest(fixture);

            await expect(
                getCommissionTokenTx_ActivateBroker(commissionToken, manager, params)
            ).to.be.revertedWithCustomError(commissionToken, 'Unauthorized');
        });

        it('2.1.11.5. Activate broker unsuccessfully by inactive manager in zone', async () => {
            const fixture = await beforeCommissionTokenTest();

            const { deployer, commissionToken, manager, zone1, admin, admins } = fixture;

            await callTransaction(
                getAdminTxByInput_ActivateIn(
                    admin,
                    deployer,
                    {
                        zone: zone1,
                        accounts: [manager.address],
                        isActive: false,
                    },
                    admins
                )
            );

            const { defaultParams: params } = await beforeActivateBrokerTest(fixture);

            await expect(
                getCommissionTokenTx_ActivateBroker(commissionToken, manager, params)
            ).to.be.revertedWithCustomError(commissionToken, 'Unauthorized');
        });
    });

    describe('2.1.12. mint(bytes32,address,uint256)', async () => {
        async function beforeMintTest(fixture: CommissionTokenFixture): Promise<{
            defaultParams: MintParams;
        }> {
            const { zone1, broker1 } = fixture;

            const params: MintParams = {
                zone: zone1,
                broker: broker1.address,
                tokenId: BigNumber.from(1),
            };

            return { defaultParams: params };
        }

        it('2.1.12.1. Mint successfully by estateToken contract', async () => {
            const { estateToken, commissionToken, zone1, zone2, broker1, broker2 } = await beforeCommissionTokenTest({
                registerSampleBrokers: true,
            });

            // Mint for broker 1 in zone 1
            const commissionRate1 = await commissionToken.getBrokerCommissionRate(zone1, broker1.address);

            const tx1 = await getCallCommissionTokenTx_Mint(commissionToken, estateToken, {
                zone: zone1,
                broker: broker1.address,
                tokenId: BigNumber.from(1),
            });
            await tx1.wait();

            await expect(tx1)
                .to.emit(commissionToken, 'NewToken')
                .withArgs(BigNumber.from(1), zone1, broker1.address, (rate: any) => {
                    expect(structToObject(rate)).to.deep.equal({
                        value: commissionRate1.value,
                        decimals: Constant.COMMON_RATE_DECIMALS,
                    });
                    return true;
                });

            expect(await commissionToken.totalSupply()).to.equal(1);

            expect(await commissionToken.ownerOf(1)).to.equal(broker1.address);
            expect(await commissionToken.tokenURI(1)).to.equal(LandInitialization.COMMISSION_TOKEN_BaseURI + '1');

            expect(structToObject(await commissionToken.getCommissionRate(1))).to.deep.equal(
                structToObject(commissionRate1)
            );

            // Mint for broker 2 in zone 2
            const commissionRate2 = await commissionToken.getBrokerCommissionRate(zone2, broker2.address);

            const tx2 = await getCallCommissionTokenTx_Mint(commissionToken, estateToken, {
                zone: zone2,
                broker: broker2.address,
                tokenId: BigNumber.from(2),
            });
            await tx2.wait();
            await expect(tx2)
                .to.emit(commissionToken, 'NewToken')
                .withArgs(BigNumber.from(2), zone2, broker2.address, (rate: any) => {
                    expect(structToObject(rate)).to.deep.equal({
                        value: commissionRate2.value,
                        decimals: Constant.COMMON_RATE_DECIMALS,
                    });
                    return true;
                });

            expect(await commissionToken.totalSupply()).to.equal(2);

            expect(await commissionToken.ownerOf(2)).to.equal(broker2.address);
            expect(await commissionToken.tokenURI(2)).to.equal(LandInitialization.COMMISSION_TOKEN_BaseURI + '2');

            expect(structToObject(await commissionToken.getCommissionRate(2))).to.deep.equal(
                structToObject(commissionRate2)
            );
        });

        it('2.1.12.2. Mint unsuccessfully when paused', async () => {
            const fixture = await beforeCommissionTokenTest({
                pause: true,
            });

            const { commissionToken, estateToken } = fixture;

            const { defaultParams: params } = await beforeMintTest(fixture);

            await expect(getCallCommissionTokenTx_Mint(commissionToken, estateToken, params)).to.be.revertedWith(
                'Pausable: paused'
            );
        });

        it('2.1.12.3. Mint unsuccessfully when sender is not estateToken contract', async () => {
            const fixture = await beforeCommissionTokenTest({
                registerSampleBrokers: true,
            });

            const { commissionToken, manager, moderator, user } = fixture;

            const { defaultParams: params } = await beforeMintTest(fixture);

            await expect(getCommissionTokenTx_Mint(commissionToken, manager, params)).to.be.revertedWithCustomError(
                commissionToken,
                'Unauthorized'
            );

            await expect(getCommissionTokenTx_Mint(commissionToken, moderator, params)).to.be.revertedWithCustomError(
                commissionToken,
                'Unauthorized'
            );

            await expect(getCommissionTokenTx_Mint(commissionToken, user, params)).to.be.revertedWithCustomError(
                commissionToken,
                'Unauthorized'
            );
        });

        it('2.1.12.4. Mint unsuccessfully with already minted token', async () => {
            const fixture = await beforeCommissionTokenTest({
                registerSampleBrokers: true,
            });

            const { commissionToken, estateToken, zone1, zone2, broker1, broker2 } = fixture;

            const params1: MintParams = {
                zone: zone1,
                broker: broker1.address,
                tokenId: BigNumber.from(1),
            };
            await callTransaction(getCallCommissionTokenTx_Mint(commissionToken, estateToken, params1));
            await expect(
                getCallCommissionTokenTx_Mint(commissionToken, estateToken, params1)
            ).to.be.revertedWithCustomError(commissionToken, 'AlreadyMinted');

            const params2: MintParams = {
                zone: zone2,
                broker: broker2.address,
                tokenId: BigNumber.from(2),
            };
            await callTransaction(getCallCommissionTokenTx_Mint(commissionToken, estateToken, params2));
            await expect(
                getCallCommissionTokenTx_Mint(commissionToken, estateToken, params2)
            ).to.be.revertedWithCustomError(commissionToken, 'AlreadyMinted');
        });

        it('2.1.12.5. Mint unsuccessfully when zone is inactive', async () => {
            const fixture = await beforeCommissionTokenTest({
                registerSampleBrokers: true,
            });

            const { commissionToken, estateToken } = fixture;

            const { defaultParams } = await beforeMintTest(fixture);

            await expect(
                getCallCommissionTokenTx_Mint(commissionToken, estateToken, {
                    ...defaultParams,
                    zone: ethers.utils.formatBytes32String('UndeclaredZone'),
                })
            ).to.be.revertedWithCustomError(commissionToken, 'InvalidZone');
        });

        it('2.1.12.6. Mint unsuccessfully when broker is not registered', async () => {
            const fixture = await beforeCommissionTokenTest();

            const { commissionToken, estateToken } = fixture;

            const { defaultParams: params } = await beforeMintTest(fixture);

            await expect(
                getCallCommissionTokenTx_Mint(commissionToken, estateToken, params)
            ).to.be.revertedWithCustomError(commissionToken, 'InvalidBroker');
        });

        it('2.1.12.7. Mint unsuccessfully when broker is deactivated', async () => {
            const fixture = await beforeCommissionTokenTest({
                registerSampleBrokers: true,
            });

            const { commissionToken, estateToken, manager } = fixture;

            const { defaultParams: params } = await beforeMintTest(fixture);

            await callTransaction(
                getCommissionTokenTx_ActivateBroker(commissionToken, manager, {
                    zone: params.zone,
                    broker: params.broker,
                    isActive: false,
                })
            );

            await expect(
                getCallCommissionTokenTx_Mint(commissionToken, estateToken, params)
            ).to.be.revertedWithCustomError(commissionToken, 'InvalidBroker');
        });
    });
});
