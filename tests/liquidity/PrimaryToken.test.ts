import { expect } from 'chai';
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
import { Admin, Currency, Treasury, MockStakeToken, MockPrimaryToken } from '@typechain-types';

// @utils
import { callTransaction, prepareERC20 } from '@utils/blockchain';

// @utils/deployments/common
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployCurrency } from '@utils/deployments/common/currency';

// @utils/deployments/mock
import { deployProxyCaller } from '@utils/deployments/mock/utilities/proxyCaller';

// @utils/models/liquidity
import {
    UnlockForBackerRoundParams,
    UnlockForBackerRoundParamsInput,
    UnlockForCoreTeamParams,
    UnlockForCoreTeamParamsInput,
    UnlockForMarketMakerParamsInput,
    UnlockForMarketMakerParams,
    UnlockForPrivateSale1Params,
    UnlockForPrivateSale1ParamsInput,
    UnlockForPrivateSale2Params,
    UnlockForPrivateSale2ParamsInput,
    UnlockForPublicSaleParams,
    UnlockForPublicSaleParamsInput,
    UnlockForSeedRoundParams,
    UnlockForSeedRoundParamsInput,
    UpdateStakeTokensParams,
    UpdateStakeTokensParamsInput,
    UpdateTreasuryParams,
    UpdateTreasuryParamsInput,
    UnlockForExternalTreasuryParamsInput,
    UnlockForExternalTreasuryParams,
} from '@utils/models/liquidity/primaryToken';

// @utils/signatures/liquidity
import {
    getUnlockForBackerRoundSignatures,
    getUnlockForCoreTeamSignatures,
    getUnlockForExternalTreasurySignatures,
    getUnlockForMarketMakerSignatures,
    getUnlockForPrivateSale1Signatures,
    getUnlockForPrivateSale2Signatures,
    getUnlockForPublicSaleSignatures,
    getUnlockForSeedRoundSignatures,
    getUpdateStakeTokensSignatures,
    getUpdateTreasurySignatures,
} from '@utils/signatures/liquidity/primaryToken';

// @utils/transaction/common
import { getPausableTxByInput_Pause } from '@utils/transaction/common/pausable';

// @utils/transaction/liquidity
import {
    getCallPrimaryTokenTx_ContributeLiquidityFromStakeToken,
    getCallPrimaryTokenTx_MintForStake,
    getPrimaryTokenTx_ContributeLiquidityFromBackerRound,
    getPrimaryTokenTx_ContributeLiquidityFromExternalTreasury,
    getPrimaryTokenTx_ContributeLiquidityFromMarketMaker,
    getPrimaryTokenTx_ContributeLiquidityFromPrivateSale1,
    getPrimaryTokenTx_ContributeLiquidityFromPrivateSale2,
    getPrimaryTokenTx_ContributeLiquidityFromPublicSale,
    getPrimaryTokenTx_ContributeLiquidityFromSeedRound,
    getPrimaryTokenTx_Liquidate,
    getPrimaryTokenTx_MintForStake,
    getPrimaryTokenTx_UnlockForBackerRound,
    getPrimaryTokenTx_UnlockForCoreTeam,
    getPrimaryTokenTx_UnlockForExternalTreasury,
    getPrimaryTokenTx_UnlockForMarketMaker,
    getPrimaryTokenTx_UnlockForPrivateSale1,
    getPrimaryTokenTx_UnlockForPrivateSale2,
    getPrimaryTokenTx_UnlockForPublicSale,
    getPrimaryTokenTx_UnlockForSeedRound,
    getPrimaryTokenTx_UpdateStakeTokens,
    getPrimaryTokenTx_UpdateTreasury,
    getPrimaryTokenTxByInput_UnlockForBackerRound,
    getPrimaryTokenTxByInput_UnlockForCoreTeam,
    getPrimaryTokenTxByInput_UnlockForExternalTreasury,
    getPrimaryTokenTxByInput_UnlockForMarketMaker,
    getPrimaryTokenTxByInput_UnlockForPrivateSale1,
    getPrimaryTokenTxByInput_UnlockForPrivateSale2,
    getPrimaryTokenTxByInput_UnlockForPublicSale,
    getPrimaryTokenTxByInput_UnlockForSeedRound,
    getPrimaryTokenTxByInput_UpdateStakeTokens,
    getPrimaryTokenTxByInput_UpdateTreasury,
} from '@utils/transaction/liquidity/primaryToken';

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

