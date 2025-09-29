import { expect } from 'chai';
import { ethers } from 'hardhat';
import { BigNumberish } from 'ethers';
import { Admin, Currency, Distributor, PrimaryToken, Treasury } from '@typechain-types';
import { deployAdmin } from '@utils/deployments/common/admin';
import { Constant } from '@tests/test.constant';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { deployCurrency } from '@utils/deployments/common/currency';
import { deployPrimaryToken } from '@utils/deployments/liquidity/primaryToken';
import { deployTreasury } from '@utils/deployments/liquidity/treasury';
import { Initialization as LiquidityInitialization } from '@tests/liquidity/test.initialization';
import { deployDistributor } from '@utils/deployments/liquidity/distributor';
import { callPrimaryToken_UnlockForCoreTeam } from '@utils/call/liquidity/primaryToken';
import { DistributeTokenParams, DistributeTokenParamsInput } from '@utils/models/liquidity/distributor';
import { getDistributeTokenInvalidSignatures, getDistributeTokenSignatures } from '@utils/signatures/liquidity/distributor';
import { getDistributeTokenTx } from '@utils/transaction/liquidity/distributor';

interface DistributorFixture {
    deployer: any;
    admins: any[];
    admin: Admin;
    treasury: Treasury;
    currency: Currency;
    primaryToken: PrimaryToken;
    distributor: Distributor;
    receiver1: any, receiver2: any, receiver3: any;
}

