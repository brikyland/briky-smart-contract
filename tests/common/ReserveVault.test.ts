import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import {
    Admin,
    Currency,
    ReserveVault,
    ReserveVault__factory,
    MockProvider,
} from '@typechain-types';
import { callTransaction, getSignatures, prepareERC20, prepareNativeToken } from '@utils/blockchain';
import { Constant } from '@tests/test.constant';
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployCurrency } from '@utils/deployments/common/currency';
import { deployReentrancyERC20 } from '@utils/deployments/mocks/mockReentrancy/reentrancyERC20';
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { randomWallet } from '@utils/blockchain';
import { MockContract, smock } from '@defi-wonderland/smock';

import { callAdmin_UpdateCurrencyRegistries } from '@utils/callWithSignatures/admin';
import { BigNumber } from 'ethers';
import { callReserveVault_AuthorizeProvider, callReserveVault_Pause } from '@utils/callWithSignatures/reserveVault';
import { deployMockProvider } from '@utils/deployments/mocks/mockProvider';
import { deployFailReceiver } from '@utils/deployments/mocks/failReceiver';

interface ReserveVaultFixture {
    admin: Admin;
    reserveVault: MockContract<ReserveVault>;
    providers: MockProvider[];
    currencies: Currency[];
    reentrancyERC20: any;

    deployer: any;
    admins: any[];
    funder1: any;
    funder2: any;
    withdrawer1: any;
    withdrawer2: any;
}

