import { expect } from 'chai';
import { BigNumber, BigNumberish, Contract } from 'ethers';
import { ethers } from 'hardhat';
import { Admin, Currency, Driptributor, StakeToken, Treasury, MockPrimaryToken } from '@typechain-types';
import { callTransaction, getSignatures, prepareERC20, testReentrancy } from '@utils/blockchain';
import { deployAdmin } from '@utils/deployments/common/admin';
import { Constant } from '@tests/test.constant';
import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import { deployCurrency } from '@utils/deployments/common/currency';
import { deployTreasury } from '@utils/deployments/liquidity/treasury';
import { deployDriptributor } from '@utils/deployments/liquidity/driptributor';
import { callDriptributor_DistributeTokensWithDuration, callDriptributor_DistributeTokensWithTimestamp, callDriptributor_UpdateStakeTokens } from '@utils/call/driptributor';
import { deployMockPrimaryToken } from '@utils/deployments/mock/mockPrimaryToken';
import { callPrimaryToken_UpdateStakeTokens } from '@utils/call/primary';
import { MockContract, smock } from '@defi-wonderland/smock';
import { Initialization as LiquidityInitialization } from '@tests/liquidity/test.initialization';
import { callPausable_Pause } from '@utils/call/Pausable';
import { DistributeTokensWithDurationParams, DistributeTokensWithDurationParamsInput, DistributeTokensWithTimestampParams, DistributeTokensWithTimestampParamsInput, UpdateStakeTokensParams, UpdateStakeTokensParamsInput } from '@utils/models/Driptributor';
import { getDistributeTokensWithDurationSignatures, getDistributeTokensWithTimestampSignatures, getUpdateStakeTokensSignatures } from '@utils/signatures/Driptributor';
import { getDistributeTokensWithDurationTx, getDistributeTokensWithTimestampTx, getUpdateStakeTokensTx } from '@utils/transaction/Driptributor';

interface DriptributorFixture {
    deployer: any;
    admins: any[];
    admin: Admin;
    treasury: Treasury;
    currency: Currency;
    primaryToken: MockPrimaryToken;
    stakeToken1: MockContract<StakeToken>;
    stakeToken2: MockContract<StakeToken>;
    stakeToken3: MockContract<StakeToken>;
    driptributor: Driptributor;
    totalAmount: BigNumber;
    receiver1: any;
    receiver2: any;
    receiver3: any;
}

// TODO: Add non-reentrant test?
async function testReentrancy_driptributor(
    driptributor: Driptributor,
    reentrancyContract: Contract,
    assertion: any,
) {
    let data = [
        driptributor.interface.encodeFunctionData("withdraw", [[0]]),
        driptributor.interface.encodeFunctionData("stake", [[0], 0, 0]),
    ];

    await testReentrancy(
        reentrancyContract,
        driptributor,
        data,
        assertion,
    );
}

