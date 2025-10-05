import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
    Admin,
    Pausable,
} from '@typechain-types';
import { callTransaction, getSignatures } from '@utils/blockchain';
import { Constant } from '@tests/test.constant';
import { deployAdmin } from '@utils/deployments/common/admin';
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { deployMockPausable } from '@utils/deployments/mock/mockPausable';
import { getPauseTx, getPauseTxByInput, getUnpauseTx, getUnpauseTxByInput } from '@utils/transaction/common/pausable';
import { getPauseSignatures, getUnpauseSignatures } from '@utils/signatures/common/pausable';
import { PauseParams, UnpauseParams } from '@utils/models/common/pausable';

interface PausableFixture {
    deployer: any;
    admins: any[];

    admin: Admin;
    pausable: Pausable;
}

describe('1.a. Pausable', async () => {
    async function pausableFixture(): Promise<PausableFixture> {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        const admins = [];
        for (let i = 1; i <= Constant.ADMIN_NUMBER; ++i) admins.push(accounts[i]);
  
        const adminAddresses: string[] = admins.map(signer => signer.address);
        const admin = await deployAdmin(
            deployer.address,
            adminAddresses[0],
            adminAddresses[1],
            adminAddresses[2],
            adminAddresses[3],
            adminAddresses[4],
        ) as Admin;

        const pausable = await deployMockPausable(
            deployer.address,
            admin.address
        ) as Pausable;

        return {
            deployer,
            admins,
            admin,
            pausable,
        };
    };

    async function beforePausableTest({
        pause = false,
    } = {}): Promise<PausableFixture> {
        const fixture = await loadFixture(pausableFixture);
        const { admin, admins, pausable } = fixture;

        if (pause) {
            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string"],
                [pausable.address, "pause"]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            await callTransaction(pausable.pause(signatures));
        }

        return fixture;
    }

    describe('1.a.1. pause(bytes[])', async () => {
        it('1.a.1.1. Pause successfully with valid signatures', async () => {
            const { deployer, admins, admin, pausable } = await beforePausableTest();

            const tx = await getPauseTxByInput(pausable, deployer, admin, admins);
            await tx.wait();

            expect(await pausable.paused()).to.equal(true);

            await expect(tx).to
                .emit(pausable, 'Paused')
                .withArgs(deployer.address);
        });

        it('1.a.1.2. Pause unsuccessfully with invalid signatures', async () => {
            const { deployer, admins, admin, pausable } = await beforePausableTest();
            
            const params: PauseParams = {
                signatures: await getPauseSignatures(pausable, admin, admins, false)
            };
            await expect(getPauseTx(pausable, deployer, params))
                .to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('1.a.1.3. Pause unsuccessfully when already paused', async () => {
            const { deployer, admins, admin, pausable } = await beforePausableTest({
                pause: true,
            });

            await expect(getPauseTxByInput(pausable, deployer, admin, admins))
                .to.be.revertedWith('Pausable: paused');
        });
    });

    describe('1.a.2. unpause(bytes[])', async () => {
        it('1.a.2.1. Unpause successfully with valid signatures', async () => {
            const { deployer, admins, admin, pausable } = await beforePausableTest({
                pause: true,
            });

            const tx = await getUnpauseTxByInput(pausable, deployer, admin, admins);
            await tx.wait();

            await expect(tx).to
                .emit(pausable, 'Unpaused')
                .withArgs(deployer.address);
        });

        it('1.a.2.2. Unpause unsuccessfully with invalid signatures', async () => {
            const { deployer, admins, admin, pausable } = await beforePausableTest({
                pause: true,
            });

            const params: UnpauseParams = {
                signatures: await getUnpauseSignatures(pausable, admin, admins, false)
            };
            await expect(getUnpauseTx(pausable, deployer, params))
                .to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('1.a.2.3. Unpause unsuccessfully when not paused', async () => {
            const { deployer, admins, admin, pausable } = await beforePausableTest({
                pause: true,
            });

            await callTransaction(getUnpauseTxByInput(pausable, deployer, admin, admins));

            await expect(getUnpauseTxByInput(pausable, deployer, admin, admins))
                .to.be.revertedWith('Pausable: not paused');
        });
    });
});
