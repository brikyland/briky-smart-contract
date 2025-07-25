import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Admin, Currency, MockPrimaryToken, MockPrimaryToken__factory, MockStakeToken, MockStakeToken__factory, Treasury } from '@typechain-types';
import { callTransaction, getSignatures, prepareERC20 } from '@utils/blockchain';
import { deployAdmin } from '@utils/deployments/common/admin';
import { Constant } from '@tests/test.constant';
import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import { deployCurrency } from '@utils/deployments/common/currency';
import { deployTreasury } from '@utils/deployments/land/treasury';
import { callStakeToken_Pause, callStakeToken_UpdateFeeRate } from '@utils/callWithSignatures/stakeToken';
import { callStakeToken_InitializeRewarding } from '@utils/callWithSignatures/stakeToken';
import { callPrimaryToken_UpdateStakeTokens, callPrimaryToken_UpdateTreasury } from '@utils/callWithSignatures/primary';
import { MockContract, smock } from '@defi-wonderland/smock';
import { getStakingFee } from '@utils/formula';
import { expectBetween, expectEqualWithErrorMargin } from '@utils/testHelper';
import { BigNumber, Wallet } from 'ethers';
import { randomArrayWithSum, randomBigNumber, randomInt, shuffle } from '@utils/utils';
import { StakeTokenOperation } from '@utils/models/enums';
import { Initialization as LiquidityInitialization } from '@tests/liquidity/test.initialization';

interface StakeTokenFixture {
    deployer: any;
    admins: any[];
    admin: Admin;
    currency: Currency;
    primaryToken: MockContract<MockPrimaryToken>;
    stakeToken1: MockContract<MockStakeToken>;
    stakeToken2: MockContract<MockStakeToken>;
    stakeToken3: MockContract<MockStakeToken>;
    treasury: Treasury;

    initialLastRewardFetch: number;
    staker1: any;
    staker2: any;
    staker3: any;
}

