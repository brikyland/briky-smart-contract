import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Admin } from '@typechain-types';
import { callTransaction, getSignatures, randomWallet } from '@utils/blockchain';
import { deployAdmin } from '@utils/deployments/common/admin';
import { nextPermutation } from '@utils/utils';
import { Constant } from '@tests/test.constant';
import { Wallet } from 'ethers';
import { 
    callAdmin_ActivateIn,
    callAdmin_AuthorizeManagers,
    callAdmin_AuthorizeModerators,
    callAdmin_DeclareZones
} from '@utils/callWithSignatures/admin';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

interface AdminFixture {
    deployer: any;
    admins: any[];
    admin: Admin;
    manager: any;
    moderator: any;
    user: any;
}

describe('1. Admin', async () => {
    async function adminFixture(): Promise<AdminFixture> {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        const admins = [];
        for (let i = 1; i <= Constant.ADMIN_NUMBER; ++i) admins.push(accounts[i]);
        const manager = accounts[Constant.ADMIN_NUMBER + 1];
        const moderator = accounts[Constant.ADMIN_NUMBER + 2];
        const user = accounts[Constant.ADMIN_NUMBER + 3];

        const adminAddresses: string[] = admins.map(signer => signer.address);
        const admin = await deployAdmin(
            deployer.address,
            adminAddresses[0],
            adminAddresses[1],
            adminAddresses[2],
            adminAddresses[3],
            adminAddresses[4],
        ) as Admin;

        return {
            deployer,
            admins,
            admin,
            manager,
            moderator,
            user,
        };
    };

    async function setupBeforeTest(): Promise<AdminFixture> {
        return await loadFixture(adminFixture);
    }

    describe('1.1. initialize(address, address, address, address, address)', async () => {
        it('1.1.1. Deploy successfully', async () => {
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

    describe('1.2. verifyAdminSignature(bytes, bytes[])', async () => {
        it('1.2.1. verify admin signatures successfully with at least 4/5 valid admin signatures', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;            
            let currentNonce = 0;

            const message = ethers.utils.hexlify(ethers.utils.toUtf8Bytes('Blockchain'));
            const invalidSignatures = await getSignatures(message, admins, 999999999);

            for (let mask = 0; mask < (1 << Constant.ADMIN_NUMBER); ++mask) {
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

                let tx = await admin.verifyAdminSignatures(
                    message,
                    signatures,
                );

                await expect(tx).to
                    .emit(admin, 'AdminSignaturesVerification')
                    .withArgs(message, currentNonce, signatures);

                ++currentNonce;
                let nonce = await admin.nonce();
                expect(nonce).to.equal(currentNonce);
            }
        });

        it('1.2.2. verify admin signatures successfully multiple times', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;            
            let currentNonce = 0;

            const messageA = ethers.utils.hexlify(ethers.utils.toUtf8Bytes('Blockchain'));
            const signaturesA = await getSignatures(
                messageA,
                admins,
                0
            );

            let tx = await admin.verifyAdminSignatures(
                messageA,
                signaturesA,
            );

            await expect(tx).to
                .emit(admin, 'AdminSignaturesVerification')
                .withArgs(messageA, 0, signaturesA);

            let nonce = await admin.nonce();
            expect(nonce).to.equal(1);

            const messageB = ethers.utils.hexlify(ethers.utils.toUtf8Bytes('Bitcoin'));
            const signaturesB = await getSignatures(
                messageB,
                admins,
                1
            );

            tx = await admin.verifyAdminSignatures(
                messageB,
                signaturesB,
            );
            await expect(tx).to
                .emit(admin, 'AdminSignaturesVerification')
                .withArgs(messageB, 1, signaturesB);

            nonce = await admin.nonce();
            expect(nonce).to.equal(2);

            const messageC = ethers.utils.hexlify(ethers.utils.toUtf8Bytes('Ethereum'));
            const signaturesC = await getSignatures(
                messageC,
                admins,
                2
            );

            tx = await admin.verifyAdminSignatures(
                messageC,
                signaturesC,
            );
            await expect(tx).to
                .emit(admin, 'AdminSignaturesVerification')
                .withArgs(messageC, 2, signaturesC);

            nonce = await admin.nonce();
            expect(nonce).to.equal(3);
        });

        it('1.2.3. Verify admin signatures unsuccessfully with less than 4/5 valid admin signatures (incorrect nonce)', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;            
            let currentNonce = 0;

            const message = ethers.utils.hexlify(ethers.utils.toUtf8Bytes('Blockchain'));

            const validSignatures = await getSignatures(message, admins, currentNonce);
            const invalidSignatures = await getSignatures(message, admins, currentNonce + 1);

            for (let mask = 0; mask < (1 << Constant.ADMIN_NUMBER); ++mask) {
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

                await expect(admin.verifyAdminSignatures(
                    message,
                    signatures,
                )).to.be.revertedWithCustomError(admin, 'FailedVerification');
            }
        });

        it('1.2.4. Verify admin signatures unsuccessfully with less than 4/5 valid admin signatures (incorrect message)', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;            
            let currentNonce = 0;

            const message = ethers.utils.hexlify(ethers.utils.toUtf8Bytes('Blockchain'));
            const incorrectMessage = ethers.utils.hexlify(ethers.utils.toUtf8Bytes('Bitcoin'));

            const validSignatures = await getSignatures(message, admins, currentNonce);
            const invalidSignatures = await getSignatures(incorrectMessage, admins, currentNonce);

            for (let mask = 0; mask < (1 << Constant.ADMIN_NUMBER); ++mask) {
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

                await expect(admin.verifyAdminSignatures(
                    message,
                    signatures,
                )).to.be.revertedWithCustomError(admin, 'FailedVerification');
            }
        });

        it('1.2.5. Verify admin signatures unsuccessfully with less than 4/5 valid admin signatures (incorrect address)', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;            
            let currentNonce = 0;

            const invalidAdmins: Wallet[] = [];
            for (let i = 0; i < Constant.ADMIN_NUMBER; ++i) invalidAdmins.push(randomWallet());

            const message = ethers.utils.hexlify(ethers.utils.toUtf8Bytes('Blockchain'));

            const validSignatures = await getSignatures(message, admins, currentNonce);
            const invalidSignatures = await getSignatures(message, invalidAdmins, currentNonce);

            for (let mask = 0; mask < (1 << Constant.ADMIN_NUMBER); ++mask) {
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

                await expect(admin.verifyAdminSignatures(
                    message,
                    signatures,
                )).to.be.revertedWithCustomError(admin, 'FailedVerification');
            }
        });

        it('1.2.6. Verify admin signatures unsuccessfully with incorrect admin signatures order', async () => {
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

                await expect(admin.verifyAdminSignatures(
                    message,
                    signatures,
                )).to.be.revertedWithCustomError(admin, 'FailedVerification');
            }
        });

        it('1.2.7. Verify admin signatures unsuccessfully with incorrect number of signatures', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;            
            let currentNonce = 0;

            const message = ethers.utils.hexlify(ethers.utils.toUtf8Bytes('Blockchain'));
            let validSignatures = await getSignatures(message, admins, currentNonce);

            validSignatures = validSignatures.concat(validSignatures);

            for (let nSignatures = 0; nSignatures <= Constant.ADMIN_NUMBER + 1; ++nSignatures) {
                if (nSignatures == Constant.ADMIN_NUMBER) continue;
                const incorrectSignatures = validSignatures.slice(0, nSignatures);
                await expect(admin.verifyAdminSignatures(
                    message,
                    incorrectSignatures,
                )).to.be.revertedWithCustomError(admin, 'InvalidSignatureNumber');
            }
        });

        it('1.2.8. Verify admin signatures unsuccessfully by non-manager origin caller', async () => {
            const { admins, admin, moderator, user } = await setupBeforeTest();
            let currentNonce = 0;

            const message = ethers.utils.hexlify(ethers.utils.toUtf8Bytes('Blockchain'));
            let validSignatures = await getSignatures(message, admins, currentNonce);

            await expect(admin.connect(moderator).verifyAdminSignatures(
                message,
                validSignatures,
            )).to.be.revertedWithCustomError(admin, 'Unauthorized');
            await expect(admin.connect(user).verifyAdminSignatures(
                message,
                validSignatures,
            )).to.be.revertedWithCustomError(admin, 'Unauthorized');
        });
    });

    describe('1.3. transferAdministration1(address, bytes[])', async () => {
        it('1.3.1. Change admin 1 successfully', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;            

            const newAdmin = randomWallet();
            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address'],
                [admin.address, 'transferAdministration1', newAdmin.address]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await admin.transferAdministration1(
                newAdmin.address,
                signatures
            );
            await tx.wait();

            await expect(tx).to
                .emit(admin, 'Administration1Transfer')
                .withArgs(newAdmin.address);

            const admin1 = await admin.admin1();
            expect(admin1).to.equal(newAdmin.address);
        });

        it('1.3.2. Change admin 1 unsuccessfully because of invalid signatures', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;            

            const newAdmin = randomWallet();
            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address'],
                [admin.address, 'transferAdministration1', newAdmin.address]
            );
            const invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(admin.transferAdministration1(
                newAdmin.address,
                invalidSignatures
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });
    });

    describe('1.4. transferAdministration2(address, bytes[])', async () => {
        it('1.4.1. Change admin 2 successfully', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;            

            const newAdmin = randomWallet();
            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address'],
                [admin.address, 'transferAdministration2', newAdmin.address]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await admin.transferAdministration2(
                newAdmin.address,
                signatures
            );
            await tx.wait();

            await expect(tx).to
                .emit(admin, 'Administration2Transfer')
                .withArgs(newAdmin.address);

            const admin2 = await admin.admin2();
            expect(admin2).to.equal(newAdmin.address);
        });

        it('1.4.2. Change admin 2 unsuccessfully because of invalid signatures', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;            

            const newAdmin = randomWallet();
            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address'],
                [admin.address, 'transferAdministration2', newAdmin.address]
            );
            const invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(admin.transferAdministration2(
                newAdmin.address,
                invalidSignatures
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });
    });

    describe('1.5. transferAdministration3(address, bytes[])', async () => {
        it('1.5.1. Change admin 3 successfully', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;            

            const newAdmin = randomWallet();
            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address'],
                [admin.address, 'transferAdministration3', newAdmin.address]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await admin.transferAdministration3(
                newAdmin.address,
                signatures
            );
            await tx.wait();

            await expect(tx).to
                .emit(admin, 'Administration3Transfer')
                .withArgs(newAdmin.address);

            const admin3 = await admin.admin3();
            expect(admin3).to.equal(newAdmin.address);
        });

        it('1.5.2. Change admin 3 unsuccessfully because of invalid signatures', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;            

            const newAdmin = randomWallet();
            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address'],
                [admin.address, 'transferAdministration3', newAdmin.address]
            );
            const invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(admin.transferAdministration3(
                newAdmin.address,
                invalidSignatures
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });
    });

    describe('1.6. transferAdministration4(address, bytes[])', async () => {
        it('1.6.1. Change admin 4 successfully', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;            

            const newAdmin = randomWallet();
            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address'],
                [admin.address, 'transferAdministration4', newAdmin.address]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await admin.transferAdministration4(
                newAdmin.address,
                signatures
            );
            await tx.wait();

            await expect(tx).to
                .emit(admin, 'Administration4Transfer')
                .withArgs(newAdmin.address);

            const admin4 = await admin.admin4();
            expect(admin4).to.equal(newAdmin.address);
        });

        it('1.6.2. Change admin 4 unsuccessfully because of invalid signatures', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;            

            const newAdmin = randomWallet();
            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address'],
                [admin.address, 'transferAdministration4', newAdmin.address]
            );
            const invalidSignatures = await getSignatures(message, admins, 1);

            await expect(admin.transferAdministration4(
                newAdmin.address,
                invalidSignatures
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });
    });

    describe('1.7. transferAdministration5(address, bytes[])', async () => {
        it('1.7.1. Change admin 5 successfully', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;            
            let currentNonce = 0;

            const newAdmin = randomWallet();
            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address'],
                [admin.address, 'transferAdministration5', newAdmin.address]
            );
            const signatures = await getSignatures(message, admins, currentNonce);

            const tx = await admin.transferAdministration5(
                newAdmin.address,
                signatures
            );
            await tx.wait();

            await expect(tx).to
                .emit(admin, 'Administration5Transfer')
                .withArgs(newAdmin.address);

            const admin5 = await admin.admin5();
            expect(admin5).to.equal(newAdmin.address);
        });

        it('1.7.2. Change admin 5 unsuccessfully because of invalid signatures', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;            

            const newAdmin = randomWallet();
            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address'],
                [admin.address, 'transferAdministration5', newAdmin.address]
            );
            const invalidSignatures = await getSignatures(message, admins, 1);

            await expect(admin.transferAdministration5(
                newAdmin.address,
                invalidSignatures
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });
    });

    describe('1.8. authorizeManager(address[], bool, bytes[])', async () => {
        it('1.8.1. Authorize manager successfully', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;            

            const toBeManagers = [];
            for (let i = 0; i < 5; ++i) toBeManagers.push(randomWallet());

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [admin.address, 'authorizeManagers', toBeManagers.map(x => x.address), true]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await admin.authorizeManagers(
                toBeManagers.map(x => x.address),
                true,
                signatures
            );
            await tx.wait();

            for (const manager of toBeManagers) {
                await expect(tx).to
                    .emit(admin, 'ManagerAuthorization')
                    .withArgs(manager.address);
            }

            for (let i = 0; i < 5; ++i) {
                const isManager = await admin.isManager(toBeManagers[i].address);
                expect(isManager).to.be.true;
            }
        });

        it('1.8.2. Authorize manager unsuccessfully because of invalid signatures', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;            

            const toBeManagers = [];
            for (let i = 0; i < 5; ++i) toBeManagers.push(randomWallet());

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [admin.address, 'authorizeManagers', toBeManagers.map(x => x.address), true]
            );
            const invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(admin.authorizeManagers(
                toBeManagers.map(x => x.address),
                true,
                invalidSignatures
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('1.8.3. Authorize manager unsuccessfully with authorized accounts on same tx', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;            

            const duplicateManagers = [];
            for (let i = 0; i < 5; ++i) duplicateManagers.push(randomWallet());
            duplicateManagers.push(duplicateManagers[0]);

            let message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [admin.address, 'authorizeManagers', duplicateManagers.map(x => x.address), true]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(admin.authorizeManagers(
                duplicateManagers.map(x => x.address),
                true,
                signatures
            )).to.be.revertedWithCustomError(admin, `AuthorizedAccount`)
                .withArgs(duplicateManagers[0].address);
        });

        it('1.8.4. Authorize manager unsuccessfully with authorized account on different tx', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;            

            const toBeManagers = [];
            for (let i = 0; i < 5; ++i) toBeManagers.push(randomWallet());

            let message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [admin.address, 'authorizeManagers', toBeManagers.map(x => x.address), true]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            await callTransaction(admin.authorizeManagers(
                toBeManagers.map(x => x.address),
                true,
                signatures
            ));

            const managers = [randomWallet(), toBeManagers[2], randomWallet()];

            message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [admin.address, 'authorizeManagers', managers.map(x => x.address), true]
            );
            signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(admin.authorizeManagers(
                managers.map(x => x.address),
                true,
                signatures
            )).to.be.revertedWithCustomError(admin, `AuthorizedAccount`)
                .withArgs(toBeManagers[2].address);
        })

        async function setupManagers(admins: any[], admin: Admin): Promise<Wallet[]> {
            const managers = [];
            for (let i = 0; i < 5; ++i) managers.push(randomWallet());

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [admin.address, 'authorizeManagers', managers.map(x => x.address), true]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await callTransaction(admin.authorizeManagers(
                managers.map(x => x.address),
                true,
                signatures
            ));

            return managers;
        }

        it('1.8.5. Deauthorize manager successfully', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;            

            const managers = await setupManagers(admins, admin);

            const toDeauth = managers.slice(0, 2);
            const remainManagers = managers.slice(2);

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [admin.address, 'authorizeManagers', toDeauth.map(x => x.address), false]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await admin.authorizeManagers(
                toDeauth.map(x => x.address),
                false,
                signatures
            );
            await tx.wait();

            for (const manager of toDeauth) {
                await expect(tx).to
                    .emit(admin, 'ManagerDeauthorization')
                    .withArgs(manager.address);
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

        it('1.8.6. Deauthorize manager unsuccessfully with unauthorized accounts', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;            

            const managers = await setupManagers(admins, admin);

            const account = randomWallet();
            const toDeauth = [managers[0], account];

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [admin.address, 'authorizeManagers', toDeauth.map(x => x.address), false]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(admin.authorizeManagers(
                toDeauth.map(x => x.address),
                false,
                signatures
            )).to.be.revertedWithCustomError(admin, `NotAuthorizedAccount`)
                .withArgs(account.address);
        });

        it('1.8.7. Deauthorize manager unsuccessfully when unauthorizing same accounts twice on same tx', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;            

            const managers = await setupManagers(admins, admin);

            const toDeauth = managers.slice(0, 2).concat([managers[0]]);

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [admin.address, 'authorizeManagers', toDeauth.map(x => x.address), false]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(admin.authorizeManagers(
                toDeauth.map(x => x.address),
                false,
                signatures
            )).to.be.revertedWithCustomError(admin, `NotAuthorizedAccount`)
                .withArgs(managers[0].address);
        });

        it('1.8.8. Deauthorize manager unsuccessfully when unauthorizing same accounts twice on different tx', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;            

            const managers = await setupManagers(admins, admin);

            const tx1_accounts = managers.slice(0, 2);
            await callAdmin_AuthorizeManagers(admin, admins, tx1_accounts.map(x => x.address), false, await admin.nonce());

            const tx2_accounts = [managers[0]];
            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [admin.address, 'authorizeManagers', tx2_accounts.map(x => x.address), false]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(admin.authorizeManagers(
                tx2_accounts.map(x => x.address),
                false,
                signatures
            )).to.be.revertedWithCustomError(admin, `NotAuthorizedAccount`)
                .withArgs(managers[0].address);
        });

        it('1.8.9. Deauthorize manager unsuccessfully when the caller self-deauthorizes', async () => {
            const { admins, admin, deployer } = await setupBeforeTest();

            const toDeauth = [deployer];

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [admin.address, 'authorizeManagers', toDeauth.map(x => x.address), false]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(admin.authorizeManagers(
                toDeauth.map(x => x.address),
                false,
                signatures
            )).to.be.revertedWithCustomError(admin, `CannotSelfDeauthorizing`)
        });
    });

    describe('1.9. authorizeModerators(address[], bool, bytes[])', async () => {
        it('1.9.1. Authorize moderator successfully', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;            

            const toBeModerators = [];
            for (let i = 0; i < 5; ++i) toBeModerators.push(randomWallet());

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [admin.address, 'authorizeModerators', toBeModerators.map(x => x.address), true]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await admin.authorizeModerators(
                toBeModerators.map(x => x.address),
                true,
                signatures
            );
            await tx.wait();

            for (const moderator of toBeModerators) {
                await expect(tx).to
                    .emit(admin, 'ModeratorAuthorization')
                    .withArgs(moderator.address);
            }

            for (let i = 0; i < 5; ++i) {
                const isModerator = await admin.isModerator(toBeModerators[i].address);
                expect(isModerator).to.be.true;
            }
        });

        it('1.9.2. Authorize moderator unsuccessfully because of invalid signatures', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;            

            const toBeModerators = [];
            for (let i = 0; i < 5; ++i) toBeModerators.push(randomWallet());

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [admin.address, 'authorizeModerators', toBeModerators.map(x => x.address), true]
            );
            const invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(admin.authorizeModerators(
                toBeModerators.map(x => x.address),
                true,
                invalidSignatures
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('1.9.3. Authorize moderator unsuccessfully with authorized accounts on same tx', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;            

            const duplicateModerators = [];
            for (let i = 0; i < 5; ++i) duplicateModerators.push(randomWallet());
            duplicateModerators.push(duplicateModerators[0]);

            let message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [admin.address, 'authorizeModerators', duplicateModerators.map(x => x.address), true]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(admin.authorizeModerators(
                duplicateModerators.map(x => x.address),
                true,
                signatures
            )).to.be.revertedWithCustomError(admin, `AuthorizedAccount`)
                .withArgs(duplicateModerators[0].address);
        });

        it('1.9.4. Authorize moderator unsuccessfully with authorized account on different tx', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;            

            const toBeModerators = [];
            for (let i = 0; i < 5; ++i) toBeModerators.push(randomWallet());

            let message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [admin.address, 'authorizeModerators', toBeModerators.map(x => x.address), true]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            await callTransaction(admin.authorizeModerators(
                toBeModerators.map(x => x.address),
                true,
                signatures
            ));

            const moderators = [randomWallet(), toBeModerators[2], randomWallet()];

            message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [admin.address, 'authorizeModerators', moderators.map(x => x.address), true]
            );
            signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(admin.authorizeModerators(
                moderators.map(x => x.address),
                true,
                signatures
            )).to.be.revertedWithCustomError(admin, `AuthorizedAccount`)
                .withArgs(toBeModerators[2].address);
        })

        async function setupModerators(admin: Admin, admins: any[]): Promise<Wallet[]> {
            const moderators = [];
            for (let i = 0; i < 5; ++i) moderators.push(randomWallet());

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [admin.address, 'authorizeModerators', moderators.map(x => x.address), true]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await callTransaction(admin.authorizeModerators(
                moderators.map(x => x.address),
                true,
                signatures
            ));

            return moderators;
        }

        it('1.9.5. Deauthorize moderator successfully', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;            

            const moderators = await setupModerators(admin, admins);

            const toDeauth = moderators.slice(0, 2);
            const remainModerators = moderators.slice(2);

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [admin.address, 'authorizeModerators', toDeauth.map(x => x.address), false]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await admin.authorizeModerators(
                toDeauth.map(x => x.address),
                false,
                signatures
            );
            await tx.wait();

            for (const moderator of toDeauth) {
                await expect(tx).to
                    .emit(admin, 'ModeratorDeauthorization')
                    .withArgs(moderator.address);
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

        it('1.9.6. Deauthorize moderator unsuccessfully with unauthorized accounts', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;            

            const moderators = await setupModerators(admin, admins);

            const account = randomWallet();
            const toDeauth = [moderators[0], account];

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [admin.address, 'authorizeModerators', toDeauth.map(x => x.address), false]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(admin.authorizeModerators(
                toDeauth.map(x => x.address),
                false,
                signatures
            )).to.be.revertedWithCustomError(admin, `NotAuthorizedAccount`)
                .withArgs(account.address);
        });

        it('1.9.7. Deauthorize moderator unsuccessfully when unauthorizing same accounts twice on same tx', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;            

            const moderators = await setupModerators(admin, admins);

            const toDeauth = moderators.slice(0, 2).concat([moderators[0]]);

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [admin.address, 'authorizeModerators', toDeauth.map(x => x.address), false]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(admin.authorizeModerators(
                toDeauth.map(x => x.address),
                false,
                signatures
            )).to.be.revertedWithCustomError(admin, `NotAuthorizedAccount`)
                .withArgs(moderators[0].address);
        });

        it('1.9.8. Deauthorize moderator unsuccessfully when unauthorizing same accounts twice on different tx', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;            

            const moderators = await setupModerators(admin, admins);

            const tx1_accounts = moderators.slice(0, 2);
            await callAdmin_AuthorizeModerators(admin, admins, tx1_accounts.map(x => x.address), false, await admin.nonce());

            const tx2_accounts = [moderators[0]];
            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [admin.address, 'authorizeModerators', tx2_accounts.map(x => x.address), false]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(admin.authorizeModerators(
                tx2_accounts.map(x => x.address),
                false,
                signatures
            )).to.be.revertedWithCustomError(admin, `NotAuthorizedAccount`)
                .withArgs(moderators[0].address);
        });
    });

    describe('1.10. declareZones(bytes32[], bool, bytes[])', async () => {
        it('1.10.1. Declare zone successfully', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;            

            const zones = [
                ethers.utils.formatBytes32String("TestZone1"),
                ethers.utils.formatBytes32String("TestZone2"), 
                ethers.utils.formatBytes32String("TestZone3"),
                ethers.utils.formatBytes32String("TestZone4"),
                ethers.utils.formatBytes32String("TestZone5"),
            ];

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'bytes32[]', 'bool'],
                [admin.address, 'declareZones', zones, true]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());
            
            const tx = await admin.declareZones(
                zones,
                true,
                signatures
            );
            await tx.wait();
            
            for(const zone of zones) {
                await expect(tx).to
                    .emit(admin, 'ZoneAnnouncement')
                    .withArgs(zone);
            }

            for (let i = 0; i < zones.length; ++i) {
                const isZone = await admin.isZone(zones[i]);
                expect(isZone).to.be.true;
            }
        });

        it('1.10.2. Declare zone unsuccessfully with invalid signatures', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;            

            const zones = [
                ethers.utils.formatBytes32String("TestZone1"),
                ethers.utils.formatBytes32String("TestZone2"), 
                ethers.utils.formatBytes32String("TestZone3"),
                ethers.utils.formatBytes32String("TestZone4"),
                ethers.utils.formatBytes32String("TestZone5"),
            ];

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'bytes32[]', 'bool'],
                [admin.address, 'declareZones', zones, true]
            );
            const signatures = await getSignatures(message, admins, (await admin.nonce()).add(1));
            
            await expect(admin.declareZones(
                zones,
                true,
                signatures
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('1.10.3. Declare zone unsuccessfully with authorized zone on same tx', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;            

            const zones = [
                ethers.utils.formatBytes32String("TestZone1"),
                ethers.utils.formatBytes32String("TestZone2"), 
                ethers.utils.formatBytes32String("TestZone1"),
            ];

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'bytes32[]', 'bool'],
                [admin.address, 'declareZones', zones, true]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());
            
            await expect(admin.declareZones(
                zones,
                true,
                signatures
            )).to.be.revertedWithCustomError(admin, 'AuthorizedZone')
                .withArgs(ethers.utils.formatBytes32String("TestZone1"));
        });

        it('1.10.4. Declare zone unsuccessfully with authorized zone on different tx', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;            

            let zones = [
                ethers.utils.formatBytes32String("TestZone1"),
                ethers.utils.formatBytes32String("TestZone2"), 
                ethers.utils.formatBytes32String("TestZone3"),
            ];
            await callAdmin_DeclareZones(admin, admins, zones, true, await admin.nonce());

            zones = [
                ethers.utils.formatBytes32String("TestZone3"),
            ];
            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'bytes32[]', 'bool'],
                [admin.address, 'declareZones', zones, true]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(admin.declareZones(
                zones,
                true,
                signatures
            )).to.be.revertedWithCustomError(admin, 'AuthorizedZone')
                .withArgs(ethers.utils.formatBytes32String("TestZone3"));
        });

        async function setupZones(admins: any[], admin: Admin): Promise<string[]> {
            const announcedZones = [
                ethers.utils.formatBytes32String("TestZone1"),
                ethers.utils.formatBytes32String("TestZone2"), 
                ethers.utils.formatBytes32String("TestZone3"),
                ethers.utils.formatBytes32String("TestZone4"),
                ethers.utils.formatBytes32String("TestZone5"),
            ];
            await callAdmin_DeclareZones(admin, admins, announcedZones, true, await admin.nonce());
            return announcedZones;
        }
        
        it('1.10.5. Renounce zone successfully', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;            

            const announcedZones = await setupZones(admins, admin);

            const toRenounceZones = [
                ethers.utils.formatBytes32String("TestZone2"),
                ethers.utils.formatBytes32String("TestZone5"), 
            ];
            const remainingZones = announcedZones.filter(zone => !toRenounceZones.includes(zone));

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'bytes32[]', 'bool'],
                [admin.address, 'declareZones', toRenounceZones, false]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());
            
            const tx = await admin.declareZones(
                toRenounceZones,
                false,
                signatures
            );
            await tx.wait();
            
            for(const zone of toRenounceZones) {
                await expect(tx).to
                    .emit(admin, 'ZoneRenouncement')
                    .withArgs(zone);
            }

            for(const zone of toRenounceZones) {
                expect(await admin.isZone(zone)).to.be.false;
            }
            for(const zone of remainingZones) {
                expect(await admin.isZone(zone)).to.be.true;
            }
        });

        it('1.10.6. Renounce zone unsuccessfully with unauthorized zone', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;            

            await setupZones(admins, admin);

            const toRenounceZones = [
                ethers.utils.formatBytes32String("TestZone6"),
            ];
            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'bytes32[]', 'bool'],
                [admin.address, 'declareZones', toRenounceZones, false]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(admin.declareZones(
                toRenounceZones,
                false,
                signatures
            )).to.be.revertedWithCustomError(admin, 'NotAuthorizedZone')
                .withArgs(ethers.utils.formatBytes32String("TestZone6"));            
        });

        it('1.10.7. Renounce zone unsuccessfully when unauthorized same zone twice on same tx', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;            

            await setupZones(admins, admin);

            const toRenounceZones = [
                ethers.utils.formatBytes32String("TestZone2"),
                ethers.utils.formatBytes32String("TestZone3"),
                ethers.utils.formatBytes32String("TestZone2"),
            ];
            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'bytes32[]', 'bool'],
                [admin.address, 'declareZones', toRenounceZones, false]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());
            
            await expect(admin.declareZones(
                toRenounceZones,
                false,
                signatures
            )).to.be.revertedWithCustomError(admin, 'NotAuthorizedZone')
                .withArgs(ethers.utils.formatBytes32String("TestZone2"));            
        });

        it('1.10.8. Renounce zone unsuccessfully when unauthorized same zone twice on different tx', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;            

            await setupZones(admins, admin);

            const tx1_zones = [
                ethers.utils.formatBytes32String("TestZone2"),
                ethers.utils.formatBytes32String("TestZone3"),
            ];
            await callAdmin_DeclareZones(admin, admins, tx1_zones, false, await admin.nonce());
            
            const tx2_zones = [
                ethers.utils.formatBytes32String("TestZone2"),
            ];
            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'bytes32[]', 'bool'],
                [admin.address, 'declareZones', tx2_zones, false]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(admin.declareZones(
                tx2_zones,
                false,
                signatures
            )).to.be.revertedWithCustomError(admin, 'NotAuthorizedZone')
                .withArgs(ethers.utils.formatBytes32String("TestZone2"));
        });
    });

    describe('1.11. activateIn(bytes32, address[], bool, bytes[])', async () => {
        async function setupAccounts(admins: any[], admin: Admin): Promise<{
            zone1: string,
            zone2: string,
            accounts: Wallet[]
        }> {
            const zone1 = ethers.utils.formatBytes32String("TestZone1");
            const zone2 = ethers.utils.formatBytes32String("TestZone2");

            const accounts = [];
            for(let i = 0; i < 5; ++i) accounts.push(randomWallet());
            return { zone1, zone2, accounts };
        }

        async function setupActivateIn(admin: Admin, admins: any[], zone1: string, zone2: string, accounts: Wallet[]) {
            await callAdmin_ActivateIn(admin, admins, zone1, accounts.map(x => x.address), true, await admin.nonce());
            await callAdmin_ActivateIn(admin, admins, zone2, accounts.map(x => x.address), true, await admin.nonce());
        }

        it('1.11.1. Activate accounts in zone successfully', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;            

            const { zone1, zone2, accounts } = await setupAccounts(admins, admin);

            const zone1Accounts = [accounts[0], accounts[2], accounts[4]];
            const zone2Accounts = [accounts[0], accounts[1], accounts[3]];

            let message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'bytes32', 'address[]', 'bool'],
                [admin.address, 'activateIn', zone1, zone1Accounts.map(x => x.address), true]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            let tx = await admin.activateIn(zone1, zone1Accounts.map(x => x.address), true, signatures);
            await tx.wait();

            for(const account of zone1Accounts) {
                await expect(tx).to
                    .emit(admin, 'ZoneActivation')
                    .withArgs(zone1, account.address);
            }

            message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'bytes32', 'address[]', 'bool'],
                [admin.address, 'activateIn', zone2, zone2Accounts.map(x => x.address), true]
            );
            signatures = await getSignatures(message, admins, await admin.nonce());

            tx = await admin.activateIn(zone2, zone2Accounts.map(x => x.address), true, signatures);
            await tx.wait();

            for(const account of zone2Accounts) {
                await expect(tx).to
                    .emit(admin, 'ZoneActivation')
                    .withArgs(zone2, account.address);
            }

            for(const account of accounts) {
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

        it('1.11.2. Activate accounts in zone unsuccessfully with invalid signatures', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;            

            const { zone1, accounts } = await setupAccounts(admins, admin);

            const zone1Accounts = [accounts[0], accounts[1]];

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'bytes32', 'address[]', 'bool'],
                [admin.address, 'activateIn', zone1, zone1Accounts.map(x => x.address), true]
            );
            const signatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(
                admin.activateIn(zone1, zone1Accounts.map(x => x.address), true, signatures)
            ).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('1.11.3. Activate accounts in zone unsuccessfully with activated accounts on same tx', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;            

            const { zone1, accounts } = await setupAccounts(admins, admin);

            const zone1Accounts = [accounts[0], accounts[1], accounts[2], accounts[1]];

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'bytes32', 'address[]', 'bool'],
                [admin.address, 'activateIn', zone1, zone1Accounts.map(x => x.address), true]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(
                admin.activateIn(zone1, zone1Accounts.map(x => x.address), true, signatures)
            ).to.be.revertedWithCustomError(admin, 'Activated')
                .withArgs(accounts[1].address);
        });

        it('1.11.4. Activate accounts in zone unsuccessfully when activated accounts on different tx', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;            

            const { zone1, accounts } = await setupAccounts(admins, admin);

            const tx1_accounts = [accounts[0], accounts[1], accounts[2]];
            await callAdmin_ActivateIn(admin, admins, zone1, tx1_accounts.map(x => x.address), true, await admin.nonce());

            const tx2_accounts = [accounts[3], accounts[2]];

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'bytes32', 'address[]', 'bool'],
                [admin.address, 'activateIn', zone1, tx2_accounts.map(x => x.address), true]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(
                admin.activateIn(zone1, tx2_accounts.map(x => x.address), true, signatures)
            ).to.be.revertedWithCustomError(admin, 'Activated')
                .withArgs(accounts[2].address);
        });

        it('1.11.5. Deactivate accounts in zone successfully', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;            

            const { zone1, zone2, accounts } = await setupAccounts(admins, admin);

            await setupActivateIn(admin, admins, zone1, zone2, accounts);

            const zone1ToDeacivate = [accounts[0], accounts[2], accounts[4]];
            const zone1Remaining = accounts.filter(x => !zone1ToDeacivate.includes(x));

            let message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'bytes32', 'address[]', 'bool'],
                [admin.address, 'activateIn', zone1, zone1ToDeacivate.map(x => x.address), false]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());
            
            let tx = await admin.activateIn(zone1, zone1ToDeacivate.map(x => x.address), false, signatures);
            await tx.wait();

            for(const account of zone1ToDeacivate) {
                await expect(tx).to
                    .emit(admin, 'ZoneDeactivation')
                    .withArgs(zone1, account.address);
            }

            const zone2ToDeacivate = [accounts[0], accounts[1], accounts[3]];
            const zone2Remaining = accounts.filter(x => !zone2ToDeacivate.includes(x));

            message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'bytes32', 'address[]', 'bool'],
                [admin.address, 'activateIn', zone2, zone2ToDeacivate.map(x => x.address), false]
            );
            signatures = await getSignatures(message, admins, await admin.nonce());
            
            tx = await admin.activateIn(zone2, zone2ToDeacivate.map(x => x.address), false, signatures);
            await tx.wait();

            for(const account of zone2ToDeacivate) {
                await expect(tx).to
                    .emit(admin, 'ZoneDeactivation')
                    .withArgs(zone2, account.address);
            }

            for(const account of accounts) {
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

        it('1.11.6. Deactivate accounts in zone unsuccessfully with inactive accounts', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;            

            const { zone1, zone2, accounts } = await setupAccounts(admins, admin);

            await setupActivateIn(admin, admins, zone1, zone2, accounts);

            const newAccount = randomWallet();
            const zone1ToDeacivate = [accounts[0], accounts[2], newAccount];

            let message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'bytes32', 'address[]', 'bool'],
                [admin.address, 'activateIn', zone1, zone1ToDeacivate.map(x => x.address), false]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(
                admin.activateIn(zone1, zone1ToDeacivate.map(x => x.address), false, signatures)
            ).to.be.revertedWithCustomError(admin, 'NotActivated')
                .withArgs(newAccount.address);
        });

        it('1.11.7. Deactivate accounts in zone unsuccessfully with deactivated accounts on same tx', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;            

            const { zone1, zone2, accounts } = await setupAccounts(admins, admin);

            await setupActivateIn(admin, admins, zone1, zone2, accounts);

            const zone1ToDeacivate = [accounts[0], accounts[1], accounts[2], accounts[0]];
            
            let message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'bytes32', 'address[]', 'bool'],
                [admin.address, 'activateIn', zone1, zone1ToDeacivate.map(x => x.address), false]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());
            
            await expect(
                admin.activateIn(zone1, zone1ToDeacivate.map(x => x.address), false, signatures)
            ).to.be.revertedWithCustomError(admin, 'NotActivated')
                .withArgs(accounts[0].address);
        });

        it('1.11.8. Deactivate accounts in zone unsuccessfully when deactivated accounts on different tx', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;            

            const { zone1, zone2, accounts } = await setupAccounts(admins, admin);

            await setupActivateIn(admin, admins, zone1, zone2, accounts);

            let tx1_accounts = [accounts[0], accounts[1], accounts[2]];
            await callAdmin_ActivateIn(admin, admins, zone1, tx1_accounts.map(x => x.address), false, await admin.nonce());

            let tx2_accounts = [accounts[3], accounts[2]];

            let message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'bytes32', 'address[]', 'bool'],
                [admin.address, 'activateIn', zone1, tx2_accounts.map(x => x.address), false]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());
            
            await expect(
                admin.activateIn(zone1, tx2_accounts.map(x => x.address), false, signatures)
            ).to.be.revertedWithCustomError(admin, 'NotActivated')
                .withArgs(accounts[2].address);
        });
    });

    describe('1.12. getZoneEligibility(bytes32, address)', async () => {
        it('1.12.1. Return correct zone eligibility', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;            

            const account1 = randomWallet();
            const zone1 = ethers.utils.formatBytes32String("TestZone1");
            await callAdmin_DeclareZones(admin, admins, [zone1], true, await admin.nonce());
            await callAdmin_ActivateIn(admin, admins, zone1, [account1.address], true, await admin.nonce());
            expect(await admin.getZoneEligibility(zone1, account1.address)).to.be.true;

            const account2 = randomWallet();
            const zone2 = ethers.utils.formatBytes32String("TestZone2");
            await callAdmin_DeclareZones(admin, admins, [zone2], true, await admin.nonce());
            expect(await admin.getZoneEligibility(zone2, account2.address)).to.be.false;

            const account3 = randomWallet();
            const zone3 = ethers.utils.formatBytes32String("TestZone3");
            await callAdmin_ActivateIn(admin, admins, zone3, [account3.address], true, await admin.nonce());
            expect(await admin.getZoneEligibility(zone3, account3.address)).to.be.false;

            const account4 = randomWallet();
            const zone4 = ethers.utils.formatBytes32String("TestZone4");
            expect(await admin.getZoneEligibility(zone4, account4.address)).to.be.false;
        });
    });

    describe('1.13. updateCurrencyRegistries(address[], bool[], bool[], uint256[], uint256[], bytes[])', async () => {
        it('1.13.1. Update currency registry successfully', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;            

            const currencyAddresses = [];
            for (let i = 0; i < 5; ++i) currencyAddresses.push(ethers.utils.computeAddress(ethers.utils.id(`currency_${i}`)));
            const isAvailable = [true, false, true, false, true];
            const isExclusive = [false, false, true, true, false];

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool[]', 'bool[]'],
                [admin.address, 'updateCurrencyRegistries', currencyAddresses, isAvailable, isExclusive]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await admin.updateCurrencyRegistries(
                currencyAddresses,
                isAvailable,
                isExclusive,
                signatures
            );
            await tx.wait();

            for (let i = 0; i < currencyAddresses.length; i++) {
                await expect(tx).to
                    .emit(admin, 'CurrencyRegistryUpdate')
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

        it('1.13.2. Update currency registry successfully with multiple records of same currency', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;            

            const address = ethers.utils.computeAddress(ethers.utils.id(`currency`));
            const currencyAddresses = [address, address];

            const isAvailable = [false, false];
            const isExclusive = [true, true];

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool[]', 'bool[]'],
                [admin.address, 'updateCurrencyRegistries', currencyAddresses, isAvailable, isExclusive]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await admin.updateCurrencyRegistries(
                currencyAddresses,
                isAvailable,
                isExclusive,
                signatures
            );
            await tx.wait();

            for (let i = 0; i < currencyAddresses.length; i++) {
                await expect(tx).to
                    .emit(admin, 'CurrencyRegistryUpdate')
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

        it('1.13.3. Update currency registries unsuccesfully with incorrect signatures', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;            

            const currencyAddresses = [];
            for (let i = 0; i < 5; ++i) currencyAddresses.push(ethers.utils.computeAddress(ethers.utils.id(`currency_${i}`)));
            const isAvailable = [true, false, true, false, true];
            const isExclusive = [false, false, true, true, false];

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool[]', 'bool[]'],
                [admin.address, 'updateCurrencyRegistries', currencyAddresses, isAvailable, isExclusive]
            );
            const invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(admin.updateCurrencyRegistries(
                currencyAddresses,
                isAvailable,
                isExclusive,
                invalidSignatures
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('1.13.4. Update currency registries unsuccesfully with conflict arrays', async () => {
            const fixture = await setupBeforeTest();
            const { admins, admin } = fixture;            

            async function testForInvalidInput(currencyAddresses: string[], isAvailable: boolean[], isExclusive: boolean[]) {
                let message = ethers.utils.defaultAbiCoder.encode(
                    ['address', 'string', 'address[]', 'bool[]', 'bool[]'],
                    [admin.address, 'updateCurrencyRegistries', currencyAddresses, isAvailable, isExclusive]
                );
                let signatures = await getSignatures(message, admins, await admin.nonce());

                await expect(admin.updateCurrencyRegistries(
                    currencyAddresses,
                    isAvailable,
                    isExclusive,
                    signatures
                )).to.be.revertedWithCustomError(admin, 'InvalidInput');
            }

            const currencyAddresses = [];
            for (let i = 0; i < 5; ++i) currencyAddresses.push(ethers.utils.computeAddress(ethers.utils.id(`currency_${i}`)));
            const isAvailable = [true, false, true, false, true];
            const isExclusive = [false, false, true, true, false];

            await testForInvalidInput(currencyAddresses.slice(0, 4), isAvailable, isExclusive);
            await testForInvalidInput(currencyAddresses, isAvailable.slice(0, 4), isExclusive);
            await testForInvalidInput(currencyAddresses, isAvailable, isExclusive.slice(0, 4));
        });
    });
});
