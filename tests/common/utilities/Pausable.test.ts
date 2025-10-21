import { expect } from 'chai';
import { ethers } from 'hardhat';

// @nomicfoundation/hardhat-network-helpers
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

// @typechain-types
import { Admin, Pausable } from '@typechain-types';

// @utils
import { callTransaction } from '@utils/blockchain';

// @utils/deployments/common
import { deployAdmin } from '@utils/deployments/common/admin';

// @utils/deployments/mock
import { deployMockPausable } from '@utils/deployments/mock/common/mockPausable';

// @utils/models/common
import { PauseParams, UnpauseParams } from '@utils/models/common/pausable';

// @utils/signatures/common
import { getPauseSignatures, getUnpauseSignatures } from '@utils/signatures/common/pausable';

// @utils/transaction/common
import {
    getPausableTx_Pause,
    getPausableTxByInput_Pause,
    getPausableTx_Unpause,
    getPausableTxByInput_Unpause,
} from '@utils/transaction/common/pausable';

interface PausableFixture {
    deployer: any;
    admins: any[];

    admin: Admin;
    pausable: Pausable;
}

describe('1.a. Pausable', async () => {
    async function pausableFixture(): Promise<PausableFixture> {
        const [deployer, admin1, admin2, admin3, admin4, admin5] = await ethers.getSigners();
        const admins = [admin1, admin2, admin3, admin4, admin5];

        const adminAddresses: string[] = admins.map((signer) => signer.address);
        const admin = (await deployAdmin(
            deployer.address,
            adminAddresses[0],
            adminAddresses[1],
            adminAddresses[2],
            adminAddresses[3],
            adminAddresses[4]
        )) as Admin;

        const pausable = (await deployMockPausable(deployer.address, admin.address)) as Pausable;

        return {
            deployer,
            admins,
            admin,
            pausable,
        };
    }

    async function beforePausableTest({ pause = false } = {}): Promise<PausableFixture> {
        const fixture = await loadFixture(pausableFixture);
        const { deployer, admin, admins, pausable } = fixture;

        if (pause) {
            await callTransaction(getPausableTxByInput_Pause(pausable, deployer, admin, admins));
        }

        return fixture;
    }

    /* --- Administration --- */
    describe('1.a.1. pause(bytes[])', async () => {
        it('1.a.1.1. Pause successfully with valid signatures', async () => {
            const { deployer, admins, admin, pausable } = await beforePausableTest();

            const tx = await getPausableTxByInput_Pause(pausable, deployer, admin, admins);
            await tx.wait();

            expect(await pausable.paused()).to.equal(true);

            await expect(tx).to.emit(pausable, 'Paused').withArgs(deployer.address);
        });

        it('1.a.1.2. Pause unsuccessfully with invalid signatures', async () => {
            const { deployer, admins, admin, pausable } = await beforePausableTest();

            const params: PauseParams = {
                signatures: await getPauseSignatures(pausable, admin, admins, false),
            };
            await expect(getPausableTx_Pause(pausable, deployer, params)).to.be.revertedWithCustomError(
                admin,
                'FailedVerification'
            );
        });

        it('1.a.1.3. Pause unsuccessfully when the contract has already been paused', async () => {
            const { deployer, admins, admin, pausable } = await beforePausableTest({
                pause: true,
            });

            await expect(getPausableTxByInput_Pause(pausable, deployer, admin, admins)).to.be.revertedWith(
                'Pausable: paused'
            );
        });
    });

    describe('1.a.2. unpause(bytes[])', async () => {
        it('1.a.2.1. Unpause successfully with valid signatures', async () => {
            const { deployer, admins, admin, pausable } = await beforePausableTest({
                pause: true,
            });

            const tx = await getPausableTxByInput_Unpause(pausable, deployer, admin, admins);
            await tx.wait();

            await expect(tx).to.emit(pausable, 'Unpaused').withArgs(deployer.address);
        });

        it('1.a.2.2. Unpause unsuccessfully with invalid signatures', async () => {
            const { deployer, admins, admin, pausable } = await beforePausableTest({
                pause: true,
            });

            const params: UnpauseParams = {
                signatures: await getUnpauseSignatures(pausable, admin, admins, false),
            };
            await expect(getPausableTx_Unpause(pausable, deployer, params)).to.be.revertedWithCustomError(
                admin,
                'FailedVerification'
            );
        });

        it('1.a.2.3. Unpause unsuccessfully when not paused', async () => {
            const { deployer, admins, admin, pausable } = await beforePausableTest({
                pause: true,
            });

            await callTransaction(getPausableTxByInput_Unpause(pausable, deployer, admin, admins));

            await expect(getPausableTxByInput_Unpause(pausable, deployer, admin, admins)).to.be.revertedWith(
                'Pausable: not paused'
            );
        });
    });
});
