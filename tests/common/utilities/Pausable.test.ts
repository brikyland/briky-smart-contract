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

interface PausableFixture {
    admin: Admin;
    pausable: Pausable;

    deployer: SignerWithAddress;
    admins: any[];
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
            admin,
            pausable,
            deployer,
            admins,
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
            const { deployer, admin, admins, pausable } = await beforePausableTest({});
            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string"],
                [pausable.address, "pause"]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await pausable.pause(signatures);
            await tx.wait();

            expect(await pausable.paused()).to.equal(true);

            await expect(tx).to
                .emit(pausable, 'Paused')
                .withArgs(deployer.address);
        });

        it('1.a.1.2. Pause unsuccessfully with invalid signatures', async () => {
            const { admin, admins, pausable } = await beforePausableTest({});
            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string"],
                [pausable.address, "pause"]
            );
            let invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(pausable.pause(invalidSignatures)).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('1.a.1.3. Pause unsuccessfully when already paused', async () => {
            const { admin, admins, pausable } = await beforePausableTest({});
            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string"],
                [pausable.address, "pause"]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            await callTransaction(pausable.pause(signatures));

            signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(pausable.pause(signatures)).to.be.revertedWith('Pausable: paused');
        });
    });

    describe('1.a.2. unpause(bytes[])', async () => {
        it('1.a.2.1. Unpause successfully with valid signatures', async () => {
            const { deployer, admin, admins, pausable } = await beforePausableTest({
                pause: true,
            });
            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string"],
                [pausable.address, "unpause"]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await pausable.unpause(signatures);
            await tx.wait();

            await expect(tx).to
                .emit(pausable, 'Unpaused')
                .withArgs(deployer.address);
        });

        it('1.a.2.2. Unpause unsuccessfully with invalid signatures', async () => {
            const { admin, admins, pausable } = await beforePausableTest({
                pause: true,
            });
            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string"],
                [pausable.address, "unpause"]
            );
            const invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(pausable.unpause(invalidSignatures)).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('1.a.2.3. Unpause unsuccessfully when not paused', async () => {
            const { admin, admins, pausable } = await beforePausableTest({
                pause: true,
            });
            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string"],
                [pausable.address, "unpause"]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            await callTransaction(pausable.unpause(signatures));

            signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(pausable.unpause(signatures)).to.be.revertedWith('Pausable: not paused');
        });
    });
});
