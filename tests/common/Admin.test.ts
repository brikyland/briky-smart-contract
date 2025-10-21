import { expect } from 'chai';
import { Wallet } from 'ethers';
import { ethers } from 'hardhat';

// @defi-wonderland/smock
import { smock } from '@defi-wonderland/smock';

// @nomicfoundation/hardhat-network-helpers
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

// @tests
import { Constant } from '@tests/test.constant';

// @typechain-types
import { Admin, Governor__factory } from '@typechain-types';

// @utils
import { callTransaction, getSignatures, randomWallet } from '@utils/blockchain';
import { nextPermutation } from '@utils/utils';

// @utils/deployments/common
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployCurrency } from '@utils/deployments/common/currency';

// @utils/models/common
import {
    TransferAdministration1ParamsInput,
    TransferAdministration1Params,
    TransferAdministration2ParamsInput,
    TransferAdministration2Params,
    TransferAdministration3ParamsInput,
    TransferAdministration3Params,
    TransferAdministration4ParamsInput,
    TransferAdministration4Params,
    TransferAdministration5ParamsInput,
    TransferAdministration5Params,
    AuthorizeManagersParamsInput,
    AuthorizeManagersParams,
    AuthorizeModeratorsParamsInput,
    AuthorizeModeratorsParams,
    AuthorizeGovernorsParamsInput,
    AuthorizeGovernorsParams,
    DeclareZoneParamsInput,
    DeclareZoneParams,
    ActivateInParamsInput,
    ActivateInParams,
    UpdateCurrencyRegistriesParamsInput,
    UpdateCurrencyRegistriesParams,
} from '@utils/models/common/admin';

// @utils/signatures/common
import {
    getTransferAdministration1Signatures,
    getTransferAdministration2Signatures,
    getTransferAdministration3Signatures,
    getTransferAdministration4Signatures,
    getTransferAdministration5Signatures,
    getAuthorizeManagersSignatures,
    getAuthorizeModeratorsSignatures,
    getAuthorizeGovernorsSignatures,
    getDeclareZoneSignatures,
    getActivateInSignatures,
    getUpdateCurrencyRegistriesSignatures,
} from '@utils/signatures/common/admin';

// @utils/transaction/common
import {
    getAdminTx_TransferAdministration1,
    getAdminTx_TransferAdministration2,
    getAdminTx_TransferAdministration3,
    getAdminTx_TransferAdministration4,
    getAdminTx_TransferAdministration5,
    getAdminTx_AuthorizeManagers,
    getAdminTx_AuthorizeModerators,
    getAdminTx_AuthorizeGovernors,
    getAdminTx_DeclareZone,
    getAdminTx_ActivateIn,
    getAdminTx_UpdateCurrencyRegistries,
    getAdminTxByInput_AuthorizeManagers,
    getAdminTxByInput_AuthorizeModerators,
    getAdminTxByInput_AuthorizeGovernors,
    getAdminTxByInput_DeclareZone,
    getAdminTxByInput_ActivateIn,
    getAdminTxByInput_TransferAdministration1,
    getAdminTxByInput_TransferAdministration2,
    getAdminTxByInput_TransferAdministration3,
    getAdminTxByInput_TransferAdministration4,
    getAdminTxByInput_TransferAdministration5,
    getAdminTxByInput_UpdateCurrencyRegistries,
} from '@utils/transaction/common/admin';

interface AdminFixture {
    deployer: any;
    admins: any[];
    manager: any;
    moderator: any;
    user: any;

    admin: Admin;

    governors: any[];
    managers: any[];
    moderators: any[];
    accounts: any[];
    zone1: string;
    zone2: string;
}