describe('4.5. StakeToken', async () => {
    async function stakeTokenFixture(): Promise<StakeTokenFixture> {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        const admins = [];
        for (let i = 1; i <= Constant.ADMIN_NUMBER; ++i) admins.push(accounts[i]);
        const staker1 = accounts[Constant.ADMIN_NUMBER + 1];
        const staker2 = accounts[Constant.ADMIN_NUMBER + 2];
        const staker3 = accounts[Constant.ADMIN_NUMBER + 3];

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
        
        const SmockPrimaryTokenFactory = await smock.mock<MockPrimaryToken__factory>("MockPrimaryToken");
        const primaryToken = await SmockPrimaryTokenFactory.deploy();
        await callTransaction(primaryToken.initialize(
            admin.address,
            LiquidityInitialization.PRIMARY_TOKEN_Name,
            LiquidityInitialization.PRIMARY_TOKEN_Symbol,
            LiquidityInitialization.PRIMARY_TOKEN_LiquidationUnlockedAt,
        ));
        
        const SmockStakeTokenFactory = await smock.mock<MockStakeToken__factory>("MockStakeToken");
        const stakeToken1 = await SmockStakeTokenFactory.deploy();
        await callTransaction(stakeToken1.initialize(
            admin.address,
            primaryToken.address,
            LiquidityInitialization.STAKE_TOKEN_Name_1,
            LiquidityInitialization.STAKE_TOKEN_Symbol_1,
        ));

        const stakeToken2 = await SmockStakeTokenFactory.deploy();
        await callTransaction(stakeToken2.initialize(
            admin.address,
            primaryToken.address,
            LiquidityInitialization.STAKE_TOKEN_Name_2,
            LiquidityInitialization.STAKE_TOKEN_Symbol_2,
        ));

        const stakeToken3 = await SmockStakeTokenFactory.deploy();
        await callTransaction(stakeToken3.initialize(
            admin.address,
            primaryToken.address,
            LiquidityInitialization.STAKE_TOKEN_Name_3,
            LiquidityInitialization.STAKE_TOKEN_Symbol_3,
        ));

        await callPrimaryToken_UpdateStakeTokens(
            primaryToken,
            admins,
            stakeToken1.address,
            stakeToken2.address,
            stakeToken3.address,
            await admin.nonce()
        );

        const treasury = await deployTreasury(
            deployer,
            deployer.address,
            currency.address,
            primaryToken.address,
        ) as Treasury;

        await callPrimaryToken_UpdateTreasury(
            primaryToken,
            admins,
            treasury.address,
            await admin.nonce()
        );

        return {
            deployer,
            admins,
            admin,
            currency,
            primaryToken,
            stakeToken1,
            stakeToken2,
            stakeToken3,
            treasury,
            initialLastRewardFetch: 0,
            staker1,
            staker2,
            staker3,
        };
    };

    async function setupBeforeTest({
        setFeeRate = false,
        initializeRewarding = false,
        prepareCurrencyForStakers = false,
        preparePrimaryTokenForStakers = false,
        pause = false,
    } = {}): Promise<StakeTokenFixture> {
        const fixture = await loadFixture(stakeTokenFixture);
        const { deployer, admin, admins, currency, primaryToken, stakeToken1, stakeToken2, stakeToken3, staker1, staker2, staker3, treasury } = fixture;

        let currentTimestamp = await time.latest() + 100;
        await time.increaseTo(currentTimestamp);

        await prepareERC20(currency, [deployer], [treasury], ethers.utils.parseEther("1000000"));
        await treasury.provideLiquidity(ethers.utils.parseEther("1000000"));

        if (setFeeRate) {
            await callStakeToken_UpdateFeeRate(
                stakeToken1,
                admins,
                LiquidityInitialization.STAKE_TOKEN_FeeRate,
                await admin.nonce()
            );
        }

        let initialLastRewardFetch = 0;
        if (initializeRewarding) {
            initialLastRewardFetch = currentTimestamp;
            await callStakeToken_InitializeRewarding(
                stakeToken1,
                admins,
                initialLastRewardFetch,
                stakeToken2.address,
                await admin.nonce()
            );
            await callStakeToken_InitializeRewarding(
                stakeToken2,
                admins,
                initialLastRewardFetch,
                stakeToken3.address,
                await admin.nonce()
            );
            await callStakeToken_InitializeRewarding(
                stakeToken3,
                admins,
                initialLastRewardFetch,
                ethers.constants.AddressZero,
                await admin.nonce()
            );            
        }

        if (prepareCurrencyForStakers) {
            await prepareERC20(
                currency,
                [staker1, staker2, staker3],
                [stakeToken1 as any, stakeToken2 as any, stakeToken3 as any],
                ethers.utils.parseEther("1000000000")
            );
        }

        if (preparePrimaryTokenForStakers) {
            for (const sender of [staker1, staker2, staker3]) {
                const amount = ethers.utils.parseEther("1000000");
                await callTransaction(primaryToken.selfTransfer(sender.address, amount));
                for (const operator of [stakeToken1, stakeToken2, stakeToken3]) {
                    await callTransaction(primaryToken.connect(sender).increaseAllowance(operator.address, amount));
                }
            }
        }

        if (pause) {
            await callStakeToken_Pause(stakeToken1, admins, await admin.nonce());
        }

        return {
            ...fixture,
            initialLastRewardFetch,
        };
    }

    describe('4.5.1. initialize(address, address, address)', async () => {
        it('4.5.1.1. Deploy successfully', async () => {
            const { admin, primaryToken, stakeToken1, stakeToken2, stakeToken3 } = await setupBeforeTest();

            // StakeToken1
            expect(await stakeToken1.name()).to.equal(LiquidityInitialization.STAKE_TOKEN_Name_1);
            expect(await stakeToken1.symbol()).to.equal(LiquidityInitialization.STAKE_TOKEN_Symbol_1);            

            expect(await stakeToken1.totalSupply()).to.equal(0);
            expect(await stakeToken1.lastRewardFetch()).to.equal(0);

            const feeRate1 = await stakeToken1.getFeeRate();
            expect(feeRate1.value).to.equal(0);
            expect(feeRate1.decimals).to.equal(Constant.COMMON_RATE_DECIMALS);

            expect(await stakeToken1.admin()).to.equal(admin.address);
            expect(await stakeToken1.primaryToken()).to.equal(primaryToken.address);
            expect(await stakeToken1.successor()).to.equal(ethers.constants.AddressZero);

            // StakeToken2
            expect(await stakeToken2.name()).to.equal(LiquidityInitialization.STAKE_TOKEN_Name_2);
            expect(await stakeToken2.symbol()).to.equal(LiquidityInitialization.STAKE_TOKEN_Symbol_2);

            expect(await stakeToken2.totalSupply()).to.equal(0);
            expect(await stakeToken2.lastRewardFetch()).to.equal(0);

            const feeRate2 = await stakeToken2.getFeeRate();
            expect(feeRate2.value).to.equal(0);
            expect(feeRate2.decimals).to.equal(Constant.COMMON_RATE_DECIMALS);

            expect(await stakeToken2.admin()).to.equal(admin.address);
            expect(await stakeToken2.primaryToken()).to.equal(primaryToken.address);
            expect(await stakeToken2.successor()).to.equal(ethers.constants.AddressZero);

            // StakeToken3
            expect(await stakeToken3.name()).to.equal(LiquidityInitialization.STAKE_TOKEN_Name_3);
            expect(await stakeToken3.symbol()).to.equal(LiquidityInitialization.STAKE_TOKEN_Symbol_3);

            expect(await stakeToken3.totalSupply()).to.equal(0);
            expect(await stakeToken3.lastRewardFetch()).to.equal(0);

            const feeRate3 = await stakeToken3.getFeeRate();
            expect(feeRate3.value).to.equal(0);
            expect(feeRate3.decimals).to.equal(Constant.COMMON_RATE_DECIMALS);

            expect(await stakeToken3.admin()).to.equal(admin.address);
            expect(await stakeToken3.primaryToken()).to.equal(primaryToken.address);
            expect(await stakeToken3.successor()).to.equal(ethers.constants.AddressZero);
        });
    });

    describe('4.5.2. initializeRewarding(uint256, address, bytes[])', async () => {
        it('4.5.2.1. initialize rewarding successfully', async () => {
            const { deployer, admin, admins, stakeToken1, stakeToken2 } = await setupBeforeTest();

            let timestamp = await time.latest() + 100;

            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256", "address"],
                [stakeToken1.address, "initializeRewarding", timestamp, stakeToken2.address]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await stakeToken1.initializeRewarding(timestamp, stakeToken2.address, signatures);
            await tx.wait();

            expect(await stakeToken1.lastRewardFetch()).to.equal(timestamp);
            expect(await stakeToken1.successor()).to.equal(stakeToken2.address); 
        });

        it('4.5.2.2. initialize rewarding unsuccessfully with invalid signatures', async () => {
            const { admin, admins, stakeToken1, stakeToken2 } = await setupBeforeTest();

            let timestamp = await time.latest() + 100;

            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256", "address"],
                [stakeToken1.address, "initializeRewarding", timestamp, stakeToken2.address]
            );
            const invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));
            
            await expect(stakeToken1.initializeRewarding(
                timestamp,
                stakeToken2.address,
                invalidSignatures,
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('4.5.2.3. initialize rewarding unsuccessfully when already initialized', async () => {
            const { admin, admins, stakeToken1, stakeToken2 } = await setupBeforeTest({
                initializeRewarding: true,
            });

            let timestamp = await time.latest() + 100;
            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256", "address"],
                [stakeToken1.address, "initializeRewarding", timestamp, stakeToken2.address]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(stakeToken1.initializeRewarding(
                timestamp,
                stakeToken2.address,
                signatures,
            )).to.be.revertedWithCustomError(stakeToken1, 'AlreadyStartedRewarding');
        });
    });

    describe('4.5.3. updateFeeRate(uint256, bytes[])', async () => {
        it('4.5.3.1. updateFeeRate successfully with valid signatures', async () => {
            const { admin, admins, stakeToken1 } = await setupBeforeTest();

            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256"],
                [stakeToken1.address, "updateFeeRate", ethers.utils.parseEther('0.2')]
            );

            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await stakeToken1.updateFeeRate(ethers.utils.parseEther('0.2'), signatures);
            await tx.wait();

            await expect(tx).to
                .emit(stakeToken1, 'FeeRateUpdate')
                .withArgs(ethers.utils.parseEther('0.2'));

            const feeRate = await stakeToken1.getFeeRate();
            expect(feeRate.value).to.equal(ethers.utils.parseEther('0.2'));
            expect(feeRate.decimals).to.equal(Constant.COMMON_RATE_DECIMALS);
        });

        it('4.5.3.2. updateFeeRate unsuccessfully with invalid signatures', async () => {
            const { admin, admins, stakeToken1 } = await setupBeforeTest();

            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256"],
                [stakeToken1.address, "updateFeeRate", ethers.utils.parseEther('0.2')]
            );
            const invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(stakeToken1.updateFeeRate(
                ethers.utils.parseEther('0.2'),
                invalidSignatures
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('4.5.3.3. updateFeeRate unsuccessfully with invalid rate', async () => {
            const { admin, admins, stakeToken1 } = await setupBeforeTest();
            
            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256"],
                [stakeToken1.address, "updateFeeRate", Constant.COMMON_RATE_MAX_FRACTION.add(1)]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(stakeToken1.updateFeeRate(
                Constant.COMMON_RATE_MAX_FRACTION.add(1),
                signatures
            )).to.be.revertedWithCustomError(stakeToken1, 'InvalidRate');
        });
    });

    describe('4.5.4. fetchReward()', async () => {
        it('4.5.4.1. fetchReward successfully for stake token', async () => {
            const { stakeToken1, primaryToken, staker1 } = await setupBeforeTest({
                setFeeRate: true,
                initializeRewarding: true,
                preparePrimaryTokenForStakers: true,
            });
            
            const initialStake = ethers.utils.parseEther("100");
            await callTransaction(stakeToken1.connect(staker1).stake(staker1.address, initialStake));
            
            const reward = Constant.PRIMARY_TOKEN_STAKE_1_WAVE_REWARD;

            let lastRewardFetch = await stakeToken1.lastRewardFetch();
            let currentSupply;

            for(let i = 0; i < 10; ++i) {
                currentSupply = await stakeToken1.totalSupply();

                lastRewardFetch = lastRewardFetch.add(Constant.STAKE_TOKEN_REWARD_FETCH_COOLDOWN);
                await time.setNextBlockTimestamp(lastRewardFetch);
                const tx = await stakeToken1.fetchReward();
                await tx.wait();

                await expect(tx).to
                    .emit(stakeToken1, 'RewardFetch')
                    .withArgs(reward);

                expect(await stakeToken1.totalSupply()).to.equal(currentSupply.add(reward));
                expect(await stakeToken1.lastRewardFetch()).to.equal(lastRewardFetch);
            }
        });

        it('4.5.4.2. fetchReward unsuccessfully when not started rewarding', async () => {
            const { stakeToken1, staker1 } = await setupBeforeTest({
                setFeeRate: true,
                preparePrimaryTokenForStakers: true,
            });

            const initialStake = ethers.utils.parseEther("100");
            await callTransaction(stakeToken1.connect(staker1).stake(staker1.address, initialStake));

            await expect(stakeToken1.fetchReward())
                .to.be.revertedWithCustomError(stakeToken1, 'NotStartedRewarding');
        });

        it('4.5.4.3. fetchReward unsuccessfully when on initial cooldown', async () => {
            const { stakeToken1, staker1 } = await setupBeforeTest({
                setFeeRate: true,
                initializeRewarding: true,
                preparePrimaryTokenForStakers: true,
            });

            const initialStake = ethers.utils.parseEther("100");
            await callTransaction(stakeToken1.connect(staker1).stake(staker1.address, initialStake));

            let lastRewardFetch = await stakeToken1.lastRewardFetch();
            lastRewardFetch = lastRewardFetch.add(Constant.STAKE_TOKEN_REWARD_FETCH_COOLDOWN);
            await expect(stakeToken1.fetchReward())
                .to.be.revertedWithCustomError(stakeToken1, 'OnCoolDown');
        });

        it('4.5.4.4. fetchReward unsuccessfully when on cooldown after fetching reward', async () => {
            const { stakeToken1, staker1 } = await setupBeforeTest({
                setFeeRate: true,
                initializeRewarding: true,
                preparePrimaryTokenForStakers: true,
            });

            const initialStake = ethers.utils.parseEther("100");
            await callTransaction(stakeToken1.connect(staker1).stake(staker1.address, initialStake));

            let lastRewardFetch = await stakeToken1.lastRewardFetch();
            lastRewardFetch = lastRewardFetch.add(Constant.STAKE_TOKEN_REWARD_FETCH_COOLDOWN);
            await time.setNextBlockTimestamp(lastRewardFetch);
            await callTransaction(stakeToken1.fetchReward());

            await expect(stakeToken1.fetchReward())
                .to.be.revertedWithCustomError(stakeToken1, 'OnCoolDown');
        });

        it('4.5.4.5. fetchReward unsuccessfully when stake token has zero stake', async () => {
            const { stakeToken1, staker1 } = await setupBeforeTest({
                setFeeRate: true,
                initializeRewarding: true,
            });

            let lastRewardFetch = await stakeToken1.lastRewardFetch();
            lastRewardFetch = lastRewardFetch.add(Constant.STAKE_TOKEN_REWARD_FETCH_COOLDOWN);
            await time.setNextBlockTimestamp(lastRewardFetch);
            await expect(stakeToken1.fetchReward())
                .to.be.revertedWithCustomError(stakeToken1, 'NoStakeholder');
        });        
    });

    describe('4.5.5. stake(address, uint256)', async () => {
        it('4.5.5.1. stake successfully before stake rewarding completed', async () => {
            const { stakeToken1, staker1, primaryToken } = await setupBeforeTest({
                setFeeRate: true,
                initializeRewarding: true,
                preparePrimaryTokenForStakers: true,
            });

            const initStaker1PrimaryBalance = await primaryToken.balanceOf(staker1.address);
            const initStakeToken1PrimaryBalance = await primaryToken.balanceOf(stakeToken1.address);

            const stakeAmount1 = ethers.utils.parseEther("100");
            const tx1 = (stakeToken1.connect(staker1).stake(staker1.address, stakeAmount1));

            await expect(tx1)
                .to.emit(stakeToken1, 'Stake')
                .withArgs(staker1.address, stakeAmount1);

            expect(await primaryToken.balanceOf(stakeToken1.address)).to.equal(initStakeToken1PrimaryBalance.add(stakeAmount1));
            expect(await primaryToken.balanceOf(staker1.address)).to.equal(initStaker1PrimaryBalance.sub(stakeAmount1));

            expect(await stakeToken1.totalSupply()).to.equal(stakeAmount1);

            const stakeAmount2 = ethers.utils.parseEther("1000");
            const tx2 = (stakeToken1.connect(staker1).stake(staker1.address, stakeAmount2));

            await expect(tx2)
                .to.emit(stakeToken1, 'Stake')
                .withArgs(staker1.address, stakeAmount2);

            expect(await primaryToken.balanceOf(stakeToken1.address))
                .to.equal(initStakeToken1PrimaryBalance.add(stakeAmount1).add(stakeAmount2));
            expect(await primaryToken.balanceOf(staker1.address))
                .to.equal(initStaker1PrimaryBalance.sub(stakeAmount1).sub(stakeAmount2));

            expect(await stakeToken1.totalSupply()).to.equal(stakeAmount1.add(stakeAmount2));

            expectEqualWithErrorMargin(await stakeToken1.balanceOf(staker1.address), stakeAmount1.add(stakeAmount2));
        });

        it('4.5.5.2. stake successfully after stake rewarding completed', async () => {
            const { stakeToken1, staker1, primaryToken, currency, treasury } = await setupBeforeTest({
                setFeeRate: true,
                initializeRewarding: true,
                prepareCurrencyForStakers: true,
                preparePrimaryTokenForStakers: true,
            });

            primaryToken.isStakeRewardingCulminated.returns(true);

            const initStaker1PrimaryBalance = await primaryToken.balanceOf(staker1.address);
            const initStakeToken1PrimaryBalance = await primaryToken.balanceOf(stakeToken1.address);

            const initStaker1CurrencyBalance = await currency.balanceOf(staker1.address);
            const initStakeToken1CurrencyBalance = await currency.balanceOf(stakeToken1.address);
            const initPrimaryTokenCurrencyBalance = await currency.balanceOf(primaryToken.address);
            const initTreasuryCurrencyBalance = await currency.balanceOf(treasury.address);

            const stakeValue1 = ethers.utils.parseEther("100");
            const feeAmount1 = getStakingFee(
                await treasury.liquidity(),
                stakeValue1,
                await primaryToken.totalSupply(),
                (await stakeToken1.getFeeRate()).value
            );

            const tx1 = (stakeToken1.connect(staker1).stake(staker1.address, stakeValue1));

            await expect(tx1)
                .to.emit(stakeToken1, 'Stake')
                .withArgs(staker1.address, stakeValue1);

            expect(await primaryToken.balanceOf(stakeToken1.address)).to.equal(initStakeToken1PrimaryBalance.add(stakeValue1));
            expect(await primaryToken.balanceOf(staker1.address)).to.equal(initStaker1PrimaryBalance.sub(stakeValue1));

            expect(await currency.balanceOf(staker1.address)).to.equal(initStaker1CurrencyBalance.sub(feeAmount1));
            expect(await currency.balanceOf(stakeToken1.address)).to.equal(initStakeToken1CurrencyBalance);
            expect(await currency.balanceOf(primaryToken.address)).to.equal(initPrimaryTokenCurrencyBalance);
            expect(await currency.balanceOf(treasury.address)).to.equal(initTreasuryCurrencyBalance.add(feeAmount1));

            expect(await stakeToken1.totalSupply()).to.equal(stakeValue1);
            
            expectEqualWithErrorMargin(await stakeToken1.balanceOf(staker1.address), stakeValue1);

            const stakeValue2 = ethers.utils.parseEther("1000");
            const feeAmount2 = getStakingFee(
                await treasury.liquidity(),
                stakeValue2,
                await primaryToken.totalSupply(),
                (await stakeToken1.getFeeRate()).value
            );
            
            const tx2 = (stakeToken1.connect(staker1).stake(staker1.address, stakeValue2));

            await expect(tx2)
                .to.emit(stakeToken1, 'Stake')
                .withArgs(staker1.address, stakeValue2);

            expect(await primaryToken.balanceOf(stakeToken1.address))
                .to.equal(initStakeToken1PrimaryBalance.add(stakeValue1).add(stakeValue2));
            expect(await primaryToken.balanceOf(staker1.address))
                .to.equal(initStaker1PrimaryBalance.sub(stakeValue1).sub(stakeValue2));

            expect(await stakeToken1.totalSupply()).to.equal(stakeValue1.add(stakeValue2));

            expect(await currency.balanceOf(staker1.address)).to.equal(initStaker1CurrencyBalance.sub(feeAmount1).sub(feeAmount2));
            expect(await currency.balanceOf(stakeToken1.address)).to.equal(initStakeToken1CurrencyBalance);
            expect(await currency.balanceOf(primaryToken.address)).to.equal(initPrimaryTokenCurrencyBalance);
            expect(await currency.balanceOf(treasury.address)).to.equal(initTreasuryCurrencyBalance.add(feeAmount1).add(feeAmount2));

            expectEqualWithErrorMargin(await stakeToken1.balanceOf(staker1.address), stakeValue1.add(stakeValue2));
            
            primaryToken.isStakeRewardingCulminated.reset();
        });
    });

    describe('4.5.6. unstake(uint256)', async () => {
        it('4.5.6.1. unstake successfully', async () => {
            const { stakeToken1, staker1, primaryToken } = await setupBeforeTest({
                setFeeRate: true,
                initializeRewarding: true,
                preparePrimaryTokenForStakers: true,
            });

            let initStaker1PrimaryBalance = await primaryToken.balanceOf(staker1.address);
            let initStakeToken1PrimaryBalance = await primaryToken.balanceOf(stakeToken1.address);

            // Initial staking
            const stakeAmount = ethers.utils.parseEther("100");

            await callTransaction(stakeToken1.connect(staker1).stake(
                staker1.address, 
                stakeAmount
            ));

            primaryToken.isStakeRewardingCulminated.returns(true);

            // Unstake #1
            const unstakeAmount1 = ethers.utils.parseEther("30");

            const tx1 = await stakeToken1.connect(staker1).unstake(unstakeAmount1);
            await tx1.wait();

            await expect(tx1)
                .to.emit(stakeToken1, 'Unstake')
                .withArgs(staker1.address, unstakeAmount1);

            expect(await stakeToken1.totalSupply()).to.equal(stakeAmount.sub(unstakeAmount1));

            expect(await primaryToken.balanceOf(stakeToken1.address)).to.equal(
                initStakeToken1PrimaryBalance.add(stakeAmount).sub(unstakeAmount1)
            );
            expect(await primaryToken.balanceOf(staker1.address)).to.equal(
                initStaker1PrimaryBalance.sub(stakeAmount).add(unstakeAmount1)
            );
            expectEqualWithErrorMargin(await stakeToken1.balanceOf(staker1.address), stakeAmount.sub(unstakeAmount1));

            // Unstake #2
            initStakeToken1PrimaryBalance = await primaryToken.balanceOf(stakeToken1.address);
            initStaker1PrimaryBalance = await primaryToken.balanceOf(staker1.address);

            const unstakeAmount2 = ethers.utils.parseEther("20");

            const tx2 = await stakeToken1.connect(staker1).unstake(unstakeAmount2);
            await tx2.wait();

            await expect(tx2)
                .to.emit(stakeToken1, 'Unstake')
                .withArgs(staker1.address, unstakeAmount2);

            expect(await stakeToken1.totalSupply()).to.equal(initStakeToken1PrimaryBalance.sub(unstakeAmount2));

            expect(await primaryToken.balanceOf(stakeToken1.address)).to.equal(
                initStakeToken1PrimaryBalance.sub(unstakeAmount2)
            );
            expect(await primaryToken.balanceOf(staker1.address)).to.equal(
                initStaker1PrimaryBalance.add(unstakeAmount2)
            );                
            expectEqualWithErrorMargin(await stakeToken1.balanceOf(staker1.address), stakeAmount.sub(unstakeAmount1).sub(unstakeAmount2));

            primaryToken.isStakeRewardingCulminated.reset();
        });

        it('4.5.6.2. unstake unsuccessfully when rewarding is not completed', async () => {
            const { stakeToken1, staker1, primaryToken } = await setupBeforeTest({
                setFeeRate: true,
                initializeRewarding: true,
                preparePrimaryTokenForStakers: true,
            });

            // Initial staking
            const stakeAmount = ethers.utils.parseEther("100");
            await callTransaction(stakeToken1.connect(staker1).stake(
                staker1.address, 
                stakeAmount
            ));

            // Unstake
            await expect(stakeToken1.connect(staker1).unstake(ethers.utils.parseEther("30")))
                .to.be.revertedWithCustomError(stakeToken1, 'NotCompletedRewarding');
        });

        it('4.5.6.3. unstake unsuccessfully when amount is greater than balance', async () => {
            const { stakeToken1, staker1, primaryToken } = await setupBeforeTest({
                setFeeRate: true,
                initializeRewarding: true,
                preparePrimaryTokenForStakers: true,
            });

            // Initial staking
            const stakeAmount = ethers.utils.parseEther("100");
            await callTransaction(stakeToken1.connect(staker1).stake(
                staker1.address, 
                stakeAmount
            ));

            // Unstake
            primaryToken.isStakeRewardingCulminated.returns(true);

            await expect(stakeToken1.connect(staker1).unstake(stakeAmount.add(1)))
                .to.be.revertedWithCustomError(stakeToken1, 'InsufficientFunds');

            primaryToken.isStakeRewardingCulminated.reset();
        });        
    });

    describe('4.5.7. promote(uint256)', async () => {
        it('4.5.7.1. promote successfully', async () => {
            const { stakeToken1, stakeToken2, stakeToken3, staker1, primaryToken } = await setupBeforeTest({
                setFeeRate: true,
                initializeRewarding: true,
                preparePrimaryTokenForStakers: true,
            });

            const stakeAmount = ethers.utils.parseEther("150");
            await callTransaction(stakeToken1.connect(staker1).stake(
                staker1.address, 
                stakeAmount
            ));

            // Transaction #1
            const promoteAmount1 = ethers.utils.parseEther("80");

            const tx1 = await stakeToken1.connect(staker1).promote(promoteAmount1);
            await tx1.wait();

            await expect(tx1)
                .to.emit(stakeToken1, 'Promotion')
                .withArgs(staker1.address, promoteAmount1);
                
            expect(await stakeToken1.totalSupply()).to.equal(stakeAmount.sub(promoteAmount1));
            expect(await stakeToken2.totalSupply()).to.equal(promoteAmount1);

            expect(await primaryToken.balanceOf(stakeToken1.address)).to.equal(stakeAmount.sub(promoteAmount1));
            expect(await primaryToken.balanceOf(stakeToken2.address)).to.equal(promoteAmount1);

            expectEqualWithErrorMargin(await stakeToken1.balanceOf(staker1.address), stakeAmount.sub(promoteAmount1));
            expectEqualWithErrorMargin(await stakeToken2.balanceOf(staker1.address), promoteAmount1);
            
            // Transaction #2
            const promoteAmount2 = ethers.utils.parseEther("40");

            const tx2 = await stakeToken1.connect(staker1).promote(promoteAmount2);
            await tx2.wait();

            await expect(tx2)
                .to.emit(stakeToken1, 'Promotion')
                .withArgs(staker1.address, promoteAmount2);

            expect(await stakeToken1.totalSupply()).to.equal(stakeAmount.sub(promoteAmount1).sub(promoteAmount2));
            expect(await stakeToken2.totalSupply()).to.equal(promoteAmount1.add(promoteAmount2));

            expect(await primaryToken.balanceOf(stakeToken1.address)).to.equal(stakeAmount.sub(promoteAmount1).sub(promoteAmount2));
            expect(await primaryToken.balanceOf(stakeToken2.address)).to.equal(promoteAmount1.add(promoteAmount2));

            expectEqualWithErrorMargin(await stakeToken1.balanceOf(staker1.address), stakeAmount.sub(promoteAmount1).sub(promoteAmount2));
            expectEqualWithErrorMargin(await stakeToken2.balanceOf(staker1.address), promoteAmount1.add(promoteAmount2));

            // Transaction #3
            const promoteAmount3 = ethers.utils.parseEther("20");

            const tx3 = await stakeToken2.connect(staker1).promote(promoteAmount3);
            await tx3.wait();

            await expect(tx3)
                .to.emit(stakeToken2, 'Promotion')
                .withArgs(staker1.address, promoteAmount3);

            expect(await stakeToken2.totalSupply()).to.equal(promoteAmount1.add(promoteAmount2).sub(promoteAmount3));
            expect(await stakeToken3.totalSupply()).to.equal(promoteAmount3);

            expect(await primaryToken.balanceOf(stakeToken2.address)).to.equal(promoteAmount1.add(promoteAmount2).sub(promoteAmount3));
            expect(await primaryToken.balanceOf(stakeToken3.address)).to.equal(promoteAmount3);

            expectEqualWithErrorMargin(await stakeToken2.balanceOf(staker1.address), promoteAmount1.add(promoteAmount2).sub(promoteAmount3));
            expectEqualWithErrorMargin(await stakeToken3.balanceOf(staker1.address), promoteAmount3);
        });

        it('4.5.7.2. promote unsuccessfully when paused', async () => {
            const fixture = await setupBeforeTest({
                setFeeRate: true,
                initializeRewarding: true,
                preparePrimaryTokenForStakers: true,
                pause: true,
            });
            const { stakeToken1, staker1 } = fixture;

            await expect(stakeToken1.connect(staker1).promote(ethers.utils.parseEther("10")))
                .to.be.revertedWith('Pausable: paused');
        });

        it('4.5.7.3. promote unsuccessfully when there is no successor', async () => {
            const fixture = await setupBeforeTest({
                setFeeRate: true,
                initializeRewarding: true,
                preparePrimaryTokenForStakers: true,
            });
            const { stakeToken3, staker1 } = fixture;

            await expect(stakeToken3.connect(staker1).promote(ethers.utils.parseEther("10")))
                .to.be.revertedWithCustomError(stakeToken3, 'NoSuccessor');
        });

        it('4.5.7.4. promote unsuccessfully when stake rewarding is completed', async () => {
            const fixture = await setupBeforeTest({
                setFeeRate: true,
                initializeRewarding: true,
                preparePrimaryTokenForStakers: true,
            });
            const { stakeToken1, staker1, primaryToken } = fixture;
            primaryToken.isStakeRewardingCulminated.returns(true);

            await expect(stakeToken1.connect(staker1).promote(ethers.utils.parseEther("10")))
                .to.be.revertedWithCustomError(stakeToken1, 'InvalidPromoting');

            primaryToken.isStakeRewardingCulminated.reset();
        });

        it('4.5.7.5. promote unsuccessfully when amount is greater than balance', async () => {
            const fixture = await setupBeforeTest({
                setFeeRate: true,
                initializeRewarding: true,
                preparePrimaryTokenForStakers: true,
            });
            const { stakeToken1, staker1 } = fixture;

            await callTransaction(stakeToken1.connect(staker1).stake(
                staker1.address, 
                ethers.utils.parseEther("100")
            ));

            await expect(stakeToken1.connect(staker1).promote(ethers.utils.parseEther("101")))
                .to.be.revertedWithCustomError(stakeToken1, 'InsufficientFunds');
        });        
    });

    describe('4.5.8. balanceOf()', async () => {
        async function testBalanceAfterOperations(
            fixture: StakeTokenFixture,
            operations: any[],
        ) {
            const { stakeToken1, stakeToken2, stakeToken3, primaryToken } = fixture;

            const stakeTokens = [stakeToken1, stakeToken2, stakeToken3];
            const stakers: Wallet[] = [];

            const expectedBalances: Map<string, BigNumber>[] = [];
            for(let i = 0; i < 3; ++i) {
                expectedBalances.push(new Map<string, BigNumber>());
            }

            function addStaker(staker: Wallet) {
                if (stakers.find(s => s.address === staker.address) === undefined) {
                    stakers.push(staker);
                }
            }

            function getBalance(pool: number, staker: Wallet): BigNumber {
                return expectedBalances[pool].has(staker.address) ? expectedBalances[pool].get(staker.address)! : ethers.constants.Zero;
            }

            let errorMargin = ethers.constants.Zero;

            for (const [index, operation] of operations.entries()) {
                if (index % 100 === 0) {
                    const indexRange = [index, Math.min(index + 100, operations.length)];
                    console.log(`Operation [${indexRange[0]}; ${indexRange[1]})`);
                }

                errorMargin = errorMargin.add(ethers.utils.parseUnits("2", "wei"));
                
                const [type, stakeToken, ...args] = operation;
                const pool = stakeTokens.findIndex(t => t.address === stakeToken.address);

                if (type === StakeTokenOperation.Stake) {
                    const [staker, amount] = args;
                    // console.log("Stake", pool, staker.address, amount);
                    addStaker(staker);
                    
                    await callTransaction(stakeToken.connect(staker).stake(
                        staker.address, 
                        amount
                    ));

                    expectedBalances[pool].set(staker.address, getBalance(pool, staker).add(amount));

                    expectEqualWithErrorMargin(await stakeTokens[pool].balanceOf(staker.address), getBalance(pool, staker), errorMargin);
                } else if (type === StakeTokenOperation.Unstake) {
                    const [staker, amount] = args;
                    // console.log("Unstake", pool, staker.address, amount);
                    addStaker(staker);

                    await callTransaction(stakeToken.connect(staker).unstake(amount));

                    expectedBalances[pool].set(staker.address, getBalance(pool, staker).sub(amount));

                    expectEqualWithErrorMargin(await stakeTokens[pool].balanceOf(staker.address), getBalance(pool, staker), errorMargin);
                } else if (type === StakeTokenOperation.Promote) {
                    const [staker, amount] = args;
                    // console.log("Promote", pool, staker.address, amount);
                    addStaker(staker);

                    await callTransaction(stakeToken.connect(staker).promote(amount));

                    expectedBalances[pool].set(staker.address, getBalance(pool, staker).sub(amount));
                    expectedBalances[pool+1].set(staker.address, getBalance(pool+1, staker).add(amount));

                    expectEqualWithErrorMargin(await stakeTokens[pool].balanceOf(staker.address), getBalance(pool, staker), errorMargin);
                    expectEqualWithErrorMargin(await stakeTokens[pool+1].balanceOf(staker.address), getBalance(pool+1, staker), errorMargin);
                } else if (type === StakeTokenOperation.Transfer) {
                    const [sender, receiver, amount] = args;
                    // console.log("Transfer", pool, sender.address, receiver.address, amount);
                    addStaker(sender);
                    addStaker(receiver);

                    await callTransaction(stakeToken.connect(sender).transfer(
                        receiver.address, 
                        amount
                    ));
                    expectedBalances[pool].set(sender.address, getBalance(pool, sender).sub(amount));
                    expectedBalances[pool].set(receiver.address, getBalance(pool, receiver).add(amount));

                    expectEqualWithErrorMargin(await stakeTokens[pool].balanceOf(sender.address), getBalance(pool, sender), errorMargin);
                    expectEqualWithErrorMargin(await stakeTokens[pool].balanceOf(receiver.address), getBalance(pool, receiver), errorMargin);
                } else if (type === StakeTokenOperation.FetchReward) {
                    // console.log("FetchReward", pool);
                    const totalSupply = await stakeTokens[pool].totalSupply();

                    const nextRewardFetch = (await stakeTokens[pool].lastRewardFetch()).add(Constant.STAKE_TOKEN_REWARD_FETCH_COOLDOWN);
                    if (nextRewardFetch.gt(await time.latest())) {
                        await time.setNextBlockTimestamp(nextRewardFetch);
                    }
                    await callTransaction(stakeTokens[pool].fetchReward());
    
                    const newTotalSupply = await stakeTokens[pool].totalSupply();
    
                    for (const staker of stakers) {
                        const balance = getBalance(pool, staker);
                        const newBalance = balance.mul(newTotalSupply).div(totalSupply);
                        expectedBalances[pool].set(staker.address, newBalance);
                        expectEqualWithErrorMargin(await stakeTokens[pool].balanceOf(staker.address), newBalance, errorMargin);
                    }
                }

                // Total supply should always equal primary token balance
                for(let pool = 0; pool < 3; ++pool) {
                    expect(await stakeTokens[pool].totalSupply()).to.equal(await primaryToken.balanceOf(stakeTokens[pool].address));
                }
            }
        }

        async function getRandomOperations(
            fixture: StakeTokenFixture,
            nOperations: number,
        ) {
            const { stakeToken1, stakeToken2, stakeToken3, staker1, staker2, staker3 } = fixture;

            const stakeTokens = [stakeToken1, stakeToken2, stakeToken3];
            const stakers = [staker1, staker2, staker3];
            
            const expectedBalances: Map<string, BigNumber>[] = [];
            const expectedTotalSupply: BigNumber[] = [];
            for(let i = 0; i < 3; ++i) {
                expectedBalances.push(new Map<string, BigNumber>());
                expectedTotalSupply.push(ethers.constants.Zero);
            }

            function getBalance(pool: number, staker: Wallet): BigNumber {
                return expectedBalances[pool].has(staker.address) ? expectedBalances[pool].get(staker.address)! : ethers.constants.Zero;
            }

            const operationCounts = randomArrayWithSum(4, ethers.BigNumber.from(nOperations), ethers.BigNumber.from(1));
            const nFetchReward1 = Constant.PRIMARY_TOKEN_STAKE_1_CULMINATING_WAVE;
            const nFetchReward2 = Constant.PRIMARY_TOKEN_STAKE_2_CULMINATING_WAVE;
            const nFetchReward3 = Constant.PRIMARY_TOKEN_STAKE_3_CULMINATING_WAVE;
            
            const nStakeOperations = operationCounts[0].toNumber();
            const nUnstakeOperations = operationCounts[1].toNumber();
            const nPromoteOperations = operationCounts[2].toNumber();
            const nTransferOperations = operationCounts[3].toNumber();

            const operationTypes: any[] = [];
            for(let i = 0; i < nFetchReward1; ++i) {
                operationTypes.push([StakeTokenOperation.FetchReward, stakeToken1]);
            }
            for(let i = 0; i < nFetchReward2; ++i) {
                operationTypes.push([StakeTokenOperation.FetchReward, stakeToken2]);
            }
            for(let i = 0; i < nFetchReward3; ++i) {
                operationTypes.push([StakeTokenOperation.FetchReward, stakeToken3]);
            }
            shuffle(operationTypes);

            for(let i = 0; i < nUnstakeOperations; ++i) {
                operationTypes.push([StakeTokenOperation.Unstake, null, null, null]);
            }
            for(let i = 0; i < nPromoteOperations; ++i) {
                let p = randomInt(0, nFetchReward1 + nFetchReward2 + nFetchReward3 - 2);
                operationTypes.splice(p, 0, [StakeTokenOperation.Promote, null, null, null]);
            }
            for(let i = 0; i < nStakeOperations; ++i) {
                let p = randomInt(0, operationTypes.length - 1);
                operationTypes.splice(p, 0, [StakeTokenOperation.Stake, null, null, null]);
            }
            for(let i = 0; i < nTransferOperations; ++i) {
                let p = randomInt(0, operationTypes.length - 1);
                operationTypes.splice(p, 0, [StakeTokenOperation.Transfer, null, null, null, null]);
            }
            for(let i = 0; i < stakers.length; ++i) {
                for(let j = 0; j < stakers.length; ++j) {
                    operationTypes.splice(0, 0, [StakeTokenOperation.Stake, stakeTokens[i], stakers[j], null]);
                }
            }

            const operations: any[] = [];
            for (let i = 0; i < operationTypes.length; i++) {
                let [type, stakeToken, ...args] = operationTypes[i];
                if (type === StakeTokenOperation.FetchReward) {
                    operations.push([type, stakeToken]);
                    const pool = stakeTokens.findIndex(t => t.address === stakeToken.address);

                    const totalSupply = expectedTotalSupply[pool];
                    const reward = (pool === 0) ? Constant.PRIMARY_TOKEN_STAKE_1_CULMINATING_WAVE : (pool === 1) ? Constant.PRIMARY_TOKEN_STAKE_2_CULMINATING_WAVE : Constant.PRIMARY_TOKEN_STAKE_3_CULMINATING_WAVE;
                    const newTotalSupply = totalSupply.add(reward);

                    for (const staker of stakers) {
                        const balance = getBalance(pool, staker);
                        const newBalance = balance.mul(newTotalSupply).div(totalSupply);
                        expectedBalances[pool].set(staker.address, newBalance);                        
                    }
                    expectedTotalSupply[pool] = newTotalSupply;
                }
                if (type === StakeTokenOperation.Stake) {
                    let [staker, amount] = args;
                    stakeToken = stakeToken || stakeTokens[randomInt(0, stakeTokens.length - 1)];
                    const pool = stakeTokens.findIndex(t => t.address === stakeToken.address);
                    staker = staker || stakers[randomInt(0, stakers.length - 1)];
                    amount = amount || randomBigNumber(ethers.constants.Zero, ethers.utils.parseEther("1000"));
                    operations.push([type, stakeToken, staker, amount]);

                    expectedBalances[pool].set(staker.address, getBalance(pool, staker).add(amount));
                    expectedTotalSupply[pool] = expectedTotalSupply[pool].add(amount);
                } else if (type === StakeTokenOperation.Unstake) {
                    let [staker, amount] = args;
                    stakeToken = stakeToken || stakeTokens[randomInt(0, stakeTokens.length - 1)];
                    const pool = stakeTokens.findIndex(t => t.address === stakeToken.address);
                    staker = staker || stakers[randomInt(0, stakers.length - 1)];
                    amount = amount || randomBigNumber(ethers.constants.Zero, getBalance(pool, staker));
                    operations.push([type, stakeToken, staker, amount]);

                    expectedBalances[pool].set(staker.address, getBalance(pool, staker).sub(amount));
                    expectedTotalSupply[pool] = expectedTotalSupply[pool].sub(amount);
                } else if (type === StakeTokenOperation.Promote) {
                    let [staker, amount] = args;
                    stakeToken = stakeToken || stakeTokens[randomInt(0, stakeTokens.length - 2)];
                    const pool = stakeTokens.findIndex(t => t.address === stakeToken.address);
                    staker = staker || stakers[randomInt(0, stakers.length - 1)];
                    amount = amount || randomBigNumber(ethers.constants.Zero, getBalance(pool, staker));
                    operations.push([type, stakeToken, staker, amount]);

                    expectedBalances[pool].set(staker.address, getBalance(pool, staker).sub(amount));
                    expectedBalances[pool+1].set(staker.address, getBalance(pool+1, staker).add(amount));

                    expectedTotalSupply[pool] = expectedTotalSupply[pool].sub(amount);
                    expectedTotalSupply[pool+1] = expectedTotalSupply[pool+1].add(amount);
                } else if (type === StakeTokenOperation.Transfer) {
                    let [sender, receiver, amount] = args;
                    stakeToken = stakeToken || stakeTokens[randomInt(0, stakeTokens.length - 1)];
                    const pool = stakeTokens.findIndex(t => t.address === stakeToken.address);
                    sender = sender || stakers[randomInt(0, stakers.length - 1)];
                    receiver = receiver || stakers[randomInt(0, stakers.length - 1)];
                    amount = amount || randomBigNumber(ethers.constants.Zero, getBalance(pool, sender));
                    operations.push([type, stakeToken, sender, receiver, amount]);

                    expectedBalances[pool].set(sender.address, getBalance(pool, sender).sub(amount));
                    expectedBalances[pool].set(receiver.address, getBalance(pool, receiver).add(amount));
                }
            }

            return operations;
        }
        
        it('4.5.8.1. return correct balance in a few staking and rewarding operations', async () => {
            const fixture = await setupBeforeTest({
                setFeeRate: true,
                initializeRewarding: true,
                prepareCurrencyForStakers: true,
                preparePrimaryTokenForStakers: true,
            });

            const { stakeToken1, staker1, staker2, staker3 } = fixture;
            
            const operations = [
                [StakeTokenOperation.Stake, stakeToken1, staker1, ethers.utils.parseEther("100")],
                [StakeTokenOperation.Stake, stakeToken1, staker2, ethers.utils.parseEther("200")],
                [StakeTokenOperation.FetchReward, stakeToken1],
                [StakeTokenOperation.Stake, stakeToken1, staker1, ethers.utils.parseEther("300")],
                [StakeTokenOperation.Stake, stakeToken1, staker2, ethers.utils.parseEther("400")],
                [StakeTokenOperation.Stake, stakeToken1, staker3, ethers.utils.parseEther("500")],
            ];

            await testBalanceAfterOperations(fixture, operations);
        });

        it('4.5.8.2. return correct balance in 1000 random operations', async () => {
            const fixture = await setupBeforeTest({
                setFeeRate: true,
                initializeRewarding: true,
                prepareCurrencyForStakers: true,
                preparePrimaryTokenForStakers: true,
            });

            const operations = await getRandomOperations(fixture, 1000);
            await testBalanceAfterOperations(fixture, operations);
        });
    });

    describe('4.5.9. exclusiveDiscount()', async () => {
        async function testDiscount(
            fixture: StakeTokenFixture,
            stakeToken1Supply: BigNumber,
            stakeToken2Supply: BigNumber,
            stakeToken3Supply: BigNumber,
            primaryTokenSupply: BigNumber,
        ) {
            const { stakeToken1, stakeToken2, stakeToken3, primaryToken } = fixture;

            stakeToken1.setVariable("totalStake", stakeToken1Supply);
            stakeToken2.setVariable("totalStake", stakeToken2Supply);
            stakeToken3.setVariable("totalStake", stakeToken3Supply);
            primaryToken.setVariable("_totalSupply", primaryTokenSupply);

            const primaryTokenDiscount = (await primaryToken.exclusiveDiscount()).value;
            const primaryTokenTotalStake = await primaryToken.totalStake();

            const expectedStateToken1Discount = primaryTokenDiscount.mul(primaryTokenTotalStake.sub(stakeToken1Supply)).div(primaryTokenTotalStake.mul(2)).add(Constant.PRIMARY_TOKEN_BASE_DISCOUNT);
            const expectedStateToken2Discount = primaryTokenDiscount.mul(primaryTokenTotalStake.sub(stakeToken2Supply)).div(primaryTokenTotalStake.mul(2)).add(Constant.PRIMARY_TOKEN_BASE_DISCOUNT);
            const expectedStateToken3Discount = primaryTokenDiscount.mul(primaryTokenTotalStake.sub(stakeToken3Supply)).div(primaryTokenTotalStake.mul(2)).add(Constant.PRIMARY_TOKEN_BASE_DISCOUNT);

            expect((await stakeToken1.exclusiveDiscount()).value).to.equal(expectedStateToken1Discount);
            expect((await stakeToken2.exclusiveDiscount()).value).to.equal(expectedStateToken2Discount);
            expect((await stakeToken3.exclusiveDiscount()).value).to.equal(expectedStateToken3Discount);

            expectBetween(expectedStateToken1Discount, ethers.utils.parseEther("0.15"), ethers.utils.parseEther("0.30"));
            expectBetween(expectedStateToken2Discount, ethers.utils.parseEther("0.15"), ethers.utils.parseEther("0.30"));
            expectBetween(expectedStateToken3Discount, ethers.utils.parseEther("0.15"), ethers.utils.parseEther("0.30"));
        }
        
        it('4.5.9.1. return correct discount', async () => {
            const fixture = await setupBeforeTest();
            
            const primaryTokenMaxSupply = Constant.PRIMARY_TOKEN_MAXIMUM_SUPPLY;
            
            // One of the token has max supply
            await testDiscount(fixture, ethers.constants.Zero, ethers.constants.Zero, primaryTokenMaxSupply, primaryTokenMaxSupply);
            await testDiscount(fixture, ethers.constants.Zero, primaryTokenMaxSupply, ethers.constants.Zero, primaryTokenMaxSupply);
            await testDiscount(fixture, primaryTokenMaxSupply, ethers.constants.Zero, ethers.constants.Zero, primaryTokenMaxSupply);

            // 50 random tests
            for (let i = 0; i < 50; i++) {
                const randomSupplies = randomArrayWithSum(5, primaryTokenMaxSupply);
                const stakeToken1Supply = randomSupplies[0];
                const stakeToken2Supply = randomSupplies[1];
                const stakeToken3Supply = randomSupplies[2];
                const primaryTokenSupply = randomSupplies.slice(0, 4).reduce((acc, curr) => acc.add(curr), ethers.constants.Zero);

                await testDiscount(fixture, stakeToken1Supply, stakeToken2Supply, stakeToken3Supply, primaryTokenSupply);
            }
        });
    });

    describe('4.5.10. transfer(address, uint256)', async () => {
        it('4.5.10.1. transfer successfully', async () => {
            const { stakeToken1, staker1, staker2 } = await setupBeforeTest({
                setFeeRate: true,
                initializeRewarding: true,
                preparePrimaryTokenForStakers: true,
            });

            await callTransaction(stakeToken1.connect(staker1).stake(
                staker1.address, 
                ethers.utils.parseEther("100")
            ));

            const tx = await stakeToken1.connect(staker1).transfer(
                staker2.address,
                ethers.utils.parseEther("40")
            );
            await tx.wait();

            await expect(tx)
                .to.emit(stakeToken1, 'Transfer')
                .withArgs(staker1.address, staker2.address, ethers.utils.parseEther("40"));

            expect(await stakeToken1.balanceOf(staker1.address)).to.equal(ethers.utils.parseEther("60"));
            expect(await stakeToken1.balanceOf(staker2.address)).to.equal(ethers.utils.parseEther("40"));
        });
    });
});
