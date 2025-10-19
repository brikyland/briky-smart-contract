import { expect } from 'chai';
import { BigNumber, BigNumberish } from 'ethers';
import { ethers } from 'hardhat';

// @defi-wonderland/smock
import { MockContract, smock } from '@defi-wonderland/smock';

// @nomicfoundation/hardhat-network-helpers
import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';

// @tests/liquidity
import { Initialization as LiquidityInitialization } from '@tests/liquidity/test.initialization';

// @typechain-types
import { Admin, Currency, Driptributor, StakeToken, Treasury, MockPrimaryToken } from '@typechain-types';

// @utils
import { callTransaction, expectRevertWithModifierCustomError, prepareERC20 } from '@utils/blockchain';

// @utils/deployments/common
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployCurrency } from '@utils/deployments/common/currency';

// @utils/deployments/liquidity
import { deployTreasury } from '@utils/deployments/liquidity/treasury';
import { deployDriptributor } from '@utils/deployments/liquidity/driptributor';

// @utils/deployments/mock
import { deployMockPrimaryToken } from '@utils/deployments/mock/liquidity/mockPrimaryToken';

// @utils/models/liquidity
import {
    DistributeTokensWithDurationParams,
    DistributeTokensWithDurationParamsInput,
    DistributeTokensWithTimestampParams,
    DistributeTokensWithTimestampParamsInput,
    UpdateStakeTokensParams,
    UpdateStakeTokensParamsInput,
} from '@utils/models/liquidity/driptributor';

// @utils/signatures/liquidity
import {
    getDistributeTokensWithDurationSignatures,
    getDistributeTokensWithTimestampSignatures,
    getUpdateStakeTokensSignatures,
} from '@utils/signatures/liquidity/driptributor';

// @utils/transaction/common
import { getPausableTxByInput_Pause } from '@utils/transaction/common/pausable';

// @utils/transaction/liquidity
import {
    getDriptributorTx_DistributeTokensWithDuration,
    getDriptributorTx_DistributeTokensWithTimestamp,
    getDriptributorTx_Stake,
    getDriptributorTx_UpdateStakeTokens,
    getDriptributorTx_Withdraw,
    getDriptributorTxByInput_DistributeTokensWithDuration,
    getDriptributorTxByInput_DistributeTokensWithTimestamp,
    getDriptributorTxByInput_UpdateStakeTokens,
} from '@utils/transaction/liquidity/driptributor';
import { getPrimaryTokenTxByInput_UpdateStakeTokens } from '@utils/transaction/liquidity/primaryToken';

interface DriptributorFixture {
    deployer: any;
    admins: any[];
    receiver1: any;
    receiver2: any;
    receiver3: any;

    admin: Admin;
    currency: Currency;
    treasury: Treasury;
    primaryToken: MockPrimaryToken;
    stakeToken1: MockContract<StakeToken>;
    stakeToken2: MockContract<StakeToken>;
    stakeToken3: MockContract<StakeToken>;
    driptributor: Driptributor;

    totalAmount: BigNumber;
}

