import chai from 'chai';
import { expect } from 'chai';
import { BigNumber } from 'ethers';
import { ethers } from 'hardhat';

// @defi-wonderland/smock
import { smock } from '@defi-wonderland/smock';

// @nomicfoundation/hardhat-network-helpers
import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';

// @typechain-types
import { Admin, Currency, PriceFeed, PriceWatcher } from '@typechain-types';

// @utils
import { callTransaction, expectRevertWithModifierCustomError, randomWallet } from '@utils/blockchain';
import { randomBigNumber, randomInt, structToObject } from '@utils/utils';

// @utils/deployments/common
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployCurrency } from '@utils/deployments/common/currency';
import { deployPriceWatcher } from '@utils/deployments/common/priceWatcher';

// @utils/deployments/mock
import { deployPriceFeed } from '@utils/deployments/mock/utilities/priceFeed';

// @utils/models/common
import { Rate } from '@utils/models/common/common';
import {
    UpdateDefaultRatesParams,
    UpdateDefaultRatesParamsInput,
    UpdatePriceFeedsParams,
    UpdatePriceFeedsParamsInput,
} from '@utils/models/common/priceWatcher';

// @utils/signatures/common
import { getUpdateDefaultRatesSignatures, getUpdatePriceFeedsSignatures } from '@utils/signatures/common/priceWatcher';

// @utils/transaction/common
import { getAdminTxByInput_UpdateCurrencyRegistries } from '@utils/transaction/common/admin';
import {
    getPriceWatcherTxByInput_UpdateDefaultRates,
    getPriceWatcherTx_UpdatePriceFeeds,
    getPriceWatcherTxByInput_UpdatePriceFeeds,
    getPriceWatcherTx_UpdateDefaultRates,
} from '@utils/transaction/common/priceWatcher';

chai.use(smock.matchers);

interface PriceWatcherFixture {
    deployer: any;
    admins: any[];

    admin: Admin;
    currency: Currency;
    nativePriceFeed: PriceFeed;
    currencyPriceFeed: PriceFeed;
    priceFeeds: PriceFeed[];
    priceWatcher: PriceWatcher;
}

