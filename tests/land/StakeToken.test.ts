import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Admin, Currency, MockPrimaryToken, MockStakeToken, PrimaryToken, StakeToken, Treasury } from '@typechain-types';
import { callTransaction, getSignatures, prepareERC20, randomWallet } from '@utils/blockchain';
import { deployAdmin } from '@utils/deployments/common/admin';
import { Constant } from '@tests/test.constant';
import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import { deployCurrency } from '@utils/deployments/common/currency';
import { deployPrimaryToken } from '@utils/deployments/land/primaryToken';
import { deployTreasury } from '@utils/deployments/land/treasury';
import { deployStakeToken } from '@utils/deployments/land/stakeToken';
import { FIXED_ONE, fixedAdd, fixedDiv, fixedMul, fixedSub, tokenToWeight } from '@utils/fixedMath';
import { callStakeToken_Pause, callStakeToken_UpdateFeeRate } from '@utils/callWithSignatures/stakeToken';
import { callStakeToken_InitializeRewarding } from '@utils/callWithSignatures/stakeToken';
import { callPrimaryToken_UpdateStakeTokens, callPrimaryToken_UpdateTreasury } from '@utils/callWithSignatures/primary';
import { deployMockStakeToken } from '@utils/deployments/mocks/mockStakeToken';
import { deployMockPrimaryToken } from '@utils/deployments/mocks/mockPrimaryToken';
import { MockContract, smock } from '@defi-wonderland/smock';
import { getStakingFee } from '@utils/formula';
import { expectEqualWithErrorMargin } from '@utils/testHelper';

interface StakeTokenFixture {
    deployer: any;
    admins: any[];
    admin: Admin;
    currency: Currency;
    primaryToken: MockContract<MockPrimaryToken>;
    stakeToken1: MockStakeToken;
    stakeToken2: MockStakeToken;
    stakeToken3: MockStakeToken;
    treasury: Treasury;

    initialLastRewardFetch: number;
    staker1: any;
    staker2: any;
    staker3: any;
}

