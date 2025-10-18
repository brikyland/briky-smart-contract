import { expect } from 'chai';
import { BigNumberish } from 'ethers';
import { ethers } from 'hardhat';

// @nomicfoundation/hardhat-network-helpers
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

// @tests/liquidity
import { Initialization as LiquidityInitialization } from '@tests/liquidity/test.initialization';

// @typechain-types
import { Admin, Currency, Distributor, PrimaryToken, Treasury } from '@typechain-types';

// @utils
import { callTransaction } from '@utils/blockchain';

// @utils/deployments/common
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployCurrency } from '@utils/deployments/common/currency';

// @utils/deployments/liquidity
import { deployDistributor } from '@utils/deployments/liquidity/distributor';
import { deployPrimaryToken } from '@utils/deployments/liquidity/primaryToken';
import { deployTreasury } from '@utils/deployments/liquidity/treasury';

// @utils/models/liquidity
import { DistributeTokenParams, DistributeTokenParamsInput } from '@utils/models/liquidity/distributor';

// @utils/signatures/liquidity
import { getDistributeTokenSignatures } from '@utils/signatures/liquidity/distributor';

// @utils/transaction/liquidity
import {
    getDistributorTx_DistributeToken,
    getDistributorTxByInput_DistributeToken,
} from '@utils/transaction/liquidity/distributor';
import { getPrimaryTokenTxByInput_UnlockForCoreTeam } from '@utils/transaction/liquidity/primaryToken';

interface DistributorFixture {
    deployer: any;
    admins: any[];
    receiver1: any;
    receiver2: any;
    receiver3: any;

    admin: Admin;
    currency: Currency;
    treasury: Treasury;
    primaryToken: PrimaryToken;
    distributor: Distributor;
}

