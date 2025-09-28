import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Admin, Auction, Currency, PrimaryToken, StakeToken, Treasury, Treasury__factory } from '@typechain-types';
import { callTransaction, getSignatures, prepareERC20, testReentrancy } from '@utils/blockchain';
import { deployAdmin } from '@utils/deployments/common/admin';
import { Constant } from '@tests/test.constant';
import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import { deployCurrency } from '@utils/deployments/common/currency';
import { deployPrimaryToken } from '@utils/deployments/liquidity/primaryToken';
import { deployStakeToken } from '@utils/deployments/liquidity/stakeToken';
import { Initialization as LiquidityInitialization } from '@tests/liquidity/test.initialization';
import { deployAuction } from '@utils/deployments/liquidity/auction';
import { callAuction_StartAuction, callAuction_UpdateStakeTokens } from '@utils/callWithSignatures/auction';
import { callPrimaryToken_UnlockForPublicSale, callPrimaryToken_UpdateStakeTokens, callPrimaryToken_UpdateTreasury } from '@utils/callWithSignatures/primary';
import { MockContract, smock } from '@defi-wonderland/smock';
import { deployReentrancyERC20 } from '@utils/deployments/mock/mockReentrancy/reentrancyERC20';
import { Contract } from 'ethers';
import { getStartAuctionInvalidSignatures, getStartAuctionSignatures, getUpdateStakeTokensInvalidSignatures, getUpdateStakeTokensSignatures } from '@utils/signatures/Auction';
import { StartAuctionParams, StartAuctionParamsInput, UpdateStakeTokensParams, UpdateStakeTokensParamsInput } from '@utils/models/Auction';
import { getStartAuctionTx, getUpdateStakeTokensTx } from '@utils/transaction/Auction';
import { callPausable_Pause } from '@utils/callWithSignatures/Pausable';

interface AuctionFixture {
    deployer: any;
    admins: any[];
    depositor1: any, depositor2: any, depositor3: any;

    admin: Admin;
    treasury: MockContract<Treasury>;
    currency: Currency;
    primaryToken: PrimaryToken;
    stakeToken1: StakeToken;
    stakeToken2: StakeToken;
    stakeToken3: StakeToken;
    auction: Auction;
}

async function testReentrancy_Auction(
    auction: Auction,
    reentrancyContract: Contract,
    assertion: any,
) {
    let data = [
        auction.interface.encodeFunctionData("deposit", [0]),
        auction.interface.encodeFunctionData("deposit", [0]),
    ];

    await testReentrancy(
        reentrancyContract,
        auction,
        data,
        assertion,
    );
}