describe('4.2. Distributor', async () => {
    async function distributorFixture(): Promise<DistributorFixture> {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        const admins = [];
        for (let i = 1; i <= Constant.ADMIN_NUMBER; ++i) admins.push(accounts[i]);
        const receiver1 = accounts[Constant.ADMIN_NUMBER + 1];
        const receiver2 = accounts[Constant.ADMIN_NUMBER + 2];
        const receiver3 = accounts[Constant.ADMIN_NUMBER + 3];

        const adminAddresses: string[] = admins.map(signer => signer.address);
        const admin = await deployAdmin(
            deployer.address,
            adminAddresses[0],
            adminAddresses[1],
            adminAddresses[2],
            adminAddresses[3],
            adminAddresses[4],
        ) as Admin;
        
        const currency = await deployCurrency(
            deployer.address,
            'MockCurrency',
            'MCK'
        ) as Currency;
        
        const primaryToken = await deployPrimaryToken(
            deployer,
            admin.address,
            LiquidityInitialization.PRIMARY_TOKEN_Name,
            LiquidityInitialization.PRIMARY_TOKEN_Symbol,
            LiquidityInitialization.PRIMARY_TOKEN_LiquidationUnlockedAt,
        ) as PrimaryToken;
        
        const treasury = await deployTreasury(
            deployer,
            admin.address,
            currency.address,
            primaryToken.address,
        ) as Treasury;

        const distributor = await deployDistributor(
            deployer,
            admin.address,
            primaryToken.address,
            treasury.address,
        ) as Distributor;
        
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
    };

    async function setupBeforeTest(): Promise<DistributorFixture> {
        const fixture = await loadFixture(distributorFixture);
        const { admin, admins, primaryToken, distributor } = fixture;

        await callPrimaryToken_UnlockForCoreTeam(
            primaryToken,
            admins,
            distributor.address,
            await admin.nonce()
        );

        return fixture;
    }

    describe('4.2.1. initialize(address, address, address)', async () => {
        it('4.2.1.1. Deploy successfully', async () => {
            const fixture = await setupBeforeTest();
            const { admin, distributor, primaryToken, treasury } = fixture;

            expect(await distributor.admin()).to.equal(admin.address);
            expect(await distributor.primaryToken()).to.equal(primaryToken.address);
            expect(await distributor.treasury()).to.equal(treasury.address);
        });
    });

    describe('4.2.2. distributeToken(address[], uint256[], string, bytes[])', async () => {
        it('4.2.2.1. distribute tokens successfully', async () => {
            const fixture = await setupBeforeTest();
            const { admin, admins, deployer, distributor, primaryToken, receiver1, receiver2, receiver3 } = fixture;

            const receivers = [receiver1.address, receiver2.address, receiver3.address];
            const amounts = [ethers.utils.parseEther('100'), ethers.utils.parseEther('200'), ethers.utils.parseEther('300')];
            const note = "Testing Data";

            const paramsInput: DistributeTokenParamsInput = {
                receivers,
                amounts,
                note,
            };
            const params: DistributeTokenParams = {
                ...paramsInput,
                signatures: await getDistributeTokenSignatures(distributor, admins, admin, paramsInput),
            };

            const initDistributorBalance = await primaryToken.balanceOf(distributor.address);
            const initReceiver1Balance = await primaryToken.balanceOf(receiver1.address);
            const initReceiver2Balance = await primaryToken.balanceOf(receiver2.address);
            const initReceiver3Balance = await primaryToken.balanceOf(receiver3.address);

            const tx = await getDistributeTokenTx(distributor, deployer, params);
            await tx.wait();

            for(let i = 0; i < receivers.length; i++) {
                await expect(tx).to.emit(distributor, "TokenDistribution").withArgs(
                    receivers[i],
                    amounts[i]
                );
            }

            expect(await primaryToken.balanceOf(receiver1.address)).to.equal(initReceiver1Balance.add(ethers.utils.parseEther('100')));
            expect(await primaryToken.balanceOf(receiver2.address)).to.equal(initReceiver2Balance.add(ethers.utils.parseEther('200')));
            expect(await primaryToken.balanceOf(receiver3.address)).to.equal(initReceiver3Balance.add(ethers.utils.parseEther('300')));
            expect(await primaryToken.balanceOf(distributor.address)).to.equal(initDistributorBalance.sub(ethers.utils.parseEther('600')));
        });

        it('4.2.2.2. distribute tokens unsuccessfully with invalid signatures', async () => {
            const fixture = await setupBeforeTest();
            const { admin, admins, deployer, distributor, receiver1, receiver2, receiver3 } = fixture;

            const receivers = [receiver1.address, receiver2.address, receiver3.address];
            const amounts = [ethers.utils.parseEther('100'), ethers.utils.parseEther('200'), ethers.utils.parseEther('300')];
            const note = "Testing Data";

            const paramsInput: DistributeTokenParamsInput = {
                receivers,
                amounts,
                note,
            };
            const params: DistributeTokenParams = {
                ...paramsInput,
                signatures: await getDistributeTokenInvalidSignatures(distributor, admins, admin, paramsInput),
            };

            await expect(getDistributeTokenTx(distributor, deployer, params))
                .to.be.revertedWithCustomError(distributor, "FailedVerification");
        });

        it('4.2.2.3. distribute tokens unsuccessfully with invalid inputs length', async () => {
            const fixture = await setupBeforeTest();
            const { admin, admins, deployer, distributor, primaryToken, receiver1, receiver2, receiver3 } = fixture;

            async function testForInvalidInput(
                receivers: string[],
                amounts: BigNumberish[],
                note: string,
            ) {
                const paramsInput: DistributeTokenParamsInput = {
                    receivers,
                    amounts,
                    note,
                };
                const params: DistributeTokenParams = {
                    ...paramsInput,
                    signatures: await getDistributeTokenSignatures(distributor, admins, admin, paramsInput),
                };

                await expect(getDistributeTokenTx(distributor, deployer, params))
                    .to.be.revertedWithCustomError(distributor, "InvalidInput");
            }

            const receivers = [receiver1.address, receiver2.address, receiver3.address];
            const amounts = [ethers.utils.parseEther('100'), ethers.utils.parseEther('200'), ethers.utils.parseEther('300')];
            const note = "Testing Data";

            await testForInvalidInput(receivers.slice(0, 2), amounts, note);
        });

        it('4.2.2.4. distribute tokens unsuccessfully with insufficient funds', async () => {
            const fixture = await setupBeforeTest();
            const { admin, admins, deployer, distributor, primaryToken, receiver1, receiver2, receiver3 } = fixture;

            const initDistributorBalance = await primaryToken.balanceOf(distributor.address);

            const receivers = [receiver1.address, receiver2.address, receiver3.address];
            const amounts = [ethers.utils.parseEther('100'), ethers.utils.parseEther('200'), initDistributorBalance];
            const note = "Testing Data";

            const paramsInput: DistributeTokenParamsInput = {
                receivers,
                amounts,
                note,
            };
            const params: DistributeTokenParams = {
                ...paramsInput,
                signatures: await getDistributeTokenSignatures(distributor, admins, admin, paramsInput),
            };

            await expect(getDistributeTokenTx(distributor, deployer, params))
                .to.be.revertedWithCustomError(distributor, "InsufficientFunds");
        });        
    });
});