describe('4.4. PrimaryToken', async () => {
    afterEach(async () => {
        const { stakeToken1, stakeToken2, stakeToken3 } = await setupBeforeTest();

        stakeToken1.totalSupply.reset();
        stakeToken2.totalSupply.reset();
        stakeToken3.totalSupply.reset();
    });

    async function primaryTokenFixture(): Promise<PrimaryTokenFixture> {
        const [deployer, admin1, admin2, admin3, admin4, admin5, receiver, contributor] = await ethers.getSigners();
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

        const liquidationUnlockedAt = (await time.latest()) + 1e9;

        const SmockPrimaryTokenFactory = (await smock.mock('MockPrimaryToken')) as any;
        const primaryToken = await SmockPrimaryTokenFactory.deploy();
        await callTransaction(
            primaryToken.initialize(
                admin.address,
                LiquidityInitialization.PRIMARY_TOKEN_Name,
                LiquidityInitialization.PRIMARY_TOKEN_Symbol,
                liquidationUnlockedAt
            )
        );

        const SmockTreasuryFactory = (await smock.mock('Treasury')) as any;
        const treasury = await SmockTreasuryFactory.deploy();
        await callTransaction(treasury.initialize(admin.address, currency.address, primaryToken.address));

        const SmockStakeTokenFactory = (await smock.mock('MockStakeToken')) as any;
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

        const SmockStakeTokenFactory2 = (await smock.mock('MockStakeToken')) as any;
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

        const SmockStakeTokenFactory3 = (await smock.mock('MockStakeToken')) as any;
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
    }

    async function setupBeforeTest({
        updateStakeTokens = false,
        updateTreasury = false,
        unlockForSeedRound = false,
        unlockForPrivateSale1 = false,
        unlockForPrivateSale2 = false,
        unlockForPublicSale = false,
        unlockForBackerRound = false,
        unlockForCoreTeam = false,
        unlockForMarketMaker = false,
        unlockForExternalTreasury = false,
        transferPrimaryTokenToContributor = false,
        provideLiquidityForTreasury = false,
        pause = false,
    } = {}): Promise<PrimaryTokenFixture> {
        const fixture = await loadFixture(primaryTokenFixture);
        const {
            deployer,
            admin,
            admins,
            primaryToken,
            stakeToken1,
            stakeToken2,
            stakeToken3,
            currency,
            contributor,
            treasury,
        } = fixture;

        await prepareERC20(
            currency,
            [contributor, stakeToken1 as any, stakeToken2 as any, stakeToken3 as any],
            [primaryToken as any],
            ethers.utils.parseEther('10000')
        );

        if (transferPrimaryTokenToContributor) {
            await primaryToken.mint(contributor.address, ethers.utils.parseEther('10000'));
            await primaryToken.call(
                primaryToken.address,
                primaryToken.interface.encodeFunctionData('burn', [
                    primaryToken.address,
                    ethers.utils.parseEther('10000'),
                ])
            );
        }

        if (provideLiquidityForTreasury) {
            await prepareERC20(currency, [deployer], [treasury as any], ethers.utils.parseEther('1000000'));
            await treasury.provideLiquidity(ethers.utils.parseEther('1000000'));
        }

        if (updateStakeTokens) {
            await callTransaction(
                getPrimaryTokenTxByInput_UpdateStakeTokens(
                    primaryToken as any,
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

        if (updateTreasury) {
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
        }

        if (unlockForSeedRound) {
            await callTransaction(
                getPrimaryTokenTxByInput_UnlockForSeedRound(
                    primaryToken as any,
                    deployer,
                    {
                        distributor: contributor.address,
                    },
                    admin,
                    admins
                )
            );
        }

        if (unlockForPrivateSale1) {
            await callTransaction(
                getPrimaryTokenTxByInput_UnlockForPrivateSale1(
                    primaryToken as any,
                    deployer,
                    {
                        distributor: contributor.address,
                    },
                    admin,
                    admins
                )
            );
        }

        if (unlockForPrivateSale2) {
            await callTransaction(
                getPrimaryTokenTxByInput_UnlockForPrivateSale2(
                    primaryToken as any,
                    deployer,
                    {
                        distributor: contributor.address,
                    },
                    admin,
                    admins
                )
            );
        }

        if (unlockForPublicSale) {
            await callTransaction(
                getPrimaryTokenTxByInput_UnlockForPublicSale(
                    primaryToken as any,
                    deployer,
                    {
                        distributor: contributor.address,
                    },
                    admin,
                    admins
                )
            );
        }

        if (unlockForBackerRound) {
            await callTransaction(
                getPrimaryTokenTxByInput_UnlockForBackerRound(
                    primaryToken as any,
                    deployer,
                    {
                        distributor: contributor.address,
                    },
                    admin,
                    admins
                )
            );
        }

        if (unlockForCoreTeam) {
            await callTransaction(
                getPrimaryTokenTxByInput_UnlockForCoreTeam(
                    primaryToken as any,
                    deployer,
                    {
                        distributor: contributor.address,
                    },
                    admin,
                    admins
                )
            );
        }

        if (unlockForMarketMaker) {
            await callTransaction(
                getPrimaryTokenTxByInput_UnlockForMarketMaker(
                    primaryToken as any,
                    deployer,
                    {
                        distributor: contributor.address,
                    },
                    admin,
                    admins
                )
            );
        }

        if (unlockForExternalTreasury) {
            await callTransaction(
                getPrimaryTokenTxByInput_UnlockForExternalTreasury(
                    primaryToken as any,
                    deployer,
                    {
                        distributor: contributor.address,
                    },
                    admin,
                    admins
                )
            );
        }

        if (pause) {
            await callTransaction(getPausableTxByInput_Pause(primaryToken as any, deployer, admin, admins));
        }

        return fixture;
    }

    /* --- Initialization --- */
    describe('4.4.1. initialize(address,string,string,uint256)', async () => {
        it('4.4.1.1. Deploy successfully', async () => {
            const { primaryToken, admin, liquidationUnlockedAt } = await setupBeforeTest();

            expect(await primaryToken.admin()).to.equal(admin.address);
            expect(await primaryToken.liquidationUnlockedAt()).to.equal(liquidationUnlockedAt);

            expect(await primaryToken.name()).to.equal(LiquidityInitialization.PRIMARY_TOKEN_Name);
            expect(await primaryToken.symbol()).to.equal(LiquidityInitialization.PRIMARY_TOKEN_Symbol);
            expect(await primaryToken.cap()).to.equal(Constant.PRIMARY_TOKEN_MAXIMUM_SUPPLY);
            expect(await primaryToken.totalSupply()).to.equal(ethers.utils.parseEther('5000000000'));

            expect(await primaryToken.balanceOf(primaryToken.address)).to.equal(ethers.utils.parseEther('5000000000'));
        });
    });

    /* --- Administration --- */
    describe('4.4.2. updateTreasury(address)', async () => {
        it('4.4.2.1. Update treasury successfully', async () => {
            const { deployer, admin, admins, primaryToken, treasury } = await setupBeforeTest();

            const paramsInput: UpdateTreasuryParamsInput = {
                treasury: treasury.address,
            };
            const tx = await getPrimaryTokenTxByInput_UpdateTreasury(
                primaryToken as any,
                deployer,
                paramsInput,
                admin,
                admins
            );
            await tx.wait();

            expect(await primaryToken.treasury()).to.equal(treasury.address);
        });

        it('4.4.2.2. Update treasury unsuccessfully with invalid signatures', async () => {
            const { deployer, admin, admins, primaryToken, treasury } = await setupBeforeTest();

            const paramsInput: UpdateTreasuryParamsInput = {
                treasury: treasury.address,
            };
            const params: UpdateTreasuryParams = {
                ...paramsInput,
                signatures: await getUpdateTreasurySignatures(primaryToken as any, paramsInput, admin, admins, false),
            };
            await expect(
                getPrimaryTokenTx_UpdateTreasury(primaryToken as any, deployer, params)
            ).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('4.4.2.3. Update treasury unsuccessfully when it has already been updated', async () => {
            const { deployer, admin, admins, primaryToken, treasury } = await setupBeforeTest({
                updateTreasury: true,
            });

            await expect(
                getPrimaryTokenTxByInput_UpdateTreasury(
                    primaryToken as any,
                    deployer,
                    {
                        treasury: treasury.address,
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(primaryToken, 'InvalidUpdating');
        });

        it('4.4.2.4. Update treasury unsuccessfully with zero address', async () => {
            const { deployer, admin, admins, primaryToken } = await setupBeforeTest();

            await expect(
                getPrimaryTokenTxByInput_UpdateTreasury(
                    primaryToken as any,
                    deployer,
                    {
                        treasury: ethers.constants.AddressZero,
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(primaryToken, 'InvalidUpdating');
        });
    });

    describe('4.4.3. updateStakeTokens(address)', async () => {
        it('4.4.3.1. Update stake tokens successfully', async () => {
            const { deployer, admin, admins, primaryToken, stakeToken1, stakeToken2, stakeToken3 } =
                await setupBeforeTest();

            const paramsInput: UpdateStakeTokensParamsInput = {
                stakeToken1: stakeToken1.address,
                stakeToken2: stakeToken2.address,
                stakeToken3: stakeToken3.address,
            };
            const tx = await getPrimaryTokenTxByInput_UpdateStakeTokens(
                primaryToken as any,
                deployer,
                paramsInput,
                admin,
                admins
            );
            await tx.wait();

            expect(await primaryToken.stakeToken1()).to.equal(stakeToken1.address);
            expect(await primaryToken.stakeToken2()).to.equal(stakeToken2.address);
            expect(await primaryToken.stakeToken3()).to.equal(stakeToken3.address);
        });

        it('4.4.3.2. Update stake tokens unsuccessfully with invalid signatures', async () => {
            const { deployer, admin, admins, primaryToken, stakeToken1, stakeToken2, stakeToken3 } =
                await setupBeforeTest();

            const paramsInput: UpdateStakeTokensParamsInput = {
                stakeToken1: stakeToken1.address,
                stakeToken2: stakeToken2.address,
                stakeToken3: stakeToken3.address,
            };
            const params: UpdateStakeTokensParams = {
                ...paramsInput,
                signatures: await getUpdateStakeTokensSignatures(
                    primaryToken as any,
                    paramsInput,
                    admin,
                    admins,
                    false
                ),
            };
            await expect(
                getPrimaryTokenTx_UpdateStakeTokens(primaryToken as any, deployer, params)
            ).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        async function testForInvalidInput(
            fixture: PrimaryTokenFixture,
            stakeToken1: string,
            stakeToken2: string,
            stakeToken3: string
        ) {
            const { deployer, admin, admins, primaryToken } = fixture;

            await expect(
                getPrimaryTokenTxByInput_UpdateStakeTokens(
                    primaryToken as any,
                    deployer,
                    {
                        stakeToken1: stakeToken1,
                        stakeToken2: stakeToken2,
                        stakeToken3: stakeToken3,
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(primaryToken, 'InvalidUpdating');
        }

        it('4.4.3.3. Update stake tokens unsuccessfully with zero address stake tokens', async () => {
            const fixture = await setupBeforeTest();
            const { stakeToken1, stakeToken2, stakeToken3 } = fixture;

            await testForInvalidInput(fixture, ethers.constants.AddressZero, stakeToken2.address, stakeToken3.address);
            await testForInvalidInput(fixture, stakeToken1.address, ethers.constants.AddressZero, stakeToken3.address);
            await testForInvalidInput(fixture, stakeToken1.address, stakeToken2.address, ethers.constants.AddressZero);
        });

        it('4.4.3.4. Update stake tokens unsuccessfully with already updated stake tokens', async () => {
            const fixture = await setupBeforeTest({
                updateStakeTokens: true,
            });
            const { stakeToken1, stakeToken2, stakeToken3 } = fixture;
            await testForInvalidInput(fixture, stakeToken1.address, stakeToken2.address, stakeToken3.address);
        });
    });

    describe('4.4.4. unlockForBackerRound(address,bytes[])', async () => {
        it('4.4.4.1. Unlock token allocation for backer round successfully', async () => {
            const { primaryToken, deployer, admins, admin, receiver } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            const paramsInput: UnlockForBackerRoundParamsInput = {
                distributor: receiver.address,
            };
            const tx = await getPrimaryTokenTxByInput_UnlockForBackerRound(
                primaryToken as any,
                deployer,
                paramsInput,
                admin,
                admins
            );
            await tx.wait();

            expect(await primaryToken.backerRoundUnlocked()).to.equal(true);
            expect(await primaryToken.balanceOf(receiver.address)).to.equal(Constant.PRIMARY_TOKEN_BACKER_ROUND);

            await expect(tx).to.emit(primaryToken, 'BackerRoundTokensUnlock');
        });

        it('4.4.4.2. Unlock token allocation for backer round unsuccessfully with invalid signatures', async () => {
            const { primaryToken, deployer, admins, admin, receiver } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            const paramsInput: UnlockForBackerRoundParamsInput = {
                distributor: receiver.address,
            };
            const params: UnlockForBackerRoundParams = {
                ...paramsInput,
                signatures: await getUnlockForBackerRoundSignatures(
                    primaryToken as any,
                    paramsInput,
                    admin,
                    admins,
                    false
                ),
            };
            await expect(
                getPrimaryTokenTx_UnlockForBackerRound(primaryToken as any, deployer, params)
            ).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('4.4.4.3. Unlock token allocation for backer round unsuccessfully when it has already been unlocked', async () => {
            const { primaryToken, deployer, admins, admin, receiver } = await setupBeforeTest({
                updateStakeTokens: true,
                unlockForBackerRound: true,
            });

            await expect(
                getPrimaryTokenTxByInput_UnlockForBackerRound(
                    primaryToken as any,
                    deployer,
                    {
                        distributor: receiver.address,
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(primaryToken, 'AlreadyUnlockedTokens');
        });
    });

    describe('4.4.5. unlockForSeedRound(address,bytes[])', async () => {
        it('4.4.5.1. Unlock token allocation for seed round successfully', async () => {
            const { primaryToken, deployer, admins, admin, receiver } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            const paramsInput: UnlockForSeedRoundParamsInput = {
                distributor: receiver.address,
            };
            const tx = await getPrimaryTokenTxByInput_UnlockForSeedRound(
                primaryToken as any,
                deployer,
                paramsInput,
                admin,
                admins
            );
            await tx.wait();

            expect(await primaryToken.seedRoundUnlocked()).to.equal(true);
            expect(await primaryToken.balanceOf(receiver.address)).to.equal(Constant.PRIMARY_TOKEN_SEED_ROUND);

            await expect(tx).to.emit(primaryToken, 'SeedRoundTokensUnlock');
        });

        it('4.4.5.2. Unlock token allocation for seed round unsuccessfully with invalid signatures', async () => {
            const { primaryToken, deployer, admins, admin, receiver } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            const paramsInput: UnlockForSeedRoundParamsInput = {
                distributor: receiver.address,
            };
            const params: UnlockForSeedRoundParams = {
                ...paramsInput,
                signatures: await getUnlockForSeedRoundSignatures(
                    primaryToken as any,
                    paramsInput,
                    admin,
                    admins,
                    false
                ),
            };
            await expect(
                getPrimaryTokenTx_UnlockForSeedRound(primaryToken as any, deployer, params)
            ).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('4.4.5.3. Unlock token allocation for seed round unsuccessfully when it has already been unlocked', async () => {
            const { primaryToken, deployer, admins, admin, receiver } = await setupBeforeTest({
                updateStakeTokens: true,
                unlockForSeedRound: true,
            });

            await expect(
                getPrimaryTokenTxByInput_UnlockForSeedRound(
                    primaryToken as any,
                    deployer,
                    {
                        distributor: receiver.address,
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(primaryToken, 'AlreadyUnlockedTokens');
        });
    });

    describe('4.4.6. unlockForPrivateSale1(address,bytes[])', async () => {
        it('4.4.6.1. Unlock token allocation for private sale 1 successfully', async () => {
            const { primaryToken, deployer, admins, admin, receiver } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            const paramsInput: UnlockForPrivateSale1ParamsInput = {
                distributor: receiver.address,
            };
            const tx = await getPrimaryTokenTxByInput_UnlockForPrivateSale1(
                primaryToken as any,
                deployer,
                paramsInput,
                admin,
                admins
            );
            await tx.wait();

            expect(await primaryToken.privateSale1Unlocked()).to.equal(true);
            expect(await primaryToken.balanceOf(receiver.address)).to.equal(Constant.PRIMARY_TOKEN_PRIVATE_SALE_1);

            await expect(tx).to.emit(primaryToken, 'PrivateSale1TokensUnlock');
        });

        it('4.4.6.2. Unlock token allocation for private sale 1 unsuccessfully with invalid signatures', async () => {
            const { primaryToken, deployer, admins, admin, receiver } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            const paramsInput: UnlockForPrivateSale1ParamsInput = {
                distributor: receiver.address,
            };
            const params: UnlockForPrivateSale1Params = {
                ...paramsInput,
                signatures: await getUnlockForPrivateSale1Signatures(
                    primaryToken as any,
                    paramsInput,
                    admin,
                    admins,
                    false
                ),
            };
            await expect(
                getPrimaryTokenTx_UnlockForPrivateSale1(primaryToken as any, deployer, params)
            ).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('4.4.6.3. Unlock token allocation for private sale 1 unsuccessfully when it has already been unlocked', async () => {
            const { primaryToken, deployer, admins, admin, receiver } = await setupBeforeTest({
                updateStakeTokens: true,
                unlockForPrivateSale1: true,
            });

            await expect(
                getPrimaryTokenTxByInput_UnlockForPrivateSale1(
                    primaryToken as any,
                    deployer,
                    {
                        distributor: receiver.address,
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(primaryToken, 'AlreadyUnlockedTokens');
        });
    });

    describe('4.4.7. unlockForPrivateSale2(address,bytes[])', async () => {
        it('4.4.7.1. Unlock token allocation for private sale 2 successfully', async () => {
            const { primaryToken, deployer, admins, admin, receiver } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            const paramsInput: UnlockForPrivateSale2ParamsInput = {
                distributor: receiver.address,
            };
            const tx = await getPrimaryTokenTxByInput_UnlockForPrivateSale2(
                primaryToken as any,
                deployer,
                paramsInput,
                admin,
                admins
            );
            await tx.wait();

            expect(await primaryToken.privateSale2Unlocked()).to.equal(true);
            expect(await primaryToken.balanceOf(receiver.address)).to.equal(Constant.PRIMARY_TOKEN_PRIVATE_SALE_2);

            await expect(tx).to.emit(primaryToken, 'PrivateSale2TokensUnlock');
        });

        it('4.4.7.2. Unlock token allocation for private sale 2 unsuccessfully with invalid signatures', async () => {
            const { primaryToken, deployer, admins, admin, receiver } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            const paramsInput: UnlockForPrivateSale2ParamsInput = {
                distributor: receiver.address,
            };
            const params: UnlockForPrivateSale2Params = {
                ...paramsInput,
                signatures: await getUnlockForPrivateSale2Signatures(
                    primaryToken as any,
                    paramsInput,
                    admin,
                    admins,
                    false
                ),
            };
            await expect(
                getPrimaryTokenTx_UnlockForPrivateSale2(primaryToken as any, deployer, params)
            ).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('4.4.7.3. Unlock token allocation for private sale 2 unsuccessfully when it has already been unlocked', async () => {
            const { primaryToken, deployer, admins, admin, receiver } = await setupBeforeTest({
                updateStakeTokens: true,
                unlockForPrivateSale2: true,
            });

            await expect(
                getPrimaryTokenTxByInput_UnlockForPrivateSale2(
                    primaryToken as any,
                    deployer,
                    {
                        distributor: receiver.address,
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(primaryToken, 'AlreadyUnlockedTokens');
        });
    });

    describe('4.4.8. unlockForPublicSale(address,bytes[])', async () => {
        it('4.4.8.1. Unlock token allocation for public sale successfully', async () => {
            const { primaryToken, deployer, admins, admin, receiver } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            const paramsInput: UnlockForPublicSaleParamsInput = {
                distributor: receiver.address,
            };
            const tx = await getPrimaryTokenTxByInput_UnlockForPublicSale(
                primaryToken as any,
                deployer,
                paramsInput,
                admin,
                admins
            );
            await tx.wait();

            expect(await primaryToken.publicSaleUnlocked()).to.equal(true);
            expect(await primaryToken.balanceOf(receiver.address)).to.equal(Constant.PRIMARY_TOKEN_PUBLIC_SALE);

            await expect(tx).to.emit(primaryToken, 'PublicSaleTokensUnlock');
        });

        it('4.4.8.2. Unlock token allocation for public sale unsuccessfully with invalid signatures', async () => {
            const { primaryToken, deployer, admins, admin, receiver } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            const paramsInput: UnlockForPublicSaleParamsInput = {
                distributor: receiver.address,
            };
            const params: UnlockForPublicSaleParams = {
                ...paramsInput,
                signatures: await getUnlockForPublicSaleSignatures(
                    primaryToken as any,
                    paramsInput,
                    admin,
                    admins,
                    false
                ),
            };
            await expect(
                getPrimaryTokenTx_UnlockForPublicSale(primaryToken as any, deployer, params)
            ).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('4.4.8.3. Unlock token allocation for public sale unsuccessfully when it has already been unlocked', async () => {
            const { primaryToken, deployer, admins, admin, receiver } = await setupBeforeTest({
                updateStakeTokens: true,
                unlockForPublicSale: true,
            });

            await expect(
                getPrimaryTokenTxByInput_UnlockForPublicSale(
                    primaryToken as any,
                    deployer,
                    {
                        distributor: receiver.address,
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(primaryToken, 'AlreadyUnlockedTokens');
        });
    });

    describe('4.4.9. unlockForCoreTeam(address,bytes[])', async () => {
        it('4.4.9.1. Unlock token allocation for core team successfully', async () => {
            const { primaryToken, deployer, admins, admin, receiver } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            const paramsInput: UnlockForCoreTeamParamsInput = {
                distributor: receiver.address,
            };
            const tx = await getPrimaryTokenTxByInput_UnlockForCoreTeam(
                primaryToken as any,
                deployer,
                paramsInput,
                admin,
                admins
            );
            await tx.wait();

            expect(await primaryToken.coreTeamTokensUnlocked()).to.equal(true);
            expect(await primaryToken.balanceOf(receiver.address)).to.equal(Constant.PRIMARY_TOKEN_CORE_TEAM);

            await expect(tx).to.emit(primaryToken, 'CoreTeamTokensUnlock');
        });

        it('4.4.9.2. Unlock token allocation for core team unsuccessfully with invalid signatures', async () => {
            const { primaryToken, deployer, admins, admin, receiver } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            const paramsInput: UnlockForCoreTeamParamsInput = {
                distributor: receiver.address,
            };
            const params: UnlockForCoreTeamParams = {
                ...paramsInput,
                signatures: await getUnlockForCoreTeamSignatures(
                    primaryToken as any,
                    paramsInput,
                    admin,
                    admins,
                    false
                ),
            };
            await expect(
                getPrimaryTokenTx_UnlockForCoreTeam(primaryToken as any, deployer, params)
            ).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('4.4.9.3. Unlock token allocation for core team unsuccessfully when it has already been unlocked', async () => {
            const { primaryToken, deployer, admins, admin, receiver } = await setupBeforeTest({
                updateStakeTokens: true,
                unlockForCoreTeam: true,
            });

            await expect(
                getPrimaryTokenTxByInput_UnlockForCoreTeam(
                    primaryToken as any,
                    deployer,
                    {
                        distributor: receiver.address,
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(primaryToken, 'AlreadyUnlockedTokens');
        });
    });

    describe('4.4.10. unlockForMarketMaker(address,bytes[])', async () => {
        it('4.4.10.1. Unlock for market maker successfully', async () => {
            const { primaryToken, deployer, admins, admin, receiver } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            const paramsInput: UnlockForMarketMakerParamsInput = {
                distributor: receiver.address,
            };
            const tx = await getPrimaryTokenTxByInput_UnlockForMarketMaker(
                primaryToken as any,
                deployer,
                paramsInput,
                admin,
                admins
            );
            await tx.wait();

            expect(await primaryToken.marketMakerTokensUnlocked()).to.equal(true);
            expect(await primaryToken.balanceOf(receiver.address)).to.equal(Constant.PRIMARY_TOKEN_MARKET_MAKER);

            await expect(tx).to.emit(primaryToken, 'MarketMakerTokensUnlock');
        });

        it('4.4.10.2. Unlock for market maker unsuccessfully with invalid signatures', async () => {
            const { primaryToken, deployer, admins, admin, receiver } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            const paramsInput: UnlockForMarketMakerParamsInput = {
                distributor: receiver.address,
            };
            const params: UnlockForMarketMakerParams = {
                ...paramsInput,
                signatures: await getUnlockForMarketMakerSignatures(
                    primaryToken as any,
                    paramsInput,
                    admin,
                    admins,
                    false
                ),
            };
            await expect(
                getPrimaryTokenTx_UnlockForMarketMaker(primaryToken as any, deployer, params)
            ).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('4.4.10.3. Unlock for market maker unsuccessfully when it has already been unlocked', async () => {
            const { primaryToken, deployer, admins, admin, receiver } = await setupBeforeTest({
                updateStakeTokens: true,
                unlockForMarketMaker: true,
            });

            await expect(
                getPrimaryTokenTxByInput_UnlockForMarketMaker(
                    primaryToken as any,
                    deployer,
                    {
                        distributor: receiver.address,
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(primaryToken, 'AlreadyUnlockedTokens');
        });
    });

    describe('4.4.11. unlockForExternalTreasury(address,bytes[])', async () => {
        it('4.4.11.1. Unlock for external treasury successfully', async () => {
            const { primaryToken, deployer, admins, admin, receiver } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            const paramsInput: UnlockForExternalTreasuryParamsInput = {
                distributor: receiver.address,
            };
            const tx = await getPrimaryTokenTxByInput_UnlockForExternalTreasury(
                primaryToken as any,
                deployer,
                paramsInput,
                admin,
                admins
            );
            await tx.wait();

            expect(await primaryToken.externalTreasuryTokensUnlocked()).to.equal(true);
            expect(await primaryToken.balanceOf(receiver.address)).to.equal(Constant.PRIMARY_TOKEN_EXTERNAL_TREASURY);

            await expect(tx).to.emit(primaryToken, 'ExternalTreasuryTokensUnlock');
        });

        it('4.4.11.2. Unlock for external treasury unsuccessfully with invalid signatures', async () => {
            const { primaryToken, deployer, admins, admin, receiver } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            const paramsInput: UnlockForExternalTreasuryParamsInput = {
                distributor: receiver.address,
            };
            const params: UnlockForExternalTreasuryParams = {
                ...paramsInput,
                signatures: await getUnlockForExternalTreasurySignatures(
                    primaryToken as any,
                    paramsInput,
                    admin,
                    admins,
                    false
                ),
            };
            await expect(
                getPrimaryTokenTx_UnlockForExternalTreasury(primaryToken as any, deployer, params)
            ).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('4.4.11.3. Unlock token allocation for external treasury unsuccessfully when it has already been unlocked', async () => {
            const { primaryToken, deployer, admins, admin, receiver } = await setupBeforeTest({
                updateStakeTokens: true,
                unlockForExternalTreasury: true,
            });

            await expect(
                getPrimaryTokenTxByInput_UnlockForExternalTreasury(
                    primaryToken as any,
                    deployer,
                    {
                        distributor: receiver.address,
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(primaryToken, 'AlreadyUnlockedTokens');
        });
    });


    /* --- Query --- */
    describe('4.4.12. totalStake()', async () => {
        it('4.4.12.1. Return correct total stake', async () => {
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

    describe('4.4.13. isStakeRewardingCulminated(address)', async () => {
        it('4.4.13.1. Return correct value', async () => {
            const { primaryToken, stakeToken1, stakeToken2, stakeToken3 } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            expect(await primaryToken.isStakeRewardingCulminated(stakeToken1.address)).to.equal(false);
            expect(await primaryToken.isStakeRewardingCulminated(stakeToken2.address)).to.equal(false);
            expect(await primaryToken.isStakeRewardingCulminated(stakeToken3.address)).to.equal(false);

            await primaryToken.setVariable('stakeToken1Waves', Constant.PRIMARY_TOKEN_STAKE_1_CULMINATING_WAVE);
            expect(await primaryToken.isStakeRewardingCulminated(stakeToken1.address)).to.equal(true);
            expect(await primaryToken.isStakeRewardingCulminated(stakeToken2.address)).to.equal(false);
            expect(await primaryToken.isStakeRewardingCulminated(stakeToken3.address)).to.equal(false);

            await primaryToken.setVariable('stakeToken2Waves', Constant.PRIMARY_TOKEN_STAKE_2_CULMINATING_WAVE);
            expect(await primaryToken.isStakeRewardingCulminated(stakeToken1.address)).to.equal(true);
            expect(await primaryToken.isStakeRewardingCulminated(stakeToken2.address)).to.equal(true);
            expect(await primaryToken.isStakeRewardingCulminated(stakeToken3.address)).to.equal(false);

            await primaryToken.setVariable('stakeToken3Waves', Constant.PRIMARY_TOKEN_STAKE_3_CULMINATING_WAVE);
            expect(await primaryToken.isStakeRewardingCulminated(stakeToken1.address)).to.equal(true);
            expect(await primaryToken.isStakeRewardingCulminated(stakeToken2.address)).to.equal(true);
            expect(await primaryToken.isStakeRewardingCulminated(stakeToken3.address)).to.equal(true);
        });

        it('4.4.13.2. Revert with unknown stake token', async () => {
            const { primaryToken } = await setupBeforeTest({
                updateStakeTokens: true,
            });

            await expect(
                primaryToken.isStakeRewardingCulminated(ethers.constants.AddressZero)
            ).to.be.revertedWithCustomError(primaryToken, 'InvalidStakeToken');
        });
    });

    /* --- Command --- */
    describe('4.4.14. contributeLiquidityFromBackerRound(uint256)', async () => {
        it('4.4.14.1. Contribute liquidity from backer round successfully', async () => {
            const { primaryToken, contributor, currency, treasury } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
                unlockForBackerRound: true,
            });

            const tx = await getPrimaryTokenTx_ContributeLiquidityFromBackerRound(primaryToken as any, contributor, {
                liquidity: ethers.utils.parseEther('1000'),
            });
            await tx.wait();

            await expect(tx)
                .to.emit(primaryToken, 'LiquidityContributionFromBackerRound')
                .withArgs(ethers.utils.parseEther('1000'));

            expect(await currency.balanceOf(contributor.address)).to.equal(ethers.utils.parseEther('9000'));
            expect(await currency.balanceOf(primaryToken.address)).to.equal(ethers.utils.parseEther('0'));
            expect(await currency.balanceOf(treasury.address)).to.equal(ethers.utils.parseEther('1000'));

            expect(treasury.provideLiquidity).to.be.calledWith(ethers.utils.parseEther('1000'));
        });

        it('4.4.14.2. Contribute liquidity from backer round unsuccessfully when not unlocked', async () => {
            const { primaryToken, contributor, currency } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
            });

            await prepareERC20(currency, [contributor], [primaryToken as any], ethers.utils.parseEther('10000'));

            await expect(
                getPrimaryTokenTx_ContributeLiquidityFromBackerRound(primaryToken as any, contributor, {
                    liquidity: ethers.utils.parseEther('1000'),
                })
            ).to.be.revertedWithCustomError(primaryToken, 'NotUnlocked');
        });
    });

    describe('4.4.15. contributeLiquidityFromSeedRound(uint256)', async () => {
        it('4.4.15.1. Contribute liquidity from seed round successfully', async () => {
            const { primaryToken, contributor, currency, treasury } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
                unlockForSeedRound: true,
            });

            const tx = await getPrimaryTokenTx_ContributeLiquidityFromSeedRound(primaryToken as any, contributor, {
                liquidity: ethers.utils.parseEther('1000'),
            });
            await tx.wait();

            await expect(tx)
                .to.emit(primaryToken, 'LiquidityContributionFromSeedRound')
                .withArgs(ethers.utils.parseEther('1000'));

            expect(await currency.balanceOf(contributor.address)).to.equal(ethers.utils.parseEther('9000'));
            expect(await currency.balanceOf(primaryToken.address)).to.equal(ethers.utils.parseEther('0'));
            expect(await currency.balanceOf(treasury.address)).to.equal(ethers.utils.parseEther('1000'));

            expect(treasury.provideLiquidity).to.be.calledWith(ethers.utils.parseEther('1000'));
        });

        it('4.4.15.2. Contribute liquidity from seed round unsuccessfully when not unlocked', async () => {
            const { primaryToken, contributor } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
            });

            await expect(
                getPrimaryTokenTx_ContributeLiquidityFromSeedRound(primaryToken as any, contributor, {
                    liquidity: ethers.utils.parseEther('1000'),
                })
            ).to.be.revertedWithCustomError(primaryToken, 'NotUnlocked');
        });
    });

    describe('4.4.16. contributeLiquidityFromPrivateSale1(uint256)', async () => {
        it('4.4.16.1. Contribute liquidity from private sale 1 successfully', async () => {
            const { primaryToken, contributor, currency, treasury } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
                unlockForPrivateSale1: true,
            });

            const tx = await getPrimaryTokenTx_ContributeLiquidityFromPrivateSale1(primaryToken as any, contributor, {
                liquidity: ethers.utils.parseEther('1000'),
            });
            await tx.wait();

            await expect(tx)
                .to.emit(primaryToken, 'LiquidityContributionFromPrivateSale1')
                .withArgs(ethers.utils.parseEther('1000'));

            expect(await currency.balanceOf(contributor.address)).to.equal(ethers.utils.parseEther('9000'));
            expect(await currency.balanceOf(primaryToken.address)).to.equal(ethers.utils.parseEther('0'));
            expect(await currency.balanceOf(treasury.address)).to.equal(ethers.utils.parseEther('1000'));

            expect(treasury.provideLiquidity).to.be.calledWith(ethers.utils.parseEther('1000'));
        });

        it('4.4.16.2. Contribute liquidity from private sale 1 unsuccessfully when not unlocked', async () => {
            const { primaryToken, contributor } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
            });

            await expect(
                getPrimaryTokenTx_ContributeLiquidityFromPrivateSale1(primaryToken as any, contributor, {
                    liquidity: ethers.utils.parseEther('1000'),
                })
            ).to.be.revertedWithCustomError(primaryToken, 'NotUnlocked');
        });
    });

    describe('4.4.17. contributeLiquidityFromPrivateSale2(uint256)', async () => {
        it('4.4.17.1. Contribute liquidity from private sale 2 successfully', async () => {
            const { primaryToken, contributor, currency, treasury } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
                unlockForPrivateSale2: true,
            });

            const tx = await getPrimaryTokenTx_ContributeLiquidityFromPrivateSale2(primaryToken as any, contributor, {
                liquidity: ethers.utils.parseEther('1000'),
            });
            await tx.wait();

            await expect(tx)
                .to.emit(primaryToken, 'LiquidityContributionFromPrivateSale2')
                .withArgs(ethers.utils.parseEther('1000'));

            expect(await currency.balanceOf(contributor.address)).to.equal(ethers.utils.parseEther('9000'));
            expect(await currency.balanceOf(primaryToken.address)).to.equal(ethers.utils.parseEther('0'));
            expect(await currency.balanceOf(treasury.address)).to.equal(ethers.utils.parseEther('1000'));

            expect(treasury.provideLiquidity).to.be.calledWith(ethers.utils.parseEther('1000'));
        });

        it('4.4.17.2. Contribute liquidity from private sale 2 unsuccessfully when not unlocked', async () => {
            const { primaryToken, contributor } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
            });

            await expect(
                getPrimaryTokenTx_ContributeLiquidityFromPrivateSale2(primaryToken as any, contributor, {
                    liquidity: ethers.utils.parseEther('1000'),
                })
            ).to.be.revertedWithCustomError(primaryToken, 'NotUnlocked');
        });
    });

    describe('4.4.18. contributeLiquidityFromPublicSale(uint256)', async () => {
        it('4.4.18.1. Contribute liquidity from public sale successfully', async () => {
            const { primaryToken, contributor, currency, treasury } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
                unlockForPublicSale: true,
            });

            const tx = await getPrimaryTokenTx_ContributeLiquidityFromPublicSale(primaryToken as any, contributor, {
                liquidity: ethers.utils.parseEther('1000'),
            });
            await tx.wait();

            await expect(tx)
                .to.emit(primaryToken, 'LiquidityContributionFromPublicSale')
                .withArgs(ethers.utils.parseEther('1000'));

            expect(await currency.balanceOf(contributor.address)).to.equal(ethers.utils.parseEther('9000'));
            expect(await currency.balanceOf(primaryToken.address)).to.equal(ethers.utils.parseEther('0'));
            expect(await currency.balanceOf(treasury.address)).to.equal(ethers.utils.parseEther('1000'));

            expect(treasury.provideLiquidity).to.be.calledWith(ethers.utils.parseEther('1000'));
        });

        it('4.4.18.2. Contribute liquidity from public sale unsuccessfully when not unlocked', async () => {
            const { primaryToken, contributor } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
            });

            await expect(
                getPrimaryTokenTx_ContributeLiquidityFromPublicSale(primaryToken as any, contributor, {
                    liquidity: ethers.utils.parseEther('1000'),
                })
            ).to.be.revertedWithCustomError(primaryToken, 'NotUnlocked');
        });
    });

    describe('4.4.19. contributeLiquidityFromMarketMaker(uint256)', async () => {
        it('4.4.19.1. Contribute liquidity from market maker successfully', async () => {
            const { primaryToken, contributor, currency, treasury } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
                unlockForMarketMaker: true,
            });

            const tx = await getPrimaryTokenTx_ContributeLiquidityFromMarketMaker(primaryToken as any, contributor, {
                liquidity: ethers.utils.parseEther('1000'),
            });
            await tx.wait();

            await expect(tx)
                .to.emit(primaryToken, 'LiquidityContributionFromMarketMaker')
                .withArgs(ethers.utils.parseEther('1000'));

            expect(await currency.balanceOf(contributor.address)).to.equal(ethers.utils.parseEther('9000'));
            expect(await currency.balanceOf(primaryToken.address)).to.equal(ethers.utils.parseEther('0'));
            expect(await currency.balanceOf(treasury.address)).to.equal(ethers.utils.parseEther('1000'));

            expect(treasury.provideLiquidity).to.be.calledWith(ethers.utils.parseEther('1000'));
        });

        it('4.4.19.2. Contribute liquidity from market maker unsuccessfully when not unlocked', async () => {
            const { primaryToken, contributor } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
            });

            await expect(
                getPrimaryTokenTx_ContributeLiquidityFromMarketMaker(primaryToken as any, contributor, {
                    liquidity: ethers.utils.parseEther('1000'),
                })
            ).to.be.revertedWithCustomError(primaryToken, 'NotUnlocked');
        });
    });

    describe('4.4.20. contributeLiquidityFromExternalTreasury(uint256)', async () => {
        it('4.4.20.1. Contribute liquidity from external treasury successfully', async () => {
            const { primaryToken, contributor, currency, treasury } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
                unlockForExternalTreasury: true,
            });

            const tx = await getPrimaryTokenTx_ContributeLiquidityFromExternalTreasury(
                primaryToken as any,
                contributor,
                {
                    liquidity: ethers.utils.parseEther('1000'),
                }
            );
            await tx.wait();

            await expect(tx)
                .to.emit(primaryToken, 'LiquidityContributionFromExternalTreasury')
                .withArgs(ethers.utils.parseEther('1000'));

            expect(await currency.balanceOf(contributor.address)).to.equal(ethers.utils.parseEther('9000'));
            expect(await currency.balanceOf(primaryToken.address)).to.equal(ethers.utils.parseEther('0'));
            expect(await currency.balanceOf(treasury.address)).to.equal(ethers.utils.parseEther('1000'));

            expect(treasury.provideLiquidity).to.be.calledWith(ethers.utils.parseEther('1000'));
        });

        it('4.4.20.2. Contribute liquidity from external treasury unsuccessfully when not unlocked', async () => {
            const { primaryToken, contributor } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
            });

            await expect(
                getPrimaryTokenTx_ContributeLiquidityFromExternalTreasury(primaryToken as any, contributor, {
                    liquidity: ethers.utils.parseEther('1000'),
                })
            ).to.be.revertedWithCustomError(primaryToken, 'NotUnlocked');
        });
    });

    describe('4.4.21. contributeLiquidityFromStakeToken(uint256, address)', async () => {
        it('4.4.21.1. Contribute liquidity from stake token 1 successfully', async () => {
            const { primaryToken, currency, stakeToken1, treasury } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
            });

            const initStakeToken1CurrencyBalance = await currency.balanceOf(stakeToken1.address);

            const value = ethers.utils.parseEther('1000');
            const tx = await getCallPrimaryTokenTx_ContributeLiquidityFromStakeToken(
                primaryToken as any,
                stakeToken1 as any,
                {
                    liquidity: value,
                }
            );
            await tx.wait();

            await expect(tx).to.emit(primaryToken, 'LiquidityContributionFromStakeToken1').withArgs(value);

            expect(await currency.balanceOf(stakeToken1.address)).to.equal(initStakeToken1CurrencyBalance.sub(value));
            expect(await currency.balanceOf(primaryToken.address)).to.equal(ethers.utils.parseEther('0'));
            expect(await currency.balanceOf(treasury.address)).to.equal(value);

            expect(treasury.provideLiquidity).to.be.calledWith(value);
        });

        it('4.4.21.2. Contribute liquidity from stake token 2 successfully', async () => {
            const { primaryToken, currency, stakeToken2, treasury } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
            });

            const initStakeToken2CurrencyBalance = await currency.balanceOf(stakeToken2.address);

            const value = ethers.utils.parseEther('1000');
            const tx = await getCallPrimaryTokenTx_ContributeLiquidityFromStakeToken(
                primaryToken as any,
                stakeToken2 as any,
                {
                    liquidity: value,
                }
            );
            await tx.wait();

            await expect(tx).to.emit(primaryToken, 'LiquidityContributionFromStakeToken2').withArgs(value);

            expect(await currency.balanceOf(stakeToken2.address)).to.equal(initStakeToken2CurrencyBalance.sub(value));
            expect(await currency.balanceOf(primaryToken.address)).to.equal(ethers.utils.parseEther('0'));
            expect(await currency.balanceOf(treasury.address)).to.equal(value);

            expect(treasury.provideLiquidity).to.be.calledWith(value);
        });

        it('4.4.21.3. Contribute liquidity from stake token 3 successfully', async () => {
            const { primaryToken, currency, stakeToken3, treasury } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
            });

            const initStakeToken3CurrencyBalance = await currency.balanceOf(stakeToken3.address);
            const value = ethers.utils.parseEther('1000');

            const tx = await getCallPrimaryTokenTx_ContributeLiquidityFromStakeToken(
                primaryToken as any,
                stakeToken3 as any,
                {
                    liquidity: value,
                }
            );
            await tx.wait();

            await expect(tx).to.emit(primaryToken, 'LiquidityContributionFromStakeToken3').withArgs(value);

            expect(await currency.balanceOf(stakeToken3.address)).to.equal(initStakeToken3CurrencyBalance.sub(value));
            expect(await currency.balanceOf(primaryToken.address)).to.equal(ethers.utils.parseEther('0'));
            expect(await currency.balanceOf(treasury.address)).to.equal(value);

            expect(treasury.provideLiquidity).to.be.calledWith(value);
        });

        it('4.4.21.4. Contribute liquidity from stake token unsuccessfully with unknown contract sender', async () => {
            const { primaryToken, deployer, currency } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
            });

            const unknownContract = await deployProxyCaller(deployer);

            await prepareERC20(
                currency,
                [unknownContract as any],
                [primaryToken as any],
                ethers.utils.parseEther('10000')
            );

            await expect(
                getCallPrimaryTokenTx_ContributeLiquidityFromStakeToken(primaryToken as any, unknownContract as any, {
                    liquidity: ethers.utils.parseEther('1000'),
                })
            ).to.be.revertedWithCustomError(primaryToken, 'InvalidStakeToken');
        });
    });

    describe('4.4.22. mintForStake()', async () => {
        it('4.4.22.1. Mint for stake token successfully by stake token 1', async () => {
            const { primaryToken, stakeToken1 } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
            });

            let expectedBalance = ethers.constants.Zero;

            for (let i = 0; i < 10; i++) {
                const tx = await getCallPrimaryTokenTx_MintForStake(primaryToken as any, stakeToken1 as any);
                await tx.wait();

                expect(tx)
                    .to.emit(primaryToken, 'Stake1WaveReward')
                    .withArgs(i + 1, Constant.PRIMARY_TOKEN_STAKE_1_WAVE_REWARD);

                expect(await primaryToken.stakeToken1Waves()).to.equal(i + 1);
                expect(await primaryToken.stakeToken2Waves()).to.equal(0);
                expect(await primaryToken.stakeToken3Waves()).to.equal(0);

                expectedBalance = expectedBalance.add(Constant.PRIMARY_TOKEN_STAKE_1_WAVE_REWARD);
                expect(await primaryToken.balanceOf(stakeToken1.address)).to.equal(expectedBalance);
            }
        });

        it('4.4.22.2. Mint for stake token unsuccessfully by stake token 1 when all stake reward is minted', async () => {
            const { primaryToken, stakeToken1 } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
            });

            for (let i = 0; i < Constant.PRIMARY_TOKEN_STAKE_1_CULMINATING_WAVE; i++) {
                await callTransaction(getCallPrimaryTokenTx_MintForStake(primaryToken as any, stakeToken1 as any));
            }

            await expect(
                getCallPrimaryTokenTx_MintForStake(primaryToken as any, stakeToken1 as any)
            ).to.be.revertedWithCustomError(primaryToken, 'AllStakeRewardMinted');
        });

        it('4.4.22.3. Mint for stake token successfully by stake token 2', async () => {
            const { primaryToken, stakeToken2 } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
            });

            let expectedBalance = ethers.constants.Zero;

            for (let i = 0; i < 10; i++) {
                const tx = await getCallPrimaryTokenTx_MintForStake(primaryToken as any, stakeToken2 as any);
                await tx.wait();

                expect(tx)
                    .to.emit(primaryToken, 'Stake2WaveReward')
                    .withArgs(i + 1, Constant.PRIMARY_TOKEN_STAKE_2_WAVE_REWARD);

                expect(await primaryToken.stakeToken1Waves()).to.equal(0);
                expect(await primaryToken.stakeToken2Waves()).to.equal(i + 1);
                expect(await primaryToken.stakeToken3Waves()).to.equal(0);

                expectedBalance = expectedBalance.add(Constant.PRIMARY_TOKEN_STAKE_2_WAVE_REWARD);
                expect(await primaryToken.balanceOf(stakeToken2.address)).to.equal(expectedBalance);
            }
        });

        it('4.4.22.4. Mint for stake token unsuccessfully by stake token 2 when all stake reward is minted', async () => {
            const { primaryToken, stakeToken2 } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
            });

            for (let i = 0; i < Constant.PRIMARY_TOKEN_STAKE_2_CULMINATING_WAVE; i++) {
                await callTransaction(getCallPrimaryTokenTx_MintForStake(primaryToken as any, stakeToken2 as any));
            }

            await expect(
                getCallPrimaryTokenTx_MintForStake(primaryToken as any, stakeToken2 as any)
            ).to.be.revertedWithCustomError(primaryToken, 'AllStakeRewardMinted');
        });

        it('4.4.22.5. Mint for stake token successfully by stake token 3', async () => {
            const { primaryToken, stakeToken3 } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
            });

            let expectedBalance = ethers.constants.Zero;

            for (let i = 0; i < 10; i++) {
                const tx = await getCallPrimaryTokenTx_MintForStake(primaryToken as any, stakeToken3 as any);
                await tx.wait();

                expect(tx)
                    .to.emit(primaryToken, 'Stake3WaveReward')
                    .withArgs(i + 1, Constant.PRIMARY_TOKEN_STAKE_3_WAVE_REWARD);

                expect(await primaryToken.stakeToken1Waves()).to.equal(0);
                expect(await primaryToken.stakeToken2Waves()).to.equal(0);
                expect(await primaryToken.stakeToken3Waves()).to.equal(i + 1);

                expectedBalance = expectedBalance.add(Constant.PRIMARY_TOKEN_STAKE_3_WAVE_REWARD);
                expect(await primaryToken.balanceOf(stakeToken3.address)).to.equal(expectedBalance);
            }
        });

        it('4.4.22.6. Mint for stake token successfully by stake token 3 when total supply is nearly capped', async () => {
            const { primaryToken, receiver, stakeToken3 } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
            });

            const initialStakeTokensCap = Constant.PRIMARY_TOKEN_MAXIMUM_SUPPLY.sub(await primaryToken.totalSupply());

            await primaryToken.mint(receiver.address, initialStakeTokensCap.sub(ethers.utils.parseEther('1')));

            const tx = await getCallPrimaryTokenTx_MintForStake(primaryToken as any, stakeToken3 as any);
            await tx.wait();

            expect(tx).to.emit(primaryToken, 'Stake3WaveReward').withArgs(1, ethers.utils.parseEther('1'));

            expect(await primaryToken.stakeToken1Waves()).to.equal(0);
            expect(await primaryToken.stakeToken2Waves()).to.equal(0);
            expect(await primaryToken.stakeToken3Waves()).to.equal(1);

            expect(await primaryToken.balanceOf(stakeToken3.address)).to.equal(ethers.utils.parseEther('1'));
        });

        it('4.4.22.7. Mint for stake token unsuccessfully by stake token 3 when total supply is capped', async () => {
            const { primaryToken, receiver, stakeToken3 } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
            });

            const initialStakeTokensCap = Constant.PRIMARY_TOKEN_MAXIMUM_SUPPLY.sub(await primaryToken.totalSupply());

            await primaryToken.mint(receiver.address, initialStakeTokensCap);

            await expect(
                getCallPrimaryTokenTx_MintForStake(primaryToken as any, stakeToken3 as any)
            ).to.be.revertedWithCustomError(primaryToken, 'SupplyCapReached');
        });

        it('4.4.22.8. Mint for stake token unsuccessfully by unauthorized user', async () => {
            const { deployer, primaryToken } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
            });

            await expect(getPrimaryTokenTx_MintForStake(primaryToken as any, deployer)).to.be.revertedWithCustomError(
                primaryToken,
                'Unauthorized'
            );
        });
    });

    describe('4.4.23. liquidate(uint256)', async () => {
        it('4.4.23.1. Liquidate successfully', async () => {
            const { primaryToken, contributor, currency, treasury } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
                transferPrimaryTokenToContributor: true,
                provideLiquidityForTreasury: true,
            });

            const supplyBefore = await primaryToken.totalSupply();
            const liquidityBefore = await treasury.liquidity();

            const burnAmount = ethers.utils.parseEther('100');

            const liquidity = (await treasury.liquidity()).mul(burnAmount).div(await primaryToken.totalSupply());

            const initContributorCurrencyBalance = await currency.balanceOf(contributor.address);

            await time.setNextBlockTimestamp(await primaryToken.liquidationUnlockedAt());
            const tx = await getPrimaryTokenTx_Liquidate(primaryToken as any, contributor, {
                amount: burnAmount,
            });
            await tx.wait();

            await expect(tx).to.emit(primaryToken, 'Liquidation').withArgs(contributor.address, burnAmount, liquidity);

            expect(await primaryToken.balanceOf(contributor.address)).to.equal(ethers.utils.parseEther('9900'));

            expect(await currency.balanceOf(contributor.address)).to.equal(
                initContributorCurrencyBalance.add(liquidity)
            );
            expect(await currency.balanceOf(treasury.address)).to.equal(
                ethers.utils.parseEther('1000000').sub(liquidity)
            );

            expect(treasury.withdrawLiquidity).to.be.calledWith(contributor.address, liquidity);

            const supplyAfter = await primaryToken.totalSupply();
            const liquidityAfter = await treasury.liquidity();

            // price = liquidity / supply is a constant
            expect(liquidityBefore.mul(supplyAfter)).to.equal(liquidityAfter.mul(supplyBefore));
        });

        it('4.4.23.2. Liquidate unsuccessfully when liquidation is not unlocked', async () => {
            const { primaryToken, contributor } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
                transferPrimaryTokenToContributor: true,
                provideLiquidityForTreasury: true,
            });

            await time.setNextBlockTimestamp((await primaryToken.liquidationUnlockedAt()).sub(1));
            await expect(
                getPrimaryTokenTx_Liquidate(primaryToken as any, contributor, {
                    amount: ethers.utils.parseEther('100'),
                })
            ).to.be.revertedWithCustomError(primaryToken, 'BeingLocked');
        });

        it('4.4.23.3. Liquidate unsuccessfully when the contract is paused', async () => {
            const { primaryToken, contributor, deployer, admins, admin } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
                transferPrimaryTokenToContributor: true,
                provideLiquidityForTreasury: true,
            });

            await callTransaction(getPausableTxByInput_Pause(primaryToken as any, deployer, admin, admins));

            await time.setNextBlockTimestamp(await primaryToken.liquidationUnlockedAt());
            await expect(
                getPrimaryTokenTx_Liquidate(primaryToken as any, contributor, {
                    amount: ethers.utils.parseEther('100'),
                })
            ).to.be.revertedWith('Pausable: paused');
        });

        it('4.4.23.4. Liquidate unsuccessfully when the amount to liquidate is greater than the liquidity', async () => {
            const { primaryToken, contributor } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
                transferPrimaryTokenToContributor: true,
                provideLiquidityForTreasury: true,
            });

            const burnAmount = (await primaryToken.totalSupply()).add(ethers.utils.parseEther('1'));
            await time.setNextBlockTimestamp(await primaryToken.liquidationUnlockedAt());
            await expect(
                getPrimaryTokenTx_Liquidate(primaryToken as any, contributor, {
                    amount: burnAmount,
                })
            ).to.be.revertedWithCustomError(primaryToken, 'InsufficientFunds');
        });
    });

    describe('4.4.24. exclusiveDiscount()', async () => {
        it('4.4.24.1. Return correct value', async () => {
            const { primaryToken, stakeToken1, stakeToken2, stakeToken3 } = await setupBeforeTest({
                updateStakeTokens: true,
                updateTreasury: true,
            });

            let discount = await primaryToken.exclusiveDiscount();
            expect(discount.value).to.equal(ethers.utils.parseEther('0.15'));
            expect(discount.decimals).to.equal(Constant.COMMON_RATE_DECIMALS);

            stakeToken1.totalSupply.returns(ethers.utils.parseEther('1000000000'));

            discount = await primaryToken.exclusiveDiscount();
            expect(discount.value).to.equal(ethers.utils.parseEther('0.18'));
            expect(discount.decimals).to.equal(Constant.COMMON_RATE_DECIMALS);

            stakeToken2.totalSupply.returns(ethers.utils.parseEther('2000000000'));

            discount = await primaryToken.exclusiveDiscount();
            expect(discount.value).to.equal(ethers.utils.parseEther('0.24'));
            expect(discount.decimals).to.equal(Constant.COMMON_RATE_DECIMALS);

            stakeToken3.totalSupply.returns(ethers.utils.parseEther('2000000000'));

            discount = await primaryToken.exclusiveDiscount();
            expect(discount.value).to.equal(ethers.utils.parseEther('0.30'));
            expect(discount.decimals).to.equal(Constant.COMMON_RATE_DECIMALS);

            stakeToken1.totalSupply.reset();
            stakeToken2.totalSupply.reset();
            stakeToken3.totalSupply.reset();
        });
    });
});