describe('1.7. PriceWatcher', async () => {
    async function priceWatcherFixture(): Promise<PriceWatcherFixture> {
        const [deployer, admin1, admin2, admin3, admin4, admin5] = await ethers.getSigners();
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

        const SmockCurrencyFactory = (await smock.mock('Currency')) as any;
        const currency = await SmockCurrencyFactory.deploy();
        await callTransaction(currency.initialize('MockCurrency', 'MCK'));

        const nativePriceFeed = (await deployPriceFeed(deployer.address, 0, 0)) as PriceFeed;
        const currencyPriceFeed = (await deployPriceFeed(deployer.address, 0, 0)) as PriceFeed;

        const priceFeeds = [];
        while (priceFeeds.length < 5) {
            const priceFeed = (await deployPriceFeed(deployer.address, 0, 0)) as PriceFeed;
            priceFeeds.push(priceFeed);
        }

        const priceWatcher = (await deployPriceWatcher(deployer.address, admin.address)) as PriceWatcher;

        return {
            deployer,
            admins,
            admin,
            currency,
            nativePriceFeed,
            currencyPriceFeed,
            priceFeeds,
            priceWatcher,
        };
    }

    async function beforePriceWatcherTest({
        skipListSampleCurrencies = false,
        listPriceFeeds = false,
        listDefaultRates = false,
    } = {}): Promise<PriceWatcherFixture> {
        const fixture = await loadFixture(priceWatcherFixture);
        const { deployer, admins, admin, currency, nativePriceFeed, currencyPriceFeed, priceFeeds, priceWatcher } =
            fixture;

        if (!skipListSampleCurrencies) {
            await callTransaction(
                getAdminTxByInput_UpdateCurrencyRegistries(
                    admin,
                    deployer,
                    {
                        currencies: [ethers.constants.AddressZero, currency.address],
                        isAvailable: [true, true],
                        isExclusive: [false, true],
                    },
                    admins
                )
            );
        }

        if (listPriceFeeds) {
            await callTransaction(nativePriceFeed.updateData(1000_00000000, 8));
            await callTransaction(currencyPriceFeed.updateData(5_00000000, 8));
            for (let i = 2; i < priceFeeds.length; ++i) {
                const decimals = randomInt(0, 18);
                const value = randomBigNumber(
                    BigNumber.from(10).pow(decimals).mul(100),
                    BigNumber.from(10)
                        .pow(decimals + 1)
                        .mul(100)
                );
                await callTransaction(priceFeeds[i].updateData(value, decimals));
            }

            await callTransaction(
                getPriceWatcherTxByInput_UpdatePriceFeeds(
                    priceWatcher,
                    deployer,
                    {
                        currencies: [ethers.constants.AddressZero, currency.address],
                        feeds: [nativePriceFeed.address, currencyPriceFeed.address],
                        heartbeats: [3600, 24 * 3600],
                    },
                    admin,
                    admins
                )
            );
        }

        if (listDefaultRates) {
            await callTransaction(
                getPriceWatcherTxByInput_UpdateDefaultRates(
                    priceWatcher,
                    deployer,
                    {
                        currencies: [ethers.constants.AddressZero, currency.address],
                        rates: [
                            { value: BigNumber.from(10000_000), decimals: 3 },
                            { value: BigNumber.from(50_000), decimals: 3 },
                        ],
                    },
                    admin,
                    admins
                )
            );
        }

        return fixture;
    }

    /* --- Initialization --- */
    describe('1.7.1. initialize(address)', async () => {
        it('1.7.1.1. Deploy successfully', async () => {
            const { admin, priceWatcher } = await beforePriceWatcherTest({});

            expect(await priceWatcher.admin()).to.equal(admin.address);
        });
    });

    /* --- Administration --- */
    describe('1.7.2. updatePriceFeeds(address[],address[],uint40[],bytes[])', async () => {
        it('1.7.2.1. Update price feeds successfully with valid signatures', async () => {
            const { deployer, admin, admins, priceWatcher, priceFeeds } = await beforePriceWatcherTest();

            const priceFeedAddresses = priceFeeds.map((priceFeed) => priceFeed.address);

            const currencyAddresses = [];
            for (let i = 0; i < 5; ++i) {
                currencyAddresses.push(ethers.utils.computeAddress(ethers.utils.id(`currency_${i}`)));
            }
            const heartbeats = [40, 50, 60, 70, 80];

            const paramsInput: UpdatePriceFeedsParamsInput = {
                currencies: currencyAddresses,
                feeds: priceFeedAddresses,
                heartbeats,
            };
            const tx = await getPriceWatcherTxByInput_UpdatePriceFeeds(
                priceWatcher,
                deployer,
                paramsInput,
                admin,
                admins
            );
            await tx.wait();

            for (let i = 0; i < currencyAddresses.length; ++i) {
                await expect(tx)
                    .to.emit(priceWatcher, 'PriceFeedUpdate')
                    .withArgs(currencyAddresses[i], priceFeedAddresses[i], heartbeats[i]);

                const priceFeed = await priceWatcher.getPriceFeed(currencyAddresses[i]);
                expect(priceFeed.feed).to.equal(priceFeedAddresses[i]);
                expect(priceFeed.heartbeat).to.equal(heartbeats[i]);
            }
        });

        it('1.7.2.2. Update price feeds unsuccessfully with invalid signatures', async () => {
            const { deployer, admin, admins, priceWatcher, priceFeeds } = await beforePriceWatcherTest();
            const priceFeedAddresses = priceFeeds.map((priceFeed) => priceFeed.address);

            const currencyAddresses = [];
            for (let i = 0; i < 5; ++i) {
                currencyAddresses.push(ethers.utils.computeAddress(ethers.utils.id(`currency_${i}`)));
            }
            const heartbeats = [40, 50, 60, 70, 80];

            const paramsInput: UpdatePriceFeedsParamsInput = {
                currencies: currencyAddresses,
                feeds: priceFeedAddresses,
                heartbeats,
            };
            const params: UpdatePriceFeedsParams = {
                ...paramsInput,
                signatures: await getUpdatePriceFeedsSignatures(priceWatcher, paramsInput, admin, admins, false),
            };
            await expect(
                getPriceWatcherTx_UpdatePriceFeeds(priceWatcher, deployer, params)
            ).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('1.7.2.3. Update price feeds unsuccessfully with invalid heartbeat', async () => {
            const { deployer, admin, admins, priceWatcher, priceFeeds } = await beforePriceWatcherTest();

            const priceFeedAddresses = priceFeeds.map((priceFeed) => priceFeed.address);
            const currencyAddresses = [];
            for (let i = 0; i < 5; ++i) {
                currencyAddresses.push(ethers.utils.computeAddress(ethers.utils.id(`currency_${i}`)));
            }
            const heartbeats = [40, 50, 0, 70, 80];

            await expect(
                getPriceWatcherTxByInput_UpdatePriceFeeds(
                    priceWatcher,
                    deployer,
                    {
                        currencies: currencyAddresses,
                        feeds: priceFeedAddresses,
                        heartbeats,
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(priceWatcher, 'InvalidInput');
        });

        it('1.7.2.4. Update price feeds unsuccessfully with conflicting params length', async () => {
            const { deployer, admin, admins, priceWatcher, priceFeeds } = await beforePriceWatcherTest();

            const priceFeedAddresses = priceFeeds.map((priceFeed) => priceFeed.address);

            async function testForInvalidInput(
                currencyAddresses: string[],
                priceFeedAddresses: string[],
                heartbeats: number[]
            ) {
                await expect(
                    getPriceWatcherTxByInput_UpdatePriceFeeds(
                        priceWatcher,
                        deployer,
                        {
                            currencies: currencyAddresses,
                            feeds: priceFeedAddresses,
                            heartbeats,
                        },
                        admin,
                        admins
                    )
                ).to.be.revertedWithCustomError(priceWatcher, 'InvalidInput');
            }

            const currencyAddresses = [];
            for (let i = 0; i < 5; ++i) {
                currencyAddresses.push(ethers.utils.computeAddress(ethers.utils.id(`currency_${i}`)));
            }
            const heartbeats = [40, 50, 60, 70, 80];

            await testForInvalidInput(currencyAddresses.slice(0, 4), priceFeedAddresses, heartbeats);
            await testForInvalidInput(currencyAddresses, priceFeedAddresses.slice(0, 4), heartbeats);
            await testForInvalidInput(currencyAddresses, priceFeedAddresses, heartbeats.slice(0, 4));
        });
    });

    describe('1.7.3. updateDefaultRates(address[],(uint256,uint8)[],bytes[])', async () => {
        it('1.7.3.1. Update default rates successfully with valid signatures', async () => {
            const { deployer, admin, admins, priceWatcher } = await beforePriceWatcherTest();

            const currencyAddresses = [];
            for (let i = 0; i < 5; ++i) {
                currencyAddresses.push(ethers.utils.computeAddress(ethers.utils.id(`currency_${i}`)));
            }
            const rates = [
                { value: BigNumber.from(10), decimals: 0 },
                { value: BigNumber.from(20_0), decimals: 1 },
                { value: BigNumber.from(30_00), decimals: 2 },
                { value: BigNumber.from(40_000), decimals: 3 },
                { value: BigNumber.from(50_0000), decimals: 4 },
            ];

            const paramsInput: UpdateDefaultRatesParamsInput = {
                currencies: currencyAddresses,
                rates,
            };
            const tx = await getPriceWatcherTxByInput_UpdateDefaultRates(
                priceWatcher,
                deployer,
                paramsInput,
                admin,
                admins
            );
            const receipt = await tx.wait();

            for (let i = 0; i < currencyAddresses.length; ++i) {
                const event = receipt.events?.filter((event) => event.event === 'DefaultRateUpdate')[i]!.args!;
                expect(event.currency).to.equal(currencyAddresses[i]);
                expect(structToObject(event.rate)).to.deep.equal(rates[i]);

                const defaultRate = await priceWatcher.getDefaultRate(currencyAddresses[i]);
                expect(structToObject(defaultRate)).to.deep.equal(rates[i]);
            }
        });

        it('1.7.3.2. Update default rates unsuccessfully with invalid signatures', async () => {
            const { deployer, admin, admins, priceWatcher } = await beforePriceWatcherTest({});
            const currencyAddresses = [];
            for (let i = 0; i < 5; ++i) {
                currencyAddresses.push(ethers.utils.computeAddress(ethers.utils.id(`currency_${i}`)));
            }
            const rates = [
                { value: BigNumber.from(10), decimals: 0 },
                { value: BigNumber.from(20_0), decimals: 1 },
                { value: BigNumber.from(30_00), decimals: 2 },
                { value: BigNumber.from(40_000), decimals: 3 },
                { value: BigNumber.from(50_0000), decimals: 4 },
            ];

            const paramsInput: UpdateDefaultRatesParamsInput = {
                currencies: currencyAddresses,
                rates,
            };
            const params: UpdateDefaultRatesParams = {
                ...paramsInput,
                signatures: await getUpdateDefaultRatesSignatures(priceWatcher, paramsInput, admin, admins, false),
            };
            await expect(
                getPriceWatcherTx_UpdateDefaultRates(priceWatcher, deployer, params)
            ).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('1.7.3.3. Update default rates unsuccessfully with invalid decimals', async () => {
            const { deployer, admin, admins, priceWatcher } = await beforePriceWatcherTest({});
            const currencyAddresses = [];
            for (let i = 0; i < 5; ++i) {
                currencyAddresses.push(ethers.utils.computeAddress(ethers.utils.id(`currency_${i}`)));
            }
            const rates = [
                { value: BigNumber.from(10), decimals: 0 },
                { value: BigNumber.from(20_0), decimals: 1 },
                { value: BigNumber.from(30_00), decimals: 19 },
                { value: BigNumber.from(40_000), decimals: 3 },
                { value: BigNumber.from(50_0000), decimals: 4 },
            ];

            await expect(
                getPriceWatcherTxByInput_UpdateDefaultRates(
                    priceWatcher,
                    deployer,
                    {
                        currencies: currencyAddresses,
                        rates,
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(priceWatcher, 'InvalidInput');
        });

        it('1.7.3.4. Update default rates unsuccessfully with conflicting params length', async () => {
            const { deployer, admin, admins, priceWatcher } = await beforePriceWatcherTest({});

            async function testForInvalidInput(currencyAddresses: string[], rates: Rate[]) {
                await expect(
                    getPriceWatcherTxByInput_UpdateDefaultRates(
                        priceWatcher,
                        deployer,
                        {
                            currencies: currencyAddresses,
                            rates,
                        },
                        admin,
                        admins
                    )
                ).to.be.revertedWithCustomError(priceWatcher, 'InvalidInput');
            }

            const currencyAddresses = [];
            for (let i = 0; i < 5; ++i) {
                currencyAddresses.push(ethers.utils.computeAddress(ethers.utils.id(`currency_${i}`)));
            }
            const rates = [
                { value: BigNumber.from(10), decimals: 0 },
                { value: BigNumber.from(20_0), decimals: 1 },
                { value: BigNumber.from(30_00), decimals: 2 },
                { value: BigNumber.from(40_000), decimals: 3 },
                { value: BigNumber.from(50_0000), decimals: 4 },
            ];

            await testForInvalidInput(currencyAddresses.slice(0, 4), rates);
            await testForInvalidInput(currencyAddresses, rates.slice(0, 4));
        });
    });

    /* --- Query --- */
    describe('1.7.4. isPriceInRange(address,uint256,uint256,uint256)', async () => {
        it('1.7.4.1. Return correct value when currency have price feed', async () => {
            const fixture = await beforePriceWatcherTest({
                listPriceFeeds: true,
            });

            const { priceWatcher } = fixture;

            const nativeValue = 1000;
            const unitPrice = 1000;
            const normalizedUnitPrice = unitPrice * nativeValue;

            expect(
                await priceWatcher.isPriceInRange(
                    ethers.constants.AddressZero,
                    unitPrice,
                    normalizedUnitPrice,
                    normalizedUnitPrice
                )
            ).to.equal(true);

            expect(
                await priceWatcher.isPriceInRange(
                    ethers.constants.AddressZero,
                    unitPrice,
                    normalizedUnitPrice / 10,
                    normalizedUnitPrice / 5
                )
            ).to.equal(false);
        });

        it('1.7.4.2. Return correct value when currency have default price', async () => {
            const fixture = await beforePriceWatcherTest({
                listDefaultRates: true,
            });

            const { admin, admins, priceWatcher, deployer } = fixture;

            const newCurrency = await deployCurrency(deployer, 'NewCurrency', 'NC');

            await callTransaction(
                getAdminTxByInput_UpdateCurrencyRegistries(
                    admin,
                    deployer,
                    {
                        currencies: [newCurrency.address],
                        isAvailable: [true],
                        isExclusive: [false],
                    },
                    admins
                )
            );

            await callTransaction(
                getPriceWatcherTxByInput_UpdateDefaultRates(
                    priceWatcher,
                    deployer,
                    {
                        currencies: [newCurrency.address],
                        rates: [{ value: BigNumber.from(2_0000), decimals: 4 }],
                    },
                    admin,
                    admins
                )
            );

            const unitPrice = 200;
            const normalizedUnitPrice = unitPrice * 2;

            expect(
                await priceWatcher.isPriceInRange(
                    newCurrency.address,
                    unitPrice,
                    normalizedUnitPrice,
                    normalizedUnitPrice
                )
            ).to.equal(true);

            expect(
                await priceWatcher.isPriceInRange(
                    newCurrency.address,
                    unitPrice,
                    normalizedUnitPrice / 10,
                    normalizedUnitPrice / 5
                )
            ).to.equal(false);
        });

        it('1.7.4.3. Revert when currency is unavailable', async () => {
            const fixture = await beforePriceWatcherTest({
                skipListSampleCurrencies: true,
            });

            const { deployer, admin, admins, priceWatcher } = fixture;

            const unavailableCurrency = randomWallet();

            await callTransaction(
                getAdminTxByInput_UpdateCurrencyRegistries(
                    admin,
                    deployer,
                    {
                        currencies: [unavailableCurrency.address],
                        isAvailable: [false],
                        isExclusive: [false],
                    },
                    admins
                )
            );

            await callTransaction(
                getPriceWatcherTxByInput_UpdateDefaultRates(
                    priceWatcher,
                    deployer,
                    {
                        currencies: [unavailableCurrency.address],
                        rates: [{ value: BigNumber.from(100_000), decimals: 3 }],
                    },
                    admin,
                    admins
                )
            );

            await expectRevertWithModifierCustomError(
                priceWatcher,
                priceWatcher.isPriceInRange(unavailableCurrency.address, 1000, 100 * 1000, 100 * 1000),
                'InvalidCurrency'
            );
        });

        it('1.7.4.4. Revert when currency rate is missing', async () => {
            const fixture = await beforePriceWatcherTest();

            const { priceWatcher } = fixture;

            await expect(
                priceWatcher.isPriceInRange(ethers.constants.AddressZero, 1000, 100 * 1000, 100 * 1000)
            ).to.be.revertedWithCustomError(priceWatcher, 'MissingCurrencyRate');
        });

        it('1.7.4.5. Revert when price feed is stale', async () => {
            const fixture = await beforePriceWatcherTest({
                listPriceFeeds: true,
            });

            const { priceWatcher, currency } = fixture;

            const currentTimestamp = (await time.latest()) + 1000;

            const heartbeat = (await priceWatcher.getPriceFeed(currency.address)).heartbeat;
            await time.setNextBlockTimestamp(currentTimestamp + heartbeat + 1);
            await ethers.provider.send('evm_mine', []);

            await expect(
                priceWatcher.isPriceInRange(currency.address, 1000, 100 * 1000, 100 * 1000)
            ).to.be.revertedWithCustomError(priceWatcher, 'StalePriceFeed');
        });

        it('1.7.4.6. Revert when price feed returns invalid data', async () => {
            const fixture = await beforePriceWatcherTest({
                listPriceFeeds: true,
            });

            const { deployer, admin, admins, priceWatcher, nativePriceFeed, currencyPriceFeed, currency } = fixture;

            await currencyPriceFeed.updateData(-5_00000000, 8);
            await nativePriceFeed.updateData(0, 8);

            await callTransaction(
                getAdminTxByInput_UpdateCurrencyRegistries(
                    admin,
                    deployer,
                    {
                        currencies: [ethers.constants.AddressZero, currency.address],
                        isAvailable: [true, true],
                        isExclusive: [false, true],
                    },
                    admins
                )
            );

            await callTransaction(
                getPriceWatcherTxByInput_UpdatePriceFeeds(
                    priceWatcher,
                    deployer,
                    {
                        currencies: [ethers.constants.AddressZero, currency.address],
                        feeds: [nativePriceFeed.address, currencyPriceFeed.address],
                        heartbeats: [3600, 24 * 3600],
                    },
                    admin,
                    admins
                )
            );

            await expect(
                priceWatcher.isPriceInRange(currency.address, 1000, 100 * 1000, 100 * 1000)
            ).to.be.revertedWithCustomError(priceWatcher, 'InvalidPriceFeedData');

            await expect(
                priceWatcher.isPriceInRange(ethers.constants.AddressZero, 1000, 100 * 1000, 100 * 1000)
            ).to.be.revertedWithCustomError(priceWatcher, 'InvalidPriceFeedData');
        });
    });
});
