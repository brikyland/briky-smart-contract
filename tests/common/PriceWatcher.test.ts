import chai from 'chai';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
    Admin,
    Currency,
    MockPriceFeed,
    PriceWatcher,
} from '@typechain-types';
import { callTransaction, expectRevertWithModifierCustomError, getSignatures, randomWallet } from '@utils/blockchain';
import { Constant } from '@tests/test.constant';
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployCurrency } from '@utils/deployments/common/currency';
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { BigNumber } from 'ethers';
import { smock } from '@defi-wonderland/smock';

import { addCurrencyToAdminAndPriceWatcher } from '@utils/call/common/common';
import { deployMockPriceFeed } from '@utils/deployments/mock/mockPriceFeed';
import { deployPriceWatcher } from '@utils/deployments/common/priceWatcher';
import { Rate, RATE_SCHEMA } from '@utils/models/common/common';
import { randomBigNumber, randomInt, structToObject } from '@utils/utils';

chai.use(smock.matchers);

interface PriceWatcherFixture {
    admin: Admin;
    currency: Currency;
    priceWatcher: PriceWatcher;
    nativePriceFeed: MockPriceFeed;
    currencyPriceFeed: MockPriceFeed;
    priceFeeds: MockPriceFeed[];
    
    deployer: any;
    admins: any[];
}

