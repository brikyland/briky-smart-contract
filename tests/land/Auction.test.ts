import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Admin, Auction, Currency, PrimaryToken, StakeToken, Treasury, Treasury__factory } from '@typechain-types';
import { callTransaction, getSignatures, prepareERC20, randomWallet, testReentrancy } from '@utils/blockchain';
import { deployAdmin } from '@utils/deployments/common/admin';
import { Constant } from '@tests/test.constant';
import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import { deployCurrency } from '@utils/deployments/common/currency';
import { deployPrimaryToken } from '@utils/deployments/land/primaryToken';
import { deployTreasury } from '@utils/deployments/land/treasury';
import { deployStakeToken } from '@utils/deployments/land/stakeToken';
import { Initialization as LandInitialization } from '@tests/land/test.initialization';
import { deployAuction } from '@utils/deployments/land/auction';
import { callAuction_Pause, callAuction_StartAuction, callAuction_UpdateStakeTokens } from '@utils/callWithSignatures/auction';
import { callPrimaryToken_UnlockForPublicSale, callPrimaryToken_UpdateStakeTokens, callPrimaryToken_UpdateTreasury } from '@utils/callWithSignatures/primary';
import { MockContract, smock } from '@defi-wonderland/smock';
import { deployReentrancyERC20 } from '@utils/deployments/mocks/mockReentrancy/reentrancyERC20';
import { Contract } from 'ethers';

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

