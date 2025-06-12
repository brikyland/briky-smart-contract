import { expect } from 'chai';
import { ethers, network } from 'hardhat';
import { Admin, Currency, Driptributor, PrimaryToken, StakeToken, Treasury, MockStakeToken, MockPrimaryToken } from '@typechain-types';
import { callTransaction, getSignatures, prepareERC20, randomWallet } from '@utils/blockchain';
import { deployAdmin } from '@utils/deployments/common/admin';
import { Constant } from '@tests/test.constant';
import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import { deployCurrency } from '@utils/deployments/common/currency';
import { deployPrimaryToken } from '@utils/deployments/land/primaryToken';
import { deployTreasury } from '@utils/deployments/land/treasury';
import { deployStakeToken } from '@utils/deployments/land/stakeToken';
import { callPrimaryToken_Pause, callPrimaryToken_UnlockForBackerRound, callPrimaryToken_UnlockForCoreTeam, callPrimaryToken_UnlockForExternalTreasury, callPrimaryToken_UnlockForMarketMaker, callPrimaryToken_UnlockForPrivateSale1, callPrimaryToken_UnlockForPrivateSale2, callPrimaryToken_UnlockForPublicSale, callPrimaryToken_UnlockForSeedRound, callPrimaryToken_UpdateStakeTokens, callPrimaryToken_UpdateTreasury } from '@utils/callWithSignatures/primary';
import { MockContract, smock } from '@defi-wonderland/smock';
import { BigNumber } from 'ethers';
import { Initialization as LandInitialization } from '@tests/land/test.initialization';

interface PrimaryTokenFixture {
    deployer: any;
    admins: any[];
    admin: Admin;
    treasury: Treasury;
    currency: Currency;
    stakeToken1: MockContract<MockStakeToken>;
    stakeToken2: MockContract<MockStakeToken>;
    stakeToken3: MockContract<MockStakeToken>;
    primaryToken: MockContract<MockPrimaryToken>;
    receiver: any;
    contributor: any;
    liquidationUnlockedAt: number;
}