describe('4.2. Distributor', async () => {
    async function distributorFixture(): Promise<DistributorFixture> {
        const [deployer, admin1, admin2, admin3, admin4, admin5, receiver1, receiver2, receiver3] =
            await ethers.getSigners();
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

        const currency = (await deployCurrency(deployer.address, 'MockCurrency', 'MCK')) as Currency;

        const primaryToken = (await deployPrimaryToken(
            deployer,
            admin.address,
            LiquidityInitialization.PRIMARY_TOKEN_Name,
            LiquidityInitialization.PRIMARY_TOKEN_Symbol,
            LiquidityInitialization.PRIMARY_TOKEN_LiquidationUnlockedAt
        )) as PrimaryToken;

        const treasury = (await deployTreasury(
            deployer,
            admin.address,
            currency.address,
            primaryToken.address
        )) as Treasury;

        const distributor = (await deployDistributor(
            deployer,
            admin.address,
            primaryToken.address,
            treasury.address
        )) as Distributor;

        return {
            deployer,
            admins,
            admin,
            treasury,
            currency,
            primaryToken,
            distributor,
            receiver1,
            receiver2,
            receiver3,
        };
    }

    async function setupBeforeTest(): Promise<DistributorFixture> {
        const fixture = await loadFixture(distributorFixture);
        const { deployer, admin, admins, primaryToken, distributor } = fixture;

        await callTransaction(
            getPrimaryTokenTxByInput_UnlockForCoreTeam(
                primaryToken,
                deployer,
                {
                    distributor: distributor.address,
                },
                admin,
                admins
            )
        );

        return fixture;
    }

    /* --- Initialization --- */
    describe('4.2.1. initialize(address,address,address)', async () => {
        it('4.2.1.1. Deploy successfully', async () => {
            const fixture = await setupBeforeTest();
            const { admin, distributor, primaryToken, treasury } = fixture;

            expect(await distributor.admin()).to.equal(admin.address);
            expect(await distributor.primaryToken()).to.equal(primaryToken.address);
            expect(await distributor.treasury()).to.equal(treasury.address);
        });
    });

    /* --- Administration --- */
    describe('4.2.2. distributeToken(address[],uint256[],string,bytes[])', async () => {
        it('4.2.2.1. Distribute tokens successfully', async () => {
            const fixture = await setupBeforeTest();
            const { admin, admins, deployer, distributor, primaryToken, receiver1, receiver2, receiver3 } = fixture;

            const receivers = [receiver1.address, receiver2.address, receiver3.address];
            const amounts = [
                ethers.utils.parseEther('100'),
                ethers.utils.parseEther('200'),
                ethers.utils.parseEther('300'),
            ];
            const note = 'Testing Data';

            const paramsInput: DistributeTokenParamsInput = {
                receivers,
                amounts,
                note,
            };
            const initDistributorBalance = await primaryToken.balanceOf(distributor.address);
            const initReceiver1Balance = await primaryToken.balanceOf(receiver1.address);
            const initReceiver2Balance = await primaryToken.balanceOf(receiver2.address);
            const initReceiver3Balance = await primaryToken.balanceOf(receiver3.address);

            const tx = await getDistributorTxByInput_DistributeToken(distributor, deployer, paramsInput, admin, admins);
            await tx.wait();

            for (let i = 0; i < receivers.length; i++) {
                await expect(tx).to.emit(distributor, 'TokenDistribution').withArgs(receivers[i], amounts[i]);
            }

            expect(await primaryToken.balanceOf(receiver1.address)).to.equal(
                initReceiver1Balance.add(ethers.utils.parseEther('100'))
            );
            expect(await primaryToken.balanceOf(receiver2.address)).to.equal(
                initReceiver2Balance.add(ethers.utils.parseEther('200'))
            );
            expect(await primaryToken.balanceOf(receiver3.address)).to.equal(
                initReceiver3Balance.add(ethers.utils.parseEther('300'))
            );
            expect(await primaryToken.balanceOf(distributor.address)).to.equal(
                initDistributorBalance.sub(ethers.utils.parseEther('600'))
            );
        });

        it('4.2.2.2. Distribute tokens unsuccessfully with invalid signatures', async () => {
            const fixture = await setupBeforeTest();
            const { admin, admins, deployer, distributor, receiver1, receiver2, receiver3 } = fixture;

            const receivers = [receiver1.address, receiver2.address, receiver3.address];
            const amounts = [
                ethers.utils.parseEther('100'),
                ethers.utils.parseEther('200'),
                ethers.utils.parseEther('300'),
            ];
            const note = 'Testing Data';

            const paramsInput: DistributeTokenParamsInput = {
                receivers,
                amounts,
                note,
            };
            const params: DistributeTokenParams = {
                ...paramsInput,
                signatures: await getDistributeTokenSignatures(distributor, paramsInput, admin, admins, false),
            };
            await expect(getDistributorTx_DistributeToken(distributor, deployer, params)).to.be.revertedWithCustomError(
                distributor,
                'FailedVerification'
            );
        });

        it('4.2.2.3. Distribute tokens unsuccessfully with invalid inputs length', async () => {
            const fixture = await setupBeforeTest();
            const { admin, admins, deployer, distributor, receiver1, receiver2, receiver3 } = fixture;

            async function testForInvalidInput(receivers: string[], amounts: BigNumberish[], note: string) {
                const paramsInput: DistributeTokenParamsInput = {
                    receivers,
                    amounts,
                    note,
                };
                await expect(
                    getDistributorTxByInput_DistributeToken(distributor, deployer, paramsInput, admin, admins)
                ).to.be.revertedWithCustomError(distributor, 'InvalidInput');
            }

            const receivers = [receiver1.address, receiver2.address, receiver3.address];
            const amounts = [
                ethers.utils.parseEther('100'),
                ethers.utils.parseEther('200'),
                ethers.utils.parseEther('300'),
            ];
            const note = 'Testing Data';

            await testForInvalidInput(receivers.slice(0, 2), amounts, note);
        });

        it('4.2.2.4. Distribute tokens unsuccessfully with insufficient funds', async () => {
            const fixture = await setupBeforeTest();
            const { admin, admins, deployer, distributor, primaryToken, receiver1, receiver2, receiver3 } = fixture;

            const initDistributorBalance = await primaryToken.balanceOf(distributor.address);

            const receivers = [receiver1.address, receiver2.address, receiver3.address];
            const amounts = [ethers.utils.parseEther('100'), ethers.utils.parseEther('200'), initDistributorBalance];
            const note = 'Testing Data';

            const paramsInput: DistributeTokenParamsInput = {
                receivers,
                amounts,
                note,
            };
            await expect(
                getDistributorTxByInput_DistributeToken(distributor, deployer, paramsInput, admin, admins)
            ).to.be.revertedWithCustomError(distributor, 'InsufficientFunds');
        });
    });
});