describe('1.7. PriceWatcher', async () => {
    async function priceWatcherFixture(): Promise<PriceWatcherFixture> {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        const admins = [];
        for (let i = 1; i <= Constant.ADMIN_NUMBER; ++i) admins.push(accounts[i]);

        const adminAddresses: string[] = admins.map(signer => signer.address);
        const admin = await deployAdmin(
            deployer.address,
            adminAddresses[0],
            adminAddresses[1],
            adminAddresses[2],
            adminAddresses[3],
            adminAddresses[4],
        ) as Admin;


        const SmockCurrencyFactory = await smock.mock('Currency') as any;
        const currency = await SmockCurrencyFactory.deploy();
        await callTransaction(currency.initialize('MockCurrency', 'MCK'));

        const nativePriceFeed = await deployMockPriceFeed(deployer.address, 0, 0) as MockPriceFeed;
        const currencyPriceFeed = await deployMockPriceFeed(deployer.address, 0, 0) as MockPriceFeed;
        
        const priceFeeds = [];
        while (priceFeeds.length < 5) {
            const priceFeed = await deployMockPriceFeed(deployer.address, 0, 0) as MockPriceFeed;
            priceFeeds.push(priceFeed);
        }

        const priceWatcher = await deployPriceWatcher(
            deployer.address,
            admin.address
        ) as PriceWatcher;

        return {
            admin,
            currency,
            priceWatcher,
            nativePriceFeed,
            currencyPriceFeed,
            priceFeeds,
            deployer,
            admins,
        };
    };

    async function beforePriceWatcherTest({
        listSampleCurrencies = false,
    } = {}): Promise<PriceWatcherFixture> {
        const fixture = await loadFixture(priceWatcherFixture);
        const { 
            admin,
            admins,
            currency,
            priceWatcher,
            nativePriceFeed,
            currencyPriceFeed,
            priceFeeds,
        } = fixture;


        if (listSampleCurrencies) {
            await callTransaction(nativePriceFeed.updateData(1000_00000000, 8));
            await callTransaction(currencyPriceFeed.updateData(5_00000000, 8));
            for (let i = 2; i < priceFeeds.length; ++i) {
                const decimals = randomInt(0, 18);
                const value = randomBigNumber(
                    BigNumber.from(10).pow(decimals).mul(100),
                    BigNumber.from(10).pow(decimals + 1).mul(100)
                );
                await callTransaction(priceFeeds[i].updateData(value, decimals));
            }
    
            await addCurrencyToAdminAndPriceWatcher(
                admin,
                priceWatcher,
                admins,
                [ethers.constants.AddressZero],
                [true],
                [false],
                [nativePriceFeed.address],
                [3600],
                [{ value: BigNumber.from(10000_000), decimals: 3 }],
            );
            
            await addCurrencyToAdminAndPriceWatcher(
                admin,
                priceWatcher,
                admins,
                [currency.address],
                [true],
                [true],
                [currencyPriceFeed.address],
                [24 * 3600],
                [{ value: BigNumber.from(50_000), decimals: 3 }],
            );
        }

        return fixture;
    }

    describe('1.7.1. initialize(address, address, string, uint256, uint256, uint256, uint256)', async () => {
        it('1.7.1.1. Deploy successfully', async () => {
            const { admin, priceWatcher } = await beforePriceWatcherTest({});
            
            expect(await priceWatcher.admin()).to.equal(admin.address);
        });
    });

    describe('1.7.2. updatePriceFeeds(uint256, uint256, bytes[])', async () => {
        it('1.7.2.1. updatePriceFeeds successfully with valid signatures', async () => {
            const { admin, admins, priceWatcher, priceFeeds } = await beforePriceWatcherTest();

            const priceFeedAddresses = priceFeeds.map(priceFeed => priceFeed.address);
            
            const currencyAddresses = [];
            for (let i = 0; i < 5; ++i) {
                currencyAddresses.push(ethers.utils.computeAddress(ethers.utils.id(`currency_${i}`)));
            }
            const heartbeats = [40, 50, 60, 70, 80];

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'address[]', 'uint40[]'],
                [priceWatcher.address, 'updatePriceFeeds', currencyAddresses, priceFeedAddresses, heartbeats]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await priceWatcher.updatePriceFeeds(
                currencyAddresses,
                priceFeedAddresses,
                heartbeats,
                signatures
            );
            await tx.wait();

            for (let i = 0; i < currencyAddresses.length; ++i) {
                await expect(tx).to.emit(priceWatcher, 'PriceFeedUpdate').withArgs(
                    currencyAddresses[i],
                    priceFeedAddresses[i],
                    heartbeats[i]
                );
                    
                const priceFeed = await priceWatcher.getPriceFeed(currencyAddresses[i]);
                expect(priceFeed.feed).to.equal(priceFeedAddresses[i]);
                expect(priceFeed.heartbeat).to.equal(heartbeats[i]);
            }
        });

        it('1.7.2.2. updatePriceFeeds unsuccessfully with invalid signatures', async () => {
            const { admin, admins, priceWatcher, priceFeeds } = await beforePriceWatcherTest();
            const priceFeedAddresses = priceFeeds.map(priceFeed => priceFeed.address);

            const currencyAddresses = [];
            for (let i = 0; i < 5; ++i) {
                currencyAddresses.push(ethers.utils.computeAddress(ethers.utils.id(`currency_${i}`)));
            }
            const heartbeats = [40, 50, 60, 70, 80];

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'address[]', 'uint40[]'],
                [priceWatcher.address, 'updatePriceFeeds', currencyAddresses, priceFeedAddresses, heartbeats]
            );
            const invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(priceWatcher.updatePriceFeeds(
                currencyAddresses,
                priceFeedAddresses,
                heartbeats,
                invalidSignatures
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('1.7.2.3. updatePriceFeeds unsuccessfully with invalid heartbeat', async () => {
            const { admin, admins, priceWatcher, priceFeeds } = await beforePriceWatcherTest();

            const priceFeedAddresses = priceFeeds.map(priceFeed => priceFeed.address);
            const currencyAddresses = [];
            for (let i = 0; i < 5; ++i) {
                currencyAddresses.push(ethers.utils.computeAddress(ethers.utils.id(`currency_${i}`)));
            }
            const heartbeats = [40, 50, 0, 70, 80];

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'address[]', 'uint40[]'],
                [priceWatcher.address, 'updatePriceFeeds', currencyAddresses, priceFeedAddresses, heartbeats]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(priceWatcher.updatePriceFeeds(
                currencyAddresses,
                priceFeedAddresses,
                heartbeats,
                signatures
            )).to.be.revertedWithCustomError(priceWatcher, 'InvalidInput');
        });

        it('1.7.2.4. updatePriceFeeds unsuccessfully with conflicting params length', async () => {
            const { admin, admins, priceWatcher, priceFeeds } = await beforePriceWatcherTest();
            
            const priceFeedAddresses = priceFeeds.map(priceFeed => priceFeed.address);

            async function testForInvalidInput(currencyAddresses: string[], priceFeedAddresses: string[], heartbeats: number[]) {
                const message = ethers.utils.defaultAbiCoder.encode(
                    ['address', 'string', 'address[]', 'address[]', 'uint40[]'],
                    [priceWatcher.address, 'updatePriceFeeds', currencyAddresses, priceFeedAddresses, heartbeats]
                );
                const signatures = await getSignatures(message, admins, await admin.nonce());
    
                await expect(priceWatcher.updatePriceFeeds(
                    currencyAddresses,
                    priceFeedAddresses,
                    heartbeats,
                    signatures
                )).to.be.revertedWithCustomError(priceWatcher, 'InvalidInput');
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

    describe('1.7.3. updateDefaultRates(address[], uint256[], uint8[], bytes[])', async () => {
        it('1.7.3.1. updateDefaultRates successfully with valid signatures', async () => {
            const { admin, admins, priceWatcher } = await beforePriceWatcherTest();

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

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', RATE_SCHEMA],
                [priceWatcher.address, 'updateDefaultRates', currencyAddresses, rates]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await priceWatcher.updateDefaultRates(
                currencyAddresses,
                rates,
                signatures
            );
            const receipt = await tx.wait();

            for (let i = 0; i < currencyAddresses.length; ++i) {
                const event = receipt.events?.filter(event => event.event === 'DefaultRateUpdate')[i]!.args!;
                expect(event.currency).to.equal(currencyAddresses[i]);
                expect(structToObject(event.rate)).to.deep.equal(rates[i]);
                    
                const defaultRate = await priceWatcher.getDefaultRate(currencyAddresses[i]);
                expect(structToObject(defaultRate)).to.deep.equal(rates[i]);
            }
        });

        it('1.7.3.2. updateDefaultRates unsuccessfully with invalid signatures', async () => {
            const { admin, admins, priceWatcher } = await beforePriceWatcherTest({});
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

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', RATE_SCHEMA],
                [priceWatcher.address, 'updateDefaultRates', currencyAddresses, rates]
            );
            const invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(priceWatcher.updateDefaultRates(
                currencyAddresses,
                rates,
                invalidSignatures
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('1.7.3.3. updateDefaultRates unsuccessfully with invalid decimals', async () => {
            const { admin, admins, priceWatcher } = await beforePriceWatcherTest({});
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

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', RATE_SCHEMA],
                [priceWatcher.address, 'updateDefaultRates', currencyAddresses, rates]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(priceWatcher.updateDefaultRates(
                currencyAddresses,
                rates,
                signatures
            )).to.be.revertedWithCustomError(priceWatcher, 'InvalidInput');
        });

        it('1.7.3.4. updateDefaultRates unsuccessfully with conflicting params length', async () => {
            const { admin, admins, priceWatcher } = await beforePriceWatcherTest({});

            async function testForInvalidInput(currencyAddresses: string[], rates: Rate[]) {
                const message = ethers.utils.defaultAbiCoder.encode(
                    ['address', 'string', 'address[]', RATE_SCHEMA],
                    [priceWatcher.address, 'updateDefaultRates', currencyAddresses, rates]
                );
                const signatures = await getSignatures(message, admins, await admin.nonce());
    
                await expect(priceWatcher.updateDefaultRates(
                    currencyAddresses,
                    rates,
                    signatures
                )).to.be.revertedWithCustomError(priceWatcher, 'InvalidInput');
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

    describe('1.7.4. isPriceInRange(address, uint256, uint256, uint256)', async () => {
        it('1.7.4.1. return correct value when currency have price feed', async () => {
            const fixture = await beforePriceWatcherTest({
                listSampleCurrencies: true,
            });

            const { priceWatcher, nativePriceFeed, currencyPriceFeed } = fixture;

            const nativeValue = 1000;
            const unitPrice = 1000;
            const normalizedUnitPrice = unitPrice * nativeValue;

            expect(await priceWatcher.isPriceInRange(
                ethers.constants.AddressZero,
                unitPrice,
                normalizedUnitPrice,
                normalizedUnitPrice,
            )).to.equal(true);

            expect(await priceWatcher.isPriceInRange(
                ethers.constants.AddressZero,
                unitPrice,
                normalizedUnitPrice / 10,
                normalizedUnitPrice / 5,
            )).to.equal(false);
        });

        it('1.7.4.2. return correct value when currency have default price', async () => {
            const fixture = await beforePriceWatcherTest();

            const { admin, admins, priceWatcher, deployer } = fixture;

            const newCurrency = await deployCurrency(
                deployer,
                "NewCurrency",
                "NC",
            );

            await addCurrencyToAdminAndPriceWatcher(
                admin,
                priceWatcher,
                admins,
                [newCurrency.address],
                [true],
                [false],
                [ethers.constants.AddressZero],
                [3600],
                [{ value: BigNumber.from(2_0000), decimals: 4 }],
            );

            const unitPrice = 200;
            const normalizedUnitPrice = unitPrice * 2;

            expect(await priceWatcher.isPriceInRange(
                newCurrency.address,
                unitPrice,
                normalizedUnitPrice,
                normalizedUnitPrice,
            )).to.equal(true);
            expect(await priceWatcher.isPriceInRange(
                newCurrency.address,
                unitPrice,
                normalizedUnitPrice / 10,
                normalizedUnitPrice / 5,
            )).to.equal(false);
        });

        it('1.7.4.3. revert when currency is unavailable', async () => {
            const fixture = await beforePriceWatcherTest();

            const { admin, admins, priceWatcher } = fixture;

            const unavailableCurrency = randomWallet();

            await addCurrencyToAdminAndPriceWatcher(
                admin,
                priceWatcher,
                admins,
                [unavailableCurrency.address],
                [false],
                [false],
                [ethers.constants.AddressZero],
                [3600],
                [{ value: BigNumber.from(100_000), decimals: 3 }],
            );

            await expectRevertWithModifierCustomError(
                priceWatcher,
                priceWatcher.isPriceInRange(
                    unavailableCurrency.address,
                    1000,
                    100 * 1000,
                    100 * 1000,
                ),
                'InvalidCurrency'
            );
        });

        it('1.7.4.4. revert when currency rate is missing', async () => {
            const fixture = await beforePriceWatcherTest();

            const { admin, admins, priceWatcher } = fixture;

            const unavailableCurrency = randomWallet();

            await addCurrencyToAdminAndPriceWatcher(
                admin,
                priceWatcher,
                admins,
                [unavailableCurrency.address],
                [true],
                [false],
                [ethers.constants.AddressZero],
                [3600],
                [{ value: BigNumber.from(0), decimals: 0 }],
            );

            await expect(priceWatcher.isPriceInRange(
                unavailableCurrency.address,
                1000,
                100 * 1000,
                100 * 1000,
            )).to.be.revertedWithCustomError(priceWatcher, 'MissingCurrencyRate');
        });
        
        it('1.7.4.5. revert when price feed is stale', async () => {
            const fixture = await beforePriceWatcherTest({
                listSampleCurrencies: true,
            });

            const { priceWatcher, currency } = fixture;

            const currentTimestamp = await time.latest() + 1000;

            const heartbeat = (await priceWatcher.getPriceFeed(currency.address)).heartbeat;
            await time.setNextBlockTimestamp(currentTimestamp + heartbeat + 1);
            await ethers.provider.send("evm_mine", []);

            await expect(priceWatcher.isPriceInRange(
                currency.address,
                1000,
                100 * 1000,
                100 * 1000,
            )).to.be.revertedWithCustomError(priceWatcher, 'StalePriceFeed');
        });

        it('1.7.4.6. revert when price feed return invalid data', async () => {
            const fixture = await beforePriceWatcherTest();

            const { admin, admins, priceWatcher, nativePriceFeed, currencyPriceFeed, currency } = fixture;

            await currencyPriceFeed.updateData(-5_00000000, 8);
            await nativePriceFeed.updateData(0, 8);

            await addCurrencyToAdminAndPriceWatcher(
                admin,
                priceWatcher,
                admins,
                [ethers.constants.AddressZero],
                [true],
                [false],
                [nativePriceFeed.address],
                [3600],
                [{ value: BigNumber.from(10000_000), decimals: 3 }],
            );
            
            await addCurrencyToAdminAndPriceWatcher(
                admin,
                priceWatcher,
                admins,
                [currency.address],
                [true],
                [true],
                [currencyPriceFeed.address],
                [24 * 3600],
                [{ value: BigNumber.from(50_000), decimals: 3 }],
            );

            await expect(priceWatcher.isPriceInRange(
                currency.address,
                1000,
                100 * 1000,
                100 * 1000,
            )).to.be.revertedWithCustomError(priceWatcher, 'InvalidPriceFeedData');

            await expect(priceWatcher.isPriceInRange(
                ethers.constants.AddressZero,
                1000,
                100 * 1000,
                100 * 1000,
            )).to.be.revertedWithCustomError(priceWatcher, 'InvalidPriceFeedData');
        });
    });
});
