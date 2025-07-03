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
    IERC4906Upgradeable__factory,
    IERC721Upgradeable__factory,
    IRoyaltyRateProposer__factory,
    ICommon__factory,
    IERC721MetadataUpgradeable__factory,
    Pausable,
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
    callAdmin_AuthorizeManagers,
    callAdmin_AuthorizeModerators,
} from '@utils/callWithSignatures/admin';
import { BigNumber } from 'ethers';
import { randomInt } from 'crypto';
import { getBytes4Hex, getInterfaceID, randomBigNumber } from '@utils/utils';
import { OrderedMap } from '@utils/utils';
import { Initialization as LandInitialization } from '@tests/land/test.initialization';
import { callCommissionToken_Pause } from '@utils/callWithSignatures/commissionToken';
import { deployMockPausable } from '@utils/deployments/mocks/mockPausable';

interface PausableFixture {
    admin: Admin;
    pausable: Pausable;

    deployer: any;
    admins: any[];
}

describe('19. Pausable', async () => {
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

    describe('19.1. pause(bytes[])', async () => {
        it('19.1.1. pause successfully with valid signatures', async () => {
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

        it('19.1.2. pause unsuccessfully with invalid signatures', async () => {
            const { admin, admins, pausable } = await beforePausableTest({});
            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string"],
                [pausable.address, "pause"]
            );
            let invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(pausable.pause(invalidSignatures)).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('19.1.3. pause unsuccessfully when already paused', async () => {
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

    describe('19.2. unpause(bytes[])', async () => {
        it('19.2.1. unpause successfully with valid signatures', async () => {
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

        it('19.2.2. unpause unsuccessfully with invalid signatures', async () => {
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

        it('19.2.3. unpause unsuccessfully when not paused', async () => {
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