describe('9. PrimaryToken', async () => {
    async function primaryTokenFixture(): Promise<PrimaryTokenFixture> {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        const admins = [];
        for (let i = 1; i <= Constant.ADMIN_NUMBER; ++i) admins.push(accounts[i]);
        const receiver = accounts[Constant.ADMIN_NUMBER + 1];
        const contributor = accounts[Constant.ADMIN_NUMBER + 2];

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

        const liquidationUnlockedAt = await time.latest() + 1e9;
        
        const SmockPrimaryTokenFactory = await smock.mock('MockPrimaryToken') as any;
        const primaryToken = await SmockPrimaryTokenFactory.deploy();
        await callTransaction(primaryToken.initialize(
            admin.address,
            LandInitialization.PRIMARY_TOKEN_Name,
            LandInitialization.PRIMARY_TOKEN_Symbol,
            liquidationUnlockedAt,
        ));
        
        const SmockTreasuryFactory = await smock.mock('Treasury') as any;
        const treasury = await SmockTreasuryFactory.deploy();
        await callTransaction(treasury.initialize(
            admin.address,
            currency.address,
            primaryToken.address,
        ));

        const SmockStakeTokenFactory = await smock.mock('MockStakeToken') as any;
        const stakeToken1 = await SmockStakeTokenFactory.deploy();
        await callTransaction(stakeToken1.initialize(
            admin.address,
            primaryToken.address,
            LandInitialization.STAKE_TOKEN_Name_1,
            LandInitialization.STAKE_TOKEN_Symbol_1,
        ));

        const SmockStakeTokenFactory2 = await smock.mock('MockStakeToken') as any;
        const stakeToken2 = await SmockStakeTokenFactory2.deploy();
        await callTransaction(stakeToken2.initialize(
            admin.address,
            primaryToken.address,
            LandInitialization.STAKE_TOKEN_Name_2,
            LandInitialization.STAKE_TOKEN_Symbol_2,
        ));

        const SmockStakeTokenFactory3 = await smock.mock('MockStakeToken') as any;
        const stakeToken3 = await SmockStakeTokenFactory3.deploy();
        await callTransaction(stakeToken3.initialize(
            admin.address,
            primaryToken.address,
            LandInitialization.STAKE_TOKEN_Name_3,
            LandInitialization.STAKE_TOKEN_Symbol_3,
        ));
        
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
            receiver,
            contributor,
            liquidationUnlockedAt,
        };
    };

    async function setupBeforeTest({
        updateStakeTokens = false,
        updateTreasury = false,
        pause = false,
    } = {}): Promise<PrimaryTokenFixture> {
        const fixture = await loadFixture(primaryTokenFixture);
        const { admin, admins, primaryToken, stakeToken1, stakeToken2, stakeToken3, currency, contributor, treasury } = fixture;

        if (updateStakeTokens) {
            await callPrimaryToken_UpdateStakeTokens(
                primaryToken,
                admins,
                stakeToken1.address,
                stakeToken2.address,
                stakeToken3.address,
                await admin.nonce(),
            );
        }

        if (updateTreasury) {
            await callPrimaryToken_UpdateTreasury(
                primaryToken,
                admins,
                treasury.address,
                await admin.nonce(),
            );
        }

        if (pause) {
            await callPrimaryToken_Pause(
                primaryToken,
                admins,
                await admin.nonce(),
            );
        }

        return fixture;
    }

    describe('9.1. initialize(address, string, string, uint256)', async () => {
        it('9.1.1. Deploy successfully', async () => {
            const { primaryToken, admin, liquidationUnlockedAt } = await setupBeforeTest();

            expect(await primaryToken.admin()).to.equal(admin.address);
            expect(await primaryToken.liquidationUnlockedAt()).to.equal(liquidationUnlockedAt);

            expect(await primaryToken.name()).to.equal(LandInitialization.PRIMARY_TOKEN_Name);
            expect(await primaryToken.symbol()).to.equal(LandInitialization.PRIMARY_TOKEN_Symbol);
            expect(await primaryToken.cap()).to.equal(Constant.PRIMARY_TOKEN_MAXIMUM_SUPPLY);
            expect(await primaryToken.totalSupply()).to.equal(ethers.utils.parseEther('5000000000'));
            
            expect(await primaryToken.balanceOf(primaryToken.address)).to.equal(ethers.utils.parseEther('5000000000'));            
        });
    });

    // TODO: Andy
    describe('9.2. pause(bytes[])', async () => {
        it('9.2.1. pause successfully with valid signatures', async () => {

        });

        it('9.2.2. pause unsuccessfully with invalid signatures', async () => {

        });

        it('9.2.3. pause unsuccessfully when already paused', async () => {

        });
    });

    // TODO: Andy
    describe('9.3. unpause(bytes[])', async () => {
        it('9.3.1. unpause successfully with valid signatures', async () => {

        });

        it('9.3.2. unpause unsuccessfully with invalid signatures', async () => {

        });

        it('9.3.3. unpause unsuccessfully when not paused', async () => {

        });
    });

    // TODO: Andy
    describe('9.4. updateTreasury(address)', async () => {
        it('9.4.1. updateTreasury successfully', async () => {

        });

        it('9.4.2. updateTreasury unsuccessfully with invalid signatures', async () => {

        });

        it('9.4.3. updateTreasury unsuccessfully when already updated', async () => {

        });
    });

    describe('9.5. updateStakeTokens(address)', async () => {
        it('9.5.1. updateStakeTokens successfully', async () => {
            const { admin, admins, primaryToken, stakeToken1, stakeToken2, stakeToken3 } = await setupBeforeTest();
            
            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "address", "address", "address"],
                [primaryToken.address, "updateStakeTokens", stakeToken1.address, stakeToken2.address, stakeToken3.address]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await primaryToken.updateStakeTokens(
                stakeToken1.address,
                stakeToken2.address,
                stakeToken3.address,
                signatures,
            );
            await tx.wait();

            await expect(tx).to
                .emit(primaryToken, 'StakeTokensUpdate')
                .withArgs(stakeToken1.address, stakeToken2.address, stakeToken3.address);

            expect(await primaryToken.stakeToken1()).to.equal(stakeToken1.address);
            expect(await primaryToken.stakeToken2()).to.equal(stakeToken2.address);
            expect(await primaryToken.stakeToken3()).to.equal(stakeToken3.address);
        });

        it('9.5.2. updateStakeTokens unsuccessfully with invalid signatures', async () => {
            const { admin, admins, primaryToken, stakeToken1, stakeToken2, stakeToken3 } = await setupBeforeTest();
            
            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "address", "address", "address"],
                [primaryToken.address, "updateStakeTokens", stakeToken1.address, stakeToken2.address, stakeToken3.address]
            );
            let invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));
            
            await expect(primaryToken.updateStakeTokens(
                stakeToken1.address,
                stakeToken2.address,
                stakeToken3.address,
                invalidSignatures,
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        async function testForInvalidInput(
            primaryToken: MockContract<MockPrimaryToken>,
            admins: any[],
            admin: Admin,
            stakeToken1: string,
            stakeToken2: string,
            stakeToken3: string,
        ) {
            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "address", "address", "address"],
                [primaryToken.address, "updateStakeTokens", stakeToken1, stakeToken2, stakeToken3]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());
            
            await expect(primaryToken.updateStakeTokens(
                stakeToken1,
                stakeToken2,
                stakeToken3,
                signatures,
            )).to.be.revertedWithCustomError(primaryToken, 'InvalidUpdating');
        }

        it('9.5.3. updateStakeTokens unsuccessfully with zero address stake tokens', async () => {
            const { admin, admins, primaryToken, stakeToken1, stakeToken2, stakeToken3 } = await setupBeforeTest();

            await testForInvalidInput(primaryToken, admins, admin, ethers.constants.AddressZero, stakeToken2.address, stakeToken3.address);
            await testForInvalidInput(primaryToken, admins, admin, stakeToken1.address, ethers.constants.AddressZero, stakeToken3.address);
            await testForInvalidInput(primaryToken, admins, admin, stakeToken1.address, stakeToken2.address, ethers.constants.AddressZero);
        });

        it('9.5.4. updateStakeTokens unsuccessfully with already updated stake tokens', async () => {
            const { admin, admins, primaryToken, stakeToken1, stakeToken2, stakeToken3 } = await setupBeforeTest({
                updateStakeTokens: true,
            });
            await testForInvalidInput(primaryToken, admins, admin, stakeToken1.address, stakeToken2.address, stakeToken3.address);
        });        
    });

    describe('9.6. totalStake()', async () => {
        it('9.6.1. return correct total stake', async () => {
            const { primaryToken, stakeToken1, stakeToken2, stakeToken3 } = await setupBeforeTest({
                updateStakeTokens: true,
            });            

            expect(await primaryToken.totalStake()).to.equal(0);

            stakeToken1.totalSupply.returns(ethers.utils.parseEther('100'));
            stakeToken2.totalSupply.returns(ethers.utils.parseEther('200'));
            stakeToken3.totalSupply.returns(ethers.utils.parseEther('300'));

            expect(await primaryToken.totalStake()).to.equal(ethers.utils.parseEther('600'));

            stakeToken1.totalSupply.reset();
            stakeToken2.totalSupply.reset();
            stakeToken3.totalSupply.reset();
        });
    });

    describe('9.7. isStakeRewardingCompleted(address)', async () => {
        async function getIsStakeRewardingCompleted(primaryToken: MockContract<MockPrimaryToken>, stakeToken: MockContract<MockStakeToken>) {
            const encodedResult = await stakeToken.callView(primaryToken.address, primaryToken.interface.encodeFunctionData('isStakeRewardingCompleted'));
            return ethers.utils.defaultAbiCoder.decode(['bool'], encodedResult)[0];
        }
        
        it('9.7.1. return corrent value', async () => {
            const { primaryToken, stakeToken1, stakeToken2, stakeToken3 } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            expect(await getIsStakeRewardingCompleted(primaryToken, stakeToken1)).to.equal(false);
            expect(await getIsStakeRewardingCompleted(primaryToken, stakeToken2)).to.equal(false);
            expect(await getIsStakeRewardingCompleted(primaryToken, stakeToken3)).to.equal(false);
            
            primaryToken.setVariable('stakeToken1Waves', Constant.PRIMARY_TOKEN_STAKE_1_CULMINATING_WAVE);
            expect(await getIsStakeRewardingCompleted(primaryToken, stakeToken1)).to.equal(true);
            expect(await getIsStakeRewardingCompleted(primaryToken, stakeToken2)).to.equal(false);
            expect(await getIsStakeRewardingCompleted(primaryToken, stakeToken3)).to.equal(false);

            primaryToken.setVariable('stakeToken2Waves', Constant.PRIMARY_TOKEN_STAKE_2_CULMINATING_WAVE);
            expect(await getIsStakeRewardingCompleted(primaryToken, stakeToken1)).to.equal(true);
            expect(await getIsStakeRewardingCompleted(primaryToken, stakeToken2)).to.equal(true);
            expect(await getIsStakeRewardingCompleted(primaryToken, stakeToken3)).to.equal(false);

            primaryToken.setVariable('stakeToken3Waves', Constant.PRIMARY_TOKEN_STAKE_3_CULMINATING_WAVE);
            expect(await getIsStakeRewardingCompleted(primaryToken, stakeToken1)).to.equal(true);
            expect(await getIsStakeRewardingCompleted(primaryToken, stakeToken2)).to.equal(true);
            expect(await getIsStakeRewardingCompleted(primaryToken, stakeToken3)).to.equal(true);
        });

        it('9.7.2. revert when sender is unauthorized', async () => {
            const { primaryToken } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            await expect(primaryToken.isStakeRewardingCompleted()).to.be.revertedWithCustomError(primaryToken, 'Unauthorized');
        });
    });

    describe('9.8. unlockForBackerRound(address, bytes[])', async () => {
        it('9.8.1. unlockForBackerRound successfully', async () => {
            const { primaryToken, admins, admin, receiver } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "address"],
                [primaryToken.address, "unlockForBackerRound", receiver.address]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await primaryToken.unlockForBackerRound(
                receiver.address,
                signatures,
            );
            await tx.wait();

            expect(await primaryToken.backerRoundUnlocked()).to.equal(true);
            expect(await primaryToken.balanceOf(receiver.address)).to.equal(Constant.PRIMARY_TOKEN_BACKER_ROUND);

            await expect(tx).to.emit(primaryToken, 'BackerRoundTokensUnlock');
        });

        it('9.8.2. unlockForBackerRound unsuccessfully with invalid signatures', async () => {
            const { primaryToken, admins, admin, receiver } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "address"],
                [primaryToken.address, "unlockForBackerRound", receiver.address]
            );
            let invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(primaryToken.unlockForBackerRound(
                receiver.address,
                invalidSignatures,
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('9.8.3. unlockForBackerRound unsuccessfully when already unlocked', async () => {
            const { primaryToken, admins, admin, receiver } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            await callPrimaryToken_UnlockForBackerRound(
                primaryToken,
                admins,
                receiver.address,
                await admin.nonce(),
            );

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "address"],
                [primaryToken.address, "unlockForBackerRound", receiver.address]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(primaryToken.unlockForBackerRound(
                receiver.address,
                signatures,
            )).to.be.revertedWithCustomError(primaryToken, 'AlreadyUnlockedTokens');
        });
    });

    describe('9.9. unlockForSeedRound(address, bytes[])', async () => {
        it('9.9.1. unlockForSeedRound successfully', async () => {
            const { primaryToken, admins, admin, receiver } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "address"],
                [primaryToken.address, "unlockForSeedRound", receiver.address]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await primaryToken.unlockForSeedRound(
                receiver.address,
                signatures,
            );
            await tx.wait();

            expect(await primaryToken.seedRoundUnlocked()).to.equal(true);
            expect(await primaryToken.balanceOf(receiver.address)).to.equal(Constant.PRIMARY_TOKEN_SEED_ROUND);

            await expect(tx).to.emit(primaryToken, 'SeedRoundTokensUnlock');
        });

        it('9.9.2. unlockForSeedRound unsuccessfully with invalid signatures', async () => {
            const { primaryToken, admins, admin, receiver } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "address"],
                [primaryToken.address, "unlockForSeedRound", receiver.address]
            );
            let invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(primaryToken.unlockForSeedRound(
                receiver.address,
                invalidSignatures,
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('9.9.3. unlockForSeedRound unsuccessfully when already unlocked', async () => {
            const { primaryToken, admins, admin, receiver } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            await callPrimaryToken_UnlockForSeedRound(
                primaryToken,
                admins,
                receiver.address,
                await admin.nonce(),
            );

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "address"],
                [primaryToken.address, "unlockForSeedRound", receiver.address]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce()); 

            await expect(primaryToken.unlockForSeedRound(
                receiver.address,
                signatures,
            )).to.be.revertedWithCustomError(primaryToken, 'AlreadyUnlockedTokens');
        });
    });

    describe('9.10. unlockForPrivateSale1(address, bytes[])', async () => {
        it('9.10.1. unlockForPrivateSale1 successfully', async () => {
            const { primaryToken, admins, admin, receiver } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "address"],
                [primaryToken.address, "unlockForPrivateSale1", receiver.address]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await primaryToken.unlockForPrivateSale1(
                receiver.address,
                signatures, 
            );
            await tx.wait();

            expect(await primaryToken.privateSale1Unlocked()).to.equal(true);
            expect(await primaryToken.balanceOf(receiver.address)).to.equal(Constant.PRIMARY_TOKEN_PRIVATE_SALE_1);

            await expect(tx).to.emit(primaryToken, 'PrivateSale1TokensUnlock');
        });

        it('9.10.2. unlockForPrivateSale1 unsuccessfully with invalid signatures', async () => {
            const { primaryToken, admins, admin, receiver } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "address"],
                [primaryToken.address, "unlockForPrivateSale1", receiver.address]
            );
            let invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(primaryToken.unlockForPrivateSale1(
                receiver.address,
                invalidSignatures,
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('9.10.3. unlockForPrivateSale1 unsuccessfully when already unlocked', async () => {
            const { primaryToken, admins, admin, receiver } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            await callPrimaryToken_UnlockForPrivateSale1(
                primaryToken,
                admins,
                receiver.address,
                await admin.nonce(),
            );

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "address"],
                [primaryToken.address, "unlockForPrivateSale1", receiver.address]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce()); 

            await expect(primaryToken.unlockForPrivateSale1(
                receiver.address,
                signatures,
            )).to.be.revertedWithCustomError(primaryToken, 'AlreadyUnlockedTokens');
        });
    });

    describe('9.11. unlockForPrivateSale2(address, bytes[])', async () => {
        it('9.11.1. unlockForPrivateSale2 successfully', async () => {
            const { primaryToken, admins, admin, receiver } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "address"],
                [primaryToken.address, "unlockForPrivateSale2", receiver.address]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await primaryToken.unlockForPrivateSale2(
                receiver.address,
                signatures,
            );
            await tx.wait();

            expect(await primaryToken.privateSale2Unlocked()).to.equal(true);
            expect(await primaryToken.balanceOf(receiver.address)).to.equal(Constant.PRIMARY_TOKEN_PRIVATE_SALE_2);

            await expect(tx).to.emit(primaryToken, 'PrivateSale2TokensUnlock');
        });

        it('9.11.2. unlockForPrivateSale2 unsuccessfully with invalid signatures', async () => {
            const { primaryToken, admins, admin, receiver } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "address"],
                [primaryToken.address, "unlockForPrivateSale2", receiver.address]
            );
            let invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(primaryToken.unlockForPrivateSale2(
                receiver.address,
                invalidSignatures,
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('9.11.3. unlockForPrivateSale2 unsuccessfully when already unlocked', async () => {
            const { primaryToken, admins, admin, receiver } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            await callPrimaryToken_UnlockForPrivateSale2(
                primaryToken,
                admins,
                receiver.address,
                await admin.nonce(),
            );

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "address"],
                [primaryToken.address, "unlockForPrivateSale2", receiver.address]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce()); 

            await expect(primaryToken.unlockForPrivateSale2(
                receiver.address,
                signatures,
            )).to.be.revertedWithCustomError(primaryToken, 'AlreadyUnlockedTokens');
        });
    });

    describe('9.12. unlockForPublicSale(address, bytes[])', async () => {
        it('9.12.1. unlockForPublicSale successfully', async () => {
            const { primaryToken, admins, admin, receiver } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "address"],
                [primaryToken.address, "unlockForPublicSale", receiver.address]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await primaryToken.unlockForPublicSale(
                receiver.address,
                signatures,
            );
            await tx.wait();

            expect(await primaryToken.publicSaleUnlocked()).to.equal(true);
            expect(await primaryToken.balanceOf(receiver.address)).to.equal(Constant.PRIMARY_TOKEN_PUBLIC_SALE);

            await expect(tx).to.emit(primaryToken, 'PublicSaleTokensUnlock');
        });

        it('9.12.2. unlockForPublicSale unsuccessfully with invalid signatures', async () => {
            const { primaryToken, admins, admin, receiver } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "address"],
                [primaryToken.address, "unlockForPublicSale", receiver.address]
            );
            let invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(primaryToken.unlockForPublicSale(
                receiver.address,
                invalidSignatures,
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('9.12.3. unlockForPublicSale unsuccessfully when already unlocked', async () => {
            const { primaryToken, admins, admin, receiver } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            await callPrimaryToken_UnlockForPublicSale(
                primaryToken,
                admins,
                receiver.address,
                await admin.nonce(),
            );

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "address"],
                [primaryToken.address, "unlockForPublicSale", receiver.address]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce()); 

            await expect(primaryToken.unlockForPublicSale(
                receiver.address,
                signatures,
            )).to.be.revertedWithCustomError(primaryToken, 'AlreadyUnlockedTokens');
        });
    });

    describe('9.13. unlockForCoreTeam(address, bytes[])', async () => {
        it('9.13.1. unlockForCoreTeam successfully', async () => {
            const { primaryToken, admins, admin, receiver } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "address"],
                [primaryToken.address, "unlockForCoreTeam", receiver.address]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await primaryToken.unlockForCoreTeam(
                receiver.address,
                signatures,
            );
            await tx.wait();

            expect(await primaryToken.coreTeamTokensUnlocked()).to.equal(true);
            expect(await primaryToken.balanceOf(receiver.address)).to.equal(Constant.PRIMARY_TOKEN_CORE_TEAM);

            await expect(tx).to.emit(primaryToken, 'CoreTeamTokensUnlock');
        });

        it('9.13.2. unlockForCoreTeam unsuccessfully with invalid signatures', async () => {
            const { primaryToken, admins, admin, receiver } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "address"],
                [primaryToken.address, "unlockForCoreTeam", receiver.address]
            );
            let invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(primaryToken.unlockForCoreTeam(
                receiver.address,
                invalidSignatures,
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('9.13.3. unlockForCoreTeam unsuccessfully when already unlocked', async () => {
            const { primaryToken, admins, admin, receiver } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            await callPrimaryToken_UnlockForCoreTeam(
                primaryToken,
                admins,
                receiver.address,
                await admin.nonce(),
            );

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "address"],
                [primaryToken.address, "unlockForCoreTeam", receiver.address]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce()); 

            await expect(primaryToken.unlockForCoreTeam(
                receiver.address,   
                signatures,
            )).to.be.revertedWithCustomError(primaryToken, 'AlreadyUnlockedTokens');
        });
    });

    describe('9.14. unlockForMarketMaker(address, bytes[])', async () => {
        it('9.14.1. unlockForMarketMaker successfully', async () => {
            const { primaryToken, admins, admin, receiver } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "address"],
                [primaryToken.address, "unlockForMarketMaker", receiver.address]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await primaryToken.unlockForMarketMaker(
                receiver.address,
                signatures,
            );
            await tx.wait();

            expect(await primaryToken.marketMakerTokensUnlocked()).to.equal(true);
            expect(await primaryToken.balanceOf(receiver.address)).to.equal(Constant.PRIMARY_TOKEN_MARKET_MAKER);

            await expect(tx).to.emit(primaryToken, 'MarketMakerTokensUnlock');
        });

        it('9.14.2. unlockForMarketMaker unsuccessfully with invalid signatures', async () => {
            const { primaryToken, admins, admin, receiver } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "address"],
                [primaryToken.address, "unlockForMarketMaker", receiver.address]
            );
            let invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(primaryToken.unlockForMarketMaker(
                receiver.address,
                invalidSignatures,
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('9.14.3. unlockForMarketMaker unsuccessfully when already unlocked', async () => {
            const { primaryToken, admins, admin, receiver } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            await callPrimaryToken_UnlockForMarketMaker(
                primaryToken,
                admins,
                receiver.address,
                await admin.nonce(),
            );

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "address"],
                [primaryToken.address, "unlockForMarketMaker", receiver.address]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce()); 

            await expect(primaryToken.unlockForMarketMaker(
                receiver.address,
                signatures,
            )).to.be.revertedWithCustomError(primaryToken, 'AlreadyUnlockedTokens');
        });
    });

    describe('9.15. unlockForExternalTreasury(address, bytes[])', async () => {
        it('9.15.1. unlockForExternalTreasury successfully', async () => {
            const { primaryToken, admins, admin, receiver } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "address"],
                [primaryToken.address, "unlockForExternalTreasury", receiver.address]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());
            
            const tx = await primaryToken.unlockForExternalTreasury(
                receiver.address,
                signatures,
            );
            await tx.wait();

            expect(await primaryToken.externalTreasuryTokensUnlocked()).to.equal(true);
            expect(await primaryToken.balanceOf(receiver.address)).to.equal(Constant.PRIMARY_TOKEN_EXTERNAL_TREASURY);

            await expect(tx).to.emit(primaryToken, 'ExternalTreasuryTokensUnlock');
        });

        it('9.15.2. unlockForExternalTreasury unsuccessfully with invalid signatures', async () => {
            const { primaryToken, admins, admin, receiver } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "address"],
                [primaryToken.address, "unlockForExternalTreasury", receiver.address]
            );
            let invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(primaryToken.unlockForExternalTreasury(
                receiver.address,
                invalidSignatures,
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('9.15.3. unlockForExternalTreasury unsuccessfully when already unlocked', async () => {
            const { primaryToken, admins, admin, receiver } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            await callPrimaryToken_UnlockForExternalTreasury(
                primaryToken,
                admins,
                receiver.address,
                await admin.nonce(),
            );

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "address"],
                [primaryToken.address, "unlockForExternalTreasury", receiver.address]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce()); 

            await expect(primaryToken.unlockForExternalTreasury(
                receiver.address,
                signatures,
            )).to.be.revertedWithCustomError(primaryToken, 'AlreadyUnlockedTokens');
        });
    });

    describe('9.16. contributeLiquidityFromBackerRound(uint256)', async () => {
        it('9.16.1. contributeLiquidityFromBackerRound successfully', async () => {
            const { primaryToken, contributor, currency, treasury } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
            });

            await prepareERC20(currency, [contributor], [primaryToken as any], ethers.utils.parseEther("10000"));

            const tx = await primaryToken.connect(contributor).contributeLiquidityFromBackerRound(ethers.utils.parseEther("1000"));
            await tx.wait();

            await expect(tx)
                .to.emit(primaryToken, 'LiquidityContributionFromBackerRound')
                .withArgs(ethers.utils.parseEther("1000"));

            expect(await currency.balanceOf(contributor.address)).to.equal(ethers.utils.parseEther("9000"));
            expect(await currency.balanceOf(primaryToken.address)).to.equal(ethers.utils.parseEther("0"));
            expect(await currency.balanceOf(treasury.address)).to.equal(ethers.utils.parseEther("1000"));   

            expect(treasury.provideLiquidity).to.be.calledWith(ethers.utils.parseEther("1000"));
        });
    });

    describe('9.17. contributeLiquidityFromSeedRound(uint256)', async () => {
        it('9.17.1. contributeLiquidityFromSeedRound successfully', async () => {
            const { primaryToken, contributor, currency, treasury } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
            });

            await prepareERC20(currency, [contributor], [primaryToken as any], ethers.utils.parseEther("10000"));

            const tx = await primaryToken.connect(contributor).contributeLiquidityFromSeedRound(ethers.utils.parseEther("1000"));
            await tx.wait();

            await expect(tx)
                .to.emit(primaryToken, 'LiquidityContributionFromSeedRound')
                .withArgs(ethers.utils.parseEther("1000"));

            expect(await currency.balanceOf(contributor.address)).to.equal(ethers.utils.parseEther("9000"));
            expect(await currency.balanceOf(primaryToken.address)).to.equal(ethers.utils.parseEther("0"));
            expect(await currency.balanceOf(treasury.address)).to.equal(ethers.utils.parseEther("1000"));   

            expect(treasury.provideLiquidity).to.be.calledWith(ethers.utils.parseEther("1000"));
        }); 
    });

    describe('9.18. contributeLiquidityFromPrivateSale1(uint256)', async () => {
        it('9.18.1. contributeLiquidityFromPrivateSale1 successfully', async () => {
            const { primaryToken, contributor, currency, treasury } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
            });

            await prepareERC20(currency, [contributor], [primaryToken as any], ethers.utils.parseEther("10000"));

            const tx = await primaryToken.connect(contributor).contributeLiquidityFromPrivateSale1(ethers.utils.parseEther("1000"));
            await tx.wait();

            await expect(tx)
                .to.emit(primaryToken, 'LiquidityContributionFromPrivateSale1')
                .withArgs(ethers.utils.parseEther("1000"));

            expect(await currency.balanceOf(contributor.address)).to.equal(ethers.utils.parseEther("9000"));
            expect(await currency.balanceOf(primaryToken.address)).to.equal(ethers.utils.parseEther("0"));
            expect(await currency.balanceOf(treasury.address)).to.equal(ethers.utils.parseEther("1000"));   

            expect(treasury.provideLiquidity).to.be.calledWith(ethers.utils.parseEther("1000"));
        });
    });

    describe('9.19. contributeLiquidityFromPrivateSale2(uint256)', async () => {
        it('9.19.1. contributeLiquidityFromPrivateSale2 successfully', async () => {
            const { primaryToken, contributor, currency, treasury } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
            });

            await prepareERC20(currency, [contributor], [primaryToken as any], ethers.utils.parseEther("10000"));

            const tx = await primaryToken.connect(contributor).contributeLiquidityFromPrivateSale2(ethers.utils.parseEther("1000"));
            await tx.wait();

            await expect(tx)
                .to.emit(primaryToken, 'LiquidityContributionFromPrivateSale2')
                .withArgs(ethers.utils.parseEther("1000"));

            expect(await currency.balanceOf(contributor.address)).to.equal(ethers.utils.parseEther("9000"));
            expect(await currency.balanceOf(primaryToken.address)).to.equal(ethers.utils.parseEther("0"));
            expect(await currency.balanceOf(treasury.address)).to.equal(ethers.utils.parseEther("1000"));   

            expect(treasury.provideLiquidity).to.be.calledWith(ethers.utils.parseEther("1000"));
        });
    });

    describe('9.20. contributeLiquidityFromPublicSale(uint256)', async () => {
        it('9.20.1. contributeLiquidityFromPublicSale successfully', async () => {
            const { primaryToken, contributor, currency, treasury } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
            });

            await prepareERC20(currency, [contributor], [primaryToken as any], ethers.utils.parseEther("10000"));

            const tx = await primaryToken.connect(contributor).contributeLiquidityFromPublicSale(ethers.utils.parseEther("1000"));
            await tx.wait();

            await expect(tx)
                .to.emit(primaryToken, 'LiquidityContributionFromPublicSale')
                .withArgs(ethers.utils.parseEther("1000"));

            expect(await currency.balanceOf(contributor.address)).to.equal(ethers.utils.parseEther("9000"));
            expect(await currency.balanceOf(primaryToken.address)).to.equal(ethers.utils.parseEther("0"));
            expect(await currency.balanceOf(treasury.address)).to.equal(ethers.utils.parseEther("1000"));   

            expect(treasury.provideLiquidity).to.be.calledWith(ethers.utils.parseEther("1000"));
        });
    });

    describe('9.21. contributeLiquidityFromMarketMaker(uint256)', async () => {
        it('9.21.1. contributeLiquidityFromMarketMaker successfully', async () => {
            const { primaryToken, contributor, currency, treasury } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
            });

            await prepareERC20(currency, [contributor], [primaryToken as any], ethers.utils.parseEther("10000"));

            const tx = await primaryToken.connect(contributor).contributeLiquidityFromMarketMaker(ethers.utils.parseEther("1000"));
            await tx.wait();

            await expect(tx)
                .to.emit(primaryToken, 'LiquidityContributionFromMarketMaker')
                .withArgs(ethers.utils.parseEther("1000"));

            expect(await currency.balanceOf(contributor.address)).to.equal(ethers.utils.parseEther("9000"));
            expect(await currency.balanceOf(primaryToken.address)).to.equal(ethers.utils.parseEther("0"));
            expect(await currency.balanceOf(treasury.address)).to.equal(ethers.utils.parseEther("1000"));   

            expect(treasury.provideLiquidity).to.be.calledWith(ethers.utils.parseEther("1000"));
        });
    });

    describe('9.22. contributeLiquidityFromExternalTreasury(uint256)', async () => {
        it('9.22.1. contributeLiquidityFromExternalTreasury successfully', async () => {
            const { primaryToken, contributor, currency, treasury } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
            });

            await prepareERC20(currency, [contributor], [primaryToken as any], ethers.utils.parseEther("10000"));

            const tx = await primaryToken.connect(contributor).contributeLiquidityFromExternalTreasury(ethers.utils.parseEther("1000"));
            await tx.wait();

            await expect(tx)
                .to.emit(primaryToken, 'LiquidityContributionFromExternalTreasury')
                .withArgs(ethers.utils.parseEther("1000"));

            expect(await currency.balanceOf(contributor.address)).to.equal(ethers.utils.parseEther("9000"));
            expect(await currency.balanceOf(primaryToken.address)).to.equal(ethers.utils.parseEther("0"));
            expect(await currency.balanceOf(treasury.address)).to.equal(ethers.utils.parseEther("1000"));   

            expect(treasury.provideLiquidity).to.be.calledWith(ethers.utils.parseEther("1000"));
        });
    });

    describe('9.23. contributeLiquidityFromStakeToken(uint256, address)', async () => {
        it('9.23.1. contributeLiquidityFromStakeToken successfully from stake token 1', async () => {
            const { primaryToken, contributor, currency, stakeToken1, treasury } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
            });

            await prepareERC20(currency, [contributor], [primaryToken as any], ethers.utils.parseEther("10000"));

            const tx = await primaryToken.connect(contributor).contributeLiquidityFromStakeToken(ethers.utils.parseEther("1000"), stakeToken1.address);
            await tx.wait();

            await expect(tx)
                .to.emit(primaryToken, 'LiquidityContributionFromStakeToken1')
                .withArgs(ethers.utils.parseEther("1000"));

            expect(await currency.balanceOf(contributor.address)).to.equal(ethers.utils.parseEther("9000"));
            expect(await currency.balanceOf(primaryToken.address)).to.equal(ethers.utils.parseEther("0"));
            expect(await currency.balanceOf(treasury.address)).to.equal(ethers.utils.parseEther("1000"));   

            expect(treasury.provideLiquidity).to.be.calledWith(ethers.utils.parseEther("1000"));
        });

        it('9.23.2. contributeLiquidityFromStakeToken successfully from stake token 2', async () => {
            const { primaryToken, contributor, currency, stakeToken2, treasury } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
            });

            await prepareERC20(currency, [contributor], [primaryToken as any], ethers.utils.parseEther("10000"));

            const tx = await primaryToken.connect(contributor).contributeLiquidityFromStakeToken(ethers.utils.parseEther("1000"), stakeToken2.address);
            await tx.wait();

            await expect(tx)
                .to.emit(primaryToken, 'LiquidityContributionFromStakeToken2')
                .withArgs(ethers.utils.parseEther("1000"));

            expect(await currency.balanceOf(contributor.address)).to.equal(ethers.utils.parseEther("9000"));
            expect(await currency.balanceOf(primaryToken.address)).to.equal(ethers.utils.parseEther("0"));
            expect(await currency.balanceOf(treasury.address)).to.equal(ethers.utils.parseEther("1000"));   

            expect(treasury.provideLiquidity).to.be.calledWith(ethers.utils.parseEther("1000"));
        });

        it('9.23.3. contributeLiquidityFromStakeToken successfully from stake token 3', async () => {
            const { primaryToken, contributor, currency, stakeToken3, treasury } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
            });

            await prepareERC20(currency, [contributor], [primaryToken as any], ethers.utils.parseEther("10000"));

            const tx = await primaryToken.connect(contributor).contributeLiquidityFromStakeToken(ethers.utils.parseEther("1000"), stakeToken3.address);
            await tx.wait();

            await expect(tx)
                .to.emit(primaryToken, 'LiquidityContributionFromStakeToken3')
                .withArgs(ethers.utils.parseEther("1000"));

            expect(await currency.balanceOf(contributor.address)).to.equal(ethers.utils.parseEther("9000"));
            expect(await currency.balanceOf(primaryToken.address)).to.equal(ethers.utils.parseEther("0"));
            expect(await currency.balanceOf(treasury.address)).to.equal(ethers.utils.parseEther("1000"));   

            expect(treasury.provideLiquidity).to.be.calledWith(ethers.utils.parseEther("1000"));
        });

        it('9.23.4. contributeLiquidityFromStakeToken successfully with unknown stake token', async () => {
            const { primaryToken, contributor, currency, stakeToken3, treasury } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
            });

            await prepareERC20(currency, [contributor], [primaryToken as any], ethers.utils.parseEther("10000"));

            const tx = await primaryToken.connect(contributor).contributeLiquidityFromStakeToken(ethers.utils.parseEther("1000"), ethers.constants.AddressZero);
            const receipt = await tx.wait();

            const events = receipt.events?.filter((event: any) => {
                return [ 
                    "LiquidityContributionFromStakeToken1", 
                    "LiquidityContributionFromStakeToken2", 
                    "LiquidityContributionFromStakeToken3" 
                ].includes(event.event);
            });
            expect(events).to.have.lengthOf(0);

            expect(await currency.balanceOf(contributor.address)).to.equal(ethers.utils.parseEther("9000"));
            expect(await currency.balanceOf(primaryToken.address)).to.equal(ethers.utils.parseEther("0"));
            expect(await currency.balanceOf(treasury.address)).to.equal(ethers.utils.parseEther("1000"));   

            expect(treasury.provideLiquidity).to.be.calledWith(ethers.utils.parseEther("1000"));
        });
    });

    describe('9.24. mintForStake()', async () => {
        it('9.24.1. mintForStake successfully by stake token 1', async () => {
            const { primaryToken, stakeToken1 } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
            });

            let expectedBalance = ethers.constants.Zero;

            for (let i = 0; i < 10; i++) {
                const tx = await stakeToken1.call(primaryToken.address, primaryToken.interface.encodeFunctionData("mintForStake"));
                await tx.wait();

                expect(tx).to
                    .emit(primaryToken, 'DailyStake1Mint')
                    .withArgs(i + 1, Constant.PRIMARY_TOKEN_STAKE_1_WAVE_REWARD);
                
                expect(await primaryToken.stakeToken1Waves()).to.equal(i + 1);
                expect(await primaryToken.stakeToken2Waves()).to.equal(0);
                expect(await primaryToken.stakeToken3Waves()).to.equal(0);

                expectedBalance = expectedBalance.add(Constant.PRIMARY_TOKEN_STAKE_1_WAVE_REWARD);
                expect(await primaryToken.balanceOf(stakeToken1.address)).to.equal(expectedBalance);
            }
        });

        it('9.24.2. mintForStake unsuccessfully by stake token 1 when all stake reward is minted', async () => {
            const { primaryToken, stakeToken1 } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
            });

            for (let i = 0; i < Constant.PRIMARY_TOKEN_STAKE_1_CULMINATING_WAVE; i++) {
                await callTransaction(stakeToken1.call(primaryToken.address, primaryToken.interface.encodeFunctionData("mintForStake")));
            }

            await expect(stakeToken1.call(primaryToken.address, primaryToken.interface.encodeFunctionData("mintForStake"))).to.be.revertedWithCustomError(primaryToken, 'AllStakeRewardMinted');
        });

        it('9.24.3. mintForStake successfully by stake token 2', async () => {
            const { primaryToken, stakeToken2 } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
            });

            let expectedBalance = ethers.constants.Zero;

            for (let i = 0; i < 10; i++) {
                const tx = await stakeToken2.call(primaryToken.address, primaryToken.interface.encodeFunctionData("mintForStake"));
                await tx.wait();

                expect(tx).to
                    .emit(primaryToken, 'DailyStake2Mint')
                    .withArgs(i + 1, Constant.PRIMARY_TOKEN_STAKE_2_WAVE_REWARD);
                
                expect(await primaryToken.stakeToken1Waves()).to.equal(0);
                expect(await primaryToken.stakeToken2Waves()).to.equal(i + 1);
                expect(await primaryToken.stakeToken3Waves()).to.equal(0);

                expectedBalance = expectedBalance.add(Constant.PRIMARY_TOKEN_STAKE_2_WAVE_REWARD);
                expect(await primaryToken.balanceOf(stakeToken2.address)).to.equal(expectedBalance);
            }
        });

        it('9.24.4. mintForStake unsuccessfully by stake token 2 when all stake reward is minted', async () => {
            const { primaryToken, stakeToken2 } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
            });

            for (let i = 0; i < Constant.PRIMARY_TOKEN_STAKE_2_CULMINATING_WAVE; i++) {
                await callTransaction(stakeToken2.call(primaryToken.address, primaryToken.interface.encodeFunctionData("mintForStake")));
            }

            await expect(stakeToken2.call(primaryToken.address, primaryToken.interface.encodeFunctionData("mintForStake"))).to.be.revertedWithCustomError(primaryToken, 'AllStakeRewardMinted');
        });

        it('9.24.5. mintForStake successfully by stake token 3', async () => {
            const { primaryToken, stakeToken3 } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
            });

            let expectedBalance = ethers.constants.Zero;

            for (let i = 0; i < 10; i++) {
                const tx = await stakeToken3.call(primaryToken.address, primaryToken.interface.encodeFunctionData("mintForStake"));
                await tx.wait();

                expect(tx).to
                    .emit(primaryToken, 'DailyStake3Mint')
                    .withArgs(i + 1, Constant.PRIMARY_TOKEN_STAKE_3_WAVE_REWARD);
                
                expect(await primaryToken.stakeToken1Waves()).to.equal(0);
                expect(await primaryToken.stakeToken2Waves()).to.equal(0);
                expect(await primaryToken.stakeToken3Waves()).to.equal(i + 1);

                expectedBalance = expectedBalance.add(Constant.PRIMARY_TOKEN_STAKE_3_WAVE_REWARD);
                expect(await primaryToken.balanceOf(stakeToken3.address)).to.equal(expectedBalance);
            }
        });

        it('9.24.6. mintForStake successfully by stake token 3 when total supply is nearly capped', async () => {
            const { primaryToken, receiver, currency, stakeToken3 } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
            });

            const initialStakeTokensCap = Constant.PRIMARY_TOKEN_MAXIMUM_SUPPLY.sub(await primaryToken.totalSupply());

            await primaryToken.mint(receiver.address, initialStakeTokensCap.sub(ethers.utils.parseEther("1")));

            const tx = await stakeToken3.call(primaryToken.address, primaryToken.interface.encodeFunctionData("mintForStake"));
            await tx.wait();

            expect(tx).to
                .emit(primaryToken, 'DailyStake3Mint')
                .withArgs(1, ethers.utils.parseEther("1"));
                
            expect(await primaryToken.stakeToken1Waves()).to.equal(0);
            expect(await primaryToken.stakeToken2Waves()).to.equal(0);
            expect(await primaryToken.stakeToken3Waves()).to.equal(1);

            expect(await primaryToken.balanceOf(stakeToken3.address)).to.equal(ethers.utils.parseEther("1"));
        });

        it('9.24.7. mintForStake unsuccessfully by stake token 3 when total supply is capped', async () => {
            const { primaryToken, receiver, currency, stakeToken3 } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
            });

            const initialStakeTokensCap = Constant.PRIMARY_TOKEN_MAXIMUM_SUPPLY.sub(await primaryToken.totalSupply());

            await primaryToken.mint(receiver.address, initialStakeTokensCap);

            await expect(stakeToken3.call(primaryToken.address, primaryToken.interface.encodeFunctionData("mintForStake"))).to.be.revertedWithCustomError(primaryToken, 'SupplyCapReached');
        });
        
        it('9.24.8. mintForStake unsuccessfully by unauthorized user', async () => {
            const { primaryToken } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
            });

            await expect(primaryToken.mintForStake()).to.be.revertedWithCustomError(primaryToken, 'Unauthorized');
        });
    });

    describe('9.25. liquidate(uint256)', async () => {
        it('9.25.1. liquidate successfully', async () => {
            const { primaryToken, contributor, currency, stakeToken1, treasury, deployer } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
            });

            await primaryToken.mint(contributor.address, ethers.utils.parseEther("10000"));
            await primaryToken.call(primaryToken.address, primaryToken.interface.encodeFunctionData("burn", [primaryToken.address, ethers.utils.parseEther("10000")]));

            await prepareERC20(currency, [deployer], [treasury as any], ethers.utils.parseEther("1000000"));
            await treasury.provideLiquidity(ethers.utils.parseEther("1000000"));
            
            const supplyBefore = await primaryToken.totalSupply();
            const liquidityBefore = await treasury.liquidity();

            const burnAmount = ethers.utils.parseEther("100");

            await time.setNextBlockTimestamp(await primaryToken.liquidationUnlockedAt());
            const tx = await primaryToken.connect(contributor).liquidate(burnAmount);
            await tx.wait();

            const liquidity = (await treasury.liquidity()).mul(burnAmount).div(await primaryToken.totalSupply());

            await expect(tx)
                .to.emit(primaryToken, 'Liquidation')
                .withArgs(contributor.address, burnAmount, liquidity);

            expect(await primaryToken.balanceOf(contributor.address)).to.equal(ethers.utils.parseEther("9900"));

            expect(await currency.balanceOf(contributor.address)).to.equal(liquidity);
            expect(await currency.balanceOf(treasury.address)).to.equal(ethers.utils.parseEther("1000000").sub(liquidity));

            expect(treasury.withdrawLiquidity).to.be.calledWith(contributor.address, liquidity);

            const supplyAfter = await primaryToken.totalSupply();
            const liquidityAfter = await treasury.liquidity();

            // price = liquidity / supply is a constant
            expect(liquidityBefore.mul(supplyAfter)).to.equal(liquidityAfter.mul(supplyBefore));
        });

        it('9.25.2. liquidate unsuccessfully when liquidation is not unlocked', async () => {
            const { primaryToken, contributor, currency, stakeToken1, treasury, deployer } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
            });

            await primaryToken.mint(contributor.address, ethers.utils.parseEther("10000"));
            await primaryToken.call(primaryToken.address, primaryToken.interface.encodeFunctionData("burn", [primaryToken.address, ethers.utils.parseEther("10000")]));

            await prepareERC20(currency, [deployer], [treasury as any], ethers.utils.parseEther("1000000"));
            await treasury.provideLiquidity(ethers.utils.parseEther("1000000"));

            await time.setNextBlockTimestamp((await primaryToken.liquidationUnlockedAt()).sub(1));
            await expect(primaryToken.connect(contributor).liquidate(ethers.utils.parseEther("100")))
                .to.be.revertedWithCustomError(primaryToken, 'BeingLocked');
        });

        it('9.25.3. liquidate unsuccessfully when the contract is paused', async () => {
            const { primaryToken, contributor, currency, treasury, deployer, admins, admin } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
            });

            await primaryToken.mint(contributor.address, ethers.utils.parseEther("10000"));
            await primaryToken.call(primaryToken.address, primaryToken.interface.encodeFunctionData("burn", [primaryToken.address, ethers.utils.parseEther("10000")]));

            await prepareERC20(currency, [deployer], [treasury as any], ethers.utils.parseEther("1000000"));
            await treasury.provideLiquidity(ethers.utils.parseEther("1000000"));

            await callPrimaryToken_Pause(primaryToken, admins, await admin.nonce());
            
            await time.setNextBlockTimestamp(await primaryToken.liquidationUnlockedAt());
            await expect(primaryToken.connect(contributor).liquidate(ethers.utils.parseEther("100")))
                .to.be.revertedWith('Pausable: paused');
        });

        it('9.25.4. liquidate unsuccessfully when the amount to liquidate is greater than the liquidity', async () => {
            const { primaryToken, contributor, currency, treasury, deployer } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
            });

            await primaryToken.mint(contributor.address, ethers.utils.parseEther("10000"));
            await primaryToken.call(primaryToken.address, primaryToken.interface.encodeFunctionData("burn", [primaryToken.address, ethers.utils.parseEther("10000")]));

            await prepareERC20(currency, [deployer], [treasury as any], ethers.utils.parseEther("1000000"));
            await treasury.provideLiquidity(ethers.utils.parseEther("1000000"));

            const burnAmount = (await primaryToken.totalSupply()).add(ethers.utils.parseEther("1"));
            await time.setNextBlockTimestamp(await primaryToken.liquidationUnlockedAt());
            await expect(primaryToken.connect(contributor).liquidate(burnAmount))
                .to.be.revertedWithCustomError(primaryToken, 'InsufficientFunds');
        });
    });

    describe('9.26. exclusiveDiscount()', async () => {
        it('9.26.1. return correct value', async () => {
            const { primaryToken, stakeToken1, stakeToken2, stakeToken3 } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
            });

            let discount = await primaryToken.exclusiveDiscount();
            expect(discount.value).to.equal(ethers.utils.parseEther("0.15"));
            expect(discount.decimals).to.equal(Constant.COMMON_RATE_DECIMALS);

            stakeToken1.totalSupply.returns(ethers.utils.parseEther("1000000000"));

            discount = await primaryToken.exclusiveDiscount();
            expect(discount.value).to.equal(ethers.utils.parseEther("0.18"));
            expect(discount.decimals).to.equal(Constant.COMMON_RATE_DECIMALS);

            stakeToken2.totalSupply.returns(ethers.utils.parseEther("2000000000"));

            discount = await primaryToken.exclusiveDiscount();
            expect(discount.value).to.equal(ethers.utils.parseEther("0.24"));
            expect(discount.decimals).to.equal(Constant.COMMON_RATE_DECIMALS);

            stakeToken3.totalSupply.returns(ethers.utils.parseEther("2000000000"));

            discount = await primaryToken.exclusiveDiscount();
            expect(discount.value).to.equal(ethers.utils.parseEther("0.30"));
            expect(discount.decimals).to.equal(Constant.COMMON_RATE_DECIMALS);

            stakeToken1.totalSupply.reset();
            stakeToken2.totalSupply.reset();
            stakeToken3.totalSupply.reset();
        });
    });
});