describe('1.2. Admin', async () => {
    async function adminFixture(): Promise<AdminFixture> {
        const [deployer, admin1, admin2, admin3, admin4, admin5, manager, moderator, user] = await ethers.getSigners();
        const admins = [admin1, admin2, admin3, admin4, admin5];

        const zone1 = ethers.utils.formatBytes32String('TestZone1');
        const zone2 = ethers.utils.formatBytes32String('TestZone2');

        const adminAddresses: string[] = admins.map((signer) => signer.address);
        const admin = (await deployAdmin(
            deployer.address,
            adminAddresses[0],
            adminAddresses[1],
            adminAddresses[2],
            adminAddresses[3],
            adminAddresses[4]
        )) as Admin;

        const SmockGovernorFactory = await smock.mock<Governor__factory>('Governor');
        const governors = [];
        for (let i = 0; i < 5; ++i) {
            const governor = await SmockGovernorFactory.deploy();
            governors.push(governor);
        }

        const managers = [];
        for (let i = 0; i < 5; ++i) {
            managers.push(randomWallet());
        }

        const moderators = [];
        for (let i = 0; i < 5; ++i) {
            moderators.push(randomWallet());
        }
        const accounts = [];
        for (let i = 0; i < 5; ++i) {
            accounts.push(randomWallet());
        }

        return {
            deployer,
            admins,
            manager,
            moderator,
            user,
            admin,
            governors,
            managers,
            moderators,
            accounts,
            zone1,
            zone2,
        };
    }

    async function setupBeforeTest({
        authorizeManagers = false,
        authorizeModerators = false,
        authorizeGovernors = false,
        declareZones = false,
        activateAccountsInZones = false,
    } = {}): Promise<AdminFixture> {
        const fixture = await loadFixture(adminFixture);
        const { deployer, admins, admin, governors, managers, moderators, accounts, zone1, zone2 } = fixture;

        if (authorizeManagers) {
            await callTransaction(
                getAdminTxByInput_AuthorizeManagers(
                    admin,
                    deployer,
                    {
                        accounts: managers.map((x) => x.address),
                        isManager: true,
                    },
                    admins
                )
            );
        }

        if (authorizeModerators) {
            await callTransaction(
                getAdminTxByInput_AuthorizeModerators(
                    admin,
                    deployer,
                    {
                        accounts: moderators.map((x) => x.address),
                        isModerator: true,
                    },
                    admins
                )
            );
        }

        if (authorizeGovernors) {
            await callTransaction(
                getAdminTxByInput_AuthorizeGovernors(
                    admin,
                    deployer,
                    {
                        accounts: governors.map((x) => x.address),
                        isGovernor: true,
                    },
                    admins
                )
            );
        }

        if (declareZones) {
            for (const zone of [zone1, zone2]) {
                await callTransaction(getAdminTxByInput_DeclareZone(admin, deployer, { zone }, admins));
            }
        }

        if (activateAccountsInZones) {
            for (const zone of [zone1, zone2]) {
                await callTransaction(
                    getAdminTxByInput_ActivateIn(
                        admin,
                        deployer,
                        {
                            zone,
                            accounts: accounts.map((x) => x.address),
                            isActive: true,
                        },
                        admins
                    )
                );
            }
        }

        return fixture;
    }

    /* --- Initialization --- */
    describe('1.2.1. initialize(address,address,address,address,address)', async () => {
        it('1.2.1.1. Deploy successfully', async () => {
            const { deployer, admins, admin } = await setupBeforeTest();

            for (let i = 1; i <= Constant.ADMIN_NUMBER; ++i) {
                const adminAddress = await (admin as any)[`admin${i}`]();
                expect(adminAddress).to.equal(admins[i - 1].address);

                const isManager = await admin.isManager(adminAddress);
                expect(isManager).to.be.true;
            }

            const isManager = await admin.isManager(deployer.address);
            expect(isManager).to.be.true;

            const nonce = await admin.nonce();
            expect(nonce).to.equal(0);
        });
    });

    /* --- Administration --- */
    describe('1.2.2. verifyAdminSignatures(bytes,bytes[])', async () => {
        it('1.2.2.1. Verify admin signatures successfully with at least 4/5 valid admin signatures', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;
            let currentNonce = 0;

            const message = ethers.utils.hexlify(ethers.utils.toUtf8Bytes('Blockchain'));
            const invalidSignatures = await getSignatures(message, admins, 999999999);

            for (let mask = 0; mask < 1 << Constant.ADMIN_NUMBER; ++mask) {
                const validSignatures = await getSignatures(message, admins, currentNonce);
                let countValidSignatures = 0;
                const signatures = [];
                for (let i = 0; i < Constant.ADMIN_NUMBER; ++i) {
                    if ((mask >> i) & 1) {
                        signatures.push(validSignatures[i]);
                        ++countValidSignatures;
                    } else {
                        signatures.push(invalidSignatures[i]);
                    }
                }

                if (countValidSignatures < 4) continue;

                let tx = await admin.verifyAdminSignatures(message, signatures);

                await expect(tx)
                    .to.emit(admin, 'AdminSignaturesVerification')
                    .withArgs(message, currentNonce, signatures);

                ++currentNonce;
                let nonce = await admin.nonce();
                expect(nonce).to.equal(currentNonce);
            }
        });

        it('1.2.2.2. Verify admin signatures successfully multiple times', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;

            const messageA = ethers.utils.hexlify(ethers.utils.toUtf8Bytes('Blockchain'));
            const signaturesA = await getSignatures(messageA, admins, 0);

            let tx = await admin.verifyAdminSignatures(messageA, signaturesA);

            await expect(tx).to.emit(admin, 'AdminSignaturesVerification').withArgs(messageA, 0, signaturesA);

            let nonce = await admin.nonce();
            expect(nonce).to.equal(1);

            const messageB = ethers.utils.hexlify(ethers.utils.toUtf8Bytes('Bitcoin'));
            const signaturesB = await getSignatures(messageB, admins, 1);

            tx = await admin.verifyAdminSignatures(messageB, signaturesB);
            await expect(tx).to.emit(admin, 'AdminSignaturesVerification').withArgs(messageB, 1, signaturesB);

            nonce = await admin.nonce();
            expect(nonce).to.equal(2);

            const messageC = ethers.utils.hexlify(ethers.utils.toUtf8Bytes('Ethereum'));
            const signaturesC = await getSignatures(messageC, admins, 2);

            tx = await admin.verifyAdminSignatures(messageC, signaturesC);
            await expect(tx).to.emit(admin, 'AdminSignaturesVerification').withArgs(messageC, 2, signaturesC);

            nonce = await admin.nonce();
            expect(nonce).to.equal(3);
        });

        async function isUnsuccessfulWithLessThan4Signatures(
            admin: Admin,
            message: string,
            validSignatures: string[],
            invalidSignatures: string[]
        ) {
            for (let mask = 0; mask < 1 << Constant.ADMIN_NUMBER; ++mask) {
                let countValidSignatures = 0;
                const signatures = [];
                for (let i = 0; i < Constant.ADMIN_NUMBER; ++i) {
                    if ((mask >> i) & 1) {
                        signatures.push(validSignatures[i]);
                        ++countValidSignatures;
                    } else {
                        signatures.push(invalidSignatures[i]);
                    }
                }

                if (countValidSignatures >= 4) continue;

                await expect(admin.verifyAdminSignatures(message, signatures)).to.be.revertedWithCustomError(
                    admin,
                    'FailedVerification'
                );
            }
        }

        it('1.2.2.3. Verify admin signatures unsuccessfully with less than 4/5 valid admin signatures (incorrect nonce)', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;
            let currentNonce = 0;

            const message = ethers.utils.hexlify(ethers.utils.toUtf8Bytes('Blockchain'));

            const validSignatures = await getSignatures(message, admins, currentNonce);
            const invalidSignatures = await getSignatures(message, admins, currentNonce + 1);

            await isUnsuccessfulWithLessThan4Signatures(admin, message, validSignatures, invalidSignatures);
        });

        it('1.2.2.4. Verify admin signatures unsuccessfully with less than 4/5 valid admin signatures (incorrect message)', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;
            let currentNonce = 0;

            const message = ethers.utils.hexlify(ethers.utils.toUtf8Bytes('Blockchain'));
            const incorrectMessage = ethers.utils.hexlify(ethers.utils.toUtf8Bytes('Bitcoin'));

            const validSignatures = await getSignatures(message, admins, currentNonce);
            const invalidSignatures = await getSignatures(incorrectMessage, admins, currentNonce);

            await isUnsuccessfulWithLessThan4Signatures(admin, message, validSignatures, invalidSignatures);
        });

        it('1.2.2.5. Verify admin signatures unsuccessfully with less than 4/5 valid admin signatures (incorrect address)', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;
            let currentNonce = 0;

            const invalidAdmins: Wallet[] = [];
            for (let i = 0; i < Constant.ADMIN_NUMBER; ++i) invalidAdmins.push(randomWallet());

            const message = ethers.utils.hexlify(ethers.utils.toUtf8Bytes('Blockchain'));

            const validSignatures = await getSignatures(message, admins, currentNonce);
            const invalidSignatures = await getSignatures(message, invalidAdmins, currentNonce);

            await isUnsuccessfulWithLessThan4Signatures(admin, message, validSignatures, invalidSignatures);
        });

        it('1.2.2.6. Verify admin signatures unsuccessfully with incorrect admin signatures order', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;
            let currentNonce = 0;

            const message = ethers.utils.hexlify(ethers.utils.toUtf8Bytes('Blockchain'));
            const validSignatures = await getSignatures(message, admins, currentNonce);

            let order = [];
            for (let i = 0; i < Constant.ADMIN_NUMBER; ++i) order.push(i);

            while (nextPermutation(order)) {
                const signatures = [];
                for (let i = 0; i < Constant.ADMIN_NUMBER; ++i) {
                    signatures.push(validSignatures[order[i]]);
                }

                await expect(admin.verifyAdminSignatures(message, signatures)).to.be.revertedWithCustomError(
                    admin,
                    'FailedVerification'
                );
            }
        });

        it('1.2.2.7. Verify admin signatures unsuccessfully with incorrect number of signatures', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;
            let currentNonce = 0;

            const message = ethers.utils.hexlify(ethers.utils.toUtf8Bytes('Blockchain'));
            let validSignatures = await getSignatures(message, admins, currentNonce);

            validSignatures = validSignatures.concat(validSignatures);

            for (let nSignatures = 0; nSignatures <= Constant.ADMIN_NUMBER + 1; ++nSignatures) {
                if (nSignatures == Constant.ADMIN_NUMBER) continue;
                const incorrectSignatures = validSignatures.slice(0, nSignatures);
                await expect(admin.verifyAdminSignatures(message, incorrectSignatures)).to.be.revertedWithCustomError(
                    admin,
                    'InvalidSignatureNumber'
                );
            }
        });

        it('1.2.2.8. Verify admin signatures unsuccessfully by non-manager origin caller', async () => {
            const { moderator, user, admins, admin } = await setupBeforeTest();
            let currentNonce = 0;

            const message = ethers.utils.hexlify(ethers.utils.toUtf8Bytes('Blockchain'));
            let validSignatures = await getSignatures(message, admins, currentNonce);

            await expect(
                admin.connect(moderator).verifyAdminSignatures(message, validSignatures)
            ).to.be.revertedWithCustomError(admin, 'Unauthorized');

            await expect(
                admin.connect(user).verifyAdminSignatures(message, validSignatures)
            ).to.be.revertedWithCustomError(admin, 'Unauthorized');
        });
    });

    describe('1.2.3. transferAdministration1(address,bytes[])', async () => {
        it('1.2.3.1. Change admin 1 successfully', async () => {
            const fixture = await setupBeforeTest();
            const { deployer, admins, admin } = fixture;

            const newAdmin = randomWallet();
            const paramsInput: TransferAdministration1ParamsInput = {
                admin1: newAdmin.address,
            };
            const tx = await getAdminTxByInput_TransferAdministration1(admin, deployer, paramsInput, admins);
            await tx.wait();

            await expect(tx).to.emit(admin, 'Administration1Transfer').withArgs(newAdmin.address);

            const admin1 = await admin.admin1();
            expect(admin1).to.equal(newAdmin.address);
        });

        it('1.2.3.2. Change admin 1 unsuccessfully with invalid signatures', async () => {
            const fixture = await setupBeforeTest();
            const { deployer, admins, admin } = fixture;

            const newAdmin = randomWallet();
            const paramsInput: TransferAdministration1ParamsInput = {
                admin1: newAdmin.address,
            };
            const params: TransferAdministration1Params = {
                ...paramsInput,
                signatures: await getTransferAdministration1Signatures(admin, paramsInput, admins, false),
            };

            await expect(getAdminTx_TransferAdministration1(admin, deployer, params)).to.be.revertedWithCustomError(
                admin,
                'FailedVerification'
            );
        });
    });

    describe('1.2.4. transferAdministration2(address,bytes[])', async () => {
        it('1.2.4.1. Change admin 2 successfully', async () => {
            const fixture = await setupBeforeTest();
            const { deployer, admins, admin } = fixture;

            const newAdmin = randomWallet();
            const paramsInput: TransferAdministration2ParamsInput = {
                admin2: newAdmin.address,
            };
            const tx = await getAdminTxByInput_TransferAdministration2(admin, deployer, paramsInput, admins);
            await tx.wait();

            await expect(tx).to.emit(admin, 'Administration2Transfer').withArgs(newAdmin.address);

            const admin2 = await admin.admin2();
            expect(admin2).to.equal(newAdmin.address);
        });

        it('1.2.4.2. Change admin 2 unsuccessfully with invalid signatures', async () => {
            const fixture = await setupBeforeTest();
            const { deployer, admins, admin } = fixture;

            const newAdmin = randomWallet();
            const paramsInput: TransferAdministration2ParamsInput = {
                admin2: newAdmin.address,
            };
            const params: TransferAdministration2Params = {
                ...paramsInput,
                signatures: await getTransferAdministration2Signatures(admin, paramsInput, admins, false),
            };

            await expect(getAdminTx_TransferAdministration2(admin, deployer, params)).to.be.revertedWithCustomError(
                admin,
                'FailedVerification'
            );
        });
    });

    describe('1.2.5. transferAdministration3(address,bytes[])', async () => {
        it('1.2.5.1. Change admin 3 successfully', async () => {
            const fixture = await setupBeforeTest();
            const { deployer, admins, admin } = fixture;

            const newAdmin = randomWallet();
            const paramsInput: TransferAdministration3ParamsInput = {
                admin3: newAdmin.address,
            };
            const tx = await getAdminTxByInput_TransferAdministration3(admin, deployer, paramsInput, admins);
            await tx.wait();

            await expect(tx).to.emit(admin, 'Administration3Transfer').withArgs(newAdmin.address);

            const admin3 = await admin.admin3();
            expect(admin3).to.equal(newAdmin.address);
        });

        it('1.2.5.2. Change admin 3 unsuccessfully with invalid signatures', async () => {
            const fixture = await setupBeforeTest();
            const { deployer, admins, admin } = fixture;

            const newAdmin = randomWallet();
            const paramsInput: TransferAdministration3ParamsInput = {
                admin3: newAdmin.address,
            };
            const params: TransferAdministration3Params = {
                ...paramsInput,
                signatures: await getTransferAdministration3Signatures(admin, paramsInput, admins, false),
            };

            await expect(getAdminTx_TransferAdministration3(admin, deployer, params)).to.be.revertedWithCustomError(
                admin,
                'FailedVerification'
            );
        });
    });

    describe('1.2.6. transferAdministration4(address,bytes[])', async () => {
        it('1.2.6.1. Change admin 4 successfully', async () => {
            const fixture = await setupBeforeTest();
            const { deployer, admins, admin } = fixture;

            const newAdmin = randomWallet();
            const paramsInput: TransferAdministration4ParamsInput = {
                admin4: newAdmin.address,
            };
            const tx = await getAdminTxByInput_TransferAdministration4(admin, deployer, paramsInput, admins);
            await tx.wait();

            await expect(tx).to.emit(admin, 'Administration4Transfer').withArgs(newAdmin.address);

            const admin4 = await admin.admin4();
            expect(admin4).to.equal(newAdmin.address);
        });

        it('1.2.6.2. Change admin 4 unsuccessfully with invalid signatures', async () => {
            const fixture = await setupBeforeTest();
            const { deployer, admins, admin } = fixture;

            const newAdmin = randomWallet();
            const paramsInput: TransferAdministration4ParamsInput = {
                admin4: newAdmin.address,
            };
            const params: TransferAdministration4Params = {
                ...paramsInput,
                signatures: await getTransferAdministration4Signatures(admin, paramsInput, admins, false),
            };

            await expect(getAdminTx_TransferAdministration4(admin, deployer, params)).to.be.revertedWithCustomError(
                admin,
                'FailedVerification'
            );
        });
    });

    describe('1.2.7. transferAdministration5(address,bytes[])', async () => {
        it('1.2.7.1. Change admin 5 successfully', async () => {
            const fixture = await setupBeforeTest();
            const { deployer, admins, admin } = fixture;

            const newAdmin = randomWallet();
            const paramsInput: TransferAdministration5ParamsInput = {
                admin5: newAdmin.address,
            };
            const tx = await getAdminTxByInput_TransferAdministration5(admin, deployer, paramsInput, admins);
            await tx.wait();

            await expect(tx).to.emit(admin, 'Administration5Transfer').withArgs(newAdmin.address);

            const admin5 = await admin.admin5();
            expect(admin5).to.equal(newAdmin.address);
        });

        it('1.2.7.2. Change admin 5 unsuccessfully with invalid signatures', async () => {
            const fixture = await setupBeforeTest();
            const { deployer, admins, admin } = fixture;

            const newAdmin = randomWallet();
            const paramsInput: TransferAdministration5ParamsInput = {
                admin5: newAdmin.address,
            };
            const params: TransferAdministration5Params = {
                ...paramsInput,
                signatures: await getTransferAdministration5Signatures(admin, paramsInput, admins, false),
            };

            await expect(getAdminTx_TransferAdministration5(admin, deployer, params)).to.be.revertedWithCustomError(
                admin,
                'FailedVerification'
            );
        });
    });

    describe('1.2.8. authorizeManagers(address[],bool,bytes[])', async () => {
        it('1.2.8.1. Authorize managers successfully', async () => {
            const fixture = await setupBeforeTest();
            const { deployer, admins, admin } = fixture;

            const toBeManagers = [];
            for (let i = 0; i < 5; ++i) toBeManagers.push(randomWallet());

            const paramsInput: AuthorizeManagersParamsInput = {
                accounts: toBeManagers.map((x) => x.address),
                isManager: true,
            };
            const tx = await getAdminTxByInput_AuthorizeManagers(admin, deployer, paramsInput, admins);
            await tx.wait();

            for (const manager of toBeManagers) {
                await expect(tx).to.emit(admin, 'ManagerAuthorization').withArgs(manager.address);
            }

            for (let i = 0; i < 5; ++i) {
                const isManager = await admin.isManager(toBeManagers[i].address);
                expect(isManager).to.be.true;
            }
        });

        it('1.2.8.2. Authorize managers unsuccessfully with invalid signatures', async () => {
            const fixture = await setupBeforeTest();
            const { deployer, admins, admin } = fixture;

            const toBeManagers = [];
            for (let i = 0; i < 5; ++i) toBeManagers.push(randomWallet());

            const paramsInput: AuthorizeManagersParamsInput = {
                accounts: toBeManagers.map((x) => x.address),
                isManager: true,
            };
            const params: AuthorizeManagersParams = {
                ...paramsInput,
                signatures: await getAuthorizeManagersSignatures(admin, paramsInput, admins, false),
            };
            await expect(getAdminTx_AuthorizeManagers(admin, deployer, params)).to.be.revertedWithCustomError(
                admin,
                'FailedVerification'
            );
        });

        it('1.2.8.3. Authorize managers unsuccessfully when authorizing the same account twice on the same tx', async () => {
            const fixture = await setupBeforeTest();
            const { deployer, admins, admin } = fixture;

            const duplicateManagers = [];
            for (let i = 0; i < 5; ++i) duplicateManagers.push(randomWallet());
            duplicateManagers.push(duplicateManagers[0]);

            await expect(
                getAdminTxByInput_AuthorizeManagers(
                    admin,
                    deployer,
                    {
                        accounts: duplicateManagers.map((x) => x.address),
                        isManager: true,
                    },
                    admins
                )
            ).to.be.revertedWithCustomError(admin, `AuthorizedAccount`);
        });

        it('1.2.8.4. Authorize managers unsuccessfully when authorizing the same account twice on different txs', async () => {
            const fixture = await setupBeforeTest();
            const { deployer, admins, admin } = fixture;

            const toBeManagers = [];
            for (let i = 0; i < 5; ++i) toBeManagers.push(randomWallet());

            await callTransaction(
                getAdminTxByInput_AuthorizeManagers(
                    admin,
                    deployer,
                    {
                        accounts: toBeManagers.map((x) => x.address),
                        isManager: true,
                    },
                    admins
                )
            );

            const managers = [randomWallet(), toBeManagers[2], randomWallet()];

            await expect(
                getAdminTxByInput_AuthorizeManagers(
                    admin,
                    deployer,
                    {
                        accounts: managers.map((x) => x.address),
                        isManager: true,
                    },
                    admins
                )
            ).to.be.revertedWithCustomError(admin, `AuthorizedAccount`);
        });

        it('1.2.8.5. Deauthorize managers successfully', async () => {
            const fixture = await setupBeforeTest({
                authorizeManagers: true,
            });
            const { deployer, admins, admin, managers } = fixture;

            const toDeauth = managers.slice(0, 2);
            const remainManagers = managers.slice(2);

            const paramsInput: AuthorizeManagersParamsInput = {
                accounts: toDeauth.map((x) => x.address),
                isManager: false,
            };
            const tx = await getAdminTxByInput_AuthorizeManagers(admin, deployer, paramsInput, admins);
            await tx.wait();

            for (const manager of toDeauth) {
                await expect(tx).to.emit(admin, 'ManagerDeauthorization').withArgs(manager.address);
            }

            for (let i = 0; i < toDeauth.length; ++i) {
                const isManager = await admin.isManager(toDeauth[i].address);
                expect(isManager).to.be.false;
            }
            for (let i = 0; i < remainManagers.length; ++i) {
                const isManager = await admin.isManager(remainManagers[i].address);
                expect(isManager).to.be.true;
            }
        });

        it('1.2.8.6. Deauthorize managers unsuccessfully with unauthorized account', async () => {
            const fixture = await setupBeforeTest({
                authorizeManagers: true,
            });
            const { deployer, admins, admin, managers } = fixture;

            const account = randomWallet();
            const toDeauth = [managers[0], account];

            await expect(
                getAdminTxByInput_AuthorizeManagers(
                    admin,
                    deployer,
                    {
                        accounts: toDeauth.map((x) => x.address),
                        isManager: false,
                    },
                    admins
                )
            ).to.be.revertedWithCustomError(admin, `NotAuthorizedAccount`);
        });

        it('1.2.8.7. Deauthorize managers unsuccessfully when unauthorizing the same account twice on the same tx', async () => {
            const fixture = await setupBeforeTest({
                authorizeManagers: true,
            });
            const { deployer, admins, admin, managers } = fixture;

            const toDeauth = managers.slice(0, 2).concat([managers[0]]);

            await expect(
                getAdminTxByInput_AuthorizeManagers(
                    admin,
                    deployer,
                    {
                        accounts: toDeauth.map((x) => x.address),
                        isManager: false,
                    },
                    admins
                )
            ).to.be.revertedWithCustomError(admin, `NotAuthorizedAccount`);
        });

        it('1.2.8.8. Deauthorize managers unsuccessfully when unauthorizing the same account twice on different txs', async () => {
            const fixture = await setupBeforeTest({
                authorizeManagers: true,
            });
            const { deployer, admins, admin, managers } = fixture;

            const tx1Accounts = managers.slice(0, 2);
            await callTransaction(
                getAdminTxByInput_AuthorizeManagers(
                    admin,
                    deployer,
                    {
                        accounts: tx1Accounts.map((x) => x.address),
                        isManager: false,
                    },
                    admins
                )
            );

            const tx2Accounts = [managers[0]];
            await expect(
                getAdminTxByInput_AuthorizeManagers(
                    admin,
                    deployer,
                    {
                        accounts: tx2Accounts.map((x) => x.address),
                        isManager: false,
                    },
                    admins
                )
            ).to.be.revertedWithCustomError(admin, `NotAuthorizedAccount`);
        });

        it('1.2.8.9. Deauthorize managers unsuccessfully when the caller self-deauthorizes', async () => {
            const fixture = await setupBeforeTest();
            const { deployer, admins, admin } = fixture;

            const toDeauth = [deployer];

            await expect(
                getAdminTxByInput_AuthorizeManagers(
                    admin,
                    deployer,
                    {
                        accounts: toDeauth.map((x) => x.address),
                        isManager: false,
                    },
                    admins
                )
            ).to.be.revertedWithCustomError(admin, `CannotSelfDeauthorizing`);
        });
    });

    describe('1.2.9. authorizeModerators(address[],bool,bytes[])', async () => {
        it('1.2.9.1. Authorize moderators successfully', async () => {
            const fixture = await setupBeforeTest();
            const { deployer, admins, admin } = fixture;

            const toBeModerators = [];
            for (let i = 0; i < 5; ++i) toBeModerators.push(randomWallet());

            const paramsInput: AuthorizeModeratorsParamsInput = {
                accounts: toBeModerators.map((x) => x.address),
                isModerator: true,
            };
            const tx = await getAdminTxByInput_AuthorizeModerators(admin, deployer, paramsInput, admins);
            await tx.wait();

            for (const moderator of toBeModerators) {
                await expect(tx).to.emit(admin, 'ModeratorAuthorization').withArgs(moderator.address);
            }

            for (let i = 0; i < 5; ++i) {
                const isModerator = await admin.isModerator(toBeModerators[i].address);
                expect(isModerator).to.be.true;
            }
        });

        it('1.2.9.2. Authorize moderators unsuccessfully with invalid signatures', async () => {
            const fixture = await setupBeforeTest();
            const { deployer, admins, admin } = fixture;

            const toBeModerators = [];
            for (let i = 0; i < 5; ++i) toBeModerators.push(randomWallet());

            const paramsInput: AuthorizeModeratorsParamsInput = {
                accounts: toBeModerators.map((x) => x.address),
                isModerator: true,
            };
            const params: AuthorizeModeratorsParams = {
                ...paramsInput,
                signatures: await getAuthorizeModeratorsSignatures(admin, paramsInput, admins, false),
            };
            await expect(getAdminTx_AuthorizeModerators(admin, deployer, params)).to.be.revertedWithCustomError(
                admin,
                'FailedVerification'
            );
        });

        it('1.2.9.3. Authorize moderators unsuccessfully when authorizing the same account twice on the same tx', async () => {
            const fixture = await setupBeforeTest();
            const { deployer, admins, admin } = fixture;

            const duplicateModerators = [];
            for (let i = 0; i < 5; ++i) duplicateModerators.push(randomWallet());
            duplicateModerators.push(duplicateModerators[0]);

            await expect(
                getAdminTxByInput_AuthorizeModerators(
                    admin,
                    deployer,
                    {
                        accounts: duplicateModerators.map((x) => x.address),
                        isModerator: true,
                    },
                    admins
                )
            ).to.be.revertedWithCustomError(admin, `AuthorizedAccount`);
        });

        it('1.2.9.4. Authorize moderators unsuccessfully when authorizing the same account twice on different txs', async () => {
            const fixture = await setupBeforeTest();
            const { deployer, admins, admin } = fixture;

            const toBeModerators = [];
            for (let i = 0; i < 5; ++i) toBeModerators.push(randomWallet());

            await callTransaction(
                getAdminTxByInput_AuthorizeModerators(
                    admin,
                    deployer,
                    {
                        accounts: toBeModerators.map((x) => x.address),
                        isModerator: true,
                    },
                    admins
                )
            );

            const moderators = [randomWallet(), toBeModerators[2], randomWallet()];

            await expect(
                getAdminTxByInput_AuthorizeModerators(
                    admin,
                    deployer,
                    {
                        accounts: moderators.map((x) => x.address),
                        isModerator: true,
                    },
                    admins
                )
            ).to.be.revertedWithCustomError(admin, `AuthorizedAccount`);
        });

        it('1.2.9.5. Deauthorize moderators successfully', async () => {
            const fixture = await setupBeforeTest({
                authorizeModerators: true,
            });
            const { deployer, admins, admin, moderators } = fixture;

            const toDeauth = moderators.slice(0, 2);
            const remainModerators = moderators.slice(2);

            const paramsInput: AuthorizeModeratorsParamsInput = {
                accounts: toDeauth.map((x) => x.address),
                isModerator: false,
            };
            const tx = await getAdminTxByInput_AuthorizeModerators(admin, deployer, paramsInput, admins);
            await tx.wait();

            for (const moderator of toDeauth) {
                await expect(tx).to.emit(admin, 'ModeratorDeauthorization').withArgs(moderator.address);
            }

            for (let i = 0; i < toDeauth.length; ++i) {
                const isModerator = await admin.isModerator(toDeauth[i].address);
                expect(isModerator).to.be.false;
            }
            for (let i = 0; i < remainModerators.length; ++i) {
                const isModerator = await admin.isModerator(remainModerators[i].address);
                expect(isModerator).to.be.true;
            }
        });

        it('1.2.9.6. Deauthorize moderators unsuccessfully with unauthorized account', async () => {
            const fixture = await setupBeforeTest({
                authorizeModerators: true,
            });
            const { deployer, admins, admin, moderators } = fixture;

            const account = randomWallet();
            const toDeauth = [moderators[0], account];

            await expect(
                getAdminTxByInput_AuthorizeModerators(
                    admin,
                    deployer,
                    {
                        accounts: toDeauth.map((x) => x.address),
                        isModerator: false,
                    },
                    admins
                )
            ).to.be.revertedWithCustomError(admin, `NotAuthorizedAccount`);
        });

        it('1.2.9.7. Deauthorize moderators unsuccessfully when unauthorizing the same account twice on the same tx', async () => {
            const fixture = await setupBeforeTest({
                authorizeModerators: true,
            });
            const { deployer, admins, admin, moderators } = fixture;

            const toDeauth = moderators.slice(0, 2).concat([moderators[0]]);

            await expect(
                getAdminTxByInput_AuthorizeModerators(
                    admin,
                    deployer,
                    {
                        accounts: toDeauth.map((x) => x.address),
                        isModerator: false,
                    },
                    admins
                )
            ).to.be.revertedWithCustomError(admin, `NotAuthorizedAccount`);
        });

        it('1.2.9.8. Deauthorize moderators unsuccessfully when unauthorizing the same account twice on different txs', async () => {
            const fixture = await setupBeforeTest({
                authorizeModerators: true,
            });
            const { deployer, admins, admin, moderators } = fixture;

            const tx1Accounts = moderators.slice(0, 2);
            await callTransaction(
                getAdminTxByInput_AuthorizeModerators(
                    admin,
                    deployer,
                    {
                        accounts: tx1Accounts.map((x) => x.address),
                        isModerator: false,
                    },
                    admins
                )
            );

            const tx2Accounts = [moderators[0]];
            await expect(
                getAdminTxByInput_AuthorizeModerators(
                    admin,
                    deployer,
                    {
                        accounts: tx2Accounts.map((x) => x.address),
                        isModerator: false,
                    },
                    admins
                )
            ).to.be.revertedWithCustomError(admin, `NotAuthorizedAccount`);
        });
    });

    describe('1.2.10. authorizeGovernors(address[],bool,bytes[])', async () => {
        it('1.2.10.1. Authorize governors successfully', async () => {
            const fixture = await setupBeforeTest();
            const { deployer, admins, admin, governors } = fixture;

            const toBeGovernors = [];
            for (let i = 0; i < 5; ++i) toBeGovernors.push(governors[i]);

            const paramsInput: AuthorizeGovernorsParamsInput = {
                accounts: toBeGovernors.map((x) => x.address),
                isGovernor: true,
            };
            const tx = await getAdminTxByInput_AuthorizeGovernors(admin, deployer, paramsInput, admins);
            await tx.wait();

            for (const governor of toBeGovernors) {
                await expect(tx).to.emit(admin, 'GovernorAuthorization').withArgs(governor.address);
            }

            for (let i = 0; i < 5; ++i) {
                const isGovernor = await admin.isGovernor(toBeGovernors[i].address);
                expect(isGovernor).to.be.true;
            }
        });

        it('1.2.10.2. Authorize governors unsuccessfully with invalid signatures', async () => {
            const fixture = await setupBeforeTest();
            const { deployer, admins, admin, governors } = fixture;

            const toBeGovernors = [];
            for (let i = 0; i < 5; ++i) toBeGovernors.push(governors[i]);

            const paramsInput: AuthorizeGovernorsParamsInput = {
                accounts: toBeGovernors.map((x) => x.address),
                isGovernor: true,
            };
            const params: AuthorizeGovernorsParams = {
                ...paramsInput,
                signatures: await getAuthorizeGovernorsSignatures(admin, paramsInput, admins, false),
            };
            await expect(getAdminTx_AuthorizeGovernors(admin, deployer, params)).to.be.revertedWithCustomError(
                admin,
                'FailedVerification'
            );
        });

        it('1.2.10.3. Authorize governors unsuccessfully with EOA', async () => {
            const fixture = await setupBeforeTest();
            const { deployer, admins, admin } = fixture;

            const invalidGovernor = randomWallet();

            await expect(
                getAdminTxByInput_AuthorizeGovernors(
                    admin,
                    deployer,
                    {
                        accounts: [invalidGovernor.address],
                        isGovernor: true,
                    },
                    admins
                )
            ).to.be.revertedWithCustomError(admin, 'InvalidGovernor');
        });

        it('1.2.10.4. Authorize governors reverted when contract does not support Governor interface', async () => {
            const fixture = await setupBeforeTest();
            const { deployer, admins, admin } = fixture;

            const invalidGovernor = await deployCurrency(deployer, 'MockCurrency', 'MCK');

            await expect(
                getAdminTxByInput_AuthorizeGovernors(
                    admin,
                    deployer,
                    {
                        accounts: [invalidGovernor.address],
                        isGovernor: true,
                    },
                    admins
                )
            ).to.be.revertedWithCustomError(admin, 'InvalidGovernor');
        });

        it('1.2.10.5. Authorize governors unsuccessfully when authorizing the same account twice on the same tx', async () => {
            const fixture = await setupBeforeTest();
            const { deployer, admins, admin, governors } = fixture;

            const duplicateGovernors = [];
            for (let i = 0; i < 5; ++i) duplicateGovernors.push(governors[i]);
            duplicateGovernors.push(duplicateGovernors[0]);

            await expect(
                getAdminTxByInput_AuthorizeGovernors(
                    admin,
                    deployer,
                    {
                        accounts: duplicateGovernors.map((x) => x.address),
                        isGovernor: true,
                    },
                    admins
                )
            ).to.be.revertedWithCustomError(admin, `AuthorizedAccount`);
        });

        it('1.2.10.6. Authorize governors unsuccessfully when authorizing the same account twice on different txs', async () => {
            const fixture = await setupBeforeTest();
            const { deployer, admins, admin, governors } = fixture;

            const tx1Governors = [governors[0], governors[1]];
            await callTransaction(
                getAdminTxByInput_AuthorizeGovernors(
                    admin,
                    deployer,
                    {
                        accounts: tx1Governors.map((x) => x.address),
                        isGovernor: true,
                    },
                    admins
                )
            );

            const tx2Governors = [governors[2], governors[1]];
            await expect(
                getAdminTxByInput_AuthorizeGovernors(
                    admin,
                    deployer,
                    {
                        accounts: tx2Governors.map((x) => x.address),
                        isGovernor: true,
                    },
                    admins
                )
            ).to.be.revertedWithCustomError(admin, `AuthorizedAccount`);
        });

        it('1.2.10.7. Deauthorize governors successfully', async () => {
            const fixture = await setupBeforeTest({
                authorizeGovernors: true,
            });
            const { deployer, admins, admin, governors } = fixture;

            const toDeauth = governors.slice(0, 2);
            const remainGovernors = governors.slice(2);

            const paramsInput: AuthorizeGovernorsParamsInput = {
                accounts: toDeauth.map((x) => x.address),
                isGovernor: false,
            };
            const tx = await getAdminTxByInput_AuthorizeGovernors(admin, deployer, paramsInput, admins);
            await tx.wait();

            for (const governor of toDeauth) {
                await expect(tx).to.emit(admin, 'GovernorDeauthorization').withArgs(governor.address);
            }

            for (let i = 0; i < toDeauth.length; ++i) {
                const isGovernor = await admin.isGovernor(toDeauth[i].address);
                expect(isGovernor).to.be.false;
            }
            for (let i = 0; i < remainGovernors.length; ++i) {
                const isGovernor = await admin.isGovernor(remainGovernors[i].address);
                expect(isGovernor).to.be.true;
            }
        });

        it('1.2.10.8. Deauthorize governors unsuccessfully with unauthorized account', async () => {
            const fixture = await setupBeforeTest({
                authorizeGovernors: true,
            });
            const { deployer, admins, admin, governors } = fixture;

            const account = randomWallet();
            const toDeauth = [governors[0], account];

            await expect(
                getAdminTxByInput_AuthorizeGovernors(
                    admin,
                    deployer,
                    {
                        accounts: toDeauth.map((x) => x.address),
                        isGovernor: false,
                    },
                    admins
                )
            ).to.be.revertedWithCustomError(admin, `NotAuthorizedAccount`);
        });

        it('1.2.10.9. Deauthorize governors unsuccessfully when unauthorizing the same account twice on the same tx', async () => {
            const fixture = await setupBeforeTest({
                authorizeGovernors: true,
            });
            const { deployer, admins, admin, governors } = fixture;

            const toDeauth = governors.slice(0, 2).concat([governors[0]]);

            await expect(
                getAdminTxByInput_AuthorizeGovernors(
                    admin,
                    deployer,
                    {
                        accounts: toDeauth.map((x) => x.address),
                        isGovernor: false,
                    },
                    admins
                )
            ).to.be.revertedWithCustomError(admin, `NotAuthorizedAccount`);
        });

        it('1.2.10.10. Deauthorize governors unsuccessfully when unauthorizing the same account twice on different txs', async () => {
            const fixture = await setupBeforeTest({
                authorizeGovernors: true,
            });
            const { deployer, admins, admin, governors } = fixture;

            const tx1Accounts = governors.slice(0, 2);
            await callTransaction(
                getAdminTxByInput_AuthorizeGovernors(
                    admin,
                    deployer,
                    {
                        accounts: tx1Accounts.map((x) => x.address),
                        isGovernor: false,
                    },
                    admins
                )
            );

            const tx2Accounts = [governors[0]];
            await expect(
                getAdminTxByInput_AuthorizeGovernors(
                    admin,
                    deployer,
                    {
                        accounts: tx2Accounts.map((x) => x.address),
                        isGovernor: false,
                    },
                    admins
                )
            ).to.be.revertedWithCustomError(admin, `NotAuthorizedAccount`);
        });
    });

    describe('1.2.11. declareZone(bytes32,bytes[])', async () => {
        it('1.2.11.1. Declare zone successfully', async () => {
            const fixture = await setupBeforeTest();
            const { deployer, admins, admin, zone1, zone2 } = fixture;

            const paramsInput1: DeclareZoneParamsInput = {
                zone: zone1,
            };
            const tx1 = await getAdminTxByInput_DeclareZone(admin, deployer, paramsInput1, admins);
            await tx1.wait();

            await expect(tx1).to.emit(admin, 'ZoneDeclaration').withArgs(zone1);

            expect(await admin.isZone(zone1)).to.be.true;

            const paramsInput2: DeclareZoneParamsInput = {
                zone: zone2,
            };
            const tx2 = await getAdminTxByInput_DeclareZone(admin, deployer, paramsInput2, admins);
            await tx2.wait();

            await expect(tx2).to.emit(admin, 'ZoneDeclaration').withArgs(zone2);

            expect(await admin.isZone(zone2)).to.be.true;
        });

        it('1.2.11.2. Declare zone unsuccessfully with invalid signatures', async () => {
            const fixture = await setupBeforeTest();
            const { deployer, admins, admin, zone1 } = fixture;

            const paramsInput: DeclareZoneParamsInput = {
                zone: zone1,
            };
            const params: DeclareZoneParams = {
                ...paramsInput,
                signatures: await getDeclareZoneSignatures(admin, paramsInput, admins, false),
            };
            await expect(getAdminTx_DeclareZone(admin, deployer, params)).to.be.revertedWithCustomError(
                admin,
                'FailedVerification'
            );
        });

        it('1.2.11.3. Declare zone unsuccessfully when declaring the same zone twice', async () => {
            const fixture = await setupBeforeTest();
            const { deployer, admins, admin, zone1 } = fixture;

            await callTransaction(getAdminTxByInput_DeclareZone(admin, deployer, { zone: zone1 }, admins));

            await expect(
                getAdminTxByInput_DeclareZone(admin, deployer, { zone: zone1 }, admins)
            ).to.be.revertedWithCustomError(admin, 'AuthorizedZone');
        });
    });

    describe('1.2.12. activateIn(bytes32,address[],bool,bytes[])', async () => {
        it('1.2.12.1. Activate accounts in zone successfully', async () => {
            const fixture = await setupBeforeTest({
                declareZones: true,
            });
            const { deployer, admin, admins, accounts, zone1, zone2 } = fixture;

            const zone1Accounts = [accounts[0], accounts[2], accounts[4]];
            const zone2Accounts = [accounts[0], accounts[1], accounts[3]];

            const paramsInput1: ActivateInParamsInput = {
                zone: zone1,
                accounts: zone1Accounts.map((x) => x.address),
                isActive: true,
            };
            const tx1 = await getAdminTxByInput_ActivateIn(admin, deployer, paramsInput1, admins);
            await tx1.wait();

            for (const account of zone1Accounts) {
                await expect(tx1).to.emit(admin, 'Activation').withArgs(zone1, account.address);
            }

            const paramsInput2: ActivateInParamsInput = {
                zone: zone2,
                accounts: zone2Accounts.map((x) => x.address),
                isActive: true,
            };
            const params2: ActivateInParams = {
                ...paramsInput2,
                signatures: await getActivateInSignatures(admin, paramsInput2, admins),
            };

            const tx2 = await getAdminTx_ActivateIn(admin, deployer, params2);
            await tx2.wait();

            for (const account of zone2Accounts) {
                await expect(tx2).to.emit(admin, 'Activation').withArgs(zone2, account.address);
            }

            for (const account of accounts) {
                if (zone1Accounts.includes(account)) {
                    expect(await admin.isActiveIn(zone1, account.address)).to.be.true;
                } else {
                    expect(await admin.isActiveIn(zone1, account.address)).to.be.false;
                }
                if (zone2Accounts.includes(account)) {
                    expect(await admin.isActiveIn(zone2, account.address)).to.be.true;
                } else {
                    expect(await admin.isActiveIn(zone2, account.address)).to.be.false;
                }
            }
        });

        it('1.2.12.2. Activate accounts in zone unsuccessfully with invalid signatures', async () => {
            const fixture = await setupBeforeTest({
                declareZones: true,
            });
            const { deployer, admins, admin, accounts, zone1 } = fixture;

            const zone1Accounts = [accounts[0], accounts[1]];

            const paramsInput: ActivateInParamsInput = {
                zone: zone1,
                accounts: zone1Accounts.map((x) => x.address),
                isActive: true,
            };
            const params: ActivateInParams = {
                ...paramsInput,
                signatures: await getActivateInSignatures(admin, paramsInput, admins, false),
            };
            await expect(getAdminTx_ActivateIn(admin, deployer, params)).to.be.revertedWithCustomError(
                admin,
                'FailedVerification'
            );
        });

        it('1.2.12.3. Activate accounts in zone unsuccessfully with invalid zone', async () => {
            const fixture = await setupBeforeTest({
                declareZones: true,
            });
            const { deployer, admins, admin, accounts } = fixture;

            const invalidZone = ethers.utils.formatBytes32String('InvalidZone');

            const zone1Accounts = [accounts[0], accounts[1]];

            await expect(
                getAdminTxByInput_ActivateIn(
                    admin,
                    deployer,
                    {
                        zone: invalidZone,
                        accounts: zone1Accounts.map((x) => x.address),
                        isActive: true,
                    },
                    admins
                )
            ).to.be.revertedWithCustomError(admin, 'InvalidInput');
        });

        it('1.2.12.4. Activate accounts in zone unsuccessfully when activating the same account twice on the same tx', async () => {
            const fixture = await setupBeforeTest({
                declareZones: true,
            });
            const { deployer, admins, admin, accounts, zone1 } = fixture;

            const zone1Accounts = [accounts[0], accounts[1], accounts[2], accounts[1]];

            await expect(
                getAdminTxByInput_ActivateIn(
                    admin,
                    deployer,
                    {
                        zone: zone1,
                        accounts: zone1Accounts.map((x) => x.address),
                        isActive: true,
                    },
                    admins
                )
            ).to.be.revertedWithCustomError(admin, 'ActivatedAccount');
        });

        it('1.2.12.5. Activate accounts in zone unsuccessfully when activating the same account twice on different txs', async () => {
            const fixture = await setupBeforeTest({
                declareZones: true,
            });
            const { deployer, admins, admin, accounts, zone1 } = fixture;

            const tx1Accounts = [accounts[0], accounts[1], accounts[2]];
            await callTransaction(
                getAdminTxByInput_ActivateIn(
                    admin,
                    deployer,
                    {
                        zone: zone1,
                        accounts: tx1Accounts.map((x) => x.address),
                        isActive: true,
                    },
                    admins
                )
            );

            const tx2Accounts = [accounts[3], accounts[2]];

            await expect(
                getAdminTxByInput_ActivateIn(
                    admin,
                    deployer,
                    {
                        zone: zone1,
                        accounts: tx2Accounts.map((x) => x.address),
                        isActive: true,
                    },
                    admins
                )
            ).to.be.revertedWithCustomError(admin, 'ActivatedAccount');
        });

        it('1.2.12.6. Deactivate accounts in zone successfully', async () => {
            const fixture = await setupBeforeTest({
                declareZones: true,
                activateAccountsInZones: true,
            });
            const { deployer, admins, admin, accounts, zone1, zone2 } = fixture;

            const zone1ToDeactivate = [accounts[0], accounts[2], accounts[4]];
            const zone1Remaining = accounts.filter((x) => !zone1ToDeactivate.includes(x));

            const paramsInput: ActivateInParamsInput = {
                zone: zone1,
                accounts: zone1ToDeactivate.map((x) => x.address),
                isActive: false,
            };
            const tx1 = await getAdminTxByInput_ActivateIn(admin, deployer, paramsInput, admins);
            await tx1.wait();

            for (const account of zone1ToDeactivate) {
                await expect(tx1).to.emit(admin, 'Deactivation').withArgs(zone1, account.address);
            }

            const zone2ToDeactivate = [accounts[0], accounts[1], accounts[3]];
            const zone2Remaining = accounts.filter((x) => !zone2ToDeactivate.includes(x));

            const paramsInput2: ActivateInParamsInput = {
                zone: zone2,
                accounts: zone2ToDeactivate.map((x) => x.address),
                isActive: false,
            };
            const tx2 = await getAdminTxByInput_ActivateIn(admin, deployer, paramsInput2, admins);
            await tx2.wait();

            for (const account of zone2ToDeactivate) {
                await expect(tx2).to.emit(admin, 'Deactivation').withArgs(zone2, account.address);
            }

            for (const account of accounts) {
                if (zone1Remaining.includes(account)) {
                    expect(await admin.isActiveIn(zone1, account.address)).to.be.true;
                } else {
                    expect(await admin.isActiveIn(zone1, account.address)).to.be.false;
                }
                if (zone2Remaining.includes(account)) {
                    expect(await admin.isActiveIn(zone2, account.address)).to.be.true;
                } else {
                    expect(await admin.isActiveIn(zone2, account.address)).to.be.false;
                }
            }
        });

        it('1.2.12.7. Deactivate accounts in zone unsuccessfully with inactive accounts', async () => {
            const fixture = await setupBeforeTest({
                declareZones: true,
                activateAccountsInZones: true,
            });
            const { deployer, admins, admin, accounts, zone1 } = fixture;

            const newAccount = randomWallet();
            const zone1ToDeactivate = [accounts[0], accounts[2], newAccount];

            await expect(
                getAdminTxByInput_ActivateIn(
                    admin,
                    deployer,
                    {
                        zone: zone1,
                        accounts: zone1ToDeactivate.map((x) => x.address),
                        isActive: false,
                    },
                    admins
                )
            ).to.be.revertedWithCustomError(admin, 'NotActivatedAccount');
        });

        it('1.2.12.8. Deactivate accounts in zone unsuccessfully when deactivating the same account twice on the same tx', async () => {
            const fixture = await setupBeforeTest({
                declareZones: true,
                activateAccountsInZones: true,
            });
            const { deployer, admins, admin, accounts, zone1 } = fixture;

            const zone1ToDeactivate = [accounts[0], accounts[1], accounts[2], accounts[0]];

            await expect(
                getAdminTxByInput_ActivateIn(
                    admin,
                    deployer,
                    {
                        zone: zone1,
                        accounts: zone1ToDeactivate.map((x) => x.address),
                        isActive: false,
                    },
                    admins
                )
            ).to.be.revertedWithCustomError(admin, 'NotActivatedAccount');
        });

        it('1.2.12.9. Deactivate accounts in zone unsuccessfully when deactivating the same account twice on different txs', async () => {
            const fixture = await setupBeforeTest({
                declareZones: true,
                activateAccountsInZones: true,
            });
            const { deployer, admins, admin, accounts, zone1 } = fixture;

            let tx1Accounts = [accounts[0], accounts[1], accounts[2]];
            await callTransaction(
                getAdminTxByInput_ActivateIn(
                    admin,
                    deployer,
                    {
                        zone: zone1,
                        accounts: tx1Accounts.map((x) => x.address),
                        isActive: false,
                    },
                    admins
                )
            );

            let tx2Accounts = [accounts[3], accounts[2]];
            await expect(
                getAdminTxByInput_ActivateIn(
                    admin,
                    deployer,
                    {
                        zone: zone1,
                        accounts: tx2Accounts.map((x) => x.address),
                        isActive: false,
                    },
                    admins
                )
            ).to.be.revertedWithCustomError(admin, 'NotActivatedAccount');
        });
    });

    describe('1.2.13. updateCurrencyRegistries(address[],bool[],bool[],bytes[])', async () => {
        it('1.2.13.1. Update currency registries successfully', async () => {
            const fixture = await setupBeforeTest();
            const { deployer, admins, admin } = fixture;

            const currencyAddresses = [];
            for (let i = 0; i < 5; ++i)
                currencyAddresses.push(ethers.utils.computeAddress(ethers.utils.id(`currency_${i}`)));
            const isAvailable = [true, false, true, false, true];
            const isExclusive = [false, false, true, true, false];

            const paramsInput: UpdateCurrencyRegistriesParamsInput = {
                currencies: currencyAddresses,
                isAvailable,
                isExclusive,
            };
            const tx = await getAdminTxByInput_UpdateCurrencyRegistries(admin, deployer, paramsInput, admins);
            await tx.wait();

            for (let i = 0; i < currencyAddresses.length; i++) {
                await expect(tx)
                    .to.emit(admin, 'CurrencyRegistryUpdate')
                    .withArgs(currencyAddresses[i], isAvailable[i], isExclusive[i]);
            }

            for (let i = 0; i < currencyAddresses.length; ++i) {
                const available = await admin.isAvailableCurrency(currencyAddresses[i]);
                expect(available).to.equal(isAvailable[i]);
            }

            for (let i = 0; i < currencyAddresses.length; ++i) {
                const exclusive = await admin.isExclusiveCurrency(currencyAddresses[i]);
                expect(exclusive).to.equal(isExclusive[i]);
            }

            for (let i = 0; i < currencyAddresses.length; ++i) {
                const currencyRegistry = await admin.getCurrencyRegistry(currencyAddresses[i]);
                expect(currencyRegistry.isAvailable).to.equal(isAvailable[i]);
                expect(currencyRegistry.isExclusive).to.equal(isExclusive[i]);
            }
        });

        it('1.2.13.2. Update currency registries successfully with multiple records of the same currency', async () => {
            const fixture = await setupBeforeTest();
            const { deployer, admins, admin } = fixture;

            const address = ethers.utils.computeAddress(ethers.utils.id(`currency`));
            const currencyAddresses = [address, address];
            const isAvailable = [false, false];
            const isExclusive = [true, true];

            const paramsInput: UpdateCurrencyRegistriesParamsInput = {
                currencies: currencyAddresses,
                isAvailable,
                isExclusive,
            };
            const tx = await getAdminTxByInput_UpdateCurrencyRegistries(admin, deployer, paramsInput, admins);
            await tx.wait();

            for (let i = 0; i < currencyAddresses.length; i++) {
                await expect(tx)
                    .to.emit(admin, 'CurrencyRegistryUpdate')
                    .withArgs(currencyAddresses[i], isAvailable[i], isExclusive[i]);
            }

            const available = await admin.isAvailableCurrency(address);
            expect(available).to.equal(isAvailable[1]);

            const exclusive = await admin.isExclusiveCurrency(address);
            expect(exclusive).to.equal(isExclusive[1]);

            const currencyRegistry = await admin.getCurrencyRegistry(address);
            expect(currencyRegistry.isAvailable).to.equal(isAvailable[1]);
            expect(currencyRegistry.isExclusive).to.equal(isExclusive[1]);
        });

        it('1.2.13.3. Update currency registries unsuccessfully with incorrect signatures', async () => {
            const fixture = await setupBeforeTest();
            const { deployer, admins, admin } = fixture;

            const currencyAddresses = [];
            for (let i = 0; i < 5; ++i)
                currencyAddresses.push(ethers.utils.computeAddress(ethers.utils.id(`currency_${i}`)));
            const isAvailable = [true, false, true, false, true];
            const isExclusive = [false, false, true, true, false];

            const paramsInput: UpdateCurrencyRegistriesParamsInput = {
                currencies: currencyAddresses,
                isAvailable,
                isExclusive,
            };
            const params: UpdateCurrencyRegistriesParams = {
                ...paramsInput,
                signatures: await getUpdateCurrencyRegistriesSignatures(admin, paramsInput, admins, false),
            };
            await expect(getAdminTx_UpdateCurrencyRegistries(admin, deployer, params)).to.be.revertedWithCustomError(
                admin,
                'FailedVerification'
            );
        });

        it('1.2.13.4. Update currency registries unsuccessfully with conflicting params lengths', async () => {
            const fixture = await setupBeforeTest();
            const { deployer, admins, admin } = fixture;

            async function testForInvalidInput(
                currencyAddresses: string[],
                isAvailable: boolean[],
                isExclusive: boolean[]
            ) {
                await expect(
                    getAdminTxByInput_UpdateCurrencyRegistries(
                        admin,
                        deployer,
                        {
                            currencies: currencyAddresses,
                            isAvailable,
                            isExclusive,
                        },
                        admins
                    )
                ).to.be.revertedWithCustomError(admin, 'InvalidInput');
            }

            const currencyAddresses = [];
            for (let i = 0; i < 5; ++i) {
                currencyAddresses.push(ethers.utils.computeAddress(ethers.utils.id(`currency_${i}`)));
            }
            const isAvailable = [true, false, true, false, true];
            const isExclusive = [false, false, true, true, false];

            await testForInvalidInput(currencyAddresses.slice(0, 4), isAvailable, isExclusive);
            await testForInvalidInput(currencyAddresses, isAvailable.slice(0, 4), isExclusive);
            await testForInvalidInput(currencyAddresses, isAvailable, isExclusive.slice(0, 4));
        });
    });

    /* --- Query --- */
    describe('1.2.14. isExecutive(address)', async () => {
        it('1.2.14.1. Return true only if the account is authorized as manager or moderator', async () => {
            const fixture = await setupBeforeTest();
            const { deployer, admins, admin, accounts } = fixture;

            await callTransaction(
                getAdminTxByInput_AuthorizeManagers(
                    admin,
                    deployer,
                    {
                        accounts: [accounts[0].address, accounts[2].address],
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
                        accounts: [accounts[0].address, accounts[1].address],
                        isModerator: true,
                    },
                    admins
                )
            );

            expect(await admin.isExecutive(accounts[0].address)).to.be.true;
            expect(await admin.isExecutive(accounts[1].address)).to.be.true;
            expect(await admin.isExecutive(accounts[2].address)).to.be.true;
            expect(await admin.isExecutive(accounts[3].address)).to.be.false;
        });
    });
});