describe('10. StakeToken', async () => {
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
        
        const SmockPrimaryTokenFactory = await smock.mock("MockPrimaryToken") as any;
        const primaryToken = await SmockPrimaryTokenFactory.deploy();
        await callTransaction(primaryToken.initialize(
            admin.address,
            Constant.PRIMARY_TOKEN_INITIAL_Name,
            Constant.PRIMARY_TOKEN_INITIAL_Symbol,
            Constant.PRIMARY_TOKEN_INITIAL_LiquidationUnlockedAt,
        ));
        
        const stakeToken1 = await deployMockStakeToken(
            deployer,
            admin.address,
            primaryToken.address,
            Constant.STAKE_TOKEN_INITIAL_Name_1,
            Constant.STAKE_TOKEN_INITIAL_Symbol_1,
        ) as MockStakeToken;

        const stakeToken2 = await deployMockStakeToken(
            deployer,
            admin.address,
            primaryToken.address,
            Constant.STAKE_TOKEN_INITIAL_Name_2,
            Constant.STAKE_TOKEN_INITIAL_Symbol_2,
        ) as MockStakeToken;

        const stakeToken3 = await deployMockStakeToken(
            deployer,
            admin.address,
            primaryToken.address,
            Constant.STAKE_TOKEN_INITIAL_Name_3,
            Constant.STAKE_TOKEN_INITIAL_Symbol_3,
        ) as MockStakeToken;

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
                Constant.STAKE_TOKEN_INITIAL_FeeRate,
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
                [stakeToken1, stakeToken2, stakeToken3],
                ethers.utils.parseEther("10000")
            );
        }

        if (preparePrimaryTokenForStakers) {
            await primaryToken.mint(staker1.address, ethers.utils.parseEther("10000"));
            await prepareERC20(
                primaryToken as any, 
                [staker1, staker2, staker3],
                [stakeToken1, stakeToken2, stakeToken3],
                ethers.utils.parseEther("10000")
            );
        }

        if (pause) {
            await callStakeToken_Pause(stakeToken1, admins, await admin.nonce());
        }

        return {
            ...fixture,
            initialLastRewardFetch,
        };
    }

    describe('10.1. initialize(address, address, address)', async () => {
        it('10.1.1. Deploy successfully', async () => {
            const { admin, primaryToken, stakeToken1, stakeToken2, stakeToken3 } = await setupBeforeTest();

            // StakeToken1
            expect(await stakeToken1.name()).to.equal(Constant.STAKE_TOKEN_INITIAL_Name_1);
            expect(await stakeToken1.symbol()).to.equal(Constant.STAKE_TOKEN_INITIAL_Symbol_1);

            expect(await stakeToken1.totalSupply()).to.equal(0);
            expect(await stakeToken1.lastRewardFetch()).to.equal(0);

            const feeRate1 = await stakeToken1.getFeeRate();
            expect(feeRate1.value).to.equal(0);
            expect(feeRate1.decimals).to.equal(Constant.COMMON_RATE_DECIMALS);

            expect(await stakeToken1.getInterestAccumulation()).to.equal(FIXED_ONE);

            expect(await stakeToken1.admin()).to.equal(admin.address);
            expect(await stakeToken1.primaryToken()).to.equal(primaryToken.address);
            expect(await stakeToken1.successor()).to.equal(ethers.constants.AddressZero);

            // StakeToken2
            expect(await stakeToken2.name()).to.equal(Constant.STAKE_TOKEN_INITIAL_Name_2);
            expect(await stakeToken2.symbol()).to.equal(Constant.STAKE_TOKEN_INITIAL_Symbol_2);

            expect(await stakeToken2.totalSupply()).to.equal(0);
            expect(await stakeToken2.lastRewardFetch()).to.equal(0);

            const feeRate2 = await stakeToken2.getFeeRate();
            expect(feeRate2.value).to.equal(0);
            expect(feeRate2.decimals).to.equal(Constant.COMMON_RATE_DECIMALS);

            expect(await stakeToken2.getInterestAccumulation()).to.equal(FIXED_ONE);

            expect(await stakeToken2.admin()).to.equal(admin.address);
            expect(await stakeToken2.primaryToken()).to.equal(primaryToken.address);
            expect(await stakeToken2.successor()).to.equal(ethers.constants.AddressZero);

            // StakeToken3
            expect(await stakeToken3.name()).to.equal(Constant.STAKE_TOKEN_INITIAL_Name_3);
            expect(await stakeToken3.symbol()).to.equal(Constant.STAKE_TOKEN_INITIAL_Symbol_3);

            expect(await stakeToken3.totalSupply()).to.equal(0);
            expect(await stakeToken3.lastRewardFetch()).to.equal(0);

            const feeRate3 = await stakeToken3.getFeeRate();
            expect(feeRate3.value).to.equal(0);
            expect(feeRate3.decimals).to.equal(Constant.COMMON_RATE_DECIMALS);

            expect(await stakeToken3.getInterestAccumulation()).to.equal(FIXED_ONE);

            expect(await stakeToken3.admin()).to.equal(admin.address);
            expect(await stakeToken3.primaryToken()).to.equal(primaryToken.address);
            expect(await stakeToken3.successor()).to.equal(ethers.constants.AddressZero);
        });
    });

    // TODO: Andy
    describe('10.2. pause(bytes[])', async () => {

    });

    // TODO: Andy
    describe('10.3. unpause(bytes[])', async () => {

    });

    // TODO: Andy
    describe('10.4. initializeRewarding(uint256, address, bytes[])', async () => {

    });

    // TODO: Andy
    describe('10.5. updateFeeRate(uint256, bytes[])', async () => {

    });

    describe('10.6. fetchReward()', async () => {
        it('10.6.1. fetchReward successfully for stake token', async () => {
            const { stakeToken1, primaryToken, staker1 } = await setupBeforeTest({
                setFeeRate: true,
                initializeRewarding: true,
                preparePrimaryTokenForStakers: true,
            });
            
            const initialStake = ethers.utils.parseEther("100");
            await callTransaction(stakeToken1.connect(staker1).stake(staker1.address, initialStake));
            
            const reward = Constant.PRIMARY_TOKEN_STAKE_1_WAVE_REWARD;

            let lastRewardFetch = await stakeToken1.lastRewardFetch();
            let interestAccumulation = FIXED_ONE;
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

                interestAccumulation = fixedMul(
                    interestAccumulation,
                    fixedAdd(FIXED_ONE, fixedDiv(reward, currentSupply)),
                );
                expect(await stakeToken1.getInterestAccumulation()).to.equal(interestAccumulation);
            }
        });

        it('10.6.2. fetchReward unsuccessfully when not started rewarding', async () => {
            const { stakeToken1, staker1 } = await setupBeforeTest({
                setFeeRate: true,
                preparePrimaryTokenForStakers: true,
            });

            const initialStake = ethers.utils.parseEther("100");
            await callTransaction(stakeToken1.connect(staker1).stake(staker1.address, initialStake));

            await expect(stakeToken1.fetchReward())
                .to.be.revertedWithCustomError(stakeToken1, 'NotStartedRewarding');
        });

        it('10.6.3. fetchReward unsuccessfully when on initial cooldown', async () => {
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

        it('10.6.4. fetchReward unsuccessfully when on cooldown after fetching reward', async () => {
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

        it('10.6.5. fetchReward unsuccessfully when stake token has zero stake', async () => {
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

    describe('10.7. stake(address, uint256)', async () => {
        it('10.7.1. stake successfully before stake rewarding completed', async () => {
            const { stakeToken1, staker1, primaryToken } = await setupBeforeTest({
                setFeeRate: true,
                initializeRewarding: true,
                preparePrimaryTokenForStakers: true,
            });

            const initStaker1PrimaryBalance = await primaryToken.balanceOf(staker1.address);
            const initStakeToken1PrimaryBalance = await primaryToken.balanceOf(stakeToken1.address);

            const stakeValue1 = ethers.utils.parseEther("100");
            const tx1 = (stakeToken1.connect(staker1).stake(staker1.address, stakeValue1));

            await expect(tx1)
                .to.emit(stakeToken1, 'Stake')
                .withArgs(staker1.address, stakeValue1);

            expect(await primaryToken.balanceOf(stakeToken1.address)).to.equal(initStakeToken1PrimaryBalance.add(stakeValue1));
            expect(await primaryToken.balanceOf(staker1.address)).to.equal(initStaker1PrimaryBalance.sub(stakeValue1));

            expect(await stakeToken1.totalSupply()).to.equal(stakeValue1);
            
            let currentWeight = tokenToWeight(stakeValue1, await stakeToken1.getInterestAccumulation());
            expect(await stakeToken1.getWeight(staker1.address)).to.equal(currentWeight);

            let lastRewardFetch = await stakeToken1.lastRewardFetch();
            lastRewardFetch = lastRewardFetch.add(Constant.STAKE_TOKEN_REWARD_FETCH_COOLDOWN);
            await time.setNextBlockTimestamp(lastRewardFetch);

            const stakeValue2 = ethers.utils.parseEther("1000");
            const tx2 = (stakeToken1.connect(staker1).stake(staker1.address, stakeValue2));

            await expect(tx2)
                .to.emit(stakeToken1, 'Stake')
                .withArgs(staker1.address, stakeValue2);

            expect(await primaryToken.balanceOf(stakeToken1.address))
                .to.equal(initStakeToken1PrimaryBalance.add(stakeValue1).add(stakeValue2));
            expect(await primaryToken.balanceOf(staker1.address))
                .to.equal(initStaker1PrimaryBalance.sub(stakeValue1).sub(stakeValue2));

            expect(await stakeToken1.totalSupply()).to.equal(stakeValue1.add(stakeValue2));

            currentWeight = fixedAdd(
                currentWeight,
                tokenToWeight(stakeValue2, await stakeToken1.getInterestAccumulation())
            );
            expect(await stakeToken1.getWeight(staker1.address)).to.equal(currentWeight);            
        });

        it('10.7.2. stake successfully after stake rewarding completed', async () => {
            const { stakeToken1, staker1, primaryToken, currency, treasury } = await setupBeforeTest({
                setFeeRate: true,
                initializeRewarding: true,
                prepareCurrencyForStakers: true,
                preparePrimaryTokenForStakers: true,
            });

            primaryToken.isStakeRewardingCompleted.returns(true);

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
            
            let currentWeight = tokenToWeight(stakeValue1, await stakeToken1.getInterestAccumulation());
            expect(await stakeToken1.getWeight(staker1.address)).to.equal(currentWeight);

            let lastRewardFetch = await stakeToken1.lastRewardFetch();
            lastRewardFetch = lastRewardFetch.add(Constant.STAKE_TOKEN_REWARD_FETCH_COOLDOWN);
            await time.setNextBlockTimestamp(lastRewardFetch);

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

            currentWeight = fixedAdd(
                currentWeight,
                tokenToWeight(stakeValue2, await stakeToken1.getInterestAccumulation())
            );
            expect(await stakeToken1.getWeight(staker1.address)).to.equal(currentWeight); 

            primaryToken.isStakeRewardingCompleted.reset();
        });
    });

    describe('10.8. unstake(uint256)', async () => {
        it('10.8.1. unstake successfully', async () => {
            const { stakeToken1, staker1, primaryToken } = await setupBeforeTest({
                setFeeRate: true,
                initializeRewarding: true,
                preparePrimaryTokenForStakers: true,
            });

            let initStaker1PrimaryBalance = await primaryToken.balanceOf(staker1.address);
            let initStakeToken1PrimaryBalance = await primaryToken.balanceOf(stakeToken1.address);

            // Initial staking
            const stakeAmount = ethers.utils.parseEther("100");

            let currentWeight = tokenToWeight(
                stakeAmount,
                await stakeToken1.getInterestAccumulation()
            );

            await callTransaction(stakeToken1.connect(staker1).stake(
                staker1.address, 
                stakeAmount
            ));

            primaryToken.isStakeRewardingCompleted.returns(true);

            currentWeight = fixedSub(
                currentWeight,
                tokenToWeight(
                    ethers.utils.parseEther("30"),
                    await stakeToken1.getInterestAccumulation()
                )
            );

            // Unstake #1
            const unstakeAmount1 = ethers.utils.parseEther("30");

            const tx1 = await stakeToken1.connect(staker1).unstake(unstakeAmount1);
            await tx1.wait();

            await expect(tx1)
                .to.emit(stakeToken1, 'Unstake')
                .withArgs(staker1.address, unstakeAmount1);

            expect(await stakeToken1.totalSupply()).to.equal(stakeAmount.sub(unstakeAmount1));
            expect(await stakeToken1.getWeight(staker1.address)).to.equal(currentWeight);

            expect(await primaryToken.balanceOf(stakeToken1.address)).to.equal(
                initStakeToken1PrimaryBalance.add(stakeAmount).sub(unstakeAmount1)
            );
            expect(await primaryToken.balanceOf(staker1.address)).to.equal(
                initStaker1PrimaryBalance.sub(stakeAmount).add(unstakeAmount1)
            );

            // mintForStake
            let lastRewardFetch = await stakeToken1.lastRewardFetch();
            lastRewardFetch = lastRewardFetch.add(Constant.STAKE_TOKEN_REWARD_FETCH_COOLDOWN);
            await time.setNextBlockTimestamp(lastRewardFetch);

            await callTransaction(stakeToken1.fetchReward());

            // Unstake #2
            initStakeToken1PrimaryBalance = await primaryToken.balanceOf(stakeToken1.address);
            initStaker1PrimaryBalance = await primaryToken.balanceOf(staker1.address);

            const unstakeAmount2 = ethers.utils.parseEther("20");

            currentWeight = fixedSub(
                currentWeight,
                tokenToWeight(
                    ethers.utils.parseEther("20"),
                    await stakeToken1.getInterestAccumulation()
                )
            );

            const tx2 = await stakeToken1.connect(staker1).unstake(unstakeAmount2);
            await tx2.wait();

            await expect(tx2)
                .to.emit(stakeToken1, 'Unstake')
                .withArgs(staker1.address, unstakeAmount2);

            expect(await stakeToken1.totalSupply()).to.equal(initStakeToken1PrimaryBalance.sub(unstakeAmount2));
            expect(await stakeToken1.getWeight(staker1.address)).to.equal(currentWeight);

            expect(await primaryToken.balanceOf(stakeToken1.address)).to.equal(
                initStakeToken1PrimaryBalance.sub(unstakeAmount2)
            );
            expect(await primaryToken.balanceOf(staker1.address)).to.equal(
                initStaker1PrimaryBalance.add(unstakeAmount2)
            );                

            primaryToken.isStakeRewardingCompleted.reset();
        });

        it('10.8.2. unstake unsuccessfully when rewarding is not completed', async () => {
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

        it('10.8.3. unstake unsuccessfully when amount is greater than balance', async () => {
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
            primaryToken.isStakeRewardingCompleted.returns(true);

            await expect(stakeToken1.connect(staker1).unstake(stakeAmount.add(1)))
                .to.be.revertedWithCustomError(stakeToken1, 'InsufficientFunds');

            primaryToken.isStakeRewardingCompleted.reset();
        });        
    });

    // describe('10.9. promote(uint256)', async () => {
    //     it('10.9.1. promote successfully', async () => {
    //         const { stakeToken1, stakeToken2, staker1, primaryToken } = await setupBeforeTest({
    //             setFeeRate: true,
    //             initializeRewarding: true,
    //             preparePrimaryTokenForStakers: true,
    //         });

    //         const stakeAmount = ethers.utils.parseEther("100");
    //         await callTransaction(stakeToken1.connect(staker1).stake(
    //             staker1.address, 
    //             stakeAmount
    //         ));

    //         const promoteAmount1 = ethers.utils.parseEther("20");

    //         let stakeToken1Weight = await stakeToken1.getWeight(staker1.address);
    //         let stakeToken2Weight = await stakeToken2.getWeight(staker1.address);

    //         stakeToken1Weight = fixedSub(
    //             stakeToken1Weight,
    //             tokenToWeight(
    //                 promoteAmount1,
    //                 await stakeToken1.getInterestAccumulation()
    //             )
    //         );

    //         stakeToken2Weight = fixedAdd(
    //             stakeToken2Weight,
    //             tokenToWeight(
    //                 promoteAmount1,
    //                 await stakeToken2.getInterestAccumulation()
    //             )
    //         );

    //         const tx1 = await stakeToken1.connect(staker1).promote(promoteAmount1);
    //         await tx1.wait();

    //         await expect(tx1)
    //             .to.emit(stakeToken1, 'Promotion')
    //             .withArgs(staker1.address, promoteAmount1);
                
    //         await expect(stakeToken1.connect(staker1).promote(stakeAmount.sub(promoteAmount1)))
    //             .to.be.revertedWithCustomError(stakeToken1, 'InsufficientFunds');

    //         expect(await stakeToken1.totalSupply()).to.equal(stakeAmount.sub(promoteAmount1));

    //         expect(await stakeToken1.totalSupply()).to.equal(stakeAmount.sub(promoteAmount1));
            
    //         expect(await stakeToken1.getWeight(staker1.address)).to.equal(stakeToken1Weight);
    //         expect(await stakeToken2.getWeight(staker1.address)).to.equal(stakeToken2Weight);


            
    //     });
    // });

    describe('10.10. balanceOf()', async () => {
        it('10.10.1. return correct balance of staker', async () => {
            const { stakeToken1, staker1, staker2, staker3, primaryToken } = await setupBeforeTest({
                setFeeRate: true,
                initializeRewarding: true,
                preparePrimaryTokenForStakers: true,
            });

            const stakeAmount1_Day0 = ethers.utils.parseEther("100");
            const stakeAmount2_Day0 = ethers.utils.parseEther("200");
            await callTransaction(stakeToken1.connect(staker1).stake(
                staker1.address, 
                stakeAmount1_Day0
            ));
            await callTransaction(stakeToken1.connect(staker2).stake(
                staker2.address, 
                stakeAmount2_Day0
            ));

            expectEqualWithErrorMargin(await stakeToken1.balanceOf(staker1.address), stakeAmount1_Day0);
            expectEqualWithErrorMargin(await stakeToken1.balanceOf(staker2.address), stakeAmount2_Day0);

            let lastRewardFetch = await stakeToken1.lastRewardFetch();
            lastRewardFetch = lastRewardFetch.add(Constant.STAKE_TOKEN_REWARD_FETCH_COOLDOWN);
            await time.setNextBlockTimestamp(lastRewardFetch);

            const totalSupply = await stakeToken1.totalSupply();

            await callTransaction(stakeToken1.fetchReward());

            const newTotalSupply = await stakeToken1.totalSupply();

            const stakeAmount1_Day1 = ethers.utils.parseEther("300");
            const stakeAmount2_Day1 = ethers.utils.parseEther("400");
            await callTransaction(stakeToken1.connect(staker1).stake(
                staker1.address, 
                stakeAmount1_Day0
            ));
            await callTransaction(stakeToken1.connect(staker2).stake(
                staker2.address, 
                stakeAmount2_Day0
            ));

            const stakeAmount3_Day1 = ethers.utils.parseEther("500");
            await callTransaction(stakeToken1.connect(staker3).stake(
                staker3.address, 
                stakeAmount3_Day1
            ));

            const stakeAmount1_Day0_AfterInterest = stakeAmount1_Day0.mul(newTotalSupply).div(totalSupply);
            const stakeAmount2_Day0_AfterInterest = stakeAmount2_Day0.mul(newTotalSupply).div(totalSupply);

            expect(await stakeToken1.balanceOf(staker1.address)).to.equal(stakeAmount1_Day0_AfterInterest.add(stakeAmount1_Day1));
            expect(await stakeToken1.balanceOf(staker2.address)).to.equal(stakeAmount2_Day0_AfterInterest.add(stakeAmount2_Day1));

            // expectEqualWithErrorMargin(await stakeToken1.balanceOf(staker1.address), stakeAmount1_Day0_AfterInterest);
            // expectEqualWithErrorMargin(await stakeToken1.balanceOf(staker2.address), stakeAmount2_Day0_AfterInterest);
            expectEqualWithErrorMargin(await stakeToken1.balanceOf(staker3.address), stakeAmount3_Day1);
        });
    });

    describe('10.11. transfer(address, uint256)', async () => {
        it('10.11.1. transfer successfully', async () => {
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