describe('4.1. Auction', async () => {
    async function auctionFixture(): Promise<AuctionFixture> {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        const admins = [];
        for (let i = 1; i <= Constant.ADMIN_NUMBER; ++i) admins.push(accounts[i]);
        const depositor1 = accounts[Constant.ADMIN_NUMBER + 1];
        const depositor2 = accounts[Constant.ADMIN_NUMBER + 2];
        const depositor3 = accounts[Constant.ADMIN_NUMBER + 3];

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
        
        const SmockTreasury = await smock.mock<Treasury__factory>('Treasury');
        const treasury = await SmockTreasury.deploy();
        await callTransaction(treasury.initialize(
            admin.address,
            currency.address,
            primaryToken.address,
        ));

        const stakeToken1 = await deployStakeToken(
            deployer,
            admin.address,
            primaryToken.address,
            LiquidityInitialization.STAKE_TOKEN_Name_1,
            LiquidityInitialization.STAKE_TOKEN_Symbol_1,
            LiquidityInitialization.STAKE_TOKEN_FeeRate,
        ) as StakeToken;

        const stakeToken2 = await deployStakeToken(
            deployer,
            admin.address,
            primaryToken.address,
            LiquidityInitialization.STAKE_TOKEN_Name_2,
            LiquidityInitialization.STAKE_TOKEN_Symbol_2,
            LiquidityInitialization.STAKE_TOKEN_FeeRate,
        ) as StakeToken;

        const stakeToken3 = await deployStakeToken(
            deployer,
            admin.address,
            primaryToken.address,
            LiquidityInitialization.STAKE_TOKEN_Name_3,
            LiquidityInitialization.STAKE_TOKEN_Symbol_3,
            LiquidityInitialization.STAKE_TOKEN_FeeRate,
        ) as StakeToken;

        const auction = await deployAuction(
            deployer,
            admin.address,
            primaryToken.address,
        ) as Auction;

        await callPrimaryToken_UpdateTreasury(
            primaryToken,
            deployer,
            admins,
            admin,
            {
                treasury: treasury.address,
            },
        );

        await callPrimaryToken_UpdateStakeTokens(
            primaryToken,
            deployer,
            admins,
            admin,
            {
                stakeToken1: stakeToken1.address,
                stakeToken2: stakeToken2.address,
                stakeToken3: stakeToken3.address,
            }
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
    };

    async function setupBeforeTest({
        mintPrimaryTokenForAuction = false,
        updateStakeTokens = false,
        startAuction = false,
        listDeposits = false,
        pause = false,
    } = {}): Promise<AuctionFixture> {
        const fixture = await loadFixture(auctionFixture);
        const { deployer, admins, depositor1, depositor2, depositor3, admin, treasury, currency, primaryToken, stakeToken1, stakeToken2, stakeToken3, auction } = fixture;

        if (mintPrimaryTokenForAuction) {
            await callPrimaryToken_UnlockForPublicSale(
                primaryToken,
                deployer,
                admins,
                admin,
                {
                    distributor: auction.address,
                },
            );
        }

        if (updateStakeTokens) {
            const paramsInput: UpdateStakeTokensParamsInput = {
                stakeToken1: stakeToken1.address,
                stakeToken2: stakeToken2.address,
                stakeToken3: stakeToken3.address,
            };
            await callAuction_UpdateStakeTokens(
                auction,
                deployer,
                admins,
                admin,
                paramsInput,
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
            await callAuction_StartAuction(
                auction,
                deployer,
                admins,
                admin,
                paramsInput,
            );
        }

        await prepareERC20(
            currency,
            [depositor1, depositor2, depositor3],
            [auction],
            ethers.utils.parseEther("10000"),
        );

        if (listDeposits) {
            await auction.connect(depositor1).deposit(ethers.utils.parseEther('100'));
            await auction.connect(depositor2).deposit(ethers.utils.parseEther('200'));
            await auction.connect(depositor3).deposit(ethers.utils.parseEther('400'));
        }

        if (pause) {
            await callPausable_Pause(
                auction,
                deployer,
                admins,
                admin,
            );
        }

        return fixture;
    }

    describe('4.1.1. initialize(address, address, address, address, address)', async () => {
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

    describe('4.1.2. updateStakeTokens(address, address, address, bytes[])', async () => {
        it('4.1.2.1. updateStakeTokens successfully', async () => {
            const fixture = await setupBeforeTest({});
            const { admin, admins, deployer, auction, stakeToken1, stakeToken2, stakeToken3 } = fixture;
            
            const paramsInput: UpdateStakeTokensParamsInput = {
                stakeToken1: stakeToken1.address,
                stakeToken2: stakeToken2.address,
                stakeToken3: stakeToken3.address,
            };
            const params: UpdateStakeTokensParams = {
                ...paramsInput,
                signatures: await getUpdateStakeTokensSignatures(auction, admins, admin, paramsInput),
            };

            const tx = await getUpdateStakeTokensTx(auction, deployer, params);
            await tx.wait();

            expect(await auction.stakeToken1()).to.equal(params.stakeToken1);
            expect(await auction.stakeToken2()).to.equal(params.stakeToken2);
            expect(await auction.stakeToken3()).to.equal(params.stakeToken3);
        });

        it('4.1.2.2. updateStakeTokens unsuccessfully with invalid signatures', async () => {
            const { admin, admins, deployer, auction, stakeToken1, stakeToken2, stakeToken3 } = await setupBeforeTest({});
            
            const paramsInput: UpdateStakeTokensParamsInput = {
                stakeToken1: stakeToken1.address,
                stakeToken2: stakeToken2.address,
                stakeToken3: stakeToken3.address,
            };
            const params: UpdateStakeTokensParams = {
                ...paramsInput,
                signatures: await getUpdateStakeTokensInvalidSignatures(auction, admins, admin, paramsInput),
            };

            await expect(getUpdateStakeTokensTx(auction, deployer, params))
                .to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        async function testForInvalidInput(
            fixture: AuctionFixture,
            stakeToken1: string,
            stakeToken2: string,
            stakeToken3: string,
        ) {
            const { admin, admins, deployer, auction } = fixture;
            const paramsInput: UpdateStakeTokensParamsInput = {
                stakeToken1: stakeToken1,
                stakeToken2: stakeToken2,
                stakeToken3: stakeToken3,
            };
            const params: UpdateStakeTokensParams = {
                ...paramsInput,
                signatures: await getUpdateStakeTokensSignatures(auction, admins, admin, paramsInput),
            };
            await expect(getUpdateStakeTokensTx(auction, deployer, params))
                .to.be.revertedWithCustomError(auction, 'InvalidUpdating');
        }

        it('4.1.2.3. updateStakeTokens unsuccessfully with zero address stake tokens', async () => {
            const fixture = await setupBeforeTest({});
            const { stakeToken1, stakeToken2, stakeToken3 } = fixture;

            await testForInvalidInput(fixture, ethers.constants.AddressZero, stakeToken2.address, stakeToken3.address);
            await testForInvalidInput(fixture, stakeToken1.address, ethers.constants.AddressZero, stakeToken3.address);
            await testForInvalidInput(fixture, stakeToken1.address, stakeToken2.address, ethers.constants.AddressZero);
        });

        it('4.1.2.4. updateStakeTokens unsuccessfully with already updated stake tokens', async () => {
            const fixture = await setupBeforeTest({
                updateStakeTokens: true,
            });
            const { stakeToken1, stakeToken2, stakeToken3 } = fixture;
            await testForInvalidInput(fixture, stakeToken1.address, stakeToken2.address, stakeToken3.address);
        });        
    });

    describe('4.1.3. startAuction(uint256, uint256, bytes[])', async () => {
        it('4.1.3.1. startAuction successfully', async () => {
            const fixture = await setupBeforeTest({
                updateStakeTokens: true,
                mintPrimaryTokenForAuction: true,
            });
            const { admin, admins, deployer, auction } = fixture;

            let currentTimestamp = await time.latest();
            let endAt = currentTimestamp + 10000;
            let vestingDuration = 1000;

            const paramsInput: StartAuctionParamsInput = {
                endAt: endAt,
                vestingDuration: vestingDuration,
            };
            const params: StartAuctionParams = {
                ...paramsInput,
                signatures: await getStartAuctionSignatures(auction, admins, admin, paramsInput),
            };

            const tx = await getStartAuctionTx(auction, deployer, params);
            await tx.wait();

            expect(await auction.endAt()).to.equal(endAt);
            expect(await auction.vestingDuration()).to.equal(vestingDuration);

            expect(await auction.totalToken()).to.equal(Constant.PRIMARY_TOKEN_PUBLIC_SALE);            
        });

        it('4.1.3.2. startAuction unsuccessfully with invalid signatures', async () => {
            const { admin, admins, deployer, auction } = await setupBeforeTest({
                updateStakeTokens: true,
                mintPrimaryTokenForAuction: true,
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
                signatures: await getStartAuctionInvalidSignatures(auction, admins, admin, paramsInput),
            };

            await expect(getStartAuctionTx(auction, deployer, params))
                .to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('4.1.3.3. startAuction unsuccessfully with invalid end time', async () => {
            const { admin, admins, deployer, auction } = await setupBeforeTest({
                updateStakeTokens: true,
                mintPrimaryTokenForAuction: true,
            });

            let currentTimestamp = await time.latest();
            await time.setNextBlockTimestamp(currentTimestamp + 10);

            let endAt = currentTimestamp + 9;
            let vestingDuration = 1000;

            const paramsInput: StartAuctionParamsInput = {
                endAt: endAt,
                vestingDuration: vestingDuration,
            };
            const params: StartAuctionParams = {
                ...paramsInput,
                signatures: await getStartAuctionSignatures(auction, admins, admin, paramsInput),
            };

            await expect(getStartAuctionTx(auction, deployer, params))
                .to.be.revertedWithCustomError(auction, 'InvalidTimestamp');
        });

        it('4.1.3.4. startAuction unsuccessfully when it has already started', async () => {
            const { admin, admins, deployer, auction } = await setupBeforeTest({
                updateStakeTokens: true,
                mintPrimaryTokenForAuction: true,
                startAuction: true,
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
                signatures: await getStartAuctionSignatures(auction, admins, admin, paramsInput),
            };

            await expect(getStartAuctionTx(auction, deployer, params))
                .to.be.revertedWithCustomError(auction, 'AlreadyStarted');
        });
    });
    
    describe('4.1.4. deposit(uint256, bytes[])', async () => {
        it('4.1.4.1. deposit successfully', async () => {
            const fixture = await setupBeforeTest({
                updateStakeTokens: true,
                mintPrimaryTokenForAuction: true,
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

            const tx1 = await auction.connect(depositor1).deposit(amount1);
            await tx1.wait();

            await expect(tx1).to.emit(auction, 'Deposit').withArgs(depositor1.address, amount1);
            expect(await currency.balanceOf(auction.address)).to.equal(auctionInitialBalance);
            expect(await currency.balanceOf(treasury.address)).to.equal(treasuryInitialBalance.add(amount1));
            expect(await currency.balanceOf(depositor1.address)).to.equal(depositor1InitialBalance.sub(amount1));
            expect(await primaryToken.publicSaleContribution()).to.equal(amount1);

            expect(await auction.totalDeposit()).to.equal(amount1);
            expect(await auction.deposits(depositor1.address)).to.equal(amount1);

            const tx2 = await auction.connect(depositor2).deposit(amount2);
            await tx2.wait();

            await expect(tx2).to.emit(auction, 'Deposit').withArgs(depositor2.address, amount2);
            expect(await currency.balanceOf(auction.address)).to.equal(auctionInitialBalance);
            expect(await currency.balanceOf(treasury.address)).to.equal(treasuryInitialBalance.add(amount1).add(amount2));
            expect(await currency.balanceOf(depositor2.address)).to.equal(depositor2InitialBalance.sub(amount2));
            expect(await auction.totalDeposit()).to.equal(amount1.add(amount2));
            expect(await primaryToken.publicSaleContribution()).to.equal(amount1.add(amount2));

            expect(await auction.totalDeposit()).to.equal(amount1.add(amount2));
            expect(await auction.deposits(depositor2.address)).to.equal(amount2);

            const tx3 = await auction.connect(depositor1).deposit(amount3);
            await tx3.wait();

            await expect(tx3).to.emit(auction, 'Deposit').withArgs(depositor1.address, amount3);
            expect(await currency.balanceOf(auction.address)).to.equal(auctionInitialBalance);
            expect(await currency.balanceOf(treasury.address)).to.equal(treasuryInitialBalance.add(amount1).add(amount2).add(amount3));
            expect(await currency.balanceOf(depositor1.address)).to.equal(depositor1InitialBalance.sub(amount1).sub(amount3));
            expect(await primaryToken.publicSaleContribution()).to.equal(amount1.add(amount2).add(amount3));

            expect(await auction.totalDeposit()).to.equal(amount1.add(amount2).add(amount3));
            expect(await auction.deposits(depositor1.address)).to.equal(amount1.add(amount3));
        });
        
        it('4.1.4.2. deposit unsuccessfully when paused', async () => {
            const fixture = await setupBeforeTest({
                updateStakeTokens: true,
                mintPrimaryTokenForAuction: true,
                startAuction: true,
                pause: true,
            });
            const { depositor1, auction } = fixture;

            const amount = ethers.utils.parseEther('100');
            await expect(auction.connect(depositor1).deposit(amount)).to.be.revertedWith('Pausable: paused');
        });

        it('4.1.4.3. deposit unsuccessfully when auction not started', async () => {
            const fixture = await setupBeforeTest({
                updateStakeTokens: true,
                mintPrimaryTokenForAuction: true,
            });
            const { depositor1, auction } = fixture;

            const amount = ethers.utils.parseEther('100');
            await expect(auction.connect(depositor1).deposit(amount)).to.be.revertedWithCustomError(auction, 'NotStarted');            
        });

        it('4.1.4.4. deposit unsuccessfully when auction ended', async () => {
            const fixture = await setupBeforeTest({
                updateStakeTokens: true,
                mintPrimaryTokenForAuction: true,
                startAuction: true,
            });
            const { depositor1, auction } = fixture;

            await time.setNextBlockTimestamp(await auction.endAt());

            const amount = ethers.utils.parseEther('100');
            await expect(auction.connect(depositor1).deposit(amount)).to.be.revertedWithCustomError(auction, 'AlreadyEnded');
        });

        it('4.1.4.5. deposit unsuccessfully when contract is reentered', async () => {
            const fixture = await setupBeforeTest({
                updateStakeTokens: true,
                mintPrimaryTokenForAuction: true,
                startAuction: true,
            });

            const { deployer, depositor1, auction, treasury } = fixture;

            const reentrancyERC20 = await deployReentrancyERC20(deployer);
            await callTransaction(reentrancyERC20.updateReentrancyPlan(
                auction.address,
                auction.interface.encodeFunctionData('deposit', [ethers.utils.parseEther('100')]),
            ));

            treasury.setVariable('currency', reentrancyERC20.address);

            const amount = ethers.utils.parseEther('100');
            await testReentrancy_Auction(
                auction,
                reentrancyERC20,
                async () => {
                    await expect(auction.connect(depositor1).deposit(amount)).to.be.revertedWith('ReentrancyGuard: reentrant call');
                },
            );
        });
    });

    describe('4.1.5. allocationOf(address)', async () => {
        it('4.1.5.1. return correct allocation', async () => {
            const fixture = await setupBeforeTest({
                updateStakeTokens: true,
                mintPrimaryTokenForAuction: true,
                startAuction: true,
                listDeposits: true,
            });

            const { depositor1, depositor2, depositor3, auction } = fixture;

            const deposit1 = await auction.deposits(depositor1.address);
            const deposit2 = await auction.deposits(depositor2.address);
            const deposit3 = await auction.deposits(depositor3.address);
            const totalDeposit = await deposit1.add(deposit2).add(deposit3);

            expect(await auction.allocationOf(depositor1.address)).to.equal(deposit1.mul(Constant.PRIMARY_TOKEN_PUBLIC_SALE).div(totalDeposit));
            expect(await auction.allocationOf(depositor2.address)).to.equal(deposit2.mul(Constant.PRIMARY_TOKEN_PUBLIC_SALE).div(totalDeposit));
            expect(await auction.allocationOf(depositor3.address)).to.equal(deposit3.mul(Constant.PRIMARY_TOKEN_PUBLIC_SALE).div(totalDeposit));
        });

        it('4.1.5.2. return zero allocation before any deposits', async () => {
            const fixture = await setupBeforeTest({});
            const { depositor1, depositor2, depositor3, auction } = fixture;

            expect(await auction.allocationOf(depositor1.address)).to.equal(0);
            expect(await auction.allocationOf(depositor2.address)).to.equal(0);
            expect(await auction.allocationOf(depositor3.address)).to.equal(0);
        });
    });

    describe('4.1.6. withdraw(uint256)', async () => {
        it('4.1.6.1. deposit successfully', async () => {
            const fixture = await setupBeforeTest({
                updateStakeTokens: true,
                mintPrimaryTokenForAuction: true,
                startAuction: true,
                listDeposits: true,
            });

            const { depositor1, depositor2, depositor3, auction, primaryToken } = fixture;

            await ethers.provider.send("evm_setAutomine", [false]);

            let endAt = await auction.endAt();
            let vestingDuration = await auction.vestingDuration();

            let timestamp1 = endAt.add(vestingDuration.div(5));
            await time.setNextBlockTimestamp(timestamp1);

            const depositor1_timestamp1_tx = await auction.connect(depositor1).withdraw();
            await ethers.provider.send("evm_mine", []);

            const vestedAmount1_timestamp1 = (await auction.allocationOf(depositor1.address)).mul(timestamp1.sub(endAt)).div(vestingDuration);

            await expect(depositor1_timestamp1_tx)
                .to.emit(auction, 'Withdrawal')
                .withArgs(depositor1.address, vestedAmount1_timestamp1);

            expect(await primaryToken.balanceOf(depositor1.address)).to.equal(vestedAmount1_timestamp1);
            expect(await auction.withdrawnAmount(depositor1.address)).to.equal(vestedAmount1_timestamp1);

            let timestamp2 = endAt.add(vestingDuration.div(3));
            await time.setNextBlockTimestamp(timestamp2);

            const depositor1_timestamp2_tx = await auction.connect(depositor1).withdraw();
            const depositor2_timestamp2_tx = await auction.connect(depositor2).withdraw();
            await ethers.provider.send("evm_mine", []);

            const vestedAmount1_timestamp2 = (await auction.allocationOf(depositor1.address)).mul(timestamp2.sub(endAt)).div(vestingDuration)
            const vestedAmount2_timestamp2 = (await auction.allocationOf(depositor2.address)).mul(timestamp2.sub(endAt)).div(vestingDuration);

            await expect(depositor1_timestamp2_tx).to.emit(auction, 'Withdrawal').withArgs(depositor1.address, vestedAmount1_timestamp2.sub(vestedAmount1_timestamp1));
            await expect(depositor2_timestamp2_tx).to.emit(auction, 'Withdrawal').withArgs(depositor2.address, vestedAmount2_timestamp2);

            expect(await primaryToken.balanceOf(depositor1.address)).to.equal(vestedAmount1_timestamp2);
            expect(await auction.withdrawnAmount(depositor1.address)).to.equal(vestedAmount1_timestamp2);
            expect(await primaryToken.balanceOf(depositor2.address)).to.equal(vestedAmount2_timestamp2);
            expect(await auction.withdrawnAmount(depositor2.address)).to.equal(vestedAmount2_timestamp2);

            let timestamp3 = endAt.add(vestingDuration.add(100));
            await time.setNextBlockTimestamp(timestamp3);

            const depositor1_timestamp3_tx = await auction.connect(depositor1).withdraw();
            const depositor2_timestamp3_tx = await auction.connect(depositor2).withdraw();
            const depositor3_timestamp3_tx = await auction.connect(depositor3).withdraw();
            await ethers.provider.send("evm_mine", []);

            const vestedAmount1_timestamp3 = await auction.allocationOf(depositor1.address);
            const vestedAmount2_timestamp3 = await auction.allocationOf(depositor2.address);
            const vestedAmount3_timestamp3 = await auction.allocationOf(depositor3.address);

            await expect(depositor1_timestamp3_tx).to.emit(auction, 'Withdrawal').withArgs(depositor1.address, vestedAmount1_timestamp3.sub(vestedAmount1_timestamp2));
            await expect(depositor2_timestamp3_tx).to.emit(auction, 'Withdrawal').withArgs(depositor2.address, vestedAmount2_timestamp3.sub(vestedAmount2_timestamp2));
            await expect(depositor3_timestamp3_tx).to.emit(auction, 'Withdrawal').withArgs(depositor3.address, vestedAmount3_timestamp3);

            expect(await primaryToken.balanceOf(depositor1.address)).to.equal(vestedAmount1_timestamp3);
            expect(await auction.withdrawnAmount(depositor1.address)).to.equal(vestedAmount1_timestamp3);
            expect(await primaryToken.balanceOf(depositor2.address)).to.equal(vestedAmount2_timestamp3);
            expect(await auction.withdrawnAmount(depositor2.address)).to.equal(vestedAmount2_timestamp3);
            expect(await primaryToken.balanceOf(depositor3.address)).to.equal(vestedAmount3_timestamp3);
            expect(await auction.withdrawnAmount(depositor3.address)).to.equal(vestedAmount3_timestamp3);

            await ethers.provider.send("evm_setAutomine", [true]);
        });

        it('4.1.6.2. withdraw unsuccessfully when paused', async () => {
            const fixture = await setupBeforeTest({
                updateStakeTokens: true,
                mintPrimaryTokenForAuction: true,
                startAuction: true,
                listDeposits: true,
                pause: true,
            });

            const { depositor1, auction } = fixture;

            await expect(auction.connect(depositor1).withdraw()).to.be.revertedWith('Pausable: paused');
        });

        it('4.1.6.3. withdraw unsuccessfully when auction not started', async () => {
            const fixture = await setupBeforeTest({
                updateStakeTokens: true,
                mintPrimaryTokenForAuction: true,                
            });

            const { depositor1, auction } = fixture;

            await expect(auction.connect(depositor1).withdraw()).to.be.revertedWithCustomError(auction, 'NotStarted');
        });
    
        it('4.1.6.4. withdraw unsuccessfully when auction not ended', async () => {
            const fixture = await setupBeforeTest({
                updateStakeTokens: true,
                mintPrimaryTokenForAuction: true,
                startAuction: true,
                listDeposits: true,
            });

            const { depositor1, auction } = fixture;

            await expect(auction.connect(depositor1).withdraw()).to.be.revertedWithCustomError(auction, 'NotEnded');
        });
    });

    describe('4.1.7. stake(uint256, uint256)', async () => {
        it('4.1.7.1. stake successfully', async () => {
            const fixture = await setupBeforeTest({
                updateStakeTokens: true,
                mintPrimaryTokenForAuction: true,
                startAuction: true,
                listDeposits: true,
            });

            const { depositor1, depositor2, depositor3, auction, primaryToken, stakeToken1, stakeToken2, stakeToken3 } = fixture;

            await ethers.provider.send("evm_setAutomine", [false]);

            let endAt = await auction.endAt();
            let vestingDuration = await auction.vestingDuration();

            let timestamp1 = endAt.add(vestingDuration.div(5));
            await time.setNextBlockTimestamp(timestamp1);

            const depositor1_timestamp1_tx = await auction.connect(depositor1).stake(ethers.utils.parseEther('100'), ethers.utils.parseEther('200'));
            await ethers.provider.send("evm_mine", []);

            const allocation1 = await auction.allocationOf(depositor1.address);
            const stake1_depositor1_timestamp1 = ethers.utils.parseEther('100');
            const stake2_depositor1_timestamp1 = ethers.utils.parseEther('200');
            const stake3_depositor1_timestamp1 = allocation1.sub(stake1_depositor1_timestamp1).sub(stake2_depositor1_timestamp1);

            await expect(depositor1_timestamp1_tx).to.emit(auction, 'Stake').withArgs(
                depositor1.address,
                stake1_depositor1_timestamp1,
                stake2_depositor1_timestamp1,
                stake3_depositor1_timestamp1,
            );

            expect(await primaryToken.balanceOf(depositor1.address)).to.equal(0);
            expect(await auction.withdrawnAmount(depositor1.address)).to.equal(allocation1);

            expect(await stakeToken1.balanceOf(depositor1.address)).to.equal(stake1_depositor1_timestamp1);
            expect(await stakeToken2.balanceOf(depositor1.address)).to.equal(stake2_depositor1_timestamp1);
            expect(await stakeToken3.balanceOf(depositor1.address)).to.equal(stake3_depositor1_timestamp1);

            let timestamp2 = endAt.add(vestingDuration.div(3));
            await time.setNextBlockTimestamp(timestamp2);

            const vestedAmount2_timestamp2 = (await auction.allocationOf(depositor2.address)).mul(timestamp2.sub(endAt)).div(vestingDuration);

            const depositor2_timestamp2_tx = await auction.connect(depositor2).withdraw();
            await ethers.provider.send("evm_mine", []);

            expect(await primaryToken.balanceOf(depositor2.address)).to.equal(vestedAmount2_timestamp2);
            expect(await auction.withdrawnAmount(depositor2.address)).to.equal(vestedAmount2_timestamp2);

            let timestamp3 = endAt.add(vestingDuration.add(100));
            await time.setNextBlockTimestamp(timestamp3);

            const allocation2 = await auction.allocationOf(depositor2.address);
            const allocation3 = await auction.allocationOf(depositor3.address);

            const stake1_depositor2_timestamp3 = ethers.utils.parseEther('700');
            const stake2_depositor2_timestamp3 = ethers.utils.parseEther('800');
            const stake3_depositor2_timestamp3 = allocation2.sub(vestedAmount2_timestamp2).sub(stake1_depositor2_timestamp3).sub(stake2_depositor2_timestamp3);

            const stake1_depositor3_timestamp3 = ethers.utils.parseEther('900');
            const stake2_depositor3_timestamp3 = ethers.utils.parseEther('1000');
            const stake3_depositor3_timestamp3 = allocation3.sub(stake1_depositor3_timestamp3).sub(stake2_depositor3_timestamp3);

            const depositor2_timestamp3_tx = await auction.connect(depositor2).stake(stake1_depositor2_timestamp3, stake2_depositor2_timestamp3);
            const depositor3_timestamp3_tx = await auction.connect(depositor3).stake(stake1_depositor3_timestamp3, stake2_depositor3_timestamp3);
            await ethers.provider.send("evm_mine", []);

            await expect(depositor2_timestamp3_tx).to.emit(auction, 'Stake').withArgs(
                depositor2.address,
                stake1_depositor2_timestamp3,
                stake2_depositor2_timestamp3,
                stake3_depositor2_timestamp3,
            );
            await expect(depositor3_timestamp3_tx).to.emit(auction, 'Stake').withArgs(
                depositor3.address,
                stake1_depositor3_timestamp3,
                stake2_depositor3_timestamp3,
                stake3_depositor3_timestamp3,
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

            await ethers.provider.send("evm_setAutomine", [true]);
        });

        it('4.1.7.2. stake unsuccessfully when paused', async () => {
            const fixture = await setupBeforeTest({
                updateStakeTokens: true,
                mintPrimaryTokenForAuction: true,
                startAuction: true,
                listDeposits: true,
                pause: true,
            });

            const { depositor1, auction } = fixture;

            await expect(auction.connect(depositor1).stake(
                ethers.utils.parseEther('100'),
                ethers.utils.parseEther('200'),
            )).to.be.revertedWith('Pausable: paused');
        });

        it('4.1.7.3. stake unsuccessfully when stake tokens not assigned', async () => {
            const fixture = await setupBeforeTest({
                mintPrimaryTokenForAuction: true,
                startAuction: true,
                listDeposits: true,                
            });

            const { depositor1, auction } = fixture;

            await expect(auction.connect(depositor1).stake(
                ethers.utils.parseEther('100'),
                ethers.utils.parseEther('200'),
            )).to.be.revertedWithCustomError(auction, 'NotAssignedStakeTokens');
        });

        it('4.1.7.4. stake unsuccessfully when auction not started', async () => {
            const fixture = await setupBeforeTest({
                updateStakeTokens: true,
            });

            const { depositor1, auction } = fixture;

            await expect(auction.connect(depositor1).stake(
                ethers.utils.parseEther('100'),
                ethers.utils.parseEther('200'),
            )).to.be.revertedWithCustomError(auction, 'NotStarted');
        });

        it('4.1.7.5. stake unsuccessfully when auction not ended', async () => {
            const fixture = await setupBeforeTest({
                updateStakeTokens: true,
                mintPrimaryTokenForAuction: true,
                startAuction: true,
                listDeposits: true,
            });

            const { depositor1, auction } = fixture;

            await expect(auction.connect(depositor1).stake(
                ethers.utils.parseEther('100'),
                ethers.utils.parseEther('200'),
            )).to.be.revertedWithCustomError(auction, 'NotEnded');
        });

        it('4.1.7.6. stake unsuccessfully with insufficient funds', async () => {
            const fixture = await setupBeforeTest({
                updateStakeTokens: true,
                mintPrimaryTokenForAuction: true,
                startAuction: true,
                listDeposits: true,
            });

            const { depositor1, auction } = fixture;

            await time.setNextBlockTimestamp(await auction.endAt());

            await expect(auction.connect(depositor1).stake(
                ethers.utils.parseEther('100'),
                await auction.allocationOf(depositor1.address),
            )).to.be.revertedWithCustomError(auction, 'InsufficientFunds');
        });
    });
});
