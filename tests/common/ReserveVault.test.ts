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
    ReserveVault,
    ProxyCaller__factory,
    ProxyCaller,
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
import { deployProxyCaller } from '@utils/deployments/mocks/proxyCaller';
import { deployReserveVault } from '@utils/deployments/common/reserveVault';
import { callReserveVault_AuthorizeInitiator, callReserveVault_Pause } from '@utils/callWithSignatures/reserveVault';

interface ReserveVaultFixture {
    admin: Admin;
    reserveVault: ReserveVault;
    initiator1: ProxyCaller;
    initiator2: ProxyCaller;
    initiator3: ProxyCaller;
    initiators: ProxyCaller[];

    deployer: any;
    admins: any[];
    funder1: any;
    funder2: any;
    withdrawer1: any;
    withdrawer2: any;
}

describe('20. ReserveVault', async () => {
    async function reserveVaultFixture(): Promise<ReserveVaultFixture> {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        const admins = [];
        for (let i = 1; i <= Constant.ADMIN_NUMBER; ++i) admins.push(accounts[i]);
        const funder1 = accounts[Constant.ADMIN_NUMBER + 1];
        const funder2 = accounts[Constant.ADMIN_NUMBER + 2];
        const withdrawer1 = accounts[Constant.ADMIN_NUMBER + 3];
        const withdrawer2 = accounts[Constant.ADMIN_NUMBER + 4];
        
        const adminAddresses: string[] = admins.map(signer => signer.address);
        const admin = await deployAdmin(
            deployer.address,
            adminAddresses[0],
            adminAddresses[1],
            adminAddresses[2],
            adminAddresses[3],
            adminAddresses[4],
        ) as Admin;

        const initiator1 = await deployProxyCaller(deployer.address) as ProxyCaller;
        const initiator2 = await deployProxyCaller(deployer.address) as ProxyCaller;
        const initiator3 = await deployProxyCaller(deployer.address) as ProxyCaller;
        const initiators = [initiator1, initiator2, initiator3];

        const reserveVault = await deployReserveVault(
            deployer.address,
            admin.address,
        ) as ReserveVault;

        return {
            admin,
            reserveVault,
            initiator1,
            initiator2,
            initiator3,
            initiators,
            deployer,
            admins,
            funder1,
            funder2,
            withdrawer1,
            withdrawer2,
        };
    };

    async function beforeReserveVaultTest({
        authorizeInitiators = false,
        pause = false,
    } = {}): Promise<ReserveVaultFixture> {
        const fixture = await loadFixture(reserveVaultFixture);
        const { admin, admins, reserveVault, initiators } = fixture;

        if (authorizeInitiators) {
            await callReserveVault_AuthorizeInitiator(
                reserveVault,
                admins,
                initiators.map(x => x.address),
                true,
                await admin.nonce(),
            )
        }

        if (pause) {
            await callReserveVault_Pause(
                reserveVault,
                admins,
                await admin.nonce(),
            )
        }

        return {
            ...fixture,
        }
    }

    describe('20.1. initialize(address, address, address)', async () => {
        it('20.1.1. Deploy successfully', async () => {
            const { admin, reserveVault } = await beforeReserveVaultTest();

            expect(await reserveVault.admin()).to.equal(admin.address);

            expect(await reserveVault.fundNumber()).to.equal(0);
        });
    });

    describe('20.2. authorizeInitiator(address[], bool, bytes[])', async () => {
        it('20.2.1. Authorize initiators successfully with valid signatures', async () => {
            const { reserveVault, admin, admins, initiators } = await beforeReserveVaultTest();

            const toBeInitiators = initiators.slice(0, 2);

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [reserveVault.address, 'authorizeInitiator', toBeInitiators.map(x => x.address), true]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await reserveVault.authorizeInitiator(
                toBeInitiators.map(x => x.address),
                true,
                signatures
            );
            await tx.wait();

            for (const initiator of toBeInitiators) {
                await expect(tx).to
                    .emit(reserveVault, 'InitiatorAuthorization')
                    .withArgs(initiator.address);
            }

            for (const initiator of initiators) {
                const isInitiator = await reserveVault.isInitiator(initiator.address);
                if (toBeInitiators.includes(initiator)) {
                    expect(isInitiator).to.be.true;
                } else {
                    expect(isInitiator).to.be.false;
                }
            }
        });

        it('20.2.2. Authorize initiator unsuccessfully with invalid signatures', async () => {
            const { reserveVault, admin, admins, initiators } = await beforeReserveVaultTest();

            const toBeInitiators = initiators.slice(0, 2);

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [reserveVault.address, 'authorizeInitiator', toBeInitiators.map(x => x.address), true]
            );
            const invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(reserveVault.authorizeInitiator(
                toBeInitiators.map(x => x.address),
                true,
                invalidSignatures
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('20.2.3. Authorize initiator unsuccessfully when authorizing same account twice on same tx', async () => {
            const { reserveVault, admin, admins, initiators } = await beforeReserveVaultTest();

            const toBeInitiators = [initiators[0], initiators[1], initiators[2], initiators[0]];

            let message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [reserveVault.address, 'authorizeInitiator', toBeInitiators.map(x => x.address), true]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(reserveVault.authorizeInitiator(
                toBeInitiators.map(x => x.address),
                true,
                signatures
            )).to.be.revertedWithCustomError(reserveVault, `AuthorizedAccount`)
                .withArgs(initiators[0].address);
        });

        it('20.2.4. Authorize initiator unsuccessfully when authorizing same account twice on different tx', async () => {
            const { reserveVault, admin, admins, initiators } = await beforeReserveVaultTest();

            const tx1Initiators = initiators.slice(0, 2);

            let message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [reserveVault.address, 'authorizeInitiator', tx1Initiators.map(x => x.address), true]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            await callTransaction(reserveVault.authorizeInitiator(
                tx1Initiators.map(x => x.address),
                true,
                signatures
            ));

            const tx2Initiators = [initiators[2], initiators[1]];

            message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [reserveVault.address, 'authorizeInitiator', tx2Initiators.map(x => x.address), true]
            );
            signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(reserveVault.authorizeInitiator(
                tx2Initiators.map(x => x.address),
                true,
                signatures
            )).to.be.revertedWithCustomError(reserveVault, `AuthorizedAccount`)
                .withArgs(initiators[1].address);
        })

        it('20.2.5. Deauthorize initiator successfully', async () => {
            const { reserveVault, admin, admins, initiators } = await beforeReserveVaultTest({
                authorizeInitiators: true,
            });

            const toDeauth = initiators.slice(0, 2);

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [reserveVault.address, 'authorizeInitiator', toDeauth.map(x => x.address), false]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await reserveVault.authorizeInitiator(
                toDeauth.map(x => x.address),
                false,
                signatures
            );
            await tx.wait();

            for (const initiator of toDeauth) {
                await expect(tx).to
                    .emit(reserveVault, 'InitiatorDeauthorization')
                    .withArgs(initiator.address);
            }

            for (const initiator of initiators) {
                const isInitiator = await reserveVault.isInitiator(initiator.address);
                if (toDeauth.includes(initiator)) {
                    expect(isInitiator).to.be.false;
                } else {
                    expect(isInitiator).to.be.true;
                }
            }            
        });

        it('20.2.6. Deauthorize initiator unsuccessfully with unauthorized account', async () => {
            const { reserveVault, admin, admins, initiators } = await beforeReserveVaultTest({
                authorizeInitiators: true,
            });

            const account = randomWallet();
            const toDeauth = [initiators[0], account];

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [reserveVault.address, 'authorizeInitiator', toDeauth.map(x => x.address), false]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(reserveVault.authorizeInitiator(
                toDeauth.map(x => x.address),
                false,
                signatures
            )).to.be.revertedWithCustomError(reserveVault, `NotAuthorizedAccount`)
                .withArgs(account.address);
        });

        it('20.2.7. Deauthorize initiator unsuccessfully when unauthorizing same accounts twice on same tx', async () => {
            const { reserveVault, admin, admins, initiators } = await beforeReserveVaultTest({
                authorizeInitiators: true,
            });

            const toDeauth = [initiators[0], initiators[1], initiators[0]];

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [reserveVault.address, 'authorizeInitiator', toDeauth.map(x => x.address), false]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(reserveVault.authorizeInitiator(
                toDeauth.map(x => x.address),
                false,
                signatures
            )).to.be.revertedWithCustomError(reserveVault, `NotAuthorizedAccount`)
                .withArgs(initiators[0].address);
        });

        it('20.2.8. Deauthorize initiator unsuccessfully when unauthorizing same accounts twice on different tx', async () => {
            const { reserveVault, admin, admins, initiators } = await beforeReserveVaultTest({
                authorizeInitiators: true,
            });

            const tx1Initiators = [initiators[0], initiators[1]];

            await callReserveVault_AuthorizeInitiator(
                reserveVault,
                admins,
                tx1Initiators.map(x => x.address),
                false,
                await admin.nonce()
            );

            const tx2Initiators = [initiators[2], initiators[1]];

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [reserveVault.address, 'authorizeInitiator', tx2Initiators.map(x => x.address), false]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(reserveVault.authorizeInitiator(
                tx2Initiators.map(x => x.address),
                false,
                signatures
            )).to.be.revertedWithCustomError(reserveVault, `NotAuthorizedAccount`)
                .withArgs(initiators[1].address);
        });
    });

    describe('20.3. initiateFund(address, uint256, address[], uint256[])', async () => {
        it('20.3.1. initiate fund successfully', async () => {

        });

        it('20.3.2. initiate fund unsuccessfully when paused', async () => {
        });

        it('20.3.3. initiate fund unsuccessfully by unauthorized account', async () => {
        });

        it('20.3.4. initiate fund unsuccessfully with invalid params length', async () => {

        });

        it('20.3.5. initiate fund unsuccessfully with invalid main currency', async () => {

        });

        it('20.3.6. initiate fund unsuccessfully with invalid sub currencies', async () => {

        });
    });

    describe('20.4. provideFund(uint256)', async () => {
    });

    describe('20.5. safeProvideFund(uint256, uint256)', async () => {
    });

    describe('20.6. withdrawFund(uint256, address, uint256)', async () => {
    });

    describe('20.7. safeWithdrawFund(uint256, address, uint256, uint256)', async () => {
    });
});
