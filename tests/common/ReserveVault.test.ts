import { expect } from 'chai';
import { BigNumber } from 'ethers';
import { ethers } from 'hardhat';

// @defi-wonderland/smock
import { MockContract, smock } from '@defi-wonderland/smock';

// @nomicfoundation/hardhat-network-helpers
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

// @typechain-types
import { Admin, Currency, ReserveVault, ReserveVault__factory, FundProvider, ReentrancyERC20 } from '@typechain-types';

// @utils
import {
    callTransaction,
    expectRevertWithModifierCustomError,
    prepareERC20,
    prepareNativeToken,
    randomWallet,
} from '@utils/blockchain';

// @utils/deployments/common
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployCurrency } from '@utils/deployments/common/currency';

// @utils/deployments/mock
import { deployReentrancyERC20 } from '@utils/deployments/mock/reentrancy/reentrancyERC20';
import { deployFundProvider } from '@utils/deployments/mock/utilities/fundProvider';
import { deployFailReceiver } from '@utils/deployments/mock/utilities/failReceiver';

// @utils/models/common
import {
    AuthorizeProviderParams,
    AuthorizeProviderParamsInput,
    ExpandFundParams,
    OpenFundParams,
    ProvideFundParams,
    WithdrawFundParams,
} from '@utils/models/common/reserveVault';

// @utils/signatures/common
import { getAuthorizeProviderSignatures } from '@utils/signatures/common/reserveVault';

// @utils/transaction/common
import { getAdminTxByInput_UpdateCurrencyRegistries } from '@utils/transaction/common/admin';
import { getPausableTxByInput_Pause } from '@utils/transaction/common/pausable';
import {
    getReserveVaultTx_AuthorizeProvider,
    getReserveVaultTxByInput_AuthorizeProvider,
    getCallReserveVaultTx_ExpandFund,
    getCallReserveVaultTx_OpenFund,
    getCallReserveVaultTx_ProvideFund,
    getCallReserveVaultTx_WithdrawFund,
    getReserveVaultTx_OpenFund,
} from '@utils/transaction/common/reserveVault';

interface ReserveVaultFixture {
    deployer: any;
    admins: any[];
    funder1: any;
    funder2: any;
    withdrawer1: any;
    withdrawer2: any;

    admin: Admin;
    currencies: Currency[];
    providers: FundProvider[];
    reserveVault: MockContract<ReserveVault>;

    reentrancyERC20: ReentrancyERC20;
}