describe('4.3. Driptributor', async () => {
    async function driptributorFixture(): Promise<DriptributorFixture> {
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
        
        const primaryToken = await deployMockPrimaryToken(
            deployer,
            admin.address,
            LiquidityInitialization.PRIMARY_TOKEN_Name,
            LiquidityInitialization.PRIMARY_TOKEN_Symbol,
            LiquidityInitialization.PRIMARY_TOKEN_LiquidationUnlockedAt,
        ) as MockPrimaryToken;
        
        const treasury = await deployTreasury(
            deployer,
            admin.address,
            currency.address,
            primaryToken.address,
        ) as Treasury;

        const SmockStakeTokenFactory = await smock.mock('StakeToken') as any;
        const stakeToken1 = await SmockStakeTokenFactory.deploy();
        await callTransaction(stakeToken1.initialize(
            admin.address,
            primaryToken.address,
            LiquidityInitialization.STAKE_TOKEN_Name_1,
            LiquidityInitialization.STAKE_TOKEN_Symbol_1,
            LiquidityInitialization.STAKE_TOKEN_FeeRate,
        ));

        const SmockStakeTokenFactory2 = await smock.mock('StakeToken') as any;
        const stakeToken2 = await SmockStakeTokenFactory2.deploy();
        await callTransaction(stakeToken2.initialize(
            admin.address,
            primaryToken.address,
            LiquidityInitialization.STAKE_TOKEN_Name_2,
            LiquidityInitialization.STAKE_TOKEN_Symbol_2,
            LiquidityInitialization.STAKE_TOKEN_FeeRate,
        ));

        const SmockStakeTokenFactory3 = await smock.mock('StakeToken') as any;
        const stakeToken3 = await SmockStakeTokenFactory3.deploy();
        await callTransaction(stakeToken3.initialize(
            admin.address,
            primaryToken.address,
            LiquidityInitialization.STAKE_TOKEN_Name_3,
            LiquidityInitialization.STAKE_TOKEN_Symbol_3,
            LiquidityInitialization.STAKE_TOKEN_FeeRate,
        ));

        const totalAmount = ethers.utils.parseEther('1000');

        const driptributor = await deployDriptributor(
            deployer,
            admin.address,
            primaryToken.address,
            totalAmount,
        ) as Driptributor;

        await primaryToken.mint(driptributor.address, totalAmount);

        const paramsInput: UpdateStakeTokensParamsInput = {
            stakeToken1: stakeToken1.address,
            stakeToken2: stakeToken2.address,
            stakeToken3: stakeToken3.address,
        };
        await callDriptributor_UpdateStakeTokens(
            driptributor,
            deployer,
            admins,
            admin,
            paramsInput,
        );
        
        return {
            deployer,
            admins,
            admin,
            treasury,
            currency,
            primaryToken,
            stakeToken1,
            stakeToken2,
            stakeToken3,
            driptributor,
            totalAmount,
            receiver1,
            receiver2,
            receiver3,
        };
    };

    async function setupBeforeTest({
        updateStakeTokens = false,
        addDistribution = false,
        pause = false,
    } = {}): Promise<DriptributorFixture> {
        const fixture = await loadFixture(driptributorFixture);

        const { deployer, admin, driptributor, admins, stakeToken1, stakeToken2, stakeToken3, receiver1, receiver2, treasury, currency } = fixture;

        await prepareERC20(currency, [deployer], [treasury], ethers.utils.parseEther("1000000"));
        await treasury.provideLiquidity(ethers.utils.parseEther("1000000"));

        if (updateStakeTokens) {
            const params: UpdateStakeTokensParamsInput = {
                stakeToken1: stakeToken1.address,
                stakeToken2: stakeToken2.address,
                stakeToken3: stakeToken3.address,
            };

            await callDriptributor_UpdateStakeTokens(
                driptributor,
                deployer,
                admins,
                admin,
                params,                
            );
        }

        let currentTimestamp = await time.latest() + 1000;

        if (addDistribution) {
            await time.setNextBlockTimestamp(currentTimestamp);
            const params1: DistributeTokensWithDurationParamsInput = {
                receivers: [receiver1.address, receiver2.address],
                amounts: [ethers.utils.parseEther('100'), ethers.utils.parseEther('200')],
                durations: [1000, 10000],
                notes: ['data1', 'data2'],
            };
            await callDriptributor_DistributeTokensWithDuration(
                driptributor,
                deployer,
                admins,
                admin,
                params1,
            );
            
            await time.setNextBlockTimestamp(currentTimestamp + 100);
            const params2: DistributeTokensWithDurationParamsInput = {
                receivers: [receiver1.address, receiver2.address],
                amounts: [ethers.utils.parseEther('10'), ethers.utils.parseEther('20')],
                durations: [2000, 20000],
                notes: ['data3', 'data4'],
            };
            await callDriptributor_DistributeTokensWithDuration(
                driptributor,
                deployer,
                admins,
                admin,
                params2,
            );
        }

        if (pause) {
            await callPausable_Pause(driptributor, deployer, admins, admin);
        }

        return {
            ...fixture,
        }
    }

    describe('4.3.1. initialize(address, address, address, address, address, uint256)', async () => {
        it('4.3.1.1. Deploy successfully', async () => {
            const { admin, primaryToken, driptributor, totalAmount } = await setupBeforeTest();
            
            expect(await driptributor.totalAllocation()).to.equal(totalAmount);
            expect(await driptributor.primaryToken()).to.equal(primaryToken.address);
            expect(await driptributor.admin()).to.equal(admin.address);

            expect(await driptributor.stakeToken1()).to.equal(ethers.constants.AddressZero);
            expect(await driptributor.stakeToken2()).to.equal(ethers.constants.AddressZero);
            expect(await driptributor.stakeToken3()).to.equal(ethers.constants.AddressZero);

            expect(await driptributor.distributionNumber()).to.equal(0);
            expect(await driptributor.distributedAmount()).to.equal(0);
        });
    });

    describe('4.3.2. updateStakeTokens(address, address, address, bytes[])', async () => {
        it('4.3.2.1. updateStakeTokens successfully', async () => {
            const { deployer, admin, admins, driptributor, stakeToken1, stakeToken2, stakeToken3 } = await setupBeforeTest();
            
            const paramsInput: UpdateStakeTokensParamsInput = {
                stakeToken1: stakeToken1.address,
                stakeToken2: stakeToken2.address,
                stakeToken3: stakeToken3.address,
            };
            const params: UpdateStakeTokensParams = {
                ...paramsInput,
                signatures: await getUpdateStakeTokensSignatures(driptributor, admins, admin, paramsInput),
            };

            const tx = await getUpdateStakeTokensTx(driptributor, deployer, params);
            await tx.wait();

            expect(await driptributor.stakeToken1()).to.equal(stakeToken1.address);
            expect(await driptributor.stakeToken2()).to.equal(stakeToken2.address);
            expect(await driptributor.stakeToken3()).to.equal(stakeToken3.address);
        });

        it('4.3.2.2. updateStakeTokens unsuccessfully with invalid signatures', async () => {
            const { deployer, admin, admins, driptributor, stakeToken1, stakeToken2, stakeToken3 } = await setupBeforeTest();
            
            const paramsInput: UpdateStakeTokensParamsInput = {
                stakeToken1: stakeToken1.address,
                stakeToken2: stakeToken2.address,
                stakeToken3: stakeToken3.address,
            };
            const params: UpdateStakeTokensParams = {
                ...paramsInput,
                signatures: await getUpdateStakeTokensSignatures(driptributor, admins, admin, paramsInput, false),
            };
            await expect(getUpdateStakeTokensTx(driptributor, deployer, params))
                .to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        async function testForInvalidInput(
            fixture: DriptributorFixture,
            stakeToken1: string,
            stakeToken2: string,
            stakeToken3: string,
        ) {
            const { admin, admins, driptributor, deployer } = fixture;
            const paramsInput: UpdateStakeTokensParamsInput = {
                stakeToken1: stakeToken1,
                stakeToken2: stakeToken2,
                stakeToken3: stakeToken3,
            };
            const params: UpdateStakeTokensParams = {
                ...paramsInput,
                signatures: await getUpdateStakeTokensSignatures(driptributor, admins, admin, paramsInput, false),
            };
            await expect(getUpdateStakeTokensTx(driptributor, deployer, params))
                .to.be.revertedWithCustomError(driptributor, 'InvalidUpdating');
        }

        it('4.3.2.3. updateStakeTokens unsuccessfully with zero address stake tokens', async () => {
            const fixture = await setupBeforeTest();
            const { stakeToken1, stakeToken2, stakeToken3 } = fixture;

            await testForInvalidInput(fixture, ethers.constants.AddressZero, stakeToken2.address, stakeToken3.address);
            await testForInvalidInput(fixture, stakeToken1.address, ethers.constants.AddressZero, stakeToken3.address);
            await testForInvalidInput(fixture, stakeToken1.address, stakeToken2.address, ethers.constants.AddressZero);
        });

        it('4.3.2.4. updateStakeTokens unsuccessfully with already updated stake tokens', async () => {
            const fixture = await setupBeforeTest({
                updateStakeTokens: true,
            });
            const { stakeToken1, stakeToken2, stakeToken3 } = fixture;
            await testForInvalidInput(fixture, stakeToken1.address, stakeToken2.address, stakeToken3.address);
        });
    });

    describe('4.3.3. distributeTokensWithDuration(address[], uint256[], uint40[], string[], bytes[])', async () => {
        it('4.3.3.1. distributeTokensWithDuration successfully with valid signatures', async () => {
            const { deployer, admin, admins, driptributor, totalAmount, receiver1, receiver2 } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            let currentTimestamp = await time.latest() + 1000;

            const paramsInput1: DistributeTokensWithDurationParamsInput = {
                receivers: [receiver1.address, receiver2.address],
                amounts: [ethers.utils.parseEther('100'), ethers.utils.parseEther('200')],
                durations: [100, 1000],
                notes: ['data1', 'data2'],
            };
            const params1: DistributeTokensWithDurationParams = {
                ...paramsInput1,
                signatures: await getDistributeTokensWithDurationSignatures(driptributor, admins, admin, paramsInput1),
            };

            await time.setNextBlockTimestamp(currentTimestamp);
            const tx1 = await getDistributeTokensWithDurationTx(driptributor, deployer, params1);
            await tx1.wait();
            
            await expect(tx1).to.emit(driptributor, 'NewDistribution').withArgs(
                1,
                params1.receivers[0],
                currentTimestamp,
                params1.durations[0],
                params1.amounts[0],
                params1.notes[0]
            );
            await expect(tx1).to.emit(driptributor, 'NewDistribution').withArgs(
                2,
                params1.receivers[1],
                currentTimestamp,
                params1.durations[1],
                params1.amounts[1],
                params1.notes[1]
            );

            expect(await driptributor.totalAllocation()).to.equal(totalAmount);
            expect(await driptributor.distributedAmount()).to.equal(ethers.utils.parseEther('300'));
            
            const distribution1 = await driptributor.getDistribution(1);
            expect(distribution1.totalAmount).to.equal(params1.amounts[0]);
            expect(distribution1.withdrawnAmount).to.equal(0);
            expect(distribution1.receiver).to.equal(params1.receivers[0]);
            expect(distribution1.distributeAt).to.equal(currentTimestamp);
            expect(distribution1.vestingDuration).to.equal(params1.durations[0]);
            expect(distribution1.isStaked).to.equal(false);

            const distribution2 = await driptributor.getDistribution(2);
            expect(distribution2.totalAmount).to.equal(params1.amounts[1]);
            expect(distribution2.withdrawnAmount).to.equal(0);
            expect(distribution2.receiver).to.equal(params1.receivers[1]);
            expect(distribution2.distributeAt).to.equal(currentTimestamp);
            expect(distribution2.vestingDuration).to.equal(params1.durations[1]);
            expect(distribution2.isStaked).to.equal(false);

            currentTimestamp += 100;

            const paramsInput2: DistributeTokensWithDurationParamsInput = {
                receivers: [receiver1.address, receiver2.address],
                amounts: [ethers.utils.parseEther('10'), ethers.utils.parseEther('20')],
                durations: [200, 2000],
                notes: ['data3', 'data4'],
            };
            const params2: DistributeTokensWithDurationParams = {
                ...paramsInput2,
                signatures: await getDistributeTokensWithDurationSignatures(driptributor, admins, admin, paramsInput2),
            };

            await time.setNextBlockTimestamp(currentTimestamp);
            const tx2 = await getDistributeTokensWithDurationTx(driptributor, deployer, params2);
            await tx2.wait();
            
            await expect(tx2).to.emit(driptributor, 'NewDistribution').withArgs(
                3,
                params2.receivers[0],
                currentTimestamp,
                params2.durations[0],
                params2.amounts[0],
                params2.notes[0]
            );
            await expect(tx2).to.emit(driptributor, 'NewDistribution').withArgs(
                4,
                params2.receivers[1],
                currentTimestamp,
                params2.durations[1],
                params2.amounts[1],
                params2.notes[1]
            );

            expect(await driptributor.totalAllocation()).to.equal(totalAmount);
            expect(await driptributor.distributedAmount()).to.equal(ethers.utils.parseEther('330'));
            
            const distribution3 = await driptributor.getDistribution(3);
            expect(distribution3.totalAmount).to.equal(params2.amounts[0]);
            expect(distribution3.withdrawnAmount).to.equal(0);
            expect(distribution3.receiver).to.equal(params2.receivers[0]);
            expect(distribution3.distributeAt).to.equal(currentTimestamp);
            expect(distribution3.vestingDuration).to.equal(params2.durations[0]);
            expect(distribution3.isStaked).to.equal(false);

            const distribution4 = await driptributor.getDistribution(4);
            expect(distribution4.totalAmount).to.equal(params2.amounts[1]);
            expect(distribution4.withdrawnAmount).to.equal(0);
            expect(distribution4.receiver).to.equal(params2.receivers[1]);
            expect(distribution4.distributeAt).to.equal(currentTimestamp);
            expect(distribution4.vestingDuration).to.equal(params2.durations[1]);
            expect(distribution4.isStaked).to.equal(false);
        });

        it('4.3.3.2. distributeTokensWithDuration unsuccessfully with invalid signatures', async () => {
            const { deployer, admin, admins, driptributor, receiver1, receiver2 } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            const paramsInput: DistributeTokensWithDurationParamsInput = {
                receivers: [receiver1.address, receiver2.address],
                amounts: [ethers.utils.parseEther('100'), ethers.utils.parseEther('200')],
                durations: [100, 1000],
                notes: ['data1', 'data2'],
            };
            const params: DistributeTokensWithDurationParams = {
                ...paramsInput,
                signatures: await getDistributeTokensWithDurationSignatures(driptributor, admins, admin, paramsInput, false),
            };

            await expect(getDistributeTokensWithDurationTx(driptributor, deployer, params))
                .to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('4.3.3.3. distributeTokensWithDuration unsuccessfully with invalid input', async () => {
            const { deployer, admin, admins, driptributor, receiver1, receiver2 } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            async function testForInvalidInput(
                receivers: string[],
                amounts: BigNumberish[],
                vestingDurations: number[],
                data: string[]
            ) {
                const paramsInput: DistributeTokensWithDurationParamsInput = {
                    receivers: receivers,
                    amounts: amounts,
                    durations: vestingDurations,
                    notes: data,
                };
                const params: DistributeTokensWithDurationParams = {
                    ...paramsInput,
                    signatures: await getDistributeTokensWithDurationSignatures(driptributor, admins, admin, paramsInput),
                };
                await expect(getDistributeTokensWithDurationTx(driptributor, deployer, params))
                    .to.be.revertedWithCustomError(driptributor, 'InvalidInput');
            }

            const receivers = [receiver1.address, receiver2.address];
            const amounts = [ethers.utils.parseEther('10'), ethers.utils.parseEther('20')];
            const vestingDurations = [200, 2000];
            const data = ['data1', 'data2'];

            await testForInvalidInput(receivers.slice(0, 1), amounts, vestingDurations, data);
            await testForInvalidInput(receivers, amounts.slice(0, 1), vestingDurations, data);
            await testForInvalidInput(receivers, amounts, vestingDurations.slice(0, 1), data);
            await testForInvalidInput(receivers, amounts, vestingDurations, data.slice(0, 1));
        });

        it('4.3.3.4. distributeTokensWithDuration unsuccessfully with insufficient funds', async () => {
            const { deployer, admin, admins, driptributor, receiver1, receiver2 } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            const paramsInput1: DistributeTokensWithDurationParamsInput = {
                receivers: [receiver1.address, receiver2.address],
                amounts: [ethers.utils.parseEther('100'), ethers.utils.parseEther('200')],
                durations: [100, 1000],
                notes: ['data1', 'data2'],
            };
            await callDriptributor_DistributeTokensWithDuration(
                driptributor,
                deployer,
                admins,
                admin,
                paramsInput1,
            );

            const paramsInput2: DistributeTokensWithDurationParamsInput = {
                receivers: [receiver1.address, receiver2.address],
                amounts: [ethers.utils.parseEther('300'), ethers.utils.parseEther('401')],
                durations: [200, 2000],
                notes: ['data3', 'data4'],
            };
            const params2: DistributeTokensWithDurationParams = {
                ...paramsInput2,
                signatures: await getDistributeTokensWithDurationSignatures(driptributor, admins, admin, paramsInput2),
            };

            await expect(getDistributeTokensWithDurationTx(driptributor, deployer, params2))
                .to.be.revertedWithCustomError(driptributor, 'InsufficientFunds');
        });
    });
    
    describe('4.3.4. distributeTokensWithTimestamp(address[], uint256[], uint40[], string[], bytes[])', async () => {
        it('4.3.4.1. distributeTokensWithTimestamp successfully with valid signatures', async () => {
            const { admin, admins, driptributor, totalAmount, receiver1, receiver2 } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            let currentTimestamp = await time.latest() + 1000;

            const receivers1 = [receiver1.address, receiver2.address];
            const amounts1 = [ethers.utils.parseEther('100'), ethers.utils.parseEther('200')];
            const endAts1 = [currentTimestamp + 100, currentTimestamp + 1000];
            const data1 = ['data1', 'data2'];

            const message1 = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "address[]", "uint256[]", "uint40[]", "string[]"],
                [driptributor.address, "distributeTokensWithTimestamp", receivers1, amounts1, endAts1, data1]
            );
            const signatures1 = await getSignatures(message1, admins, await admin.nonce());

            await time.setNextBlockTimestamp(currentTimestamp);
            const tx1 = await driptributor.distributeTokensWithTimestamp(
                receivers1,
                amounts1,
                endAts1,
                data1,
                signatures1
            );
            await tx1.wait();
            
            await expect(tx1).to
                .emit(driptributor, 'NewDistribution')
                .withArgs(1, receiver1.address, currentTimestamp, 100, ethers.utils.parseEther('100'), 'data1')
                .emit(driptributor, 'NewDistribution')
                .withArgs(2, receiver2.address, currentTimestamp, 1000, ethers.utils.parseEther('200'), 'data2')

            expect(await driptributor.totalAllocation()).to.equal(totalAmount);
            expect(await driptributor.distributedAmount()).to.equal(ethers.utils.parseEther('300'));
            
            const distribution1 = await driptributor.getDistribution(1);
            expect(distribution1.totalAmount).to.equal(ethers.utils.parseEther('100'));
            expect(distribution1.withdrawnAmount).to.equal(0);
            expect(distribution1.receiver).to.equal(receiver1.address);
            expect(distribution1.distributeAt).to.equal(currentTimestamp);
            expect(distribution1.vestingDuration).to.equal(100);
            expect(distribution1.isStaked).to.equal(false);

            const distribution2 = await driptributor.getDistribution(2);
            expect(distribution2.totalAmount).to.equal(ethers.utils.parseEther('200'));
            expect(distribution2.withdrawnAmount).to.equal(0);
            expect(distribution2.receiver).to.equal(receiver2.address);
            expect(distribution2.distributeAt).to.equal(currentTimestamp);
            expect(distribution2.vestingDuration).to.equal(1000);
            expect(distribution2.isStaked).to.equal(false);

            currentTimestamp += 100;

            const receivers2 = [receiver1.address, receiver2.address];
            const amounts2 = [ethers.utils.parseEther('10'), ethers.utils.parseEther('20')];
            const endAts2 = [currentTimestamp + 200, currentTimestamp + 2000];
            const data2 = ['data3', 'data4'];

            const message2 = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "address[]", "uint256[]", "uint40[]", "string[]"],
                [driptributor.address, "distributeTokensWithTimestamp", receivers2, amounts2, endAts2, data2]
            );
            const signatures2 = await getSignatures(message2, admins, await admin.nonce());

            await time.setNextBlockTimestamp(currentTimestamp);
            const tx2 = await driptributor.distributeTokensWithTimestamp(
                receivers2,
                amounts2,
                endAts2,
                data2,
                signatures2
            );
            await tx2.wait();
            
            await expect(tx2).to
                .emit(driptributor, 'NewDistribution')
                .withArgs(3, receiver1.address, currentTimestamp, 200, ethers.utils.parseEther('10'), 'data3')
                .emit(driptributor, 'NewDistribution')
                .withArgs(4, receiver2.address, currentTimestamp, 2000, ethers.utils.parseEther('20'), 'data4')

            expect(await driptributor.totalAllocation()).to.equal(totalAmount);
            expect(await driptributor.distributedAmount()).to.equal(ethers.utils.parseEther('330'));
            
            const distribution3 = await driptributor.getDistribution(3);
            expect(distribution3.totalAmount).to.equal(ethers.utils.parseEther('10'));
            expect(distribution3.withdrawnAmount).to.equal(0);
            expect(distribution3.receiver).to.equal(receiver1.address);
            expect(distribution3.distributeAt).to.equal(currentTimestamp);
            expect(distribution3.vestingDuration).to.equal(200);
            expect(distribution3.isStaked).to.equal(false);

            const distribution4 = await driptributor.getDistribution(4);
            expect(distribution4.totalAmount).to.equal(ethers.utils.parseEther('20'));
            expect(distribution4.withdrawnAmount).to.equal(0);
            expect(distribution4.receiver).to.equal(receiver2.address);
            expect(distribution4.distributeAt).to.equal(currentTimestamp);
            expect(distribution4.vestingDuration).to.equal(2000);
            expect(distribution4.isStaked).to.equal(false);
        });

        it('4.3.4.2. distributeTokensWithTimestamp unsuccessfully with invalid signatures', async () => {
            const { admin, admins, driptributor, receiver1, receiver2, deployer } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            let currentTimestamp = await time.latest() + 1000;

            const paramsInput: DistributeTokensWithTimestampParamsInput = {
                receivers: [receiver1.address, receiver2.address],
                amounts: [ethers.utils.parseEther('100'), ethers.utils.parseEther('200')],
                endAts: [currentTimestamp + 100, currentTimestamp + 1000],
                notes: ['data1', 'data2'],
            };
            const params: DistributeTokensWithTimestampParams = {
                ...paramsInput,
                signatures: await getDistributeTokensWithTimestampSignatures(driptributor, admins, admin, paramsInput, false),
            };

            await expect(getDistributeTokensWithTimestampTx(driptributor, deployer, params))
                .to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('4.3.4.3. distributeTokensWithTimestamp unsuccessfully with invalid input', async () => {
            const { admin, admins, driptributor, receiver1, receiver2, deployer } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            let currentTimestamp = await time.latest() + 1000;

            async function testForInvalidInput(
                receivers: string[],
                amounts: BigNumberish[],
                endAts: number[],
                data: string[]
            ) {
                const paramsInput: DistributeTokensWithTimestampParamsInput = {
                    receivers: receivers,
                    amounts: amounts,
                    endAts: endAts,
                    notes: data,
                };
                const params: DistributeTokensWithTimestampParams = {
                    ...paramsInput,
                    signatures: await getDistributeTokensWithTimestampSignatures(driptributor, admins, admin, paramsInput),
                };

                await expect(getDistributeTokensWithTimestampTx(driptributor, deployer, params))
                    .to.be.revertedWithCustomError(driptributor, 'InvalidInput');
            }

            const receivers = [receiver1.address, receiver2.address];
            const amounts = [ethers.utils.parseEther('10'), ethers.utils.parseEther('20')];
            const endAts = [currentTimestamp + 200, currentTimestamp + 2000];
            const data = ['data1', 'data2'];

            await testForInvalidInput(receivers.slice(0, 1), amounts, endAts, data);
            await testForInvalidInput(receivers, amounts.slice(0, 1), endAts, data);
            await testForInvalidInput(receivers, amounts, endAts.slice(0, 1), data);            
            await testForInvalidInput(receivers, amounts, endAts, data.slice(0, 1));
        });

        it('4.3.4.4. distributeTokensWithTimestamp unsuccessfully with insufficient funds', async () => {
            const { admin, admins, driptributor, receiver1, receiver2, deployer } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            let currentTimestamp = await time.latest() + 1000;

            const params1: DistributeTokensWithTimestampParamsInput = {
                receivers: [receiver1.address, receiver2.address],
                amounts: [ethers.utils.parseEther('100'), ethers.utils.parseEther('200')],
                endAts: [currentTimestamp + 100, currentTimestamp + 1000],
                notes:  ['data1', 'data2'],
            };
            await callDriptributor_DistributeTokensWithTimestamp(
                driptributor,
                deployer,
                admins,
                admin,
                params1,
            );

            const paramsInput2: DistributeTokensWithTimestampParamsInput = {
                receivers: [receiver1.address, receiver2.address],
                amounts: [ethers.utils.parseEther('300'), ethers.utils.parseEther('401')],
                endAts: [currentTimestamp + 200, currentTimestamp + 2000],
                notes: ['data3', 'data4'],
            };
            const params2: DistributeTokensWithTimestampParams = {
                ...paramsInput2,
                signatures: await getDistributeTokensWithTimestampSignatures(driptributor, admins, admin, paramsInput2),
            };

            await expect(getDistributeTokensWithTimestampTx(driptributor, deployer, params2))
                .to.be.revertedWithCustomError(driptributor, 'InsufficientFunds');
        });

        it('4.3.4.5. distributeTokensWithTimestamp unsuccessfully with invalid end timestamp', async () => {
            const { admin, admins, driptributor, receiver1, receiver2, deployer } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            const currentTimestamp = await time.latest();
            await time.setNextBlockTimestamp(currentTimestamp + 10);

            const paramsInput: DistributeTokensWithTimestampParamsInput = {
                receivers: [receiver1.address, receiver2.address],
                amounts: [ethers.utils.parseEther('100'), ethers.utils.parseEther('200')],
                endAts: [currentTimestamp + 10, currentTimestamp + 9],
                notes: ['data1', 'data2'],
            };
            const params: DistributeTokensWithTimestampParams = {
                ...paramsInput,
                signatures: await getDistributeTokensWithTimestampSignatures(driptributor, admins, admin, paramsInput),
            };

            await expect(getDistributeTokensWithTimestampTx(driptributor, deployer, params))
                .to.be.revertedWithCustomError(driptributor, 'InvalidTimestamp');
        });
    });
    
    describe('4.3.5. withdraw(uint256[])', async () => {
        it('4.3.5.1. withdraw successfully', async () => {
            const { admin, admins, driptributor, totalAmount, receiver1, receiver2, primaryToken } = await setupBeforeTest({
                updateStakeTokens: true,
                addDistribution: true,
            });

            let distributionIds = [1, 3];
            let currentTimestamp = await time.latest();

            // Distribution 1: [-100, 900]
            // Distribution 3: [0, 2000]

            // Transaction 1
            await time.setNextBlockTimestamp(currentTimestamp + 100);
            let tx1 = await driptributor.connect(receiver1).withdraw(distributionIds);
            await tx1.wait();

            let distribution1 = await driptributor.getDistribution(1);
            let distribution3 = await driptributor.getDistribution(3);

            const vestedAmount1_tx1 = distribution1.totalAmount.mul(currentTimestamp + 100 - distribution1.distributeAt).div(distribution1.vestingDuration);
            const vestedAmount3_tx1 = distribution3.totalAmount.mul(currentTimestamp + 100 - distribution3.distributeAt).div(distribution3.vestingDuration);

            expect(distribution1.totalAmount).to.equal(ethers.utils.parseEther('100'));
            expect(distribution1.withdrawnAmount).to.equal(vestedAmount1_tx1);
            expect(distribution1.receiver).to.equal(receiver1.address);
            expect(distribution1.distributeAt).to.equal(currentTimestamp - 100);
            expect(distribution1.vestingDuration).to.equal(1000);
            expect(distribution1.isStaked).to.equal(false);

            expect(distribution3.withdrawnAmount).to.equal(vestedAmount3_tx1);
            expect(distribution3.totalAmount).to.equal(ethers.utils.parseEther('10'));
            expect(distribution3.receiver).to.equal(receiver1.address);
            expect(distribution3.distributeAt).to.equal(currentTimestamp);
            expect(distribution3.vestingDuration).to.equal(2000);
            expect(distribution3.isStaked).to.equal(false);

            await expect(tx1).to
                .emit(driptributor, 'Withdrawal')
                .withArgs(1, vestedAmount1_tx1)
                .emit(driptributor, 'Withdrawal')
                .withArgs(3, vestedAmount3_tx1);

            expect(await primaryToken.balanceOf(receiver1.address)).to.equal(vestedAmount1_tx1.add(vestedAmount3_tx1));
            expect(await primaryToken.balanceOf(driptributor.address)).to.equal(totalAmount.sub(vestedAmount1_tx1).sub(vestedAmount3_tx1));

            // Transaction 2
            await time.setNextBlockTimestamp(currentTimestamp + 1000);
            let tx2 = await driptributor.connect(receiver1).withdraw(distributionIds);
            await tx2.wait();

            distribution1 = await driptributor.getDistribution(1);
            distribution3 = await driptributor.getDistribution(3);

            const vestedAmount1_tx2 = distribution1.totalAmount
            const vestedAmount3_tx2 = distribution3.totalAmount.mul(currentTimestamp + 1000 - distribution3.distributeAt).div(distribution3.vestingDuration);

            expect(distribution1.totalAmount).to.equal(ethers.utils.parseEther('100'));
            expect(distribution1.withdrawnAmount).to.equal(vestedAmount1_tx2);
            expect(distribution1.receiver).to.equal(receiver1.address);
            expect(distribution1.distributeAt).to.equal(currentTimestamp - 100);
            expect(distribution1.vestingDuration).to.equal(1000);
            expect(distribution1.isStaked).to.equal(false);

            expect(distribution3.withdrawnAmount).to.equal(vestedAmount3_tx2);
            expect(distribution3.totalAmount).to.equal(ethers.utils.parseEther('10'));
            expect(distribution3.receiver).to.equal(receiver1.address);
            expect(distribution3.distributeAt).to.equal(currentTimestamp);
            expect(distribution3.vestingDuration).to.equal(2000);
            expect(distribution3.isStaked).to.equal(false);

            await expect(tx2).to
                .emit(driptributor, 'Withdrawal')
                .withArgs(1, vestedAmount1_tx2.sub(vestedAmount1_tx1))
                .emit(driptributor, 'Withdrawal')
                .withArgs(3, vestedAmount3_tx2.sub(vestedAmount3_tx1));
            
            expect(await primaryToken.balanceOf(receiver1.address)).to.equal(vestedAmount1_tx2.add(vestedAmount3_tx2));
            expect(await primaryToken.balanceOf(driptributor.address)).to.equal(totalAmount.sub(vestedAmount1_tx2).sub(vestedAmount3_tx2));

            // Transaction 3
            await time.setNextBlockTimestamp(currentTimestamp + 1e9);
            let tx3 = await driptributor.connect(receiver1).withdraw(distributionIds);
            await tx3.wait();

            distribution1 = await driptributor.getDistribution(1);
            distribution3 = await driptributor.getDistribution(3);

            const vestedAmount1_tx3 = distribution1.totalAmount
            const vestedAmount3_tx3 = distribution3.totalAmount

            expect(distribution1.totalAmount).to.equal(ethers.utils.parseEther('100'));
            expect(distribution1.withdrawnAmount).to.equal(vestedAmount1_tx3);
            expect(distribution1.receiver).to.equal(receiver1.address);
            expect(distribution1.distributeAt).to.equal(currentTimestamp - 100);
            expect(distribution1.vestingDuration).to.equal(1000);
            expect(distribution1.isStaked).to.equal(false);

            expect(distribution3.withdrawnAmount).to.equal(vestedAmount3_tx3);
            expect(distribution3.totalAmount).to.equal(ethers.utils.parseEther('10'));
            expect(distribution3.receiver).to.equal(receiver1.address);
            expect(distribution3.distributeAt).to.equal(currentTimestamp);
            expect(distribution3.vestingDuration).to.equal(2000);
            expect(distribution3.isStaked).to.equal(false);

            await expect(tx3).to
                .emit(driptributor, 'Withdrawal')
                .withArgs(1, 0)
                .emit(driptributor, 'Withdrawal')
                .withArgs(3, vestedAmount3_tx3.sub(vestedAmount3_tx2));
            
            expect(await primaryToken.balanceOf(receiver1.address)).to.equal(vestedAmount1_tx3.add(vestedAmount3_tx3));
            expect(await primaryToken.balanceOf(driptributor.address)).to.equal(totalAmount.sub(vestedAmount1_tx3).sub(vestedAmount3_tx3));
        });

        it('4.3.5.2. withdraw unsuccessfully with zero vesting duration distribution', async () => {
            const { driptributor, admin, admins, receiver1, primaryToken, totalAmount, deployer } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            const paramsInput: DistributeTokensWithDurationParamsInput = {
                receivers: [receiver1.address],
                amounts: [ethers.utils.parseEther('100')],
                durations: [0],
                notes: ['data1'],
            };
            await callDriptributor_DistributeTokensWithDuration(
                driptributor,
                deployer,
                admins,
                admin,
                paramsInput,
            );
            
            let tx = await driptributor.connect(receiver1).withdraw([1]);
            await tx.wait();

            await expect(tx).to
                .emit(driptributor, 'Withdrawal')
                .withArgs(1, ethers.utils.parseEther('100'));

            let distribution1 = await driptributor.getDistribution(1);
            expect(distribution1.withdrawnAmount).to.equal(ethers.utils.parseEther('100'));

            expect(await primaryToken.balanceOf(receiver1.address)).to.equal(ethers.utils.parseEther('100'));
            expect(await primaryToken.balanceOf(driptributor.address)).to.equal(totalAmount.sub(ethers.utils.parseEther('100')));
        });

        it('4.3.5.3. withdraw unsuccessfully by unauthorized sender', async () => {
            const { driptributor, receiver1, receiver2 } = await setupBeforeTest({
                updateStakeTokens: true,
                addDistribution: true,
            });

            let distributionIds = [1, 2];

            await expect(driptributor.connect(receiver1).withdraw(distributionIds))
                .to.be.revertedWithCustomError(driptributor, 'Unauthorized');
            await expect(driptributor.connect(receiver2).withdraw(distributionIds))
                .to.be.revertedWithCustomError(driptributor, 'Unauthorized');
        });

        it('4.3.5.4. withdraw unsuccessfully with staked distribution', async () => {
            const { driptributor, receiver1 } = await setupBeforeTest({
                updateStakeTokens: true,
                addDistribution: true,
            });

            let distributionIds = [1, 3];
            await driptributor.connect(receiver1).stake(distributionIds, 0, 0);

            await expect(driptributor.connect(receiver1).withdraw(distributionIds))
                .to.be.revertedWithCustomError(driptributor, 'AlreadyStaked');
        });

        it('4.3.5.5. withdraw unsuccessfully when paused', async () => {
            const { driptributor, receiver1 } = await setupBeforeTest({
                updateStakeTokens: true,
                addDistribution: true,
                pause: true,
            });

            let distributionIds = [1, 3];

            await expect(driptributor.connect(receiver1).withdraw(distributionIds))
                .to.be.revertedWith('Pausable: paused');            
        });
    });

    describe('4.3.6. stake(uint256[], uint256, uint256)', async () => {
        it('4.3.6.1. stake successfully with fresh distributions', async () => {
            const { driptributor, receiver1, primaryToken, stakeToken1, stakeToken2, stakeToken3 } = await setupBeforeTest({
                updateStakeTokens: true,
                addDistribution: true,
            });

            let distributionIds = [1, 3];
            // Total value: 110 ETH

            let tx = await driptributor.connect(receiver1).stake(
                distributionIds,
                ethers.utils.parseEther('40'),
                ethers.utils.parseEther('20')
            );
            await tx.wait();

            await expect(tx).to
                .emit(driptributor, 'Stake')
                .withArgs(distributionIds, ethers.utils.parseEther('40'), ethers.utils.parseEther('20'), ethers.utils.parseEther('50'));

            let distribution1 = await driptributor.getDistribution(1);
            let distribution3 = await driptributor.getDistribution(3);

            expect(distribution1.isStaked).to.equal(true);
            expect(distribution3.isStaked).to.equal(true);

            expect(await primaryToken.balanceOf(receiver1.address)).to.equal(0);

            expect(stakeToken1.stake).to.have.been.calledWith(receiver1.address, ethers.utils.parseEther('40'));
            expect(stakeToken2.stake).to.have.been.calledWith(receiver1.address, ethers.utils.parseEther('20'));
            expect(stakeToken3.stake).to.have.been.calledWith(receiver1.address, ethers.utils.parseEther('50'));
        });

        it('4.3.6.2. stake successfully with withdrawn distributions', async () => {
            const { driptributor, receiver1, primaryToken, stakeToken1, stakeToken2, stakeToken3 } = await setupBeforeTest({
                updateStakeTokens: true,
                addDistribution: true,
            });

            let distributionIds = [1, 3];
            // Total value: 110 ETH

            let currentTimestamp = await time.latest();

            await time.setNextBlockTimestamp(currentTimestamp + 100);
            await callTransaction(driptributor.connect(receiver1).withdraw(distributionIds));

            let distribution1 = await driptributor.getDistribution(1);
            let distribution3 = await driptributor.getDistribution(3);

            const vestedAmount1 = distribution1.totalAmount.mul(currentTimestamp + 100 - distribution1.distributeAt).div(distribution1.vestingDuration);
            const vestedAmount3 = distribution3.totalAmount.mul(currentTimestamp + 100 - distribution3.distributeAt).div(distribution3.vestingDuration);

            let tx = await driptributor.connect(receiver1).stake(
                distributionIds,
                ethers.utils.parseEther('40'),
                ethers.utils.parseEther('20')
            );
            await tx.wait();

            const expectedStakeToken3 = ethers.utils.parseEther('50').sub(vestedAmount3).sub(vestedAmount1);

            await expect(tx).to
                .emit(driptributor, 'Stake')
                .withArgs(distributionIds, ethers.utils.parseEther('40'), ethers.utils.parseEther('20'), expectedStakeToken3);

            distribution1 = await driptributor.getDistribution(1);
            distribution3 = await driptributor.getDistribution(3);

            expect(distribution1.isStaked).to.equal(true);
            expect(distribution3.isStaked).to.equal(true);

            expect(await primaryToken.balanceOf(receiver1.address)).to.equal(vestedAmount1.add(vestedAmount3));

            expect(stakeToken1.stake).to.have.been.calledWith(receiver1.address, ethers.utils.parseEther('40'));
            expect(stakeToken2.stake).to.have.been.calledWith(receiver1.address, ethers.utils.parseEther('20'));
            expect(stakeToken3.stake).to.have.been.calledWith(receiver1.address, expectedStakeToken3);
        });

        it('4.3.6.3. stake unsuccessfully when stake tokens are not assigned', async () => {
            const { driptributor, receiver1 } = await setupBeforeTest({
                addDistribution: true,
            });

            let distributionIds = [1, 3];
            await expect(driptributor.connect(receiver1).stake(
                distributionIds,
                ethers.utils.parseEther('40'),
                ethers.utils.parseEther('20')
            )).to.be.revertedWithCustomError(driptributor, 'NotAssignedStakeTokens');
        });

        it('4.3.6.4. stake unsuccessfully by unauthorized sender', async () => {
            const { driptributor, receiver1, receiver2 } = await setupBeforeTest({
                updateStakeTokens: true,
                addDistribution: true,
            });

            let distributionIds = [1, 2];
            await expect(driptributor.connect(receiver1).stake(
                distributionIds,
                ethers.utils.parseEther('40'),
                ethers.utils.parseEther('20')
            )).to.be.revertedWithCustomError(driptributor, 'Unauthorized');
            await expect(driptributor.connect(receiver2).stake(
                distributionIds,
                ethers.utils.parseEther('40'),
                ethers.utils.parseEther('20')
            )).to.be.revertedWithCustomError(driptributor, 'Unauthorized');
        });

        it('4.3.6.5. stake unsuccessfully when distribution is already staked', async () => {
            const { driptributor, receiver1 } = await setupBeforeTest({
                updateStakeTokens: true,
                addDistribution: true,
            });

            let distributionIds = [1, 3];
            await callTransaction(driptributor.connect(receiver1).stake(
                distributionIds,
                ethers.utils.parseEther('40'),
                ethers.utils.parseEther('20')
            ));

            await expect(driptributor.connect(receiver1).stake(
                distributionIds,
                ethers.utils.parseEther('40'),
                ethers.utils.parseEther('20')
            )).to.be.revertedWithCustomError(driptributor, 'AlreadyStaked');
        });

        it('4.3.6.6. stake unsuccessfully when total amount of distributions is insufficient', async () => {
            const { driptributor, receiver1 } = await setupBeforeTest({
                updateStakeTokens: true,
                addDistribution: true,
            });

            let distributionIds = [1, 3];
            await expect(driptributor.connect(receiver1).stake(
                distributionIds,
                ethers.utils.parseEther('100'),
                ethers.utils.parseEther('1000')
            )).to.be.revertedWithCustomError(driptributor, 'InsufficientFunds');
        });

        it('4.3.6.7. stake unsuccessfully when paused', async () => {
            const { driptributor, receiver1 } = await setupBeforeTest({
                updateStakeTokens: true,
                addDistribution: true,
                pause: true,
            });

            let distributionIds = [1, 3];
            await expect(driptributor.connect(receiver1).stake(
                distributionIds,
                ethers.utils.parseEther('40'),
                ethers.utils.parseEther('20'))
            ).to.be.revertedWith('Pausable: paused');
        });
    });
});