describe('4.3. Driptributor', async () => {
    async function driptributorFixture(): Promise<DriptributorFixture> {
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

        const primaryToken = (await deployMockPrimaryToken(
            deployer,
            admin.address,
            LiquidityInitialization.PRIMARY_TOKEN_Name,
            LiquidityInitialization.PRIMARY_TOKEN_Symbol,
            LiquidityInitialization.PRIMARY_TOKEN_LiquidationUnlockedAt
        )) as MockPrimaryToken;

        const treasury = (await deployTreasury(
            deployer,
            admin.address,
            currency.address,
            primaryToken.address
        )) as Treasury;

        const SmockStakeTokenFactory = (await smock.mock('StakeToken')) as any;
        const stakeToken1 = await SmockStakeTokenFactory.deploy();
        await callTransaction(
            stakeToken1.initialize(
                admin.address,
                primaryToken.address,
                LiquidityInitialization.STAKE_TOKEN_Name_1,
                LiquidityInitialization.STAKE_TOKEN_Symbol_1,
                LiquidityInitialization.STAKE_TOKEN_FeeRate
            )
        );

        const SmockStakeTokenFactory2 = (await smock.mock('StakeToken')) as any;
        const stakeToken2 = await SmockStakeTokenFactory2.deploy();
        await callTransaction(
            stakeToken2.initialize(
                admin.address,
                primaryToken.address,
                LiquidityInitialization.STAKE_TOKEN_Name_2,
                LiquidityInitialization.STAKE_TOKEN_Symbol_2,
                LiquidityInitialization.STAKE_TOKEN_FeeRate
            )
        );

        const SmockStakeTokenFactory3 = (await smock.mock('StakeToken')) as any;
        const stakeToken3 = await SmockStakeTokenFactory3.deploy();
        await callTransaction(
            stakeToken3.initialize(
                admin.address,
                primaryToken.address,
                LiquidityInitialization.STAKE_TOKEN_Name_3,
                LiquidityInitialization.STAKE_TOKEN_Symbol_3,
                LiquidityInitialization.STAKE_TOKEN_FeeRate
            )
        );

        const totalAmount = ethers.utils.parseEther('1000');

        const driptributor = (await deployDriptributor(
            deployer,
            admin.address,
            primaryToken.address,
            totalAmount
        )) as Driptributor;

        await primaryToken.mint(driptributor.address, totalAmount);

        await callTransaction(
            getPrimaryTokenTxByInput_UpdateStakeTokens(
                primaryToken,
                deployer,
                {
                    stakeToken1: stakeToken1.address,
                    stakeToken2: stakeToken2.address,
                    stakeToken3: stakeToken3.address,
                },
                admin,
                admins
            )
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
    }

    async function setupBeforeTest({
        updateStakeTokens = false,
        addDistribution = false,
        pause = false,
    } = {}): Promise<DriptributorFixture> {
        const fixture = await loadFixture(driptributorFixture);

        const {
            deployer,
            admin,
            driptributor,
            admins,
            stakeToken1,
            stakeToken2,
            stakeToken3,
            receiver1,
            receiver2,
            treasury,
            currency,
        } = fixture;

        await prepareERC20(currency, [deployer], [treasury], ethers.utils.parseEther('1000000'));
        await treasury.provideLiquidity(ethers.utils.parseEther('1000000'));

        if (updateStakeTokens) {
            await callTransaction(
                getDriptributorTxByInput_UpdateStakeTokens(
                    driptributor,
                    deployer,
                    {
                        stakeToken1: stakeToken1.address,
                        stakeToken2: stakeToken2.address,
                        stakeToken3: stakeToken3.address,
                    },
                    admin,
                    admins
                )
            );
        }

        let currentTimestamp = (await time.latest()) + 1000;

        if (addDistribution) {
            await time.setNextBlockTimestamp(currentTimestamp);
            await callTransaction(
                getDriptributorTxByInput_DistributeTokensWithDuration(
                    driptributor,
                    deployer,
                    {
                        receivers: [receiver1.address, receiver2.address],
                        amounts: [ethers.utils.parseEther('100'), ethers.utils.parseEther('200')],
                        durations: [1000, 10000],
                        notes: ['data1', 'data2'],
                    },
                    admin,
                    admins
                )
            );

            await time.setNextBlockTimestamp(currentTimestamp + 100);
            await callTransaction(
                getDriptributorTxByInput_DistributeTokensWithDuration(
                    driptributor,
                    deployer,
                    {
                        receivers: [receiver1.address, receiver2.address],
                        amounts: [ethers.utils.parseEther('10'), ethers.utils.parseEther('20')],
                        durations: [2000, 20000],
                        notes: ['data3', 'data4'],
                    },
                    admin,
                    admins
                )
            );
        }

        if (pause) {
            await callTransaction(getPausableTxByInput_Pause(driptributor, deployer, admin, admins));
        }

        return {
            ...fixture,
        };
    }

    /* --- Initialization --- */
    describe('4.3.1. initialize(address,address,uint256)', async () => {
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

    /* --- Administration --- */
    describe('4.3.2. updateStakeTokens(address,address,address,bytes[])', async () => {
        it('4.3.2.1. Update stake tokens successfully', async () => {
            const { deployer, admin, admins, driptributor, stakeToken1, stakeToken2, stakeToken3 } =
                await setupBeforeTest();

            const paramsInput: UpdateStakeTokensParamsInput = {
                stakeToken1: stakeToken1.address,
                stakeToken2: stakeToken2.address,
                stakeToken3: stakeToken3.address,
            };
            const tx = await getDriptributorTxByInput_UpdateStakeTokens(
                driptributor,
                deployer,
                paramsInput,
                admin,
                admins
            );
            await tx.wait();

            expect(await driptributor.stakeToken1()).to.equal(stakeToken1.address);
            expect(await driptributor.stakeToken2()).to.equal(stakeToken2.address);
            expect(await driptributor.stakeToken3()).to.equal(stakeToken3.address);
        });

        it('4.3.2.2. Update stake tokens unsuccessfully with invalid signatures', async () => {
            const { deployer, admin, admins, driptributor, stakeToken1, stakeToken2, stakeToken3 } =
                await setupBeforeTest();

            const paramsInput: UpdateStakeTokensParamsInput = {
                stakeToken1: stakeToken1.address,
                stakeToken2: stakeToken2.address,
                stakeToken3: stakeToken3.address,
            };
            const params: UpdateStakeTokensParams = {
                ...paramsInput,
                signatures: await getUpdateStakeTokensSignatures(driptributor, paramsInput, admin, admins, false),
            };
            await expect(
                getDriptributorTx_UpdateStakeTokens(driptributor, deployer, params)
            ).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        async function testForInvalidInput(
            fixture: DriptributorFixture,
            stakeToken1: string,
            stakeToken2: string,
            stakeToken3: string
        ) {
            const { admin, admins, driptributor, deployer } = fixture;
            const paramsInput: UpdateStakeTokensParamsInput = {
                stakeToken1: stakeToken1,
                stakeToken2: stakeToken2,
                stakeToken3: stakeToken3,
            };
            await expect(
                getDriptributorTxByInput_UpdateStakeTokens(driptributor, deployer, paramsInput, admin, admins)
            ).to.be.revertedWithCustomError(driptributor, 'InvalidUpdating');
        }

        it('4.3.2.3. Update stake tokens unsuccessfully with zero address stake tokens', async () => {
            const fixture = await setupBeforeTest();
            const { stakeToken1, stakeToken2, stakeToken3 } = fixture;

            await testForInvalidInput(fixture, ethers.constants.AddressZero, stakeToken2.address, stakeToken3.address);
            await testForInvalidInput(fixture, stakeToken1.address, ethers.constants.AddressZero, stakeToken3.address);
            await testForInvalidInput(fixture, stakeToken1.address, stakeToken2.address, ethers.constants.AddressZero);
        });

        it('4.3.2.4. Update stake tokens unsuccessfully with already updated stake tokens', async () => {
            const fixture = await setupBeforeTest({
                updateStakeTokens: true,
            });
            const { stakeToken1, stakeToken2, stakeToken3 } = fixture;
            await testForInvalidInput(fixture, stakeToken1.address, stakeToken2.address, stakeToken3.address);
        });
    });

    describe('4.3.3. distributeTokensWithDuration(address[],uint256[],uint40[],string[],bytes[])', async () => {
        it('4.3.3.1. Distribute tokens with duration successfully with valid signatures', async () => {
            const { deployer, admin, admins, driptributor, totalAmount, receiver1, receiver2 } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            let currentTimestamp = (await time.latest()) + 1000;

            const paramsInput1: DistributeTokensWithDurationParamsInput = {
                receivers: [receiver1.address, receiver2.address],
                amounts: [ethers.utils.parseEther('100'), ethers.utils.parseEther('200')],
                durations: [100, 1000],
                notes: ['data1', 'data2'],
            };
            await time.setNextBlockTimestamp(currentTimestamp);
            const tx1 = await getDriptributorTxByInput_DistributeTokensWithDuration(
                driptributor,
                deployer,
                paramsInput1,
                admin,
                admins
            );
            await tx1.wait();

            await expect(tx1)
                .to.emit(driptributor, 'NewDistribution')
                .withArgs(
                    1,
                    paramsInput1.receivers[0],
                    currentTimestamp,
                    paramsInput1.durations[0],
                    paramsInput1.amounts[0],
                    paramsInput1.notes[0]
                );
            await expect(tx1)
                .to.emit(driptributor, 'NewDistribution')
                .withArgs(
                    2,
                    paramsInput1.receivers[1],
                    currentTimestamp,
                    paramsInput1.durations[1],
                    paramsInput1.amounts[1],
                    paramsInput1.notes[1]
                );

            expect(await driptributor.totalAllocation()).to.equal(totalAmount);
            expect(await driptributor.distributedAmount()).to.equal(ethers.utils.parseEther('300'));

            const distribution1 = await driptributor.getDistribution(1);
            expect(distribution1.totalAmount).to.equal(paramsInput1.amounts[0]);
            expect(distribution1.withdrawnAmount).to.equal(0);
            expect(distribution1.receiver).to.equal(paramsInput1.receivers[0]);
            expect(distribution1.distributeAt).to.equal(currentTimestamp);
            expect(distribution1.vestingDuration).to.equal(paramsInput1.durations[0]);
            expect(distribution1.isStaked).to.equal(false);

            const distribution2 = await driptributor.getDistribution(2);
            expect(distribution2.totalAmount).to.equal(paramsInput1.amounts[1]);
            expect(distribution2.withdrawnAmount).to.equal(0);
            expect(distribution2.receiver).to.equal(paramsInput1.receivers[1]);
            expect(distribution2.distributeAt).to.equal(currentTimestamp);
            expect(distribution2.vestingDuration).to.equal(paramsInput1.durations[1]);
            expect(distribution2.isStaked).to.equal(false);

            currentTimestamp += 100;

            const paramsInput2: DistributeTokensWithDurationParamsInput = {
                receivers: [receiver1.address, receiver2.address],
                amounts: [ethers.utils.parseEther('10'), ethers.utils.parseEther('20')],
                durations: [200, 2000],
                notes: ['data3', 'data4'],
            };
            await time.setNextBlockTimestamp(currentTimestamp);
            const tx2 = await getDriptributorTxByInput_DistributeTokensWithDuration(
                driptributor,
                deployer,
                paramsInput2,
                admin,
                admins
            );
            await tx2.wait();

            await expect(tx2)
                .to.emit(driptributor, 'NewDistribution')
                .withArgs(
                    3,
                    paramsInput2.receivers[0],
                    currentTimestamp,
                    paramsInput2.durations[0],
                    paramsInput2.amounts[0],
                    paramsInput2.notes[0]
                );
            await expect(tx2)
                .to.emit(driptributor, 'NewDistribution')
                .withArgs(
                    4,
                    paramsInput2.receivers[1],
                    currentTimestamp,
                    paramsInput2.durations[1],
                    paramsInput2.amounts[1],
                    paramsInput2.notes[1]
                );

            expect(await driptributor.totalAllocation()).to.equal(totalAmount);
            expect(await driptributor.distributedAmount()).to.equal(ethers.utils.parseEther('330'));

            const distribution3 = await driptributor.getDistribution(3);
            expect(distribution3.totalAmount).to.equal(paramsInput2.amounts[0]);
            expect(distribution3.withdrawnAmount).to.equal(0);
            expect(distribution3.receiver).to.equal(paramsInput2.receivers[0]);
            expect(distribution3.distributeAt).to.equal(currentTimestamp);
            expect(distribution3.vestingDuration).to.equal(paramsInput2.durations[0]);
            expect(distribution3.isStaked).to.equal(false);

            const distribution4 = await driptributor.getDistribution(4);
            expect(distribution4.totalAmount).to.equal(paramsInput2.amounts[1]);
            expect(distribution4.withdrawnAmount).to.equal(0);
            expect(distribution4.receiver).to.equal(paramsInput2.receivers[1]);
            expect(distribution4.distributeAt).to.equal(currentTimestamp);
            expect(distribution4.vestingDuration).to.equal(paramsInput2.durations[1]);
            expect(distribution4.isStaked).to.equal(false);
        });

        it('4.3.3.2. Distribute tokens with duration unsuccessfully with invalid signatures', async () => {
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
                signatures: await getDistributeTokensWithDurationSignatures(
                    driptributor,
                    paramsInput,
                    admin,
                    admins,
                    false
                ),
            };
            await expect(
                getDriptributorTx_DistributeTokensWithDuration(driptributor, deployer, params)
            ).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('4.3.3.3. Distribute tokens with duration unsuccessfully with invalid input', async () => {
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
                await expect(
                    getDriptributorTxByInput_DistributeTokensWithDuration(
                        driptributor,
                        deployer,
                        paramsInput,
                        admin,
                        admins
                    )
                ).to.be.revertedWithCustomError(driptributor, 'InvalidInput');
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

        it('4.3.3.4. Distribute tokens with duration unsuccessfully with insufficient funds', async () => {
            const { deployer, admin, admins, driptributor, receiver1, receiver2 } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            await getDriptributorTxByInput_DistributeTokensWithDuration(
                driptributor,
                deployer,
                {
                    receivers: [receiver1.address, receiver2.address],
                    amounts: [ethers.utils.parseEther('100'), ethers.utils.parseEther('200')],
                    durations: [100, 1000],
                    notes: ['data1', 'data2'],
                },
                admin,
                admins
            );

            await expect(
                getDriptributorTxByInput_DistributeTokensWithDuration(
                    driptributor,
                    deployer,
                    {
                        receivers: [receiver1.address, receiver2.address],
                        amounts: [ethers.utils.parseEther('300'), ethers.utils.parseEther('401')],
                        durations: [200, 2000],
                        notes: ['data3', 'data4'],
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(driptributor, 'InsufficientFunds');
        });
    });

    describe('4.3.4. distributeTokensWithTimestamp(address[],uint256[],uint40[],string[],bytes[])', async () => {
        it('4.3.4.1. Distribute tokens with timestamp successfully with valid signatures', async () => {
            const { deployer, admin, admins, driptributor, totalAmount, receiver1, receiver2 } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            let currentTimestamp = (await time.latest()) + 1000;

            const paramsInput1: DistributeTokensWithTimestampParamsInput = {
                receivers: [receiver1.address, receiver2.address],
                amounts: [ethers.utils.parseEther('100'), ethers.utils.parseEther('200')],
                endAts: [currentTimestamp + 100, currentTimestamp + 1000],
                notes: ['data1', 'data2'],
            };
            await time.setNextBlockTimestamp(currentTimestamp);
            const tx1 = await getDriptributorTxByInput_DistributeTokensWithTimestamp(
                driptributor,
                deployer,
                paramsInput1,
                admin,
                admins
            );
            await tx1.wait();

            await expect(tx1)
                .to.emit(driptributor, 'NewDistribution')
                .withArgs(1, receiver1.address, currentTimestamp, 100, ethers.utils.parseEther('100'), 'data1')
                .emit(driptributor, 'NewDistribution')
                .withArgs(2, receiver2.address, currentTimestamp, 1000, ethers.utils.parseEther('200'), 'data2');

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

            const paramsInput2: DistributeTokensWithTimestampParamsInput = {
                receivers: [receiver1.address, receiver2.address],
                amounts: [ethers.utils.parseEther('10'), ethers.utils.parseEther('20')],
                endAts: [currentTimestamp + 200, currentTimestamp + 2000],
                notes: ['data3', 'data4'],
            };
            await time.setNextBlockTimestamp(currentTimestamp);
            const tx2 = await getDriptributorTxByInput_DistributeTokensWithTimestamp(
                driptributor,
                deployer,
                paramsInput2,
                admin,
                admins
            );
            await tx2.wait();

            await expect(tx2)
                .to.emit(driptributor, 'NewDistribution')
                .withArgs(3, receiver1.address, currentTimestamp, 200, ethers.utils.parseEther('10'), 'data3')
                .emit(driptributor, 'NewDistribution')
                .withArgs(4, receiver2.address, currentTimestamp, 2000, ethers.utils.parseEther('20'), 'data4');

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

        it('4.3.4.2. Distribute tokens with timestamp unsuccessfully with invalid signatures', async () => {
            const { deployer, admin, admins, driptributor, receiver1, receiver2 } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            let currentTimestamp = (await time.latest()) + 1000;

            const paramsInput: DistributeTokensWithTimestampParamsInput = {
                receivers: [receiver1.address, receiver2.address],
                amounts: [ethers.utils.parseEther('100'), ethers.utils.parseEther('200')],
                endAts: [currentTimestamp + 100, currentTimestamp + 1000],
                notes: ['data1', 'data2'],
            };
            const params: DistributeTokensWithTimestampParams = {
                ...paramsInput,
                signatures: await getDistributeTokensWithTimestampSignatures(
                    driptributor,
                    paramsInput,
                    admin,
                    admins,
                    false
                ),
            };
            await expect(
                getDriptributorTx_DistributeTokensWithTimestamp(driptributor, deployer, params)
            ).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('4.3.4.3. Distribute tokens with timestamp unsuccessfully with invalid input', async () => {
            const { admin, admins, driptributor, receiver1, receiver2, deployer } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            let currentTimestamp = (await time.latest()) + 1000;

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
                await expect(
                    getDriptributorTxByInput_DistributeTokensWithTimestamp(
                        driptributor,
                        deployer,
                        paramsInput,
                        admin,
                        admins
                    )
                ).to.be.revertedWithCustomError(driptributor, 'InvalidInput');
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

        it('4.3.4.4. Distribute tokens with timestamp unsuccessfully with insufficient funds', async () => {
            const { admin, admins, driptributor, receiver1, receiver2, deployer } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            let currentTimestamp = (await time.latest()) + 1000;

            await callTransaction(
                getDriptributorTxByInput_DistributeTokensWithTimestamp(
                    driptributor,
                    deployer,
                    {
                        receivers: [receiver1.address, receiver2.address],
                        amounts: [ethers.utils.parseEther('100'), ethers.utils.parseEther('200')],
                        endAts: [currentTimestamp + 100, currentTimestamp + 1000],
                        notes: ['data1', 'data2'],
                    },
                    admin,
                    admins
                )
            );

            await expect(
                getDriptributorTxByInput_DistributeTokensWithTimestamp(
                    driptributor,
                    deployer,
                    {
                        receivers: [receiver1.address, receiver2.address],
                        amounts: [ethers.utils.parseEther('300'), ethers.utils.parseEther('401')],
                        endAts: [currentTimestamp + 200, currentTimestamp + 2000],
                        notes: ['data3', 'data4'],
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(driptributor, 'InsufficientFunds');
        });

        it('4.3.4.5. DistributeTokensWithTimestamp unsuccessfully with invalid end timestamp', async () => {
            const { admin, admins, driptributor, receiver1, receiver2, deployer } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            const currentTimestamp = await time.latest();
            await time.setNextBlockTimestamp(currentTimestamp + 10);

            await expect(
                getDriptributorTxByInput_DistributeTokensWithTimestamp(
                    driptributor,
                    deployer,
                    {
                        receivers: [receiver1.address, receiver2.address],
                        amounts: [ethers.utils.parseEther('100'), ethers.utils.parseEther('200')],
                        endAts: [currentTimestamp + 10, currentTimestamp + 9],
                        notes: ['data1', 'data2'],
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(driptributor, 'InvalidTimestamp');
        });
    });

    /* --- Query --- */
    describe('4.3.5. getDistribution(uint256)', async () => {
        it('4.3.5.1. Revert with invalid distribution id', async () => {
            const { driptributor } = await setupBeforeTest();

            await expectRevertWithModifierCustomError(driptributor, driptributor.getDistribution(0), 'InvalidDistributionId');
            await expectRevertWithModifierCustomError(
                driptributor,
                driptributor.getDistribution(100),
                'InvalidDistributionId'
            );
        });
    });

    /* --- Command --- */
    describe('4.3.6. withdraw(uint256[])', async () => {
        it('4.3.6.1. Withdraw successfully', async () => {
            const { driptributor, totalAmount, receiver1, primaryToken } = await setupBeforeTest({
                updateStakeTokens: true,
                addDistribution: true,
            });

            let distributionIds = [1, 3];
            let currentTimestamp = await time.latest();

            // Distribution 1: [-100, 900]
            // Distribution 3: [0, 2000]

            // Transaction 1
            await time.setNextBlockTimestamp(currentTimestamp + 100);
            let tx1 = await getDriptributorTx_Withdraw(driptributor, receiver1, {
                distributionIds,
            });
            await tx1.wait();

            let distribution1 = await driptributor.getDistribution(1);
            let distribution3 = await driptributor.getDistribution(3);

            const vestedAmount1_tx1 = distribution1.totalAmount
                .mul(currentTimestamp + 100 - distribution1.distributeAt)
                .div(distribution1.vestingDuration);
            const vestedAmount3_tx1 = distribution3.totalAmount
                .mul(currentTimestamp + 100 - distribution3.distributeAt)
                .div(distribution3.vestingDuration);

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

            await expect(tx1)
                .to.emit(driptributor, 'Withdrawal')
                .withArgs(1, vestedAmount1_tx1)
                .emit(driptributor, 'Withdrawal')
                .withArgs(3, vestedAmount3_tx1);

            expect(await primaryToken.balanceOf(receiver1.address)).to.equal(vestedAmount1_tx1.add(vestedAmount3_tx1));
            expect(await primaryToken.balanceOf(driptributor.address)).to.equal(
                totalAmount.sub(vestedAmount1_tx1).sub(vestedAmount3_tx1)
            );

            // Transaction 2
            await time.setNextBlockTimestamp(currentTimestamp + 1000);
            let tx2 = await getDriptributorTx_Withdraw(driptributor, receiver1, {
                distributionIds,
            });
            await tx2.wait();

            distribution1 = await driptributor.getDistribution(1);
            distribution3 = await driptributor.getDistribution(3);

            const vestedAmount1_tx2 = distribution1.totalAmount;
            const vestedAmount3_tx2 = distribution3.totalAmount
                .mul(currentTimestamp + 1000 - distribution3.distributeAt)
                .div(distribution3.vestingDuration);

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

            await expect(tx2)
                .to.emit(driptributor, 'Withdrawal')
                .withArgs(1, vestedAmount1_tx2.sub(vestedAmount1_tx1))
                .emit(driptributor, 'Withdrawal')
                .withArgs(3, vestedAmount3_tx2.sub(vestedAmount3_tx1));

            expect(await primaryToken.balanceOf(receiver1.address)).to.equal(vestedAmount1_tx2.add(vestedAmount3_tx2));
            expect(await primaryToken.balanceOf(driptributor.address)).to.equal(
                totalAmount.sub(vestedAmount1_tx2).sub(vestedAmount3_tx2)
            );

            // Transaction 3
            await time.setNextBlockTimestamp(currentTimestamp + 1e9);
            let tx3 = await getDriptributorTx_Withdraw(driptributor, receiver1, {
                distributionIds,
            });
            await tx3.wait();

            distribution1 = await driptributor.getDistribution(1);
            distribution3 = await driptributor.getDistribution(3);

            const vestedAmount1_tx3 = distribution1.totalAmount;
            const vestedAmount3_tx3 = distribution3.totalAmount;

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

            await expect(tx3)
                .to.emit(driptributor, 'Withdrawal')
                .withArgs(1, 0)
                .emit(driptributor, 'Withdrawal')
                .withArgs(3, vestedAmount3_tx3.sub(vestedAmount3_tx2));

            expect(await primaryToken.balanceOf(receiver1.address)).to.equal(vestedAmount1_tx3.add(vestedAmount3_tx3));
            expect(await primaryToken.balanceOf(driptributor.address)).to.equal(
                totalAmount.sub(vestedAmount1_tx3).sub(vestedAmount3_tx3)
            );
        });

        it('4.3.6.2. Withdraw unsuccessfully with zero vesting duration distribution', async () => {
            const { deployer, driptributor, admin, admins, receiver1, primaryToken, totalAmount } =
                await setupBeforeTest({
                    updateStakeTokens: true,
                });

            await callTransaction(
                getDriptributorTxByInput_DistributeTokensWithDuration(
                    driptributor,
                    deployer,
                    {
                        receivers: [receiver1.address],
                        amounts: [ethers.utils.parseEther('100')],
                        durations: [0],
                        notes: ['data1'],
                    },
                    admin,
                    admins
                )
            );

            let tx = await getDriptributorTx_Withdraw(driptributor, receiver1, {
                distributionIds: [1],
            });
            await tx.wait();

            await expect(tx).to.emit(driptributor, 'Withdrawal').withArgs(1, ethers.utils.parseEther('100'));

            let distribution1 = await driptributor.getDistribution(1);
            expect(distribution1.withdrawnAmount).to.equal(ethers.utils.parseEther('100'));

            expect(await primaryToken.balanceOf(receiver1.address)).to.equal(ethers.utils.parseEther('100'));
            expect(await primaryToken.balanceOf(driptributor.address)).to.equal(
                totalAmount.sub(ethers.utils.parseEther('100'))
            );
        });

        it('4.3.6.3. Withdraw unsuccessfully by unauthorized sender', async () => {
            const { driptributor, receiver1, receiver2 } = await setupBeforeTest({
                updateStakeTokens: true,
                addDistribution: true,
            });

            let distributionIds = [1, 2];

            await expect(
                getDriptributorTx_Withdraw(driptributor, receiver1, {
                    distributionIds,
                })
            ).to.be.revertedWithCustomError(driptributor, 'Unauthorized');
            await expect(
                getDriptributorTx_Withdraw(driptributor, receiver2, {
                    distributionIds,
                })
            ).to.be.revertedWithCustomError(driptributor, 'Unauthorized');
        });

        it('4.3.6.4. Withdraw unsuccessfully with staked distribution', async () => {
            const { driptributor, receiver1 } = await setupBeforeTest({
                updateStakeTokens: true,
                addDistribution: true,
            });

            let distributionIds = [1, 3];
            await getDriptributorTx_Stake(driptributor, receiver1, {
                distributionIds,
                stake1: BigNumber.from(0),
                stake2: BigNumber.from(0),
            });

            await expect(
                getDriptributorTx_Withdraw(driptributor, receiver1, {
                    distributionIds,
                })
            ).to.be.revertedWithCustomError(driptributor, 'AlreadyStaked');
        });

        it('4.3.6.5. Withdraw unsuccessfully when paused', async () => {
            const { driptributor, receiver1 } = await setupBeforeTest({
                updateStakeTokens: true,
                addDistribution: true,
                pause: true,
            });

            let distributionIds = [1, 3];

            await expect(
                getDriptributorTx_Withdraw(driptributor, receiver1, {
                    distributionIds,
                })
            ).to.be.revertedWith('Pausable: paused');
        });
    });

    describe('4.3.7. stake(uint256[],uint256,uint256)', async () => {
        it('4.3.7.1. Stake successfully with fresh distributions', async () => {
            const { driptributor, receiver1, primaryToken, stakeToken1, stakeToken2, stakeToken3 } =
                await setupBeforeTest({
                    updateStakeTokens: true,
                    addDistribution: true,
                });

            let distributionIds = [1, 3];
            // Total value: 110 ETH

            let tx = await getDriptributorTx_Stake(driptributor, receiver1, {
                distributionIds,
                stake1: ethers.utils.parseEther('40'),
                stake2: ethers.utils.parseEther('20'),
            });
            await tx.wait();

            await expect(tx)
                .to.emit(driptributor, 'Stake')
                .withArgs(
                    distributionIds,
                    ethers.utils.parseEther('40'),
                    ethers.utils.parseEther('20'),
                    ethers.utils.parseEther('50')
                );

            let distribution1 = await driptributor.getDistribution(1);
            let distribution3 = await driptributor.getDistribution(3);

            expect(distribution1.isStaked).to.equal(true);
            expect(distribution3.isStaked).to.equal(true);

            expect(await primaryToken.balanceOf(receiver1.address)).to.equal(0);

            expect(stakeToken1.stake).to.have.been.calledWith(receiver1.address, ethers.utils.parseEther('40'));
            expect(stakeToken2.stake).to.have.been.calledWith(receiver1.address, ethers.utils.parseEther('20'));
            expect(stakeToken3.stake).to.have.been.calledWith(receiver1.address, ethers.utils.parseEther('50'));
        });

        it('4.3.7.2. Stake successfully with withdrawn distributions', async () => {
            const { driptributor, receiver1, primaryToken, stakeToken1, stakeToken2, stakeToken3 } =
                await setupBeforeTest({
                    updateStakeTokens: true,
                    addDistribution: true,
                });

            let distributionIds = [1, 3];
            // Total value: 110 ETH

            let currentTimestamp = await time.latest();

            await time.setNextBlockTimestamp(currentTimestamp + 100);
            await callTransaction(
                getDriptributorTx_Withdraw(driptributor, receiver1, {
                    distributionIds,
                })
            );

            let distribution1 = await driptributor.getDistribution(1);
            let distribution3 = await driptributor.getDistribution(3);

            const vestedAmount1 = distribution1.totalAmount
                .mul(currentTimestamp + 100 - distribution1.distributeAt)
                .div(distribution1.vestingDuration);
            const vestedAmount3 = distribution3.totalAmount
                .mul(currentTimestamp + 100 - distribution3.distributeAt)
                .div(distribution3.vestingDuration);

            let tx = await getDriptributorTx_Stake(driptributor, receiver1, {
                distributionIds,
                stake1: ethers.utils.parseEther('40'),
                stake2: ethers.utils.parseEther('20'),
            });
            await tx.wait();

            const expectedStakeToken3 = ethers.utils.parseEther('50').sub(vestedAmount3).sub(vestedAmount1);

            await expect(tx)
                .to.emit(driptributor, 'Stake')
                .withArgs(
                    distributionIds,
                    ethers.utils.parseEther('40'),
                    ethers.utils.parseEther('20'),
                    expectedStakeToken3
                );

            distribution1 = await driptributor.getDistribution(1);
            distribution3 = await driptributor.getDistribution(3);

            expect(distribution1.isStaked).to.equal(true);
            expect(distribution3.isStaked).to.equal(true);

            expect(await primaryToken.balanceOf(receiver1.address)).to.equal(vestedAmount1.add(vestedAmount3));

            expect(stakeToken1.stake).to.have.been.calledWith(receiver1.address, ethers.utils.parseEther('40'));
            expect(stakeToken2.stake).to.have.been.calledWith(receiver1.address, ethers.utils.parseEther('20'));
            expect(stakeToken3.stake).to.have.been.calledWith(receiver1.address, expectedStakeToken3);
        });

        it('4.3.7.3. Stake unsuccessfully when stake tokens are not assigned', async () => {
            const { driptributor, receiver1 } = await setupBeforeTest({
                addDistribution: true,
            });

            let distributionIds = [1, 3];
            await expect(
                getDriptributorTx_Stake(driptributor, receiver1, {
                    distributionIds,
                    stake1: ethers.utils.parseEther('40'),
                    stake2: ethers.utils.parseEther('20'),
                })
            ).to.be.revertedWithCustomError(driptributor, 'NotAssignedStakeTokens');
        });

        it('4.3.7.4. Stake unsuccessfully by unauthorized sender', async () => {
            const { driptributor, receiver1, receiver2 } = await setupBeforeTest({
                updateStakeTokens: true,
                addDistribution: true,
            });

            let distributionIds = [1, 2];
            await expect(
                getDriptributorTx_Stake(driptributor, receiver1, {
                    distributionIds,
                    stake1: ethers.utils.parseEther('40'),
                    stake2: ethers.utils.parseEther('20'),
                })
            ).to.be.revertedWithCustomError(driptributor, 'Unauthorized');
            await expect(
                getDriptributorTx_Stake(driptributor, receiver2, {
                    distributionIds,
                    stake1: ethers.utils.parseEther('40'),
                    stake2: ethers.utils.parseEther('20'),
                })
            ).to.be.revertedWithCustomError(driptributor, 'Unauthorized');
        });

        it('4.3.7.5. Stake unsuccessfully with already staked distribution', async () => {
            const { driptributor, receiver1 } = await setupBeforeTest({
                updateStakeTokens: true,
                addDistribution: true,
            });

            let distributionIds = [1, 3];
            await callTransaction(
                getDriptributorTx_Stake(driptributor, receiver1, {
                    distributionIds,
                    stake1: ethers.utils.parseEther('40'),
                    stake2: ethers.utils.parseEther('20'),
                })
            );

            await expect(
                getDriptributorTx_Stake(driptributor, receiver1, {
                    distributionIds,
                    stake1: ethers.utils.parseEther('40'),
                    stake2: ethers.utils.parseEther('20'),
                })
            ).to.be.revertedWithCustomError(driptributor, 'AlreadyStaked');
        });

        it('4.3.7.6. Stake unsuccessfully when total amount of distributions is insufficient', async () => {
            const { driptributor, receiver1 } = await setupBeforeTest({
                updateStakeTokens: true,
                addDistribution: true,
            });

            let distributionIds = [1, 3];
            await expect(
                getDriptributorTx_Stake(driptributor, receiver1, {
                    distributionIds,
                    stake1: ethers.utils.parseEther('400'),
                    stake2: ethers.utils.parseEther('200'),
                })
            ).to.be.revertedWithCustomError(driptributor, 'InsufficientFunds');
        });

        it('4.3.7.7. Stake unsuccessfully when paused', async () => {
            const { driptributor, receiver1 } = await setupBeforeTest({
                updateStakeTokens: true,
                addDistribution: true,
                pause: true,
            });

            let distributionIds = [1, 3];
            await expect(
                getDriptributorTx_Stake(driptributor, receiver1, {
                    distributionIds,
                    stake1: ethers.utils.parseEther('40'),
                    stake2: ethers.utils.parseEther('20'),
                })
            ).to.be.revertedWith('Pausable: paused');
        });
    });
});
