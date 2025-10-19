import { expect } from 'chai';
import { Contract } from 'ethers';
import { ethers } from 'hardhat';

// @defi-wonderland/smock
import { MockContract, smock } from '@defi-wonderland/smock';

// @nomicfoundation/hardhat-network-helpers
import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';

// @tests
import { Constant } from '@tests/test.constant';

// @tests/liquidity
import { Initialization as LiquidityInitialization } from '@tests/liquidity/test.initialization';

// @typechain-types
import { Admin, Auction, Currency, PrimaryToken, StakeToken, Treasury, Treasury__factory } from '@typechain-types';

// @utils
import { callTransaction, prepareERC20, testReentrancy } from '@utils/blockchain';

// @utils/deployments/common
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployCurrency } from '@utils/deployments/common/currency';

// @utils/deployments/liquidity
import { deployAuction } from '@utils/deployments/liquidity/auction';
import { deployPrimaryToken } from '@utils/deployments/liquidity/primaryToken';
import { deployStakeToken } from '@utils/deployments/liquidity/stakeToken';

// @utils/deployments/mock
import { deployReentrancyERC20 } from '@utils/deployments/mock/reentrancy/reentrancyERC20';

// @utils/models/liquidity
import {
    StartAuctionParams,
    StartAuctionParamsInput,
    UpdateStakeTokensParams,
    UpdateStakeTokensParamsInput,
} from '@utils/models/liquidity/auction';

// @utils/signatures/liquidity
import { getStartAuctionSignatures, getUpdateStakeTokensSignatures } from '@utils/signatures/liquidity/auction';

// @utils/transaction/common
import { getPausableTxByInput_Pause } from '@utils/transaction/common/pausable';

// @utils/transaction/liquidity
import {
    getAuctionTx_Deposit,
    getAuctionTx_Stake,
    getAuctionTx_StartAuction,
    getAuctionTx_UpdateStakeTokens,
    getAuctionTx_Withdraw,
    getAuctionTxByInput_StartAuction,
    getAuctionTxByInput_UpdateStakeTokens,
} from '@utils/transaction/liquidity/auction';
import {
    getPrimaryTokenTxByInput_UnlockForPublicSale,
    getPrimaryTokenTxByInput_UpdateStakeTokens,
    getPrimaryTokenTxByInput_UpdateTreasury,
} from '@utils/transaction/liquidity/primaryToken';

interface AuctionFixture {
    deployer: any;
    admins: any[];
    depositor1: any;
    depositor2: any;
    depositor3: any;

    admin: Admin;
    currency: Currency;
    treasury: MockContract<Treasury>;
    primaryToken: PrimaryToken;
    stakeToken1: StakeToken;
    stakeToken2: StakeToken;
    stakeToken3: StakeToken;
    auction: Auction;
}

async function testReentrancy_Auction(auction: Auction, reentrancyContract: Contract, assertion: any) {
    let data = [auction.interface.encodeFunctionData('deposit', [0])];

    await testReentrancy(reentrancyContract, auction, data, assertion);
}