describe('1.8. ReserveVault', async () => {
    async function reserveVaultFixture(): Promise<ReserveVaultFixture> {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        const admins = [];
        for (let i = 1; i <= Constant.ADMIN_NUMBER; ++i) admins.push(accounts[i]);
        const funder1 = accounts[Constant.ADMIN_NUMBER + 1];
        const funder2 = accounts[Constant.ADMIN_NUMBER + 2];
        const withdrawer1 = accounts[Constant.ADMIN_NUMBER + 3];
        const withdrawer2 = accounts[Constant.ADMIN_NUMBER + 4];
        
        const adminAddresses: string[] = admins.map(signer => signer.address);
        const admin = await deployAdmin(
            deployer.address,
            adminAddresses[0],
            adminAddresses[1],
            adminAddresses[2],
            adminAddresses[3],
            adminAddresses[4],
        ) as Admin;

        const provider1 = await deployMockProvider(deployer) as MockProvider;
        const provider2 = await deployMockProvider(deployer) as MockProvider;
        const provider3 = await deployMockProvider(deployer) as MockProvider;
        const providers = [provider1, provider2, provider3];

        const currency1 = await deployCurrency(deployer.address, 'MockCurrency1', 'MCK1') as Currency;
        const currency2 = await deployCurrency(deployer.address, 'MockCurrency2', 'MCK2') as Currency;
        const currency3 = await deployCurrency(deployer.address, 'MockCurrency3', 'MCK3') as Currency;
        const currency4 = await deployCurrency(deployer.address, 'MockCurrency4', 'MCK4') as Currency;
        const currencies = [currency1, currency2, currency3, currency4];

        const reentrancyERC20 = await deployReentrancyERC20(deployer); 

        const SmockReserveVaultFactory = await smock.mock<ReserveVault__factory>('ReserveVault');
        const reserveVault = await SmockReserveVaultFactory.deploy();
        await callTransaction(reserveVault.initialize(
            admin.address,
        ));

        return {
            admin,
            reserveVault,
            providers,
            currencies,
            deployer,
            admins,
            funder1,
            funder2,
            withdrawer1,
            withdrawer2,
            reentrancyERC20,
        };
    };

    async function beforeReserveVaultTest({
        listSampleCurrencies = false,
        authorizeProviders = false,
        listSampleFunds = false,
        listSampleDeposits = false,
        includeReentrancyERC20 = false,
        fundProvider = false,
        provideFunds = false,
        pause = false,
    } = {}): Promise<ReserveVaultFixture> {
        const fixture = await loadFixture(reserveVaultFixture);
        const { deployer, admin, admins, reserveVault, providers, currencies, reentrancyERC20 } = fixture;

        if (authorizeProviders) {
            await callReserveVault_AuthorizeProvider(
                reserveVault,
                admins,
                providers.map(x => x.address),
                true,
                await admin.nonce(),
            )
        }

        if (listSampleCurrencies) {
            const currencyAddresses = [
                ethers.constants.AddressZero,
                ...currencies.map(x => x.address),
            ];
            if (includeReentrancyERC20) {
                currencyAddresses.push(reentrancyERC20.address);
            }

            await callAdmin_UpdateCurrencyRegistries(
                admin,
                admins,
                currencyAddresses,
                currencyAddresses.map(_ => true),
                currencyAddresses.map(_ => false),
                await admin.nonce(),
            )
        }

        if (listSampleFunds) {
            const mainCurrency = currencies[0].address;
            const mainDenomination = 100
            const extraCurrencies = [currencies[1].address, ethers.constants.AddressZero];
            const extraDenominations = [200, 400];
            if (includeReentrancyERC20) {
                extraCurrencies.push(reentrancyERC20.address);
                extraDenominations.push(300);
            }
            await callTransaction(providers[0].call(
                reserveVault.address,
                reserveVault.interface.encodeFunctionData(
                    'openFund',
                    [
                        mainCurrency,
                        mainDenomination,
                        extraCurrencies,
                        extraDenominations,
                    ]
                )
            ));
        }

        if (listSampleDeposits) {
            const quantity = 1000;
            await callTransaction(providers[0].call(
                reserveVault.address,
                reserveVault.interface.encodeFunctionData(
                    'expandFund',
                    [
                        1,
                        quantity,
                    ]
                )
            ));
        }

        if (fundProvider) {            
            await prepareNativeToken(
                ethers.provider,
                deployer,
                providers,
                ethers.utils.parseEther('100')
            );
            for (const currency of currencies) {
                await prepareERC20(
                    currency,
                    providers,
                    [reserveVault as any],
                    ethers.utils.parseEther('100')
                );
            }
        }

        if (provideFunds) {
            const initTotalQuantity = (await reserveVault.getFund(1)).totalQuantity;
            const nativeDenomination = 400;
            await callTransaction(providers[0].call(
                reserveVault.address,
                reserveVault.interface.encodeFunctionData(
                    'provideFund',
                    [1]
                ),
                { value : initTotalQuantity.mul(nativeDenomination) }
            ));
        }

        if (pause) {
            await callReserveVault_Pause(
                reserveVault,
                admins,
                await admin.nonce(),
            )
        }

        return {
            ...fixture,
        }
    }

    describe('1.8.1. initialize(address, address, address)', async () => {
        it('1.8.1.1. Deploy successfully', async () => {
            const { admin, reserveVault } = await beforeReserveVaultTest();

            expect(await reserveVault.admin()).to.equal(admin.address);

            expect(await reserveVault.fundNumber()).to.equal(0);
        });
    });

    describe('1.8.2. authorizeProvider(address[], bool, bytes[])', async () => {
        it('1.8.2.1. Authorize providers successfully with valid signatures', async () => {
            const { reserveVault, admin, admins, providers } = await beforeReserveVaultTest();

            const toBeProviders = providers.slice(0, 2);

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [reserveVault.address, 'authorizeProvider', toBeProviders.map(x => x.address), true]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await reserveVault.authorizeProvider(
                toBeProviders.map(x => x.address),
                true,
                signatures
            );
            await tx.wait();

            for (const provider of toBeProviders) {
                await expect(tx).to
                    .emit(reserveVault, 'ProviderAuthorization')
                    .withArgs(provider.address);
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

        it('1.8.2.2. Authorize provider unsuccessfully with invalid signatures', async () => {
            const { reserveVault, admin, admins, providers } = await beforeReserveVaultTest();

            const toBeProviders = providers.slice(0, 2);

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [reserveVault.address, 'authorizeProvider', toBeProviders.map(x => x.address), true]
            );
            const invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(reserveVault.authorizeProvider(
                toBeProviders.map(x => x.address),
                true,
                invalidSignatures
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('1.8.2.3. Authorize provider unsuccessfully when authorizing same account twice on same tx', async () => {
            const { reserveVault, admin, admins, providers } = await beforeReserveVaultTest();

            const toBeProviders = [providers[0], providers[1], providers[2], providers[0]];

            let message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [reserveVault.address, 'authorizeProvider', toBeProviders.map(x => x.address), true]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(reserveVault.authorizeProvider(
                toBeProviders.map(x => x.address),
                true,
                signatures
            )).to.be.revertedWithCustomError(reserveVault, `AuthorizedAccount`);
        });

        it('1.8.2.4. Authorize provider unsuccessfully when authorizing same account twice on different tx', async () => {
            const { reserveVault, admin, admins, providers } = await beforeReserveVaultTest();

            const tx1Providers = providers.slice(0, 2);

            let message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [reserveVault.address, 'authorizeProvider', tx1Providers.map(x => x.address), true]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            await callTransaction(reserveVault.authorizeProvider(
                tx1Providers.map(x => x.address),
                true,
                signatures
            ));

            const tx2Providers = [providers[2], providers[1]];

            message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [reserveVault.address, 'authorizeProvider', tx2Providers.map(x => x.address), true]
            );
            signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(reserveVault.authorizeProvider(
                tx2Providers.map(x => x.address),
                true,
                signatures
            )).to.be.revertedWithCustomError(reserveVault, `AuthorizedAccount`);
        })

        it('1.8.2.5. Deauthorize provider successfully', async () => {
            const { reserveVault, admin, admins, providers } = await beforeReserveVaultTest({
                authorizeProviders: true,
            });

            const toDeauth = providers.slice(0, 2);

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [reserveVault.address, 'authorizeProvider', toDeauth.map(x => x.address), false]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await reserveVault.authorizeProvider(
                toDeauth.map(x => x.address),
                false,
                signatures
            );
            await tx.wait();

            for (const provider of toDeauth) {
                await expect(tx).to
                    .emit(reserveVault, 'ProviderDeauthorization')
                    .withArgs(provider.address);
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

        it('1.8.2.6. Deauthorize provider unsuccessfully with unauthorized account', async () => {
            const { reserveVault, admin, admins, providers } = await beforeReserveVaultTest({
                authorizeProviders: true,
            });

            const account = randomWallet();
            const toDeauth = [providers[0], account];

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [reserveVault.address, 'authorizeProvider', toDeauth.map(x => x.address), false]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(reserveVault.authorizeProvider(
                toDeauth.map(x => x.address),
                false,
                signatures
            )).to.be.revertedWithCustomError(reserveVault, `NotAuthorizedAccount`)
        });

        it('1.8.2.7. Deauthorize provider unsuccessfully when unauthorizing same accounts twice on same tx', async () => {
            const { reserveVault, admin, admins, providers } = await beforeReserveVaultTest({
                authorizeProviders: true,
            });

            const toDeauth = [providers[0], providers[1], providers[0]];

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [reserveVault.address, 'authorizeProvider', toDeauth.map(x => x.address), false]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(reserveVault.authorizeProvider(
                toDeauth.map(x => x.address),
                false,
                signatures
            )).to.be.revertedWithCustomError(reserveVault, `NotAuthorizedAccount`)
        });

        it('1.8.2.8. Deauthorize provider unsuccessfully when unauthorizing same accounts twice on different tx', async () => {
            const { reserveVault, admin, admins, providers } = await beforeReserveVaultTest({
                authorizeProviders: true,
            });

            const tx1Providers = [providers[0], providers[1]];

            await callReserveVault_AuthorizeProvider(
                reserveVault,
                admins,
                tx1Providers.map(x => x.address),
                false,
                await admin.nonce()
            );

            const tx2Providers = [providers[2], providers[1]];

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [reserveVault.address, 'authorizeProvider', tx2Providers.map(x => x.address), false]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(reserveVault.authorizeProvider(
                tx2Providers.map(x => x.address),
                false,
                signatures
            )).to.be.revertedWithCustomError(reserveVault, `NotAuthorizedAccount`)
        });
    });

    describe('1.8.3. openFund(address, uint256, address[], uint256[])', async () => {
        it('1.8.3.1. initiate fund successfully', async () => {
            const { reserveVault, providers, currencies } = await beforeReserveVaultTest({
                authorizeProviders: true,
                listSampleCurrencies: true,
            });

            const provider = providers[0];

            // Tx1: Native main currency
            const mainCurrencyAddress1 = ethers.constants.AddressZero;
            const mainDenomination1 = 100;
            const subCurrencyAddresses1 = [currencies[0].address, currencies[1].address, ethers.constants.AddressZero];
            const subDenominations1 = [200, 400, 800];

            const callData1 = reserveVault.interface.encodeFunctionData(
                'openFund',
                [
                    mainCurrencyAddress1,
                    mainDenomination1,
                    subCurrencyAddresses1,
                    subDenominations1,
                ]
            );
            const tx1 = await provider.call(reserveVault.address, callData1);
            await tx1.wait();

            const fundId1 = 1;

            await expect(tx1).to
                .emit(reserveVault, 'NewFund')
                .withArgs(
                    fundId1,
                    provider.address,
                    mainCurrencyAddress1,
                    mainDenomination1,
                    subCurrencyAddresses1,
                    subDenominations1,
                );

            expect(await reserveVault.fundNumber()).to.equal(1);

            const fund1 = await reserveVault.getFund(fundId1);
            expect(fund1.mainCurrency).to.equal(mainCurrencyAddress1);
            expect(fund1.mainDenomination).to.equal(mainDenomination1);
            expect(fund1.extraCurrencies).to.deep.equal(subCurrencyAddresses1);
            expect(fund1.extraDenominations).to.deep.equal(subDenominations1);
            expect(fund1.totalQuantity).to.equal(0);
            expect(fund1.provider).to.equal(provider.address);
            expect(fund1.isSufficient).to.equal(false);

            // Tx2: ERC20 main currency

            const mainCurrencyAddress2 = currencies[0].address;
            const mainDenomination2 = 1600;
            const subCurrencyAddresses2 = [currencies[1].address, currencies[2].address, ethers.constants.AddressZero];
            const subDenominations2 = [3200, 6400, 12800];

            const callData2 = reserveVault.interface.encodeFunctionData(
                'openFund',
                [
                    mainCurrencyAddress2,
                    mainDenomination2,
                    subCurrencyAddresses2,
                    subDenominations2,
                ]
            );
            const tx2 = await provider.call(reserveVault.address, callData2);
            await tx2.wait();

            const fundId2 = 2;

            await expect(tx2).to
                .emit(reserveVault, 'NewFund')
                .withArgs(
                    fundId2,
                    provider.address,
                    mainCurrencyAddress2,
                    mainDenomination2,
                    subCurrencyAddresses2,
                    subDenominations2,
                );

            expect(await reserveVault.fundNumber()).to.equal(2);

            const fund2 = await reserveVault.getFund(fundId2);
            expect(fund2.mainCurrency).to.equal(mainCurrencyAddress2);
            expect(fund2.mainDenomination).to.equal(mainDenomination2);
            expect(fund2.extraCurrencies).to.deep.equal(subCurrencyAddresses2);
            expect(fund2.extraDenominations).to.deep.equal(subDenominations2);
            expect(fund2.totalQuantity).to.equal(0);
            expect(fund2.provider).to.equal(provider.address);
            expect(fund2.isSufficient).to.equal(false);
        });

        it('1.8.3.2. initiate fund successfully with zero denomination main currency', async () => {
            const { reserveVault, providers, currencies } = await beforeReserveVaultTest({
                authorizeProviders: true,
                listSampleCurrencies: true,
            });

            const provider = providers[0];

            const mainCurrencyAddress = currencies[0].address;
            const mainDenomination = 0;
            const subCurrencyAddresses = [currencies[1].address, currencies[2].address, ethers.constants.AddressZero];
            const subDenominations = [100, 200, 400];

            const callData = reserveVault.interface.encodeFunctionData(
                'openFund',
                [
                    mainCurrencyAddress,
                    mainDenomination,
                    subCurrencyAddresses,
                    subDenominations,
                ]
            );
            const tx = await provider.call(reserveVault.address, callData);
            await tx.wait();
            
            const fundId = 1;

            await expect(tx).to
                .emit(reserveVault, 'NewFund')
                .withArgs(
                    fundId,
                    provider.address,
                    mainCurrencyAddress,
                    mainDenomination,
                    subCurrencyAddresses,
                    subDenominations,
                );

            expect(await reserveVault.fundNumber()).to.equal(1);

            const fund = await reserveVault.getFund(fundId);
            expect(fund.mainCurrency).to.equal(mainCurrencyAddress);
            expect(fund.mainDenomination).to.equal(mainDenomination);
            expect(fund.extraCurrencies).to.deep.equal(subCurrencyAddresses);
            expect(fund.extraDenominations).to.deep.equal(subDenominations);
            expect(fund.totalQuantity).to.equal(0);
            expect(fund.provider).to.equal(provider.address);
            expect(fund.isSufficient).to.equal(false);
        });

        it('1.8.3.3. initiate fund unsuccessfully when paused', async () => {
            const { reserveVault, providers, currencies } = await beforeReserveVaultTest({
                authorizeProviders: true,
                listSampleCurrencies: true,
                pause: true,
            });

            const provider = providers[0];

            const mainCurrencyAddress = currencies[0].address;
            const mainDenomination = 100;
            const subCurrencyAddresses = [currencies[1].address, currencies[2].address, ethers.constants.AddressZero];
            const subDenominations = [200, 400, 800];

            const callData = reserveVault.interface.encodeFunctionData(
                'openFund',
                [
                    mainCurrencyAddress,
                    mainDenomination,
                    subCurrencyAddresses,
                    subDenominations,
                ]
            );
            await expect(provider.call(reserveVault.address, callData))
                .to.be.revertedWith('Pausable: paused');
        });

        it('1.8.3.4. initiate fund unsuccessfully by unauthorized account', async () => {
            const { reserveVault, currencies } = await beforeReserveVaultTest({
                authorizeProviders: true,
                listSampleCurrencies: true,
            });

            const mainCurrencyAddress = currencies[0].address;
            const mainDenomination = 100;
            const subCurrencyAddresses = [currencies[1].address, currencies[2].address, ethers.constants.AddressZero];
            const subDenominations = [200, 400, 800];

            await expect(reserveVault.openFund(
                mainCurrencyAddress,
                mainDenomination,
                subCurrencyAddresses,
                subDenominations,
            )).to.be.revertedWithCustomError(reserveVault, 'Unauthorized');
        });

        it('1.8.3.5. initiate fund unsuccessfully with invalid params length', async () => {
            const { reserveVault, providers, currencies } = await beforeReserveVaultTest({
                authorizeProviders: true,
                listSampleCurrencies: true,
            });

            const provider = providers[0];

            const mainCurrencyAddress = currencies[0].address;
            const mainDenomination = 100;
            const subCurrencyAddresses = [currencies[1].address, currencies[2].address, ethers.constants.AddressZero];
            const subDenominations = [200, 400];
            
            const callData = reserveVault.interface.encodeFunctionData(
                'openFund',
                [
                    mainCurrencyAddress,
                    mainDenomination,
                    subCurrencyAddresses,
                    subDenominations,
                ]
            );
            await expect(provider.call(reserveVault.address, callData))
                .to.be.revertedWithCustomError(reserveVault, 'InvalidInput');
        });

        it('1.8.3.6. initiate fund unsuccessfully with invalid main currency', async () => {
            const { reserveVault, providers, currencies } = await beforeReserveVaultTest({
                authorizeProviders: true,
                listSampleCurrencies: true,
            });

            const provider = providers[0];
            
            const mainCurrencyAddress = randomWallet().address;
            const mainDenomination = 100;
            const subCurrencyAddresses = [currencies[1].address, currencies[2].address, ethers.constants.AddressZero];
            const subDenominations = [200, 400, 800];

            const callData = reserveVault.interface.encodeFunctionData(
                'openFund',
                [
                    mainCurrencyAddress,
                    mainDenomination,
                    subCurrencyAddresses,
                    subDenominations,
                ]
            );
            await expect(provider.call(reserveVault.address, callData))
                .to.be.revertedWithCustomError(reserveVault, 'InvalidCurrency');
        });

        it('1.8.3.7. initiate fund unsuccessfully with invalid sub currencies', async () => {
            const { reserveVault, providers, currencies } = await beforeReserveVaultTest({
                authorizeProviders: true,
                listSampleCurrencies: true,
            });

            const provider = providers[0];
            
            const mainCurrencyAddress = currencies[0].address;
            const mainDenomination = 100;
            const subCurrencyAddresses = [currencies[1].address, currencies[2].address, randomWallet().address];
            const subDenominations = [200, 400, 800];

            const callData = reserveVault.interface.encodeFunctionData(
                'openFund',
                [
                    mainCurrencyAddress,
                    mainDenomination,
                    subCurrencyAddresses,
                    subDenominations,
                ]
            );
            await expect(provider.call(reserveVault.address, callData))
                .to.be.revertedWithCustomError(reserveVault, 'InvalidCurrency');
        });

        it('1.8.3.8. initiate fund unsuccessfully with zero denomination sub currencies', async () => {
            const { reserveVault, providers, currencies } = await beforeReserveVaultTest({
                authorizeProviders: true,
                listSampleCurrencies: true,
            });

            const provider = providers[0];
            
            const mainCurrencyAddress = currencies[0].address;
            const mainDenomination = 100;
            const subCurrencyAddresses = [currencies[1].address, currencies[2].address, ethers.constants.AddressZero];
            const subDenominations = [200, 400, 0];

            const callData = reserveVault.interface.encodeFunctionData(
                'openFund',
                [
                    mainCurrencyAddress,
                    mainDenomination,
                    subCurrencyAddresses,
                    subDenominations,
                ]
            );
            await expect(provider.call(reserveVault.address, callData))
                .to.be.revertedWithCustomError(reserveVault, 'InvalidDenomination');
        });
    });

    describe('1.8.4. expandFund(uint256, uint256)', async () => {
        it('1.8.4.1. expand fund successfully', async () => {
            const { reserveVault, providers, currencies, deployer } = await beforeReserveVaultTest({
                authorizeProviders: true,
                listSampleCurrencies: true,
                listSampleFunds: true,
                listSampleDeposits: true,
                fundProvider: true,
            });

            const provider = providers[0];
            const fundId = 1;

            const deployerInitNativeBalance = await ethers.provider.getBalance(deployer.address);
            const initTotalQuantity = (await reserveVault.getFund(fundId)).totalQuantity;
            const expansionQuantity1 = 2000;
            const expansionQuantity2 = 3000;
            const callData1 = reserveVault.interface.encodeFunctionData(
                'expandFund',
                [
                    fundId,
                    expansionQuantity1,
                ]
            );
            const tx1 = await provider.call(reserveVault.address, callData1);
            const receipt1 = await tx1.wait();
            const gasFee1 = receipt1.gasUsed.mul(receipt1.effectiveGasPrice);

            await expect(tx1).to
                .emit(reserveVault, 'FundExpansion')
                .withArgs(fundId, expansionQuantity1);

            const newFund1 = await reserveVault.getFund(fundId);
            expect(await ethers.provider.getBalance(deployer.address)).to.equal(deployerInitNativeBalance.sub(gasFee1));
            expect(newFund1.totalQuantity).to.equal(initTotalQuantity.add(expansionQuantity1));

            const callData2 = reserveVault.interface.encodeFunctionData(
                'expandFund',
                [
                    fundId,
                    expansionQuantity2,
                ]
            );
            const tx2 = await provider.call(reserveVault.address, callData2);
            const receipt2 = await tx2.wait();
            const gasFee2 = receipt2.gasUsed.mul(receipt2.effectiveGasPrice);
            await expect(tx2).to
                .emit(reserveVault, 'FundExpansion')
                .withArgs(fundId, expansionQuantity2);

            const newFund2 = await reserveVault.getFund(fundId);
            expect(await ethers.provider.getBalance(deployer.address)).to.equal(deployerInitNativeBalance.sub(gasFee1).sub(gasFee2));
            expect(newFund2.totalQuantity).to.equal(initTotalQuantity.add(expansionQuantity1).add(expansionQuantity2));
        });

        it('1.8.4.2. expand fund unsuccessfully with invalid fund id', async () => {
            const { reserveVault, providers, currencies, deployer } = await beforeReserveVaultTest({
                authorizeProviders: true,
                listSampleCurrencies: true,
                listSampleFunds: true,
                listSampleDeposits: true,
                fundProvider: true,
            });

            const provider = providers[0];
            const invalidFundIds = [0, 3];

            for (const invalidFundId of invalidFundIds) {
                const expansionQuantity = 2000;
                const callData = reserveVault.interface.encodeFunctionData(
                    'expandFund',
                    [
                        invalidFundId,
                        expansionQuantity,
                    ]
                );
                await expect(provider.call(reserveVault.address, callData))
                    .to.be.revertedWithCustomError(reserveVault, 'InvalidFundId');
            }
        });

        it('1.8.4.3. expand fund unsuccessfully when paused', async () => {
            const { reserveVault, providers, currencies, deployer } = await beforeReserveVaultTest({
                authorizeProviders: true,
                listSampleCurrencies: true,
                listSampleFunds: true,
                listSampleDeposits: true,
                fundProvider: true,
                pause: true,
            });

            const provider = providers[0];
            const fundId = 1;
            const expansionQuantity = 2000;
            const callData = reserveVault.interface.encodeFunctionData(
                'expandFund',
                [
                    fundId,
                    expansionQuantity,
                ]
            );
            await expect(provider.call(reserveVault.address, callData))
                .to.be.revertedWith('Pausable: paused');
        });

        it('1.8.4.4. expand fund unsuccessfully by unauthorized account', async () => {
            const { reserveVault, providers, currencies, deployer } = await beforeReserveVaultTest({
                authorizeProviders: true,
                listSampleCurrencies: true,
                listSampleFunds: true,
                listSampleDeposits: true,
                fundProvider: true,
            });

            const provider = providers[1];
            const fundId = 1;
            const expansionQuantity = 2000;
            const callData = reserveVault.interface.encodeFunctionData(
                'expandFund',
                [
                    fundId,
                    expansionQuantity,
                ]
            );
            await expect(provider.call(reserveVault.address, callData))
                .to.be.revertedWithCustomError(reserveVault, 'Unauthorized');
        });

        it('1.8.4.5. expand fund unsuccessfully with already provided fund', async () => {
            const { reserveVault, providers } = await beforeReserveVaultTest({
                authorizeProviders: true,
                listSampleCurrencies: true,
                listSampleFunds: true,
                listSampleDeposits: true,
                fundProvider: true,
                provideFunds: true,
            });
            const provider = providers[0];
            const fundId = 1;
            const expansionQuantity = 2000;
            const callData = reserveVault.interface.encodeFunctionData(
                'expandFund',
                [
                    fundId,
                    expansionQuantity,
                ]
            );
            await expect(provider.call(reserveVault.address, callData))
                .to.be.revertedWithCustomError(reserveVault, 'AlreadyProvided');
        });
    });

    describe('1.8.5. provideFund(uint256)', async () => {
        it('1.8.5.1. provide fund successfully with just enough native currency', async () => {
            const { reserveVault, providers, currencies, deployer } = await beforeReserveVaultTest({
                authorizeProviders: true,
                listSampleCurrencies: true,
                listSampleFunds: true,
                listSampleDeposits: true,
                fundProvider: true,
            });

            const provider = providers[0];
            
            const fundId = 1;
            const initTotalQuantity = (await reserveVault.getFund(fundId)).totalQuantity;

            const currency0Denomination = 100;
            const currency1Denomination = 200;
            const nativeDenomination = 400;

            const deployerInitNativeBalance = await ethers.provider.getBalance(deployer.address);
            const providerInitNativeBalance = await ethers.provider.getBalance(provider.address);
            const providerInitCurrency0Balance = await currencies[0].balanceOf(provider.address);
            const providerInitCurrency1Balance = await currencies[1].balanceOf(provider.address);
            const providerInitCurrency2Balance = await currencies[2].balanceOf(provider.address);

            const callData = reserveVault.interface.encodeFunctionData(
                'provideFund',
                [fundId],
            );
            const tx = await provider.call(reserveVault.address, callData, { value: initTotalQuantity.mul(nativeDenomination) });
            const receipt = await tx.wait();
            const gasFee = receipt.gasUsed.mul(receipt.effectiveGasPrice);

            await expect(tx).to
                .emit(reserveVault, 'FundProvision')
                .withArgs(fundId);

            expect(await ethers.provider.getBalance(deployer.address)).to.equal(deployerInitNativeBalance.sub(gasFee).sub(initTotalQuantity.mul(nativeDenomination)));
            expect(await ethers.provider.getBalance(provider.address)).to.equal(providerInitNativeBalance);
            expect(await currencies[0].balanceOf(provider.address)).to.equal(providerInitCurrency0Balance.sub(initTotalQuantity.mul(currency0Denomination)));
            expect(await currencies[1].balanceOf(provider.address)).to.equal(providerInitCurrency1Balance.sub(initTotalQuantity.mul(currency1Denomination)));
            expect(await currencies[2].balanceOf(provider.address)).to.equal(providerInitCurrency2Balance);

            const fund = await reserveVault.getFund(fundId);
            expect(fund.totalQuantity).to.equal(initTotalQuantity);
            expect(fund.isSufficient).to.equal(true);
        });

        it('1.8.5.2. provide fund successfully with excess native currency', async () => {
            const { reserveVault, providers, currencies, deployer } = await beforeReserveVaultTest({
                authorizeProviders: true,
                listSampleCurrencies: true,
                listSampleFunds: true,
                listSampleDeposits: true,
                fundProvider: true,
            });

            const provider = providers[0];
            
            const fundId = 1;
            const initTotalQuantity = (await reserveVault.getFund(fundId)).totalQuantity;

            const currency0Denomination = 100;
            const currency1Denomination = 200;
            const nativeDenomination = 400;

            const deployerInitNativeBalance = await ethers.provider.getBalance(deployer.address);
            const providerInitNativeBalance = await ethers.provider.getBalance(provider.address);
            const providerInitCurrency0Balance = await currencies[0].balanceOf(provider.address);
            const providerInitCurrency1Balance = await currencies[1].balanceOf(provider.address);
            const providerInitCurrency2Balance = await currencies[2].balanceOf(provider.address);

            const callData = reserveVault.interface.encodeFunctionData(
                'provideFund',
                [fundId],
            );
            const tx = await provider.call(reserveVault.address, callData, { value: initTotalQuantity.mul(nativeDenomination).add(ethers.utils.parseEther('100')) });
            const receipt = await tx.wait();
            const gasFee = receipt.gasUsed.mul(receipt.effectiveGasPrice);

            await expect(tx).to
                .emit(reserveVault, 'FundProvision')
                .withArgs(fundId);

            expect(await ethers.provider.getBalance(deployer.address)).to.equal(deployerInitNativeBalance.sub(gasFee).sub(initTotalQuantity.mul(nativeDenomination)).sub(ethers.utils.parseEther('100')));
            expect(await ethers.provider.getBalance(provider.address)).to.equal(providerInitNativeBalance.add(ethers.utils.parseEther('100')));
            expect(await currencies[0].balanceOf(provider.address)).to.equal(providerInitCurrency0Balance.sub(initTotalQuantity.mul(currency0Denomination)));
            expect(await currencies[1].balanceOf(provider.address)).to.equal(providerInitCurrency1Balance.sub(initTotalQuantity.mul(currency1Denomination)));
            expect(await currencies[2].balanceOf(provider.address)).to.equal(providerInitCurrency2Balance);

            const fund = await reserveVault.getFund(fundId);
            expect(fund.totalQuantity).to.equal(initTotalQuantity);
            expect(fund.isSufficient).to.equal(true);
        });

        it('1.8.5.3. provide fund unsuccessfully with invalid fund id', async () => {
            const { reserveVault, providers} = await beforeReserveVaultTest({
                authorizeProviders: true,
                listSampleCurrencies: true,
                listSampleFunds: true,
                listSampleDeposits: true,
                fundProvider: true,
            });
            const provider = providers[0];
            const callData0 = reserveVault.interface.encodeFunctionData(
                'provideFund',
                [0],
            );
            await expect(provider.call(reserveVault.address, callData0, { value: 0 })).to.be.revertedWithCustomError(reserveVault, 'InvalidFundId');
            const callData3 = reserveVault.interface.encodeFunctionData(
                'provideFund',
                [3],
            );
            await expect(provider.call(reserveVault.address, callData3, { value: 0 })).to.be.revertedWithCustomError(reserveVault, 'InvalidFundId');
        });

        it('1.8.5.4. provide fund unsuccessfully when paused', async () => {
            const { reserveVault, providers } = await beforeReserveVaultTest({
                authorizeProviders: true,
                listSampleCurrencies: true,
                listSampleFunds: true,
                listSampleDeposits: true,
                fundProvider: true,
                pause: true,
            });
            const provider = providers[0];
            const fundId = 1;
            const callData = reserveVault.interface.encodeFunctionData(
                'provideFund',
                [fundId],
            );
            await expect(provider.call(reserveVault.address, callData, { value: 0 })).to.be.revertedWith('Pausable: paused');
        });

        it('1.8.5.5. provide fund unsuccessfully by unauthorized account', async () => {
            const { reserveVault, providers } = await beforeReserveVaultTest({
                authorizeProviders: true,
                listSampleCurrencies: true,
                listSampleFunds: true,
                listSampleDeposits: true,
                fundProvider: true,
            });
            const provider = providers[1];
            const callData = reserveVault.interface.encodeFunctionData(
                'provideFund',
                [1],
            );
            await expect(provider.call(reserveVault.address, callData, { value: 0 })).to.be.revertedWithCustomError(reserveVault, 'Unauthorized');
        });

        it('1.8.5.6. provide fund unsuccessfully with already provided fund', async () => {
            const { reserveVault, providers } = await beforeReserveVaultTest({
                authorizeProviders: true,
                listSampleCurrencies: true,
                listSampleFunds: true,
                listSampleDeposits: true,
                fundProvider: true,
                provideFunds: true,
            });
            const provider = providers[0];
            const callData = reserveVault.interface.encodeFunctionData(
                'provideFund',
                [1],
            );
            await expect(provider.call(reserveVault.address, callData, { value: 0 })).to.be.revertedWithCustomError(reserveVault, 'AlreadyProvided');
        });

        it('1.8.5.7. provide fund unsuccessfully with insufficient native currency', async () => {
            const { reserveVault, providers, currencies, deployer } = await beforeReserveVaultTest({
                authorizeProviders: true,
                listSampleCurrencies: true,
                listSampleFunds: true,
                listSampleDeposits: true,
                fundProvider: true,
            });

            const provider = providers[0];
            
            const fundId = 1;
            const initTotalQuantity = (await reserveVault.getFund(fundId)).totalQuantity;
            const nativeDenomination = 400;

            const callData = reserveVault.interface.encodeFunctionData(
                'provideFund',
                [fundId],
            );
            await expect(provider.call(reserveVault.address, callData, { value: initTotalQuantity.mul(nativeDenomination).sub(1) })).to.be.revertedWithCustomError(reserveVault, 'InsufficientValue');
        });

        it('1.8.5.8. provide fund unsuccessfully with insufficient ERC20 currencies', async () => {
            const { reserveVault, providers, deployer } = await beforeReserveVaultTest({
                authorizeProviders: true,
                listSampleCurrencies: true,
                listSampleFunds: true,
                listSampleDeposits: true,
                fundProvider: false,
            });
            await prepareNativeToken(
                ethers.provider,
                deployer,
                providers,
                ethers.utils.parseEther('100')
            );

            const provider = providers[0];
            
            const fundId = 1;
            const initTotalQuantity = (await reserveVault.getFund(fundId)).totalQuantity;
            const nativeDenomination = 400;
            const callData = reserveVault.interface.encodeFunctionData(
                'provideFund',
                [fundId],
            );
            await expect(provider.call(reserveVault.address, callData, { value: initTotalQuantity.mul(nativeDenomination) })).to.be.revertedWith('ERC20: insufficient allowance');
        });

        it('1.8.5.9. provide fund unsuccessfully when refunding native currency failed', async () => {
            const { reserveVault, admins, deployer, admin, currencies } = await beforeReserveVaultTest({
                authorizeProviders: true,
                listSampleCurrencies: true,
                listSampleFunds: true,
                listSampleDeposits: true,
                fundProvider: true,
            });

            const failReceiver = await deployFailReceiver(deployer, false, false);

            await callReserveVault_AuthorizeProvider(
                reserveVault,
                admins,
                [failReceiver.address],
                true,
                await admin.nonce(),
            );

            const mainCurrency = currencies[0].address;
            const mainDenomination = 100
            const extraCurrencies = [currencies[1].address, ethers.constants.AddressZero];
            const extraDenominations = [200, 400];
            await callTransaction(failReceiver.call(
                reserveVault.address,
                reserveVault.interface.encodeFunctionData(
                    'openFund',
                    [
                        mainCurrency,
                        mainDenomination,
                        extraCurrencies,
                        extraDenominations,
                    ]
                )
            ));

            await prepareNativeToken(
                ethers.provider,
                deployer,
                [failReceiver],
                ethers.utils.parseEther('100')
            );

            await callTransaction(failReceiver.activate(true));

            const fundId = 2;
            const initTotalQuantity = (await reserveVault.getFund(fundId)).totalQuantity;
            const nativeDenomination = 400;

            const callData = reserveVault.interface.encodeFunctionData(
                'provideFund',
                [fundId],
            );

            await expect(failReceiver.call(reserveVault.address, callData, { value: initTotalQuantity.mul(nativeDenomination).add(1) })).to.be.revertedWithCustomError(reserveVault, 'FailedRefund');
            
        });

        it('1.8.5.10. provide fund unsuccessfully when this contract is reentered', async () => {
            const { reserveVault, providers, deployer, reentrancyERC20 } = await beforeReserveVaultTest({
                authorizeProviders: true,
                listSampleCurrencies: true,
                listSampleFunds: true,
                listSampleDeposits: true,
                fundProvider: true,
                includeReentrancyERC20: true,
            });

            const provider = providers[0];
            
            const fundId = 1;
            const initTotalQuantity = (await reserveVault.getFund(fundId)).totalQuantity;
            const nativeDenomination = 400;

            const callData = reserveVault.interface.encodeFunctionData(
                'provideFund',
                [fundId],
            );

            const proxyCallData = provider.interface.encodeFunctionData(
                'call',
                [reserveVault.address, callData],
            );
            
            await callTransaction(reentrancyERC20.updateReentrancyPlan(
                provider.address,
                proxyCallData
            ));

            await expect(provider.call(
                reserveVault.address,
                callData,
                { value: initTotalQuantity.mul(nativeDenomination) }
            )).to.be.revertedWith('ReentrancyGuard: reentrant call');
        });        
    });

    describe('1.8.6. withdrawFund(uint256, address, uint256)', async () => {
        it('1.8.6.1. withdraw fund successfully', async () => {
            const { reserveVault, providers, currencies, deployer,  withdrawer1, withdrawer2 } = await beforeReserveVaultTest({
                authorizeProviders: true,
                listSampleCurrencies: true,
                listSampleFunds: true,
                listSampleDeposits: true,
                fundProvider: true,
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

            const callData1 = reserveVault.interface.encodeFunctionData(
                'withdrawFund',
                [fundId, withdrawer1.address, withdrawalQuantity1],
            );
            const tx1 = await provider.call(reserveVault.address, callData1, { value: 0 });
            const receipt1 = await tx1.wait();
            const gasFee1 = receipt1.gasUsed.mul(receipt1.effectiveGasPrice);

            await expect(tx1).to
                .emit(reserveVault, 'FundWithdrawal')
                .withArgs(fundId, withdrawer1.address, withdrawalQuantity1);

            expect(await ethers.provider.getBalance(deployer.address)).to.equal(deployerInitNativeBalance.sub(gasFee1));
            expect(await ethers.provider.getBalance(withdrawer1.address)).to.equal(withdrawer1InitNativeBalance.add(withdrawalQuantity1.mul(nativeDenomination)));
            expect(await currencies[0].balanceOf(withdrawer1.address)).to.equal(withdrawer1InitCurrency0Balance.add(withdrawalQuantity1.mul(currency0Denomination)));
            expect(await currencies[1].balanceOf(withdrawer1.address)).to.equal(withdrawer1InitCurrency1Balance.add(withdrawalQuantity1.mul(currency1Denomination)));
            expect(await currencies[2].balanceOf(withdrawer1.address)).to.equal(withdrawer1InitCurrency2Balance);

            const withdrawalQuantity2 = BigNumber.from(20);
            const callData2 = reserveVault.interface.encodeFunctionData(
                'withdrawFund',
                [fundId, withdrawer2.address, withdrawalQuantity2],
            );
            const tx2 = await provider.call(reserveVault.address, callData2, { value: 0 });
            const receipt2 = await tx2.wait();
            const gasFee2 = receipt2.gasUsed.mul(receipt2.effectiveGasPrice);

            await expect(tx2).to
                .emit(reserveVault, 'FundWithdrawal')
                .withArgs(fundId, withdrawer2.address, withdrawalQuantity2);
            
            expect(await ethers.provider.getBalance(deployer.address)).to.equal(deployerInitNativeBalance.sub(gasFee1).sub(gasFee2));
            expect(await ethers.provider.getBalance(withdrawer2.address)).to.equal(withdrawer2InitNativeBalance.add(withdrawalQuantity2.mul(nativeDenomination)));
            expect(await currencies[0].balanceOf(withdrawer2.address)).to.equal(withdrawer2InitCurrency0Balance.add(withdrawalQuantity2.mul(currency0Denomination)));
            expect(await currencies[1].balanceOf(withdrawer2.address)).to.equal(withdrawer2InitCurrency1Balance.add(withdrawalQuantity2.mul(currency1Denomination)));
            expect(await currencies[2].balanceOf(withdrawer2.address)).to.equal(withdrawer2InitCurrency2Balance);
        });

        it('1.8.6.2. withdraw fund unsuccessfully with invalid fund id', async () => {
            const { reserveVault, providers, withdrawer1 } = await beforeReserveVaultTest({
                authorizeProviders: true,
                listSampleCurrencies: true,
                listSampleFunds: true,
                listSampleDeposits: true,
                fundProvider: true,
                provideFunds: true,
            });
            const provider = providers[0];
            const fundId = 3;
            const withdrawalQuantity = BigNumber.from(10);
            const callData = reserveVault.interface.encodeFunctionData(
                'withdrawFund',
                [fundId, withdrawer1.address, withdrawalQuantity],
            );
            await expect(provider.call(reserveVault.address, callData, { value: 0 })).to.be.revertedWithCustomError(reserveVault, 'InvalidFundId');
        });

        it('1.8.6.3. withdraw fund unsuccessfully when paused', async () => {
            const { reserveVault, providers, withdrawer1 } = await beforeReserveVaultTest({
                authorizeProviders: true,
                listSampleCurrencies: true,
                listSampleFunds: true,
                listSampleDeposits: true,
                fundProvider: true,
                provideFunds: true,
                pause: true,
            });
            const provider = providers[0];
            const fundId = 1;
            const withdrawalQuantity = BigNumber.from(10);
            const callData = reserveVault.interface.encodeFunctionData(
                'withdrawFund',
                [fundId, withdrawer1.address, withdrawalQuantity],
            );
            await expect(provider.call(reserveVault.address, callData, { value: 0 })).to.be.revertedWith('Pausable: paused');
        });

        it('1.8.6.4. withdraw fund unsuccessfully by unauthorized account', async () => {
            const { reserveVault, providers, withdrawer1 } = await beforeReserveVaultTest({
                authorizeProviders: true,
                listSampleCurrencies: true,
                listSampleFunds: true,
                listSampleDeposits: true,
                fundProvider: true,
                provideFunds: true,
            });
            const provider = providers[1];
            const fundId = 1;
            const withdrawalQuantity = BigNumber.from(10);
            const callData = reserveVault.interface.encodeFunctionData(
                'withdrawFund',
                [fundId, withdrawer1.address, withdrawalQuantity],
            );
            await expect(provider.call(reserveVault.address, callData, { value: 0 })).to.be.revertedWithCustomError(reserveVault, 'Unauthorized');
        });

        it('1.8.6.5. withdraw fund unsuccessfully with unprovided fund', async () => {
            const { reserveVault, providers, withdrawer1 } = await beforeReserveVaultTest({
                authorizeProviders: true,
                listSampleCurrencies: true,
                listSampleFunds: true,
                listSampleDeposits: true,
                fundProvider: true,
            });
            const provider = providers[0];
            const fundId = 1;
            const withdrawalQuantity = BigNumber.from(10);
            const callData = reserveVault.interface.encodeFunctionData(
                'withdrawFund',
                [fundId, withdrawer1.address, withdrawalQuantity],
            );
            await expect(provider.call(reserveVault.address, callData, { value: 0 })).to.be.revertedWithCustomError(reserveVault, 'InsufficientFunds');
        });
        
        it('1.8.6.6. withdraw fund unsuccessfully when withdraw quantity exceed fund quantity', async () => {
            const { reserveVault, providers, withdrawer1 } = await beforeReserveVaultTest({
                authorizeProviders: true,
                listSampleCurrencies: true,
                listSampleFunds: true,
                listSampleDeposits: true,
                fundProvider: true,
            });
            const provider = providers[0];
            const fundId = 1;
            const withdrawalQuantity = (await reserveVault.getFund(fundId)).totalQuantity.add(100);
            const callData = reserveVault.interface.encodeFunctionData(
                'withdrawFund',
                [fundId, withdrawer1.address, withdrawalQuantity],
            );
            await expect(provider.call(reserveVault.address, callData, { value: 0 })).to.be.revertedWithCustomError(reserveVault, 'InsufficientFunds');
        });

        it('1.8.6.7. withdraw fund unsuccessfully when this contract is reentered', async () => {
            const { reserveVault, providers, deployer, withdrawer1, reentrancyERC20 } = await beforeReserveVaultTest({
                authorizeProviders: true,
                listSampleCurrencies: true,
                listSampleFunds: true,
                listSampleDeposits: true,
                fundProvider: true,
                provideFunds: true,
                includeReentrancyERC20: true,
            });

            const provider = providers[0];
            
            const fundId = 1;

            const withdrawalQuantity = BigNumber.from(10);

            const callData = reserveVault.interface.encodeFunctionData(
                'withdrawFund',
                [fundId, withdrawer1.address, withdrawalQuantity],
            );

            const proxyCallData = provider.interface.encodeFunctionData(
                'call',
                [reserveVault.address, callData],
            );

            await callTransaction(reentrancyERC20.updateReentrancyPlan(
                provider.address,
                proxyCallData,
            ));
            await expect(provider.call(reserveVault.address, callData, { value: 0 })).to.be.revertedWith('ReentrancyGuard: reentrant call');
        });
    });
});