describe('13. Auction', async () => {
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
            LandInitialization.PRIMARY_TOKEN_Name,
            LandInitialization.PRIMARY_TOKEN_Symbol,
            LandInitialization.PRIMARY_TOKEN_LiquidationUnlockedAt,
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
            LandInitialization.STAKE_TOKEN_Name_1,
            LandInitialization.STAKE_TOKEN_Symbol_1,
        ) as StakeToken;

        const stakeToken2 = await deployStakeToken(
            deployer,
            admin.address,
            primaryToken.address,
            LandInitialization.STAKE_TOKEN_Name_2,
            LandInitialization.STAKE_TOKEN_Symbol_2,
        ) as StakeToken;

        const stakeToken3 = await deployStakeToken(
            deployer,
            admin.address,
            primaryToken.address,
            LandInitialization.STAKE_TOKEN_Name_3,
            LandInitialization.STAKE_TOKEN_Symbol_3,
        ) as StakeToken;

        const auction = await deployAuction(
            deployer,
            admin.address,
            primaryToken.address,
        ) as Auction;

        await callPrimaryToken_UpdateTreasury(
            primaryToken,
            admins,
            treasury.address,
            await admin.nonce(),
        );

        await callPrimaryToken_UpdateStakeTokens(
            primaryToken,
            admins,
            stakeToken1.address,
            stakeToken2.address,
            stakeToken3.address,
            await admin.nonce(),
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
                admins,
                auction.address,
                await admin.nonce(),
            );    
        }

        if (updateStakeTokens) {
            await callAuction_UpdateStakeTokens(
                auction,
                admins,
                stakeToken1.address,
                stakeToken2.address,
                stakeToken3.address,
                await admin.nonce(),
            );
        }

        if (startAuction) {
            let currentTimestamp = await time.latest();
            let endAt = currentTimestamp + 10000;
            let vestingDuration = 1000;

            await callAuction_StartAuction(
                auction,
                admins,
                endAt,
                vestingDuration,
                await admin.nonce(),
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
            await callAuction_Pause(
                auction,
                admins,
                await admin.nonce(),
            );
        }

        return fixture;
    }

    describe('13.1. initialize(address, address, address, address, address)', async () => {
        it('13.1.1. Deploy successfully', async () => {
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

    describe('13.2. pause(bytes[])', async () => {
        it('13.2.1. pause successfully with valid signatures', async () => {
            const { deployer, admin, admins, auction } = await setupBeforeTest({});
            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string"],
                [auction.address, "pause"]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await auction.pause(signatures);
            await tx.wait();

            expect(await auction.paused()).to.equal(true);

            await expect(tx).to
                .emit(auction, 'Paused')
                .withArgs(deployer.address);
        });

        it('13.2.2. pause unsuccessfully with invalid signatures', async () => {
            const { admin, admins, auction } = await setupBeforeTest({});
            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string"],
                [auction.address, "pause"]
            );
            let invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(auction.pause(invalidSignatures)).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('13.2.3. pause unsuccessfully when already paused', async () => {
            const { admin, admins, auction } = await setupBeforeTest({});
            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string"],
                [auction.address, "pause"]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            await callTransaction(auction.pause(signatures));

            signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(auction.pause(signatures)).to.be.revertedWith('Pausable: paused');
        });
    });

    describe('13.3. unpause(bytes[])', async () => {
        it('13.3.1. unpause successfully with valid signatures', async () => {
            const { deployer, admin, admins, auction } = await setupBeforeTest({
                pause: true,
            });
            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string"],
                [auction.address, "unpause"]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await auction.unpause(signatures);
            await tx.wait();

            await expect(tx).to
                .emit(auction, 'Unpaused')
                .withArgs(deployer.address);
        });

        it('13.3.2. unpause unsuccessfully with invalid signatures', async () => {
            const { admin, admins, auction } = await setupBeforeTest({
                pause: true,
            });
            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string"],
                [auction.address, "unpause"]
            );
            const invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(auction.unpause(invalidSignatures)).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('13.3.3. unpause unsuccessfully when not paused', async () => {
            const { admin, admins, auction } = await setupBeforeTest({
                pause: true,
            });
            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string"],
                [auction.address, "unpause"]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            await callTransaction(auction.unpause(signatures));

            signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(auction.unpause(signatures)).to.be.revertedWith('Pausable: not paused');
        });
    });

    describe('13.4. updateStakeTokens(address, address, address, bytes[])', async () => {
        it('13.4.1. updateStakeTokens successfully', async () => {
            const fixture = await setupBeforeTest({});
            const { admin, admins, auction, stakeToken1, stakeToken2, stakeToken3 } = fixture;
            
            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "address", "address", "address"],
                [auction.address, "updateStakeTokens", stakeToken1.address, stakeToken2.address, stakeToken3.address]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await auction.updateStakeTokens(
                stakeToken1.address,
                stakeToken2.address,
                stakeToken3.address,
                signatures,
            );
            await tx.wait();

            await expect(tx).to
                .emit(auction, 'StakeTokensUpdate')
                .withArgs(stakeToken1.address, stakeToken2.address, stakeToken3.address);

            expect(await auction.stakeToken1()).to.equal(stakeToken1.address);
            expect(await auction.stakeToken2()).to.equal(stakeToken2.address);
            expect(await auction.stakeToken3()).to.equal(stakeToken3.address);
        });

        it('13.4.2. updateStakeTokens unsuccessfully with invalid signatures', async () => {
            const { admin, admins, auction, stakeToken1, stakeToken2, stakeToken3 } = await setupBeforeTest({});
            
            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "address", "address", "address"],
                [auction.address, "updateStakeTokens", stakeToken1.address, stakeToken2.address, stakeToken3.address]
            );
            let invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));
            
            await expect(auction.updateStakeTokens(
                stakeToken1.address,
                stakeToken2.address,
                stakeToken3.address,
                invalidSignatures,
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        async function testForInvalidInput(
            auction: Auction,
            admins: any[],
            admin: Admin,
            stakeToken1: string,
            stakeToken2: string,
            stakeToken3: string,
        ) {
            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "address", "address", "address"],
                [auction.address, "updateStakeTokens", stakeToken1, stakeToken2, stakeToken3]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());
            
            await expect(auction.updateStakeTokens(
                stakeToken1,
                stakeToken2,
                stakeToken3,
                signatures,
            )).to.be.revertedWithCustomError(auction, 'InvalidUpdating');
        }

        it('13.4.3. updateStakeTokens unsuccessfully with zero address stake tokens', async () => {
            const { admin, admins, auction, stakeToken1, stakeToken2, stakeToken3 } = await setupBeforeTest({});

            await testForInvalidInput(auction, admins, admin, ethers.constants.AddressZero, stakeToken2.address, stakeToken3.address);
            await testForInvalidInput(auction, admins, admin, stakeToken1.address, ethers.constants.AddressZero, stakeToken3.address);
            await testForInvalidInput(auction, admins, admin, stakeToken1.address, stakeToken2.address, ethers.constants.AddressZero);
        });

        it('13.4.4. updateStakeTokens unsuccessfully with already updated stake tokens', async () => {
            const { admin, admins, auction, stakeToken1, stakeToken2, stakeToken3 } = await setupBeforeTest({
                updateStakeTokens: true,
            });
            await testForInvalidInput(auction, admins, admin, stakeToken1.address, stakeToken2.address, stakeToken3.address);
        });        
    });

    describe('13.5. startAuction(uint256, uint256, bytes[])', async () => {
        it('13.5.1. startAuction successfully', async () => {
            const fixture = await setupBeforeTest({
                updateStakeTokens: true,
                mintPrimaryTokenForAuction: true,
            });
            const { admin, admins, auction } = fixture;

            let currentTimestamp = await time.latest();
            let endAt = currentTimestamp + 10000;
            let vestingDuration = 1000;

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256", "uint256"],
                [auction.address, "startAuction", endAt, vestingDuration]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await auction.startAuction(
                endAt,
                vestingDuration,
                signatures,
            );
            await tx.wait();

            // TODO: Add event check

            expect(await auction.endAt()).to.equal(endAt);
            expect(await auction.vestingDuration()).to.equal(vestingDuration);

            expect(await auction.totalToken()).to.equal(Constant.PRIMARY_TOKEN_PUBLIC_SALE);            
        });

        it('13.5.2. startAuction unsuccessfully with invalid signatures', async () => {
            const { admin, admins, auction } = await setupBeforeTest({
                updateStakeTokens: true,
                mintPrimaryTokenForAuction: true,
            });

            let currentTimestamp = await time.latest();
            let endAt = currentTimestamp + 10000;
            let vestingDuration = 1000;

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256", "uint256"],
                [auction.address, "startAuction", endAt, vestingDuration]
            );
            let invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(auction.startAuction(
                endAt,
                vestingDuration,
                invalidSignatures,
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('13.5.3. startAuction unsuccessfully with invalid end time', async () => {
            const { admin, admins, auction } = await setupBeforeTest({
                updateStakeTokens: true,
                mintPrimaryTokenForAuction: true,
            });

            let endAt = 0;
            let vestingDuration = 1000;

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256", "uint256"],
                [auction.address, "startAuction", endAt, vestingDuration]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(auction.startAuction(
                endAt,
                vestingDuration,
                signatures,
            )).to.be.revertedWithCustomError(auction, 'InvalidInput');
        });

        it('13.5.4. startAuction unsuccessfully when it has already started', async () => {
            const { admin, admins, auction } = await setupBeforeTest({
                updateStakeTokens: true,
                mintPrimaryTokenForAuction: true,
                startAuction: true,
            });            

            let currentTimestamp = await time.latest();
            let endAt = currentTimestamp + 10000;
            let vestingDuration = 1000;

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256", "uint256"],
                [auction.address, "startAuction", endAt, vestingDuration]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(auction.startAuction(
                endAt,
                vestingDuration,
                signatures,
            )).to.be.revertedWithCustomError(auction, 'Started');
        });
    });
    
    describe('13.6. deposit(uint256, bytes[])', async () => {
        it('13.6.1. deposit successfully', async () => {
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
        
        it('13.6.2. deposit unsuccessfully when paused', async () => {
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

        it('13.6.3. deposit unsuccessfully when auction not started', async () => {
            const fixture = await setupBeforeTest({
                updateStakeTokens: true,
                mintPrimaryTokenForAuction: true,
            });
            const { depositor1, auction } = fixture;

            const amount = ethers.utils.parseEther('100');
            await expect(auction.connect(depositor1).deposit(amount)).to.be.revertedWithCustomError(auction, 'NotStarted');            
        });

        it('13.6.4. deposit unsuccessfully when auction ended', async () => {
            const fixture = await setupBeforeTest({
                updateStakeTokens: true,
                mintPrimaryTokenForAuction: true,
                startAuction: true,
            });
            const { depositor1, auction } = fixture;

            await time.setNextBlockTimestamp(await auction.endAt());

            const amount = ethers.utils.parseEther('100');
            await expect(auction.connect(depositor1).deposit(amount)).to.be.revertedWithCustomError(auction, 'Ended');
        });

        it('13.6.5. deposit unsuccessfully when contract is reentered', async () => {
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

    describe('13.7. allocationOf(address)', async () => {
        it('13.7.1. return correct allocation', async () => {
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

        it('13.7.2. return zero allocation before any deposits', async () => {
            const fixture = await setupBeforeTest({});
            const { depositor1, depositor2, depositor3, auction } = fixture;

            expect(await auction.allocationOf(depositor1.address)).to.equal(0);
            expect(await auction.allocationOf(depositor2.address)).to.equal(0);
            expect(await auction.allocationOf(depositor3.address)).to.equal(0);
        });
    });

    describe('13.8. withdraw(uint256)', async () => {
        it('13.8.1. deposit successfully', async () => {
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

            await expect(depositor1_timestamp1_tx).to.emit(auction, 'Withdrawal').withArgs(depositor1.address, vestedAmount1_timestamp1);

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

        it('13.8.2. withdraw unsuccessfully when paused', async () => {
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

        it('13.8.3. withdraw unsuccessfully when auction not started', async () => {
            const fixture = await setupBeforeTest({
                updateStakeTokens: true,
                mintPrimaryTokenForAuction: true,                
            });

            const { depositor1, auction } = fixture;

            await expect(auction.connect(depositor1).withdraw()).to.be.revertedWithCustomError(auction, 'NotStarted');
        });
    
        it('13.8.4. withdraw unsuccessfully when auction not ended', async () => {
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

    describe('13.9. stake(uint256, uint256)', async () => {
        it('13.9.1. stake successfully', async () => {
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

        it('13.9.2. stake unsuccessfully when paused', async () => {
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

        it('13.9.3. stake unsuccessfully when stake tokens not assigned', async () => {
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

        it('13.9.4. stake unsuccessfully when auction not started', async () => {
            const fixture = await setupBeforeTest({
                updateStakeTokens: true,
            });

            const { depositor1, auction } = fixture;

            await expect(auction.connect(depositor1).stake(
                ethers.utils.parseEther('100'),
                ethers.utils.parseEther('200'),
            )).to.be.revertedWithCustomError(auction, 'NotStarted');
        });

        it('13.9.5. stake unsuccessfully when auction not ended', async () => {
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

        it('13.9.6. stake unsuccessfully with insufficient funds', async () => {
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