describe('4.1. Auction', async () => {
    async function auctionFixture(): Promise<AuctionFixture> {
        const [deployer, admin1, admin2, admin3, admin4, admin5, depositor1, depositor2, depositor3] =
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

        const SmockTreasury = await smock.mock<Treasury__factory>('Treasury');
        const treasury = await SmockTreasury.deploy();
        await callTransaction(treasury.initialize(admin.address, currency.address, primaryToken.address));

        const stakeToken1 = (await deployStakeToken(
            deployer,
            admin.address,
            primaryToken.address,
            LiquidityInitialization.STAKE_TOKEN_Name_1,
            LiquidityInitialization.STAKE_TOKEN_Symbol_1,
            LiquidityInitialization.STAKE_TOKEN_FeeRate
        )) as StakeToken;

        const stakeToken2 = (await deployStakeToken(
            deployer,
            admin.address,
            primaryToken.address,
            LiquidityInitialization.STAKE_TOKEN_Name_2,
            LiquidityInitialization.STAKE_TOKEN_Symbol_2,
            LiquidityInitialization.STAKE_TOKEN_FeeRate
        )) as StakeToken;

        const stakeToken3 = (await deployStakeToken(
            deployer,
            admin.address,
            primaryToken.address,
            LiquidityInitialization.STAKE_TOKEN_Name_3,
            LiquidityInitialization.STAKE_TOKEN_Symbol_3,
            LiquidityInitialization.STAKE_TOKEN_FeeRate
        )) as StakeToken;

        const auction = (await deployAuction(deployer, admin.address, primaryToken.address)) as Auction;

        await callTransaction(
            getPrimaryTokenTxByInput_UpdateTreasury(
                primaryToken as any,
                deployer,
                {
                    treasury: treasury.address,
                },
                admin,
                admins
            )
        );

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
            depositor1,
            depositor2,
            depositor3,
            admin,
            treasury,
            currency,
            primaryToken,
            stakeToken1,
            stakeToken2,
            stakeToken3,
            auction,
        };
    }

    async function setupBeforeTest({
        skipMintPrimaryTokenForAuction = false,
        updateStakeTokens = false,
        startAuction = false,
        listDeposits = false,
        pause = false,
    } = {}): Promise<AuctionFixture> {
        const fixture = await loadFixture(auctionFixture);
        const {
            deployer,
            admins,
            depositor1,
            depositor2,
            depositor3,
            admin,
            currency,
            primaryToken,
            stakeToken1,
            stakeToken2,
            stakeToken3,
            auction,
        } = fixture;

        if (!skipMintPrimaryTokenForAuction) {
            await callTransaction(
                getPrimaryTokenTxByInput_UnlockForPublicSale(
                    primaryToken,
                    deployer,
                    {
                        distributor: auction.address,
                    },
                    admin,
                    admins
                )
            );
        }

        if (updateStakeTokens) {
            await callTransaction(
                getAuctionTxByInput_UpdateStakeTokens(
                    auction,
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

        if (startAuction) {
            let currentTimestamp = await time.latest();
            let endAt = currentTimestamp + 10000;
            let vestingDuration = 1000;

            const paramsInput: StartAuctionParamsInput = {
                endAt: endAt,
                vestingDuration: vestingDuration,
            };
            await callTransaction(getAuctionTxByInput_StartAuction(auction, deployer, paramsInput, admin, admins));
        }

        await prepareERC20(currency, [depositor1, depositor2, depositor3], [auction], ethers.utils.parseEther('10000'));

        if (listDeposits) {
            await getAuctionTx_Deposit(auction, depositor1, {
                value: ethers.utils.parseEther('100'),
            });
            await getAuctionTx_Deposit(auction, depositor2, {
                value: ethers.utils.parseEther('200'),
            });
            await getAuctionTx_Deposit(auction, depositor3, {
                value: ethers.utils.parseEther('400'),
            });
        }

        if (pause) {
            await callTransaction(getPausableTxByInput_Pause(auction, deployer, admin, admins));
        }

        return fixture;
    }

    /* --- Initialization --- */
    describe('4.1.1. initialize(address,address)', async () => {
        it('4.1.1.1. Deploy successfully', async () => {
            const fixture = await setupBeforeTest({});
            const { admin, primaryToken, auction } = fixture;

            expect(await auction.totalToken()).to.equal(0);
            expect(await auction.totalDeposit()).to.equal(0);

            expect(await auction.endAt()).to.equal(0);
            expect(await auction.vestingDuration()).to.equal(0);

            expect(await auction.admin()).to.equal(admin.address);
            expect(await auction.primaryToken()).to.equal(primaryToken.address);
            expect(await auction.stakeToken1()).to.equal(ethers.constants.AddressZero);
            expect(await auction.stakeToken2()).to.equal(ethers.constants.AddressZero);
            expect(await auction.stakeToken3()).to.equal(ethers.constants.AddressZero);

            expect(await auction.paused()).to.equal(false);
        });
    });

    /* --- Administration --- */
    describe('4.1.2. updateStakeTokens(address,address,address,bytes[])', async () => {
        it('4.1.2.1. Update stake tokens successfully', async () => {
            const fixture = await setupBeforeTest({});
            const { admin, admins, deployer, auction, stakeToken1, stakeToken2, stakeToken3 } = fixture;

            const paramsInput: UpdateStakeTokensParamsInput = {
                stakeToken1: stakeToken1.address,
                stakeToken2: stakeToken2.address,
                stakeToken3: stakeToken3.address,
            };
            const tx = await getAuctionTxByInput_UpdateStakeTokens(auction, deployer, paramsInput, admin, admins);
            await tx.wait();

            expect(await auction.stakeToken1()).to.equal(stakeToken1.address);
            expect(await auction.stakeToken2()).to.equal(stakeToken2.address);
            expect(await auction.stakeToken3()).to.equal(stakeToken3.address);
        });

        it('4.1.2.2. Update stake tokens unsuccessfully with invalid signatures', async () => {
            const { admin, admins, deployer, auction, stakeToken1, stakeToken2, stakeToken3 } = await setupBeforeTest(
                {}
            );

            const paramsInput: UpdateStakeTokensParamsInput = {
                stakeToken1: stakeToken1.address,
                stakeToken2: stakeToken2.address,
                stakeToken3: stakeToken3.address,
            };
            const params: UpdateStakeTokensParams = {
                ...paramsInput,
                signatures: await getUpdateStakeTokensSignatures(auction, paramsInput, admin, admins, false),
            };
            await expect(getAuctionTx_UpdateStakeTokens(auction, deployer, params)).to.be.revertedWithCustomError(
                admin,
                'FailedVerification'
            );
        });

        async function testForInvalidInput(
            fixture: AuctionFixture,
            stakeToken1: string,
            stakeToken2: string,
            stakeToken3: string
        ) {
            const { admin, admins, deployer, auction } = fixture;
            const paramsInput: UpdateStakeTokensParamsInput = {
                stakeToken1: stakeToken1,
                stakeToken2: stakeToken2,
                stakeToken3: stakeToken3,
            };
            await expect(
                getAuctionTxByInput_UpdateStakeTokens(auction, deployer, paramsInput, admin, admins)
            ).to.be.revertedWithCustomError(auction, 'InvalidUpdating');
        }

        it('4.1.2.3. Update stake tokens unsuccessfully with zero address stake tokens', async () => {
            const fixture = await setupBeforeTest({});
            const { stakeToken1, stakeToken2, stakeToken3 } = fixture;

            await testForInvalidInput(fixture, ethers.constants.AddressZero, stakeToken2.address, stakeToken3.address);
            await testForInvalidInput(fixture, stakeToken1.address, ethers.constants.AddressZero, stakeToken3.address);
            await testForInvalidInput(fixture, stakeToken1.address, stakeToken2.address, ethers.constants.AddressZero);
        });

        it('4.1.2.4. Update stake tokens unsuccessfully when they have already been updated', async () => {
            const fixture = await setupBeforeTest({
                updateStakeTokens: true,
            });
            const { stakeToken1, stakeToken2, stakeToken3 } = fixture;
            await testForInvalidInput(fixture, stakeToken1.address, stakeToken2.address, stakeToken3.address);
        });
    });

    describe('4.1.3. startAuction(uint256,uint256,bytes[])', async () => {
        it('4.1.3.1. Start auction successfully', async () => {
            const fixture = await setupBeforeTest({
                updateStakeTokens: true,
            });
            const { admin, admins, deployer, auction } = fixture;

            let currentTimestamp = await time.latest();
            let endAt = currentTimestamp + 10000;
            let vestingDuration = 1000;

            const paramsInput: StartAuctionParamsInput = {
                endAt: endAt,
                vestingDuration: vestingDuration,
            };
            const tx = await getAuctionTxByInput_StartAuction(auction, deployer, paramsInput, admin, admins);
            await tx.wait();

            expect(await auction.endAt()).to.equal(endAt);
            expect(await auction.vestingDuration()).to.equal(vestingDuration);

            expect(await auction.totalToken()).to.equal(Constant.PRIMARY_TOKEN_PUBLIC_SALE);
        });

        it('4.1.3.2. Start auction unsuccessfully with invalid signatures', async () => {
            const { admin, admins, deployer, auction } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            let currentTimestamp = await time.latest();
            let endAt = currentTimestamp + 10000;
            let vestingDuration = 1000;

            const paramsInput: StartAuctionParamsInput = {
                endAt: endAt,
                vestingDuration: vestingDuration,
            };
            const params: StartAuctionParams = {
                ...paramsInput,
                signatures: await getStartAuctionSignatures(auction, paramsInput, admin, admins, false),
            };
            await expect(getAuctionTx_StartAuction(auction, deployer, params)).to.be.revertedWithCustomError(
                admin,
                'FailedVerification'
            );
        });

        it('4.1.3.3. Start auction unsuccessfully with invalid end time', async () => {
            const { admin, admins, deployer, auction } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            let currentTimestamp = await time.latest();
            await time.setNextBlockTimestamp(currentTimestamp + 10);

            let endAt = currentTimestamp + 9;
            let vestingDuration = 1000;

            const paramsInput: StartAuctionParamsInput = {
                endAt: endAt,
                vestingDuration: vestingDuration,
            };
            await expect(
                getAuctionTxByInput_StartAuction(auction, deployer, paramsInput, admin, admins)
            ).to.be.revertedWithCustomError(auction, 'InvalidTimestamp');
        });

        it('4.1.3.4. Start auction unsuccessfully when it has already started', async () => {
            const { admin, admins, deployer, auction } = await setupBeforeTest({
                updateStakeTokens: true,
                startAuction: true,
            });

            let currentTimestamp = await time.latest();
            let endAt = currentTimestamp + 10000;
            let vestingDuration = 1000;

            const paramsInput: StartAuctionParamsInput = {
                endAt: endAt,
                vestingDuration: vestingDuration,
            };
            await expect(
                getAuctionTxByInput_StartAuction(auction, deployer, paramsInput, admin, admins)
            ).to.be.revertedWithCustomError(auction, 'AlreadyStarted');
        });
    });

    /* --- Query --- */
    describe('4.1.4. allocationOf(address)', async () => {
        it('4.1.4.1. Return correct allocation', async () => {
            const fixture = await setupBeforeTest({
                updateStakeTokens: true,
                startAuction: true,
                listDeposits: true,
            });

            const { depositor1, depositor2, depositor3, auction } = fixture;

            const deposit1 = await auction.deposits(depositor1.address);
            const deposit2 = await auction.deposits(depositor2.address);
            const deposit3 = await auction.deposits(depositor3.address);
            const totalDeposit = deposit1.add(deposit2).add(deposit3);

            expect(await auction.allocationOf(depositor1.address)).to.equal(
                deposit1.mul(Constant.PRIMARY_TOKEN_PUBLIC_SALE).div(totalDeposit)
            );
            expect(await auction.allocationOf(depositor2.address)).to.equal(
                deposit2.mul(Constant.PRIMARY_TOKEN_PUBLIC_SALE).div(totalDeposit)
            );
            expect(await auction.allocationOf(depositor3.address)).to.equal(
                deposit3.mul(Constant.PRIMARY_TOKEN_PUBLIC_SALE).div(totalDeposit)
            );
        });

        it('4.1.4.2. Return zero allocation before any deposits', async () => {
            const fixture = await setupBeforeTest();
            const { depositor1, depositor2, depositor3, auction } = fixture;

            expect(await auction.allocationOf(depositor1.address)).to.equal(0);
            expect(await auction.allocationOf(depositor2.address)).to.equal(0);
            expect(await auction.allocationOf(depositor3.address)).to.equal(0);
        });
    });

    /* --- Command --- */
    describe('4.1.5. deposit(uint256)', async () => {
        it('4.1.5.1. Deposit successfully', async () => {
            const fixture = await setupBeforeTest({
                updateStakeTokens: true,
                startAuction: true,
            });

            const { depositor1, depositor2, auction, currency, treasury, primaryToken } = fixture;

            const amount1 = ethers.utils.parseEther('100');
            const amount2 = ethers.utils.parseEther('200');
            const amount3 = ethers.utils.parseEther('300');

            const auctionInitialBalance = await currency.balanceOf(auction.address);
            const treasuryInitialBalance = await currency.balanceOf(treasury.address);
            const depositor1InitialBalance = await currency.balanceOf(depositor1.address);
            const depositor2InitialBalance = await currency.balanceOf(depositor2.address);

            const tx1 = await getAuctionTx_Deposit(auction, depositor1, {
                value: amount1,
            });
            await tx1.wait();

            await expect(tx1).to.emit(auction, 'Deposit').withArgs(depositor1.address, amount1);
            expect(await currency.balanceOf(auction.address)).to.equal(auctionInitialBalance);
            expect(await currency.balanceOf(treasury.address)).to.equal(treasuryInitialBalance.add(amount1));
            expect(await currency.balanceOf(depositor1.address)).to.equal(depositor1InitialBalance.sub(amount1));
            expect(await primaryToken.publicSaleContribution()).to.equal(amount1);

            expect(await auction.totalDeposit()).to.equal(amount1);
            expect(await auction.deposits(depositor1.address)).to.equal(amount1);

            const tx2 = await getAuctionTx_Deposit(auction, depositor2, {
                value: amount2,
            });
            await tx2.wait();

            await expect(tx2).to.emit(auction, 'Deposit').withArgs(depositor2.address, amount2);
            expect(await currency.balanceOf(auction.address)).to.equal(auctionInitialBalance);
            expect(await currency.balanceOf(treasury.address)).to.equal(
                treasuryInitialBalance.add(amount1).add(amount2)
            );
            expect(await currency.balanceOf(depositor2.address)).to.equal(depositor2InitialBalance.sub(amount2));
            expect(await auction.totalDeposit()).to.equal(amount1.add(amount2));
            expect(await primaryToken.publicSaleContribution()).to.equal(amount1.add(amount2));

            expect(await auction.totalDeposit()).to.equal(amount1.add(amount2));
            expect(await auction.deposits(depositor2.address)).to.equal(amount2);

            const tx3 = await getAuctionTx_Deposit(auction, depositor1, {
                value: amount3,
            });
            await tx3.wait();

            await expect(tx3).to.emit(auction, 'Deposit').withArgs(depositor1.address, amount3);
            expect(await currency.balanceOf(auction.address)).to.equal(auctionInitialBalance);
            expect(await currency.balanceOf(treasury.address)).to.equal(
                treasuryInitialBalance.add(amount1).add(amount2).add(amount3)
            );
            expect(await currency.balanceOf(depositor1.address)).to.equal(
                depositor1InitialBalance.sub(amount1).sub(amount3)
            );
            expect(await primaryToken.publicSaleContribution()).to.equal(amount1.add(amount2).add(amount3));

            expect(await auction.totalDeposit()).to.equal(amount1.add(amount2).add(amount3));
            expect(await auction.deposits(depositor1.address)).to.equal(amount1.add(amount3));
        });

        it('4.1.5.2. Deposit unsuccessfully when paused', async () => {
            const fixture = await setupBeforeTest({
                updateStakeTokens: true,
                startAuction: true,
                pause: true,
            });
            const { depositor1, auction } = fixture;

            const amount = ethers.utils.parseEther('100');
            await expect(getAuctionTx_Deposit(auction, depositor1, { value: amount })).to.be.revertedWith(
                'Pausable: paused'
            );
        });

        it('4.1.5.3. Deposit unsuccessfully when auction not started', async () => {
            const fixture = await setupBeforeTest({
                updateStakeTokens: true,
            });
            const { depositor1, auction } = fixture;

            const amount = ethers.utils.parseEther('100');
            await expect(getAuctionTx_Deposit(auction, depositor1, { value: amount })).to.be.revertedWithCustomError(
                auction,
                'NotStarted'
            );
        });

        it('4.1.5.4. Deposit unsuccessfully when auction ended', async () => {
            const fixture = await setupBeforeTest({
                updateStakeTokens: true,
                startAuction: true,
            });
            const { depositor1, auction } = fixture;

            await time.setNextBlockTimestamp(await auction.endAt());

            const amount = ethers.utils.parseEther('100');
            await expect(getAuctionTx_Deposit(auction, depositor1, { value: amount })).to.be.revertedWithCustomError(
                auction,
                'AlreadyEnded'
            );
        });

        it('4.1.5.5. Deposit unsuccessfully when the contract is reentered', async () => {
            const fixture = await setupBeforeTest({
                updateStakeTokens: true,
                startAuction: true,
            });

            const { deployer, depositor1, auction, treasury } = fixture;

            const reentrancyERC20 = await deployReentrancyERC20(deployer, true, false);
            await callTransaction(
                reentrancyERC20.updateReentrancyPlan(
                    auction.address,
                    auction.interface.encodeFunctionData('deposit', [ethers.utils.parseEther('100')])
                )
            );

            await treasury.setVariable('currency', reentrancyERC20.address);

            const amount = ethers.utils.parseEther('100');
            await testReentrancy_Auction(auction, reentrancyERC20, async () => {
                await expect(getAuctionTx_Deposit(auction, depositor1, { value: amount })).to.be.revertedWith(
                    'ReentrancyGuard: reentrant call'
                );
            });
        });
    });

    describe('4.1.6. withdraw()', async () => {
        it('4.1.6.1. Deposit successfully', async () => {
            const fixture = await setupBeforeTest({
                updateStakeTokens: true,
                startAuction: true,
                listDeposits: true,
            });

            const { depositor1, depositor2, depositor3, auction, primaryToken } = fixture;

            await ethers.provider.send('evm_setAutomine', [false]);

            let endAt = await auction.endAt();
            let vestingDuration = await auction.vestingDuration();

            let timestamp1 = endAt.add(vestingDuration.div(5));
            await time.setNextBlockTimestamp(timestamp1);

            const depositor1_timestamp1_tx = await getAuctionTx_Withdraw(auction, depositor1);
            await ethers.provider.send('evm_mine', []);

            const vestedAmount1_timestamp1 = (await auction.allocationOf(depositor1.address))
                .mul(timestamp1.sub(endAt))
                .div(vestingDuration);

            await expect(depositor1_timestamp1_tx)
                .to.emit(auction, 'Withdrawal')
                .withArgs(depositor1.address, vestedAmount1_timestamp1);

            expect(await primaryToken.balanceOf(depositor1.address)).to.equal(vestedAmount1_timestamp1);
            expect(await auction.withdrawnAmount(depositor1.address)).to.equal(vestedAmount1_timestamp1);

            let timestamp2 = endAt.add(vestingDuration.div(3));
            await time.setNextBlockTimestamp(timestamp2);

            const depositor1_timestamp2_tx = await getAuctionTx_Withdraw(auction, depositor1);
            const depositor2_timestamp2_tx = await getAuctionTx_Withdraw(auction, depositor2);
            await ethers.provider.send('evm_mine', []);

            const vestedAmount1_timestamp2 = (await auction.allocationOf(depositor1.address))
                .mul(timestamp2.sub(endAt))
                .div(vestingDuration);
            const vestedAmount2_timestamp2 = (await auction.allocationOf(depositor2.address))
                .mul(timestamp2.sub(endAt))
                .div(vestingDuration);

            await expect(depositor1_timestamp2_tx)
                .to.emit(auction, 'Withdrawal')
                .withArgs(depositor1.address, vestedAmount1_timestamp2.sub(vestedAmount1_timestamp1));
            await expect(depositor2_timestamp2_tx)
                .to.emit(auction, 'Withdrawal')
                .withArgs(depositor2.address, vestedAmount2_timestamp2);

            expect(await primaryToken.balanceOf(depositor1.address)).to.equal(vestedAmount1_timestamp2);
            expect(await auction.withdrawnAmount(depositor1.address)).to.equal(vestedAmount1_timestamp2);
            expect(await primaryToken.balanceOf(depositor2.address)).to.equal(vestedAmount2_timestamp2);
            expect(await auction.withdrawnAmount(depositor2.address)).to.equal(vestedAmount2_timestamp2);

            let timestamp3 = endAt.add(vestingDuration.add(100));
            await time.setNextBlockTimestamp(timestamp3);

            const depositor1_timestamp3_tx = await getAuctionTx_Withdraw(auction, depositor1);
            const depositor2_timestamp3_tx = await getAuctionTx_Withdraw(auction, depositor2);
            const depositor3_timestamp3_tx = await getAuctionTx_Withdraw(auction, depositor3);
            await ethers.provider.send('evm_mine', []);

            const vestedAmount1_timestamp3 = await auction.allocationOf(depositor1.address);
            const vestedAmount2_timestamp3 = await auction.allocationOf(depositor2.address);
            const vestedAmount3_timestamp3 = await auction.allocationOf(depositor3.address);

            await expect(depositor1_timestamp3_tx)
                .to.emit(auction, 'Withdrawal')
                .withArgs(depositor1.address, vestedAmount1_timestamp3.sub(vestedAmount1_timestamp2));
            await expect(depositor2_timestamp3_tx)
                .to.emit(auction, 'Withdrawal')
                .withArgs(depositor2.address, vestedAmount2_timestamp3.sub(vestedAmount2_timestamp2));
            await expect(depositor3_timestamp3_tx)
                .to.emit(auction, 'Withdrawal')
                .withArgs(depositor3.address, vestedAmount3_timestamp3);

            expect(await primaryToken.balanceOf(depositor1.address)).to.equal(vestedAmount1_timestamp3);
            expect(await auction.withdrawnAmount(depositor1.address)).to.equal(vestedAmount1_timestamp3);
            expect(await primaryToken.balanceOf(depositor2.address)).to.equal(vestedAmount2_timestamp3);
            expect(await auction.withdrawnAmount(depositor2.address)).to.equal(vestedAmount2_timestamp3);
            expect(await primaryToken.balanceOf(depositor3.address)).to.equal(vestedAmount3_timestamp3);
            expect(await auction.withdrawnAmount(depositor3.address)).to.equal(vestedAmount3_timestamp3);

            await ethers.provider.send('evm_setAutomine', [true]);
        });

        it('4.1.6.2. Withdraw unsuccessfully when paused', async () => {
            const fixture = await setupBeforeTest({
                updateStakeTokens: true,
                startAuction: true,
                listDeposits: true,
                pause: true,
            });

            const { depositor1, auction } = fixture;

            await expect(getAuctionTx_Withdraw(auction, depositor1)).to.be.revertedWith('Pausable: paused');
        });

        it('4.1.6.3. Withdraw unsuccessfully when auction not started', async () => {
            const fixture = await setupBeforeTest({
                updateStakeTokens: true,
            });

            const { depositor1, auction } = fixture;

            await expect(getAuctionTx_Withdraw(auction, depositor1)).to.be.revertedWithCustomError(
                auction,
                'NotStarted'
            );
        });

        it('4.1.6.4. Withdraw unsuccessfully when auction not ended', async () => {
            const fixture = await setupBeforeTest({
                updateStakeTokens: true,
                startAuction: true,
                listDeposits: true,
            });

            const { depositor1, auction } = fixture;

            await expect(getAuctionTx_Withdraw(auction, depositor1)).to.be.revertedWithCustomError(auction, 'NotEnded');
        });
    });

    describe('4.1.7. stake(uint256,uint256)', async () => {
        it('4.1.7.1. Stake successfully', async () => {
            const fixture = await setupBeforeTest({
                updateStakeTokens: true,
                startAuction: true,
                listDeposits: true,
            });

            const { depositor1, depositor2, depositor3, auction, primaryToken, stakeToken1, stakeToken2, stakeToken3 } =
                fixture;

            await ethers.provider.send('evm_setAutomine', [false]);

            let endAt = await auction.endAt();
            let vestingDuration = await auction.vestingDuration();

            let timestamp1 = endAt.add(vestingDuration.div(5));
            await time.setNextBlockTimestamp(timestamp1);

            const depositor1_timestamp1_tx = await getAuctionTx_Stake(auction, depositor1, {
                stake1: ethers.utils.parseEther('100'),
                stake2: ethers.utils.parseEther('200'),
            });
            await ethers.provider.send('evm_mine', []);

            const allocation1 = await auction.allocationOf(depositor1.address);
            const stake1_depositor1_timestamp1 = ethers.utils.parseEther('100');
            const stake2_depositor1_timestamp1 = ethers.utils.parseEther('200');
            const stake3_depositor1_timestamp1 = allocation1
                .sub(stake1_depositor1_timestamp1)
                .sub(stake2_depositor1_timestamp1);

            await expect(depositor1_timestamp1_tx)
                .to.emit(auction, 'Stake')
                .withArgs(
                    depositor1.address,
                    stake1_depositor1_timestamp1,
                    stake2_depositor1_timestamp1,
                    stake3_depositor1_timestamp1
                );

            expect(await primaryToken.balanceOf(depositor1.address)).to.equal(0);
            expect(await auction.withdrawnAmount(depositor1.address)).to.equal(allocation1);

            expect(await stakeToken1.balanceOf(depositor1.address)).to.equal(stake1_depositor1_timestamp1);
            expect(await stakeToken2.balanceOf(depositor1.address)).to.equal(stake2_depositor1_timestamp1);
            expect(await stakeToken3.balanceOf(depositor1.address)).to.equal(stake3_depositor1_timestamp1);

            let timestamp2 = endAt.add(vestingDuration.div(3));
            await time.setNextBlockTimestamp(timestamp2);

            const vestedAmount2_timestamp2 = (await auction.allocationOf(depositor2.address))
                .mul(timestamp2.sub(endAt))
                .div(vestingDuration);

            await getAuctionTx_Withdraw(auction, depositor2);
            await ethers.provider.send('evm_mine', []);

            expect(await primaryToken.balanceOf(depositor2.address)).to.equal(vestedAmount2_timestamp2);
            expect(await auction.withdrawnAmount(depositor2.address)).to.equal(vestedAmount2_timestamp2);

            let timestamp3 = endAt.add(vestingDuration.add(100));
            await time.setNextBlockTimestamp(timestamp3);

            const allocation2 = await auction.allocationOf(depositor2.address);
            const allocation3 = await auction.allocationOf(depositor3.address);

            const stake1_depositor2_timestamp3 = ethers.utils.parseEther('700');
            const stake2_depositor2_timestamp3 = ethers.utils.parseEther('800');
            const stake3_depositor2_timestamp3 = allocation2
                .sub(vestedAmount2_timestamp2)
                .sub(stake1_depositor2_timestamp3)
                .sub(stake2_depositor2_timestamp3);

            const stake1_depositor3_timestamp3 = ethers.utils.parseEther('900');
            const stake2_depositor3_timestamp3 = ethers.utils.parseEther('1000');
            const stake3_depositor3_timestamp3 = allocation3
                .sub(stake1_depositor3_timestamp3)
                .sub(stake2_depositor3_timestamp3);

            const depositor2_timestamp3_tx = await getAuctionTx_Stake(auction, depositor2, {
                stake1: stake1_depositor2_timestamp3,
                stake2: stake2_depositor2_timestamp3,
            });
            const depositor3_timestamp3_tx = await getAuctionTx_Stake(auction, depositor3, {
                stake1: stake1_depositor3_timestamp3,
                stake2: stake2_depositor3_timestamp3,
            });
            await ethers.provider.send('evm_mine', []);

            await expect(depositor2_timestamp3_tx)
                .to.emit(auction, 'Stake')
                .withArgs(
                    depositor2.address,
                    stake1_depositor2_timestamp3,
                    stake2_depositor2_timestamp3,
                    stake3_depositor2_timestamp3
                );
            await expect(depositor3_timestamp3_tx)
                .to.emit(auction, 'Stake')
                .withArgs(
                    depositor3.address,
                    stake1_depositor3_timestamp3,
                    stake2_depositor3_timestamp3,
                    stake3_depositor3_timestamp3
                );

            expect(await primaryToken.balanceOf(depositor2.address)).to.equal(vestedAmount2_timestamp2);
            expect(await auction.withdrawnAmount(depositor2.address)).to.equal(allocation2);
            expect(await primaryToken.balanceOf(depositor3.address)).to.equal(0);
            expect(await auction.withdrawnAmount(depositor3.address)).to.equal(allocation3);

            expect(await stakeToken1.balanceOf(depositor2.address)).to.equal(stake1_depositor2_timestamp3);
            expect(await stakeToken2.balanceOf(depositor2.address)).to.equal(stake2_depositor2_timestamp3);
            expect(await stakeToken3.balanceOf(depositor2.address)).to.equal(stake3_depositor2_timestamp3);

            expect(await stakeToken1.balanceOf(depositor3.address)).to.equal(stake1_depositor3_timestamp3);
            expect(await stakeToken2.balanceOf(depositor3.address)).to.equal(stake2_depositor3_timestamp3);
            expect(await stakeToken3.balanceOf(depositor3.address)).to.equal(stake3_depositor3_timestamp3);

            await ethers.provider.send('evm_setAutomine', [true]);
        });

        it('4.1.7.2. Stake unsuccessfully when paused', async () => {
            const fixture = await setupBeforeTest({
                updateStakeTokens: true,
                startAuction: true,
                listDeposits: true,
                pause: true,
            });

            const { depositor1, auction } = fixture;

            await expect(
                getAuctionTx_Stake(auction, depositor1, {
                    stake1: ethers.utils.parseEther('100'),
                    stake2: ethers.utils.parseEther('200'),
                })
            ).to.be.revertedWith('Pausable: paused');
        });

        it('4.1.7.3. Stake unsuccessfully when stake tokens not assigned', async () => {
            const fixture = await setupBeforeTest({
                startAuction: true,
                listDeposits: true,
            });

            const { depositor1, auction } = fixture;

            await expect(
                getAuctionTx_Stake(auction, depositor1, {
                    stake1: ethers.utils.parseEther('100'),
                    stake2: ethers.utils.parseEther('200'),
                })
            ).to.be.revertedWithCustomError(auction, 'NotAssignedStakeTokens');
        });

        it('4.1.7.4. Stake unsuccessfully when auction not started', async () => {
            const fixture = await setupBeforeTest({
                updateStakeTokens: true,
            });

            const { depositor1, auction } = fixture;

            await expect(
                getAuctionTx_Stake(auction, depositor1, {
                    stake1: ethers.utils.parseEther('100'),
                    stake2: ethers.utils.parseEther('200'),
                })
            ).to.be.revertedWithCustomError(auction, 'NotStarted');
        });

        it('4.1.7.5. Stake unsuccessfully when auction not ended', async () => {
            const fixture = await setupBeforeTest({
                updateStakeTokens: true,
                startAuction: true,
                listDeposits: true,
            });

            const { depositor1, auction } = fixture;

            await expect(
                getAuctionTx_Stake(auction, depositor1, {
                    stake1: ethers.utils.parseEther('100'),
                    stake2: ethers.utils.parseEther('200'),
                })
            ).to.be.revertedWithCustomError(auction, 'NotEnded');
        });

        it('4.1.7.6. Stake unsuccessfully with insufficient funds', async () => {
            const fixture = await setupBeforeTest({
                updateStakeTokens: true,
                startAuction: true,
                listDeposits: true,
            });

            const { depositor1, auction } = fixture;

            await time.setNextBlockTimestamp(await auction.endAt());

            await expect(
                getAuctionTx_Stake(auction, depositor1, {
                    stake1: ethers.utils.parseEther('100'),
                    stake2: await auction.allocationOf(depositor1.address),
                })
            ).to.be.revertedWithCustomError(auction, 'InsufficientFunds');
        });
    });
});