describe('1.8. ReserveVault', async () => {
    async function reserveVaultFixture(): Promise<ReserveVaultFixture> {
        const [deployer, admin1, admin2, admin3, admin4, admin5, funder1, funder2, withdrawer1, withdrawer2] =
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

        const currency1 = (await deployCurrency(deployer.address, 'MockCurrency1', 'MCK1')) as Currency;
        const currency2 = (await deployCurrency(deployer.address, 'MockCurrency2', 'MCK2')) as Currency;
        const currency3 = (await deployCurrency(deployer.address, 'MockCurrency3', 'MCK3')) as Currency;
        const currency4 = (await deployCurrency(deployer.address, 'MockCurrency4', 'MCK4')) as Currency;
        const currencies = [currency1, currency2, currency3, currency4];

        const provider1 = (await deployFundProvider(deployer)) as FundProvider;
        const provider2 = (await deployFundProvider(deployer)) as FundProvider;
        const provider3 = (await deployFundProvider(deployer)) as FundProvider;
        const providers = [provider1, provider2, provider3];

        const SmockReserveVaultFactory = await smock.mock<ReserveVault__factory>('ReserveVault');
        const reserveVault = await SmockReserveVaultFactory.deploy();
        await callTransaction(reserveVault.initialize(admin.address));

        const reentrancyERC20 = (await deployReentrancyERC20(deployer, true, false)) as ReentrancyERC20;

        return {
            deployer,
            admins,
            funder1,
            funder2,
            withdrawer1,
            withdrawer2,
            admin,
            currencies,
            providers,
            reserveVault,
            reentrancyERC20,
        };
    }

    async function beforeReserveVaultTest({
        skipListSampleCurrencies = false,
        skipFundForProvider = false,
        authorizeProviders = false,
        listFunds = false,
        expandFunds = false,
        provideFunds = false,
        includeReentrancyERC20 = false,
        pause = false,
    } = {}): Promise<ReserveVaultFixture> {
        const fixture = await loadFixture(reserveVaultFixture);
        const { deployer, admin, admins, currencies, providers, reserveVault, reentrancyERC20 } = fixture;

        if (!skipListSampleCurrencies) {
            const currencyAddresses = [ethers.constants.AddressZero, ...currencies.map((x) => x.address)];
            if (includeReentrancyERC20) {
                currencyAddresses.push(reentrancyERC20.address);
            }

            await callTransaction(
                getAdminTxByInput_UpdateCurrencyRegistries(
                    admin,
                    deployer,
                    {
                        currencies: currencyAddresses,
                        isAvailable: currencyAddresses.map((_) => true),
                        isExclusive: currencyAddresses.map((_) => false),
                    },
                    admins
                )
            );
        }

        if (!skipFundForProvider) {
            await prepareNativeToken(ethers.provider, deployer, providers, ethers.utils.parseEther('100'));
            for (const currency of currencies) {
                await prepareERC20(currency, providers, [reserveVault as any], ethers.utils.parseEther('100'));
            }
        }

        if (authorizeProviders) {
            await callTransaction(
                getReserveVaultTxByInput_AuthorizeProvider(
                    reserveVault as any,
                    deployer,
                    {
                        accounts: providers.map((x) => x.address),
                        isProvider: true,
                    },
                    admin,
                    admins
                )
            );
        }

        if (listFunds) {
            const mainCurrency = currencies[0].address;
            const mainDenomination = 100;
            const extraCurrencies = [currencies[1].address, ethers.constants.AddressZero];
            const extraDenominations = [200, 400];
            if (includeReentrancyERC20) {
                extraCurrencies.push(reentrancyERC20.address);
                extraDenominations.push(300);
            }
            await callTransaction(
                getCallReserveVaultTx_OpenFund(reserveVault as any, providers[0], {
                    mainCurrency,
                    mainDenomination,
                    extraCurrencies,
                    extraDenominations,
                })
            );
        }

        if (expandFunds) {
            const quantity = 1000;
            await callTransaction(
                getCallReserveVaultTx_ExpandFund(reserveVault as any, providers[0], {
                    fundId: BigNumber.from(1),
                    quantity: BigNumber.from(quantity),
                })
            );
        }

        if (provideFunds) {
            const initTotalQuantity = (await reserveVault.getFund(1)).quantity;
            const nativeDenomination = 400;
            await callTransaction(
                getCallReserveVaultTx_ProvideFund(
                    reserveVault as any,
                    providers[0],
                    { fundId: BigNumber.from(1) },
                    { value: initTotalQuantity.mul(nativeDenomination) }
                )
            );
        }

        if (pause) {
            await callTransaction(getPausableTxByInput_Pause(reserveVault as any, deployer, admin, admins));
        }

        return {
            ...fixture,
        };
    }

    /* --- Initialization --- */
    describe('1.8.1. initialize(address)', async () => {
        it('1.8.1.1. Deploy successfully', async () => {
            const { admin, reserveVault } = await beforeReserveVaultTest();

            expect(await reserveVault.admin()).to.equal(admin.address);

            expect(await reserveVault.fundNumber()).to.equal(0);
        });
    });

    /* --- Administration --- */
    describe('1.8.2. authorizeProviders(address[],bool,bytes[])', async () => {
        it('1.8.2.1. Authorize providers successfully with valid signatures', async () => {
            const { deployer, reserveVault, admin, admins, providers } = await beforeReserveVaultTest();

            const toBeProviders = providers.slice(0, 2);

            const paramsInput: AuthorizeProviderParamsInput = {
                accounts: toBeProviders.map((x) => x.address),
                isProvider: true,
            };
            const tx = await getReserveVaultTxByInput_AuthorizeProvider(
                reserveVault as any,
                deployer,
                paramsInput,
                admin,
                admins
            );
            await tx.wait();

            for (const provider of toBeProviders) {
                await expect(tx).to.emit(reserveVault, 'ProviderAuthorization').withArgs(provider.address);
            }

            for (const provider of providers) {
                const isProvider = await reserveVault.isProvider(provider.address);
                if (toBeProviders.includes(provider)) {
                    expect(isProvider).to.be.true;
                } else {
                    expect(isProvider).to.be.false;
                }
            }
        });

        it('1.8.2.2. Authorize providers unsuccessfully with invalid signatures', async () => {
            const { deployer, reserveVault, admin, admins, providers } = await beforeReserveVaultTest();

            const toBeProviders = providers.slice(0, 2);

            const paramsInput: AuthorizeProviderParamsInput = {
                accounts: toBeProviders.map((x) => x.address),
                isProvider: true,
            };
            const params: AuthorizeProviderParams = {
                ...paramsInput,
                signatures: await getAuthorizeProviderSignatures(
                    reserveVault as any,
                    paramsInput,
                    admin,
                    admins,
                    false
                ),
            };
            await expect(
                getReserveVaultTx_AuthorizeProvider(reserveVault as any, deployer, params)
            ).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('1.8.2.3. Authorize providers unsuccessfully when authorizing the same account twice on the same tx', async () => {
            const { deployer, reserveVault, admin, admins, providers } = await beforeReserveVaultTest();

            const toBeProviders = [providers[0], providers[1], providers[2], providers[0]];

            await expect(
                getReserveVaultTxByInput_AuthorizeProvider(
                    reserveVault as any,
                    deployer,
                    {
                        accounts: toBeProviders.map((x) => x.address),
                        isProvider: true,
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(reserveVault, `AuthorizedAccount`);
        });

        it('1.8.2.4. Authorize providers unsuccessfully when authorizing the same account twice on different txs', async () => {
            const { deployer, reserveVault, admin, admins, providers } = await beforeReserveVaultTest();

            const tx1Providers = providers.slice(0, 2);

            await callTransaction(
                getReserveVaultTxByInput_AuthorizeProvider(
                    reserveVault as any,
                    deployer,
                    {
                        accounts: tx1Providers.map((x) => x.address),
                        isProvider: true,
                    },
                    admin,
                    admins
                )
            );

            const tx2Providers = [providers[2], providers[1]];

            await expect(
                getReserveVaultTxByInput_AuthorizeProvider(
                    reserveVault as any,
                    deployer,
                    {
                        accounts: tx2Providers.map((x) => x.address),
                        isProvider: true,
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(reserveVault, `AuthorizedAccount`);
        });

        it('1.8.2.5. Deauthorize providers successfully', async () => {
            const { deployer, reserveVault, admin, admins, providers } = await beforeReserveVaultTest({
                authorizeProviders: true,
            });

            const toDeauth = providers.slice(0, 2);

            const paramsInput: AuthorizeProviderParamsInput = {
                accounts: toDeauth.map((x) => x.address),
                isProvider: false,
            };
            const tx = await getReserveVaultTxByInput_AuthorizeProvider(
                reserveVault as any,
                deployer,
                paramsInput,
                admin,
                admins
            );
            await tx.wait();

            for (const provider of toDeauth) {
                await expect(tx).to.emit(reserveVault, 'ProviderDeauthorization').withArgs(provider.address);
            }

            for (const provider of providers) {
                const isProvider = await reserveVault.isProvider(provider.address);
                if (toDeauth.includes(provider)) {
                    expect(isProvider).to.be.false;
                } else {
                    expect(isProvider).to.be.true;
                }
            }
        });

        it('1.8.2.6. Deauthorize providers unsuccessfully with unauthorized account', async () => {
            const { deployer, reserveVault, admin, admins, providers } = await beforeReserveVaultTest({
                authorizeProviders: true,
            });

            const account = randomWallet();
            const toDeauth = [providers[0], account];

            await expect(
                getReserveVaultTxByInput_AuthorizeProvider(
                    reserveVault as any,
                    deployer,
                    {
                        accounts: toDeauth.map((x) => x.address),
                        isProvider: false,
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(reserveVault, `NotAuthorizedAccount`);
        });

        it('1.8.2.7. Deauthorize providers unsuccessfully when unauthorizing the same account twice on the same tx', async () => {
            const { deployer, reserveVault, admin, admins, providers } = await beforeReserveVaultTest({
                authorizeProviders: true,
            });

            const toDeauth = [providers[0], providers[1], providers[0]];

            await expect(
                getReserveVaultTxByInput_AuthorizeProvider(
                    reserveVault as any,
                    deployer,
                    {
                        accounts: toDeauth.map((x) => x.address),
                        isProvider: false,
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(reserveVault, `NotAuthorizedAccount`);
        });

        it('1.8.2.8. Deauthorize providers unsuccessfully when unauthorizing the same account twice on different txs', async () => {
            const { deployer, reserveVault, admin, admins, providers } = await beforeReserveVaultTest({
                authorizeProviders: true,
            });

            const tx1Providers = [providers[0], providers[1]];
            await callTransaction(
                getReserveVaultTxByInput_AuthorizeProvider(
                    reserveVault as any,
                    deployer,
                    {
                        accounts: tx1Providers.map((x) => x.address),
                        isProvider: false,
                    },
                    admin,
                    admins
                )
            );

            const tx2Providers = [providers[2], providers[1]];

            await expect(
                getReserveVaultTxByInput_AuthorizeProvider(
                    reserveVault as any,
                    deployer,
                    {
                        accounts: tx2Providers.map((x) => x.address),
                        isProvider: false,
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(reserveVault, `NotAuthorizedAccount`);
        });
    });

    /* --- Query --- */
    describe('1.8.3. getFund(uint256)', async () => {
        it('1.8.3.1. Return successfully with valid fund id', async () => {
            const { reserveVault } = await beforeReserveVaultTest({
                authorizeProviders: true,
                listFunds: true,
            });

            expect(await reserveVault.getFund(1)).to.not.be.reverted;
        });

        it('1.8.3.2. Revert with invalid fund id', async () => {
            const { reserveVault } = await beforeReserveVaultTest({
                authorizeProviders: true,
                listFunds: true,
            });

            await expectRevertWithModifierCustomError(reserveVault as any, reserveVault.getFund(0), 'InvalidFundId');

            await expectRevertWithModifierCustomError(reserveVault as any, reserveVault.getFund(3), 'InvalidFundId');
        });
    });

    describe('1.8.4. isFundSufficient(uint256)', async () => {
        it('1.8.4.1. Return false with unprovided fund', async () => {
            const { reserveVault } = await beforeReserveVaultTest({
                authorizeProviders: true,
                listFunds: true,
            });

            expect(await reserveVault.isFundSufficient(1)).to.be.false;
        });

        it('1.8.4.2. Return true with provided fund', async () => {
            const { reserveVault } = await beforeReserveVaultTest({
                authorizeProviders: true,
                listFunds: true,
                provideFunds: true,
            });

            expect(await reserveVault.isFundSufficient(1)).to.be.true;
        });

        it('1.8.4.3. Revert with invalid fund id', async () => {
            const { reserveVault } = await beforeReserveVaultTest({
                authorizeProviders: true,
                listFunds: true,
            });

            await expectRevertWithModifierCustomError(
                reserveVault as any,
                reserveVault.isFundSufficient(0),
                'InvalidFundId'
            );

            await expectRevertWithModifierCustomError(
                reserveVault as any,
                reserveVault.isFundSufficient(3),
                'InvalidFundId'
            );
        });
    });

    /* --- Command --- */
    describe('1.8.5. openFund(address,uint256,address[],uint256[])', async () => {
        it('1.8.5.1. Open fund successfully', async () => {
            const { reserveVault, providers, currencies } = await beforeReserveVaultTest({
                authorizeProviders: true,
            });

            const provider = providers[0];

            // Tx1: Native main currency
            const params1: OpenFundParams = {
                mainCurrency: ethers.constants.AddressZero,
                mainDenomination: 100,
                extraCurrencies: [currencies[0].address, currencies[1].address, ethers.constants.AddressZero],
                extraDenominations: [200, 400, 800],
            };
            const tx1 = await getCallReserveVaultTx_OpenFund(reserveVault as any, provider, params1);
            await tx1.wait();

            const fundId1 = 1;

            await expect(tx1)
                .to.emit(reserveVault, 'NewFund')
                .withArgs(
                    fundId1,
                    provider.address,
                    params1.mainCurrency,
                    params1.mainDenomination,
                    params1.extraCurrencies,
                    params1.extraDenominations
                );

            expect(await reserveVault.fundNumber()).to.equal(1);

            const fund1 = await reserveVault.getFund(fundId1);
            expect(fund1.mainCurrency).to.equal(params1.mainCurrency);
            expect(fund1.mainDenomination).to.equal(params1.mainDenomination);
            expect(fund1.extraCurrencies).to.deep.equal(params1.extraCurrencies);
            expect(fund1.extraDenominations).to.deep.equal(params1.extraDenominations);
            expect(fund1.quantity).to.equal(0);
            expect(fund1.provider).to.equal(provider.address);
            expect(fund1.isSufficient).to.equal(false);

            // Tx2: ERC20 main currency
            const params2: OpenFundParams = {
                mainCurrency: currencies[0].address,
                mainDenomination: 1600,
                extraCurrencies: [currencies[1].address, currencies[2].address, ethers.constants.AddressZero],
                extraDenominations: [3200, 6400, 12800],
            };
            const tx2 = await getCallReserveVaultTx_OpenFund(reserveVault as any, provider, params2);
            await tx2.wait();

            const fundId2 = 2;

            await expect(tx2)
                .to.emit(reserveVault, 'NewFund')
                .withArgs(
                    fundId2,
                    provider.address,
                    params2.mainCurrency,
                    params2.mainDenomination,
                    params2.extraCurrencies,
                    params2.extraDenominations
                );

            expect(await reserveVault.fundNumber()).to.equal(2);

            const fund2 = await reserveVault.getFund(fundId2);
            expect(fund2.mainCurrency).to.equal(params2.mainCurrency);
            expect(fund2.mainDenomination).to.equal(params2.mainDenomination);
            expect(fund2.extraCurrencies).to.deep.equal(params2.extraCurrencies);
            expect(fund2.extraDenominations).to.deep.equal(params2.extraDenominations);
            expect(fund2.quantity).to.equal(0);
            expect(fund2.provider).to.equal(provider.address);
            expect(fund2.isSufficient).to.equal(false);
        });

        it('1.8.5.2. Open fund successfully with zero denomination main currency', async () => {
            const { reserveVault, providers, currencies } = await beforeReserveVaultTest({
                authorizeProviders: true,
            });

            const provider = providers[0];

            const params: OpenFundParams = {
                mainCurrency: currencies[0].address,
                mainDenomination: 0,
                extraCurrencies: [currencies[1].address, currencies[2].address, ethers.constants.AddressZero],
                extraDenominations: [100, 200, 400],
            };
            const tx = await getCallReserveVaultTx_OpenFund(reserveVault as any, provider, params);
            await tx.wait();

            const fundId = 1;

            await expect(tx)
                .to.emit(reserveVault, 'NewFund')
                .withArgs(
                    fundId,
                    provider.address,
                    params.mainCurrency,
                    params.mainDenomination,
                    params.extraCurrencies,
                    params.extraDenominations
                );

            expect(await reserveVault.fundNumber()).to.equal(1);

            const fund = await reserveVault.getFund(fundId);
            expect(fund.mainCurrency).to.equal(params.mainCurrency);
            expect(fund.mainDenomination).to.equal(params.mainDenomination);
            expect(fund.extraCurrencies).to.deep.equal(params.extraCurrencies);
            expect(fund.extraDenominations).to.deep.equal(params.extraDenominations);
            expect(fund.quantity).to.equal(0);
            expect(fund.provider).to.equal(provider.address);
            expect(fund.isSufficient).to.equal(false);
        });

        it('1.8.5.3. Open fund unsuccessfully when paused', async () => {
            const { reserveVault, providers, currencies } = await beforeReserveVaultTest({
                authorizeProviders: true,
                pause: true,
            });

            const provider = providers[0];

            await expect(
                getCallReserveVaultTx_OpenFund(reserveVault as any, provider, {
                    mainCurrency: currencies[0].address,
                    mainDenomination: 100,
                    extraCurrencies: [currencies[1].address, currencies[2].address, ethers.constants.AddressZero],
                    extraDenominations: [200, 400, 800],
                })
            ).to.be.revertedWith('Pausable: paused');
        });

        it('1.8.5.4. Open fund unsuccessfully by unauthorized account', async () => {
            const { deployer, reserveVault, currencies } = await beforeReserveVaultTest({
                authorizeProviders: true,
            });

            await expect(
                getReserveVaultTx_OpenFund(reserveVault as any, deployer, {
                    mainCurrency: currencies[0].address,
                    mainDenomination: 100,
                    extraCurrencies: [currencies[1].address, currencies[2].address, ethers.constants.AddressZero],
                    extraDenominations: [200, 400, 800],
                })
            ).to.be.revertedWithCustomError(reserveVault, 'Unauthorized');
        });

        it('1.8.5.5. Open fund unsuccessfully with invalid params length', async () => {
            const { reserveVault, providers, currencies } = await beforeReserveVaultTest({
                authorizeProviders: true,
            });

            const provider = providers[0];

            await expect(
                getCallReserveVaultTx_OpenFund(reserveVault as any, provider, {
                    mainCurrency: currencies[0].address,
                    mainDenomination: 100,
                    extraCurrencies: [currencies[1].address, currencies[2].address, ethers.constants.AddressZero],
                    extraDenominations: [200, 400, 800, 1600],
                })
            ).to.be.revertedWithCustomError(reserveVault, 'InvalidInput');
        });

        it('1.8.5.6. Open fund unsuccessfully with invalid main currency', async () => {
            const { reserveVault, providers, currencies } = await beforeReserveVaultTest({
                authorizeProviders: true,
            });

            const provider = providers[0];

            await expect(
                getCallReserveVaultTx_OpenFund(reserveVault as any, provider, {
                    mainCurrency: randomWallet().address,
                    mainDenomination: 100,
                    extraCurrencies: [currencies[1].address, currencies[2].address, ethers.constants.AddressZero],
                    extraDenominations: [200, 400, 800],
                })
            ).to.be.revertedWithCustomError(reserveVault, 'InvalidCurrency');
        });

        it('1.8.5.7. Open fund unsuccessfully with invalid sub currencies', async () => {
            const { reserveVault, providers, currencies } = await beforeReserveVaultTest({
                authorizeProviders: true,
            });

            const provider = providers[0];

            await expect(
                getCallReserveVaultTx_OpenFund(reserveVault as any, provider, {
                    mainCurrency: currencies[0].address,
                    mainDenomination: 100,
                    extraCurrencies: [currencies[1].address, currencies[2].address, randomWallet().address],
                    extraDenominations: [200, 400, 800],
                })
            ).to.be.revertedWithCustomError(reserveVault, 'InvalidCurrency');
        });

        it('1.8.5.8. Open fund unsuccessfully with zero denomination sub currencies', async () => {
            const { reserveVault, providers, currencies } = await beforeReserveVaultTest({
                authorizeProviders: true,
            });

            const provider = providers[0];

            await expect(
                getCallReserveVaultTx_OpenFund(reserveVault as any, provider, {
                    mainCurrency: currencies[0].address,
                    mainDenomination: 100,
                    extraCurrencies: [currencies[1].address, currencies[2].address, ethers.constants.AddressZero],
                    extraDenominations: [200, 400, 0],
                })
            ).to.be.revertedWithCustomError(reserveVault, 'InvalidDenomination');
        });
    });

    describe('1.8.6. expandFund(uint256,uint256)', async () => {
        it('1.8.6.1. Expand fund successfully', async () => {
            const { reserveVault, providers, deployer } = await beforeReserveVaultTest({
                authorizeProviders: true,
                listFunds: true,
                expandFunds: true,
            });

            const provider = providers[0];
            const fundId = 1;

            const deployerInitNativeBalance = await ethers.provider.getBalance(deployer.address);
            const initTotalQuantity = (await reserveVault.getFund(fundId)).quantity;

            const params1: ExpandFundParams = {
                fundId: BigNumber.from(fundId),
                quantity: BigNumber.from(2000),
            };
            const tx1 = await getCallReserveVaultTx_ExpandFund(reserveVault as any, provider, params1);
            const receipt1 = await tx1.wait();
            const gasFee1 = receipt1.gasUsed.mul(receipt1.effectiveGasPrice);

            await expect(tx1).to.emit(reserveVault, 'FundExpansion').withArgs(fundId, params1.quantity);

            const newFund1 = await reserveVault.getFund(fundId);
            expect(await ethers.provider.getBalance(deployer.address)).to.equal(deployerInitNativeBalance.sub(gasFee1));
            expect(newFund1.quantity).to.equal(initTotalQuantity.add(params1.quantity));

            const params2: ExpandFundParams = {
                fundId: BigNumber.from(fundId),
                quantity: BigNumber.from(3000),
            };
            const tx2 = await getCallReserveVaultTx_ExpandFund(reserveVault as any, provider, params2);
            const receipt2 = await tx2.wait();
            const gasFee2 = receipt2.gasUsed.mul(receipt2.effectiveGasPrice);
            await expect(tx2).to.emit(reserveVault, 'FundExpansion').withArgs(fundId, params2.quantity);

            const newFund2 = await reserveVault.getFund(fundId);
            expect(await ethers.provider.getBalance(deployer.address)).to.equal(
                deployerInitNativeBalance.sub(gasFee1).sub(gasFee2)
            );
            expect(newFund2.quantity).to.equal(initTotalQuantity.add(params1.quantity).add(params2.quantity));
        });

        it('1.8.6.2. Expand fund unsuccessfully with invalid fund id', async () => {
            const { reserveVault, providers } = await beforeReserveVaultTest({
                authorizeProviders: true,
                listFunds: true,
                expandFunds: true,
            });

            const provider = providers[0];
            const invalidFundIds = [0, 3];

            for (const invalidFundId of invalidFundIds) {
                await expect(
                    getCallReserveVaultTx_ExpandFund(reserveVault as any, provider, {
                        fundId: BigNumber.from(invalidFundId),
                        quantity: BigNumber.from(2000),
                    })
                ).to.be.revertedWithCustomError(reserveVault, 'InvalidFundId');
            }
        });

        it('1.8.6.3. Expand fund unsuccessfully when paused', async () => {
            const { reserveVault, providers } = await beforeReserveVaultTest({
                authorizeProviders: true,
                listFunds: true,
                expandFunds: true,
                pause: true,
            });

            await expect(
                getCallReserveVaultTx_ExpandFund(reserveVault as any, providers[0], {
                    fundId: BigNumber.from(1),
                    quantity: BigNumber.from(2000),
                })
            ).to.be.revertedWith('Pausable: paused');
        });

        it('1.8.6.4. Expand fund unsuccessfully by unauthorized account', async () => {
            const { reserveVault, providers } = await beforeReserveVaultTest({
                authorizeProviders: true,
                listFunds: true,
                expandFunds: true,
            });

            await expect(
                getCallReserveVaultTx_ExpandFund(reserveVault as any, providers[1], {
                    fundId: BigNumber.from(1),
                    quantity: BigNumber.from(2000),
                })
            ).to.be.revertedWithCustomError(reserveVault, 'Unauthorized');
        });

        it('1.8.6.5. Expand fund unsuccessfully with already provided fund', async () => {
            const { reserveVault, providers } = await beforeReserveVaultTest({
                authorizeProviders: true,
                listFunds: true,
                expandFunds: true,
                provideFunds: true,
            });

            await expect(
                getCallReserveVaultTx_ExpandFund(reserveVault as any, providers[0], {
                    fundId: BigNumber.from(1),
                    quantity: BigNumber.from(2000),
                })
            ).to.be.revertedWithCustomError(reserveVault, 'AlreadyProvided');
        });
    });

    describe('1.8.7. provideFund(uint256)', async () => {
        it('1.8.7.1. Provide fund successfully with just enough native currency', async () => {
            const { reserveVault, providers, currencies, deployer } = await beforeReserveVaultTest({
                authorizeProviders: true,
                listFunds: true,
                expandFunds: true,
            });

            const provider = providers[0];

            const fundId = 1;
            const initTotalQuantity = (await reserveVault.getFund(fundId)).quantity;

            const currency0Denomination = 100;
            const currency1Denomination = 200;
            const nativeDenomination = 400;

            const deployerInitNativeBalance = await ethers.provider.getBalance(deployer.address);
            const providerInitNativeBalance = await ethers.provider.getBalance(provider.address);
            const providerInitCurrency0Balance = await currencies[0].balanceOf(provider.address);
            const providerInitCurrency1Balance = await currencies[1].balanceOf(provider.address);
            const providerInitCurrency2Balance = await currencies[2].balanceOf(provider.address);

            const params: ProvideFundParams = {
                fundId: BigNumber.from(fundId),
            };
            const tx = await getCallReserveVaultTx_ProvideFund(reserveVault as any, provider, params, {
                value: initTotalQuantity.mul(nativeDenomination),
            });
            const receipt = await tx.wait();
            const gasFee = receipt.gasUsed.mul(receipt.effectiveGasPrice);

            await expect(tx).to.emit(reserveVault, 'FundProvision').withArgs(fundId);

            expect(await ethers.provider.getBalance(deployer.address)).to.equal(
                deployerInitNativeBalance.sub(gasFee).sub(initTotalQuantity.mul(nativeDenomination))
            );
            expect(await ethers.provider.getBalance(provider.address)).to.equal(providerInitNativeBalance);
            expect(await currencies[0].balanceOf(provider.address)).to.equal(
                providerInitCurrency0Balance.sub(initTotalQuantity.mul(currency0Denomination))
            );
            expect(await currencies[1].balanceOf(provider.address)).to.equal(
                providerInitCurrency1Balance.sub(initTotalQuantity.mul(currency1Denomination))
            );
            expect(await currencies[2].balanceOf(provider.address)).to.equal(providerInitCurrency2Balance);

            const fund = await reserveVault.getFund(fundId);
            expect(fund.quantity).to.equal(initTotalQuantity);
            expect(fund.isSufficient).to.equal(true);
        });

        it('1.8.7.2. Provide fund successfully with excess native currency', async () => {
            const { reserveVault, providers, currencies, deployer } = await beforeReserveVaultTest({
                authorizeProviders: true,
                listFunds: true,
                expandFunds: true,
            });

            const provider = providers[0];

            const fundId = 1;
            const initTotalQuantity = (await reserveVault.getFund(fundId)).quantity;

            const currency0Denomination = 100;
            const currency1Denomination = 200;
            const nativeDenomination = 400;

            const deployerInitNativeBalance = await ethers.provider.getBalance(deployer.address);
            const providerInitNativeBalance = await ethers.provider.getBalance(provider.address);
            const providerInitCurrency0Balance = await currencies[0].balanceOf(provider.address);
            const providerInitCurrency1Balance = await currencies[1].balanceOf(provider.address);
            const providerInitCurrency2Balance = await currencies[2].balanceOf(provider.address);

            const params: ProvideFundParams = {
                fundId: BigNumber.from(fundId),
            };
            const tx = await getCallReserveVaultTx_ProvideFund(reserveVault as any, provider, params, {
                value: initTotalQuantity.mul(nativeDenomination).add(ethers.utils.parseEther('100')),
            });
            const receipt = await tx.wait();
            const gasFee = receipt.gasUsed.mul(receipt.effectiveGasPrice);

            await expect(tx).to.emit(reserveVault, 'FundProvision').withArgs(fundId);

            expect(await ethers.provider.getBalance(deployer.address)).to.equal(
                deployerInitNativeBalance
                    .sub(gasFee)
                    .sub(initTotalQuantity.mul(nativeDenomination))
                    .sub(ethers.utils.parseEther('100'))
            );
            expect(await ethers.provider.getBalance(provider.address)).to.equal(
                providerInitNativeBalance.add(ethers.utils.parseEther('100'))
            );
            expect(await currencies[0].balanceOf(provider.address)).to.equal(
                providerInitCurrency0Balance.sub(initTotalQuantity.mul(currency0Denomination))
            );
            expect(await currencies[1].balanceOf(provider.address)).to.equal(
                providerInitCurrency1Balance.sub(initTotalQuantity.mul(currency1Denomination))
            );
            expect(await currencies[2].balanceOf(provider.address)).to.equal(providerInitCurrency2Balance);

            const fund = await reserveVault.getFund(fundId);
            expect(fund.quantity).to.equal(initTotalQuantity);
            expect(fund.isSufficient).to.equal(true);
        });

        it('1.8.7.3. Provide fund unsuccessfully with invalid fund id', async () => {
            const { reserveVault, providers } = await beforeReserveVaultTest({
                authorizeProviders: true,
                listFunds: true,
                expandFunds: true,
            });

            await expect(
                getCallReserveVaultTx_ProvideFund(
                    reserveVault as any,
                    providers[0],
                    { fundId: BigNumber.from(0) },
                    { value: 0 }
                )
            ).to.be.revertedWithCustomError(reserveVault, 'InvalidFundId');

            await expect(
                getCallReserveVaultTx_ProvideFund(
                    reserveVault as any,
                    providers[0],
                    { fundId: BigNumber.from(3) },
                    { value: 0 }
                )
            ).to.be.revertedWithCustomError(reserveVault, 'InvalidFundId');
        });

        it('1.8.7.4. Provide fund unsuccessfully when paused', async () => {
            const { reserveVault, providers } = await beforeReserveVaultTest({
                authorizeProviders: true,
                listFunds: true,
                expandFunds: true,
                pause: true,
            });

            await expect(
                getCallReserveVaultTx_ProvideFund(
                    reserveVault as any,
                    providers[0],
                    { fundId: BigNumber.from(1) },
                    { value: 0 }
                )
            ).to.be.revertedWith('Pausable: paused');
        });

        it('1.8.7.5. Provide fund unsuccessfully by unauthorized account', async () => {
            const { reserveVault, providers } = await beforeReserveVaultTest({
                authorizeProviders: true,
                listFunds: true,
                expandFunds: true,
            });

            await expect(
                getCallReserveVaultTx_ProvideFund(
                    reserveVault as any,
                    providers[1],
                    { fundId: BigNumber.from(1) },
                    { value: 0 }
                )
            ).to.be.revertedWithCustomError(reserveVault, 'Unauthorized');
        });

        it('1.8.7.6. Provide fund unsuccessfully with already provided fund', async () => {
            const { reserveVault, providers } = await beforeReserveVaultTest({
                authorizeProviders: true,
                listFunds: true,
                expandFunds: true,
                provideFunds: true,
            });

            await expect(
                getCallReserveVaultTx_ProvideFund(
                    reserveVault as any,
                    providers[0],
                    { fundId: BigNumber.from(1) },
                    { value: 0 }
                )
            ).to.be.revertedWithCustomError(reserveVault, 'AlreadyProvided');
        });

        it('1.8.7.7. Provide fund unsuccessfully with insufficient native currency', async () => {
            const { reserveVault, providers } = await beforeReserveVaultTest({
                authorizeProviders: true,
                listFunds: true,
                expandFunds: true,
            });

            const initTotalQuantity = (await reserveVault.getFund(1)).quantity;
            const nativeDenomination = 400;

            await expect(
                getCallReserveVaultTx_ProvideFund(
                    reserveVault as any,
                    providers[0],
                    { fundId: BigNumber.from(1) },
                    { value: initTotalQuantity.mul(nativeDenomination).sub(1) }
                )
            ).to.be.revertedWithCustomError(reserveVault, 'InsufficientValue');
        });

        it('1.8.7.8. Provide fund unsuccessfully with insufficient ERC20 currencies', async () => {
            const { reserveVault, providers, deployer } = await beforeReserveVaultTest({
                authorizeProviders: true,
                skipFundForProvider: true,
                listFunds: true,
                expandFunds: true,
            });
            await prepareNativeToken(ethers.provider, deployer, providers, ethers.utils.parseEther('100'));

            const provider = providers[0];

            const fundId = 1;
            const initTotalQuantity = (await reserveVault.getFund(fundId)).quantity;
            const nativeDenomination = 400;

            await expect(
                getCallReserveVaultTx_ProvideFund(
                    reserveVault as any,
                    provider,
                    { fundId: BigNumber.from(fundId) },
                    { value: initTotalQuantity.mul(nativeDenomination) }
                )
            ).to.be.revertedWith('ERC20: insufficient allowance');
        });

        it('1.8.7.9. Provide fund unsuccessfully when refunding native currency failed', async () => {
            const { reserveVault, admins, deployer, admin, currencies } = await beforeReserveVaultTest({
                authorizeProviders: true,
                listFunds: true,
                expandFunds: true,
            });

            const failReceiver = await deployFailReceiver(deployer, false, false);

            await callTransaction(
                getReserveVaultTxByInput_AuthorizeProvider(
                    reserveVault as any,
                    deployer,
                    {
                        accounts: [failReceiver.address],
                        isProvider: true,
                    },
                    admin,
                    admins
                )
            );

            await callTransaction(
                getCallReserveVaultTx_OpenFund(reserveVault as any, failReceiver as any, {
                    mainCurrency: currencies[0].address,
                    mainDenomination: 100,
                    extraCurrencies: [currencies[1].address, ethers.constants.AddressZero],
                    extraDenominations: [200, 400],
                })
            );

            await prepareNativeToken(ethers.provider, deployer, [failReceiver], ethers.utils.parseEther('100'));

            await callTransaction(failReceiver.activate(true));

            const fundId = 2;
            const initTotalQuantity = (await reserveVault.getFund(fundId)).quantity;
            const nativeDenomination = 400;

            await expect(
                getCallReserveVaultTx_ProvideFund(
                    reserveVault as any,
                    failReceiver as any,
                    { fundId: BigNumber.from(fundId) },
                    { value: initTotalQuantity.mul(nativeDenomination).add(1) }
                )
            ).to.be.revertedWithCustomError(reserveVault, 'FailedRefund');
        });

        it('1.8.7.10. Provide fund unsuccessfully when the contract is reentered', async () => {
            const { reserveVault, providers, reentrancyERC20 } = await beforeReserveVaultTest({
                authorizeProviders: true,
                listFunds: true,
                expandFunds: true,
                includeReentrancyERC20: true,
            });

            const provider = providers[0];

            const fundId = 1;
            const initTotalQuantity = (await reserveVault.getFund(fundId)).quantity;
            const nativeDenomination = 400;

            const callData = reserveVault.interface.encodeFunctionData('provideFund', [fundId]);

            const proxyCallData = provider.interface.encodeFunctionData('call', [reserveVault.address, callData]);

            await callTransaction(reentrancyERC20.updateReentrancyPlan(provider.address, proxyCallData));

            await expect(
                provider.call(reserveVault.address, callData, {
                    value: initTotalQuantity.mul(nativeDenomination),
                })
            ).to.be.revertedWith('ReentrancyGuard: reentrant call');
        });
    });

    describe('1.8.8. withdrawFund(uint256,address,uint256)', async () => {
        it('1.8.8.1. Withdraw fund successfully', async () => {
            const { reserveVault, providers, currencies, deployer, withdrawer1, withdrawer2 } =
                await beforeReserveVaultTest({
                    authorizeProviders: true,
                    listFunds: true,
                    expandFunds: true,
                    provideFunds: true,
                });
            const provider = providers[0];

            const currency0Denomination = 100;
            const currency1Denomination = 200;
            const nativeDenomination = 400;

            const deployerInitNativeBalance = await ethers.provider.getBalance(deployer.address);
            const withdrawer1InitNativeBalance = await ethers.provider.getBalance(withdrawer1.address);
            const withdrawer1InitCurrency0Balance = await currencies[0].balanceOf(withdrawer1.address);
            const withdrawer1InitCurrency1Balance = await currencies[1].balanceOf(withdrawer1.address);
            const withdrawer1InitCurrency2Balance = await currencies[2].balanceOf(withdrawer1.address);
            const withdrawer2InitCurrency0Balance = await currencies[0].balanceOf(withdrawer2.address);
            const withdrawer2InitCurrency1Balance = await currencies[1].balanceOf(withdrawer2.address);
            const withdrawer2InitCurrency2Balance = await currencies[2].balanceOf(withdrawer2.address);
            const withdrawer2InitNativeBalance = await ethers.provider.getBalance(withdrawer2.address);

            const fundId = 1;
            const withdrawalQuantity1 = BigNumber.from(10);

            const params1: WithdrawFundParams = {
                fundId: BigNumber.from(fundId),
                receiver: withdrawer1.address,
                quantity: BigNumber.from(withdrawalQuantity1),
            };
            const tx1 = await getCallReserveVaultTx_WithdrawFund(reserveVault as any, provider, params1);
            const receipt1 = await tx1.wait();
            const gasFee1 = receipt1.gasUsed.mul(receipt1.effectiveGasPrice);

            await expect(tx1)
                .to.emit(reserveVault, 'FundWithdrawal')
                .withArgs(fundId, withdrawer1.address, withdrawalQuantity1);

            expect(await ethers.provider.getBalance(deployer.address)).to.equal(deployerInitNativeBalance.sub(gasFee1));
            expect(await ethers.provider.getBalance(withdrawer1.address)).to.equal(
                withdrawer1InitNativeBalance.add(withdrawalQuantity1.mul(nativeDenomination))
            );
            expect(await currencies[0].balanceOf(withdrawer1.address)).to.equal(
                withdrawer1InitCurrency0Balance.add(withdrawalQuantity1.mul(currency0Denomination))
            );
            expect(await currencies[1].balanceOf(withdrawer1.address)).to.equal(
                withdrawer1InitCurrency1Balance.add(withdrawalQuantity1.mul(currency1Denomination))
            );
            expect(await currencies[2].balanceOf(withdrawer1.address)).to.equal(withdrawer1InitCurrency2Balance);

            const withdrawalQuantity2 = BigNumber.from(20);
            const params2: WithdrawFundParams = {
                fundId: BigNumber.from(fundId),
                receiver: withdrawer2.address,
                quantity: BigNumber.from(withdrawalQuantity2),
            };
            const tx2 = await getCallReserveVaultTx_WithdrawFund(reserveVault as any, provider, params2);
            const receipt2 = await tx2.wait();
            const gasFee2 = receipt2.gasUsed.mul(receipt2.effectiveGasPrice);

            await expect(tx2)
                .to.emit(reserveVault, 'FundWithdrawal')
                .withArgs(fundId, withdrawer2.address, withdrawalQuantity2);

            expect(await ethers.provider.getBalance(deployer.address)).to.equal(
                deployerInitNativeBalance.sub(gasFee1).sub(gasFee2)
            );
            expect(await ethers.provider.getBalance(withdrawer2.address)).to.equal(
                withdrawer2InitNativeBalance.add(withdrawalQuantity2.mul(nativeDenomination))
            );
            expect(await currencies[0].balanceOf(withdrawer2.address)).to.equal(
                withdrawer2InitCurrency0Balance.add(withdrawalQuantity2.mul(currency0Denomination))
            );
            expect(await currencies[1].balanceOf(withdrawer2.address)).to.equal(
                withdrawer2InitCurrency1Balance.add(withdrawalQuantity2.mul(currency1Denomination))
            );
            expect(await currencies[2].balanceOf(withdrawer2.address)).to.equal(withdrawer2InitCurrency2Balance);
        });

        it('1.8.8.2. Withdraw fund unsuccessfully with invalid fund id', async () => {
            const { reserveVault, providers, withdrawer1 } = await beforeReserveVaultTest({
                authorizeProviders: true,
                listFunds: true,
                expandFunds: true,
                provideFunds: true,
            });

            await expect(
                getCallReserveVaultTx_WithdrawFund(reserveVault as any, providers[0], {
                    fundId: BigNumber.from(3),
                    receiver: withdrawer1.address,
                    quantity: BigNumber.from(10),
                })
            ).to.be.revertedWithCustomError(reserveVault, 'InvalidFundId');
        });

        it('1.8.8.3. Withdraw fund unsuccessfully when paused', async () => {
            const { reserveVault, providers, withdrawer1 } = await beforeReserveVaultTest({
                authorizeProviders: true,
                listFunds: true,
                expandFunds: true,
                provideFunds: true,
                pause: true,
            });

            await expect(
                getCallReserveVaultTx_WithdrawFund(reserveVault as any, providers[0], {
                    fundId: BigNumber.from(1),
                    receiver: withdrawer1.address,
                    quantity: BigNumber.from(10),
                })
            ).to.be.revertedWith('Pausable: paused');
        });

        it('1.8.8.4. Withdraw fund unsuccessfully by unauthorized account', async () => {
            const { reserveVault, providers, withdrawer1 } = await beforeReserveVaultTest({
                authorizeProviders: true,
                listFunds: true,
                expandFunds: true,
                provideFunds: true,
            });

            await expect(
                getCallReserveVaultTx_WithdrawFund(reserveVault as any, providers[1], {
                    fundId: BigNumber.from(1),
                    receiver: withdrawer1.address,
                    quantity: BigNumber.from(10),
                })
            ).to.be.revertedWithCustomError(reserveVault, 'Unauthorized');
        });

        it('1.8.8.5. Withdraw fund unsuccessfully with unprovided fund', async () => {
            const { reserveVault, providers, withdrawer1 } = await beforeReserveVaultTest({
                authorizeProviders: true,
                listFunds: true,
                expandFunds: true,
            });

            await expect(
                getCallReserveVaultTx_WithdrawFund(reserveVault as any, providers[0], {
                    fundId: BigNumber.from(1),
                    receiver: withdrawer1.address,
                    quantity: BigNumber.from(10),
                })
            ).to.be.revertedWithCustomError(reserveVault, 'InsufficientFunds');
        });

        it('1.8.8.6. Withdraw fund unsuccessfully when withdrawing quantity exceed fund quantity', async () => {
            const { reserveVault, providers, withdrawer1 } = await beforeReserveVaultTest({
                authorizeProviders: true,
                listFunds: true,
                expandFunds: true,
                provideFunds: true,
            });

            const fundId = 1;
            await expect(
                getCallReserveVaultTx_WithdrawFund(reserveVault as any, providers[0], {
                    fundId: BigNumber.from(fundId),
                    receiver: withdrawer1.address,
                    quantity: (await reserveVault.getFund(fundId)).quantity.add(100),
                })
            ).to.be.revertedWithCustomError(reserveVault, 'InsufficientFunds');
        });

        it('1.8.8.7. Withdraw fund unsuccessfully when the contract is reentered', async () => {
            const { reserveVault, providers, withdrawer1, reentrancyERC20 } = await beforeReserveVaultTest({
                authorizeProviders: true,
                listFunds: true,
                expandFunds: true,
                provideFunds: true,
                includeReentrancyERC20: true,
            });

            const provider = providers[0];

            const fundId = 1;

            const withdrawalQuantity = BigNumber.from(10);

            const callData = reserveVault.interface.encodeFunctionData('withdrawFund', [
                fundId,
                withdrawer1.address,
                withdrawalQuantity,
            ]);

            const proxyCallData = provider.interface.encodeFunctionData('call', [reserveVault.address, callData]);

            await callTransaction(reentrancyERC20.updateReentrancyPlan(provider.address, proxyCallData));
            await expect(provider.call(reserveVault.address, callData)).to.be.revertedWith(
                'ReentrancyGuard: reentrant call'
            );
        });
    });
});
