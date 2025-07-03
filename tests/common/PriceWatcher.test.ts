import chai from 'chai';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
    Admin,
    Currency,
    MockPriceFeed,
    PriceWatcher,
} from '@typechain-types';
import { callTransaction, getSignatures, randomWallet } from '@utils/blockchain';
import { Constant } from '@tests/test.constant';
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployCurrency } from '@utils/deployments/common/currency';
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

import { smock } from '@defi-wonderland/smock';

import { addCurrencyToAdminAndPriceWatcher } from '@utils/callWithSignatures/common';
import { deployMockPriceFeed } from '@utils/deployments/mocks/mockPriceFeed';
import { deployPriceWatcher } from '@utils/deployments/common/priceWatcher';

chai.use(smock.matchers);

interface PriceWatcherFixture {
    admin: Admin;
    currency: Currency;
    priceWatcher: PriceWatcher;
    nativePriceFeed: MockPriceFeed;
    currencyPriceFeed: MockPriceFeed;
    
    deployer: any;
    admins: any[];
}

describe('21. PriceWatcher', async () => {
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
        } = fixture;

        if (listSampleCurrencies) {
            await nativePriceFeed.updateData(1000_00000000, 8);
            await currencyPriceFeed.updateData(5_00000000, 8);

            await addCurrencyToAdminAndPriceWatcher(
                admin,
                priceWatcher,
                admins,
                [ethers.constants.AddressZero],
                [true],
                [false],
                [nativePriceFeed.address],
                [3600],
                [10000_000],
                [3],
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
                [50_000],
                [3],
            );
        }

        return fixture;
    }

    describe('21.1. initialize(address, address, string, uint256, uint256, uint256, uint256)', async () => {
        it('21.1.1. Deploy successfully', async () => {
            const { admin, priceWatcher } = await beforePriceWatcherTest({});
            
            expect(await priceWatcher.admin()).to.equal(admin.address);
        });
    });

    describe('21.2. updatePriceFeeds(uint256, uint256, bytes[])', async () => {
        it('21.2.1. updatePriceFeeds successfully with valid signatures', async () => {
            const { admin, admins, priceWatcher } = await beforePriceWatcherTest();
            
            const currencyAddresses = [];
            const priceFeeds = [];
            for (let i = 0; i < 5; ++i) {
                currencyAddresses.push(ethers.utils.computeAddress(ethers.utils.id(`currency_${i}`)));
                priceFeeds.push(ethers.utils.computeAddress(ethers.utils.id(`priceFeed_${i}`)));
            }
            const heartbeats = [40, 50, 60, 70, 80];

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'address[]', 'uint40[]'],
                [priceWatcher.address, 'updatePriceFeeds', currencyAddresses, priceFeeds, heartbeats]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await priceWatcher.updatePriceFeeds(
                currencyAddresses,
                priceFeeds,
                heartbeats,
                signatures
            );
            await tx.wait();

            for (let i = 0; i < currencyAddresses.length; ++i) {
                await expect(tx).to
                    .emit(priceWatcher, 'PriceFeedUpdate')
                    .withArgs(currencyAddresses[i], priceFeeds[i], heartbeats[i]);
                    
                const priceFeed = await priceWatcher.getPriceFeed(currencyAddresses[i]);
                expect(priceFeed.feed).to.equal(priceFeeds[i]);
                expect(priceFeed.heartbeat).to.equal(heartbeats[i]);
            }
        });

        it('21.2.2. updatePriceFeeds unsuccessfully with invalid signatures', async () => {
            const { admin, admins, priceWatcher } = await beforePriceWatcherTest({});
            const currencyAddresses = [];
            const priceFeeds = [];
            for (let i = 0; i < 5; ++i) {
                currencyAddresses.push(ethers.utils.computeAddress(ethers.utils.id(`currency_${i}`)));
                priceFeeds.push(ethers.utils.computeAddress(ethers.utils.id(`priceFeed_${i}`)));
            }
            const heartbeats = [40, 50, 60, 70, 80];

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'address[]', 'uint40[]'],
                [priceWatcher.address, 'updatePriceFeeds', currencyAddresses, priceFeeds, heartbeats]
            );
            const invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(priceWatcher.updatePriceFeeds(
                currencyAddresses,
                priceFeeds,
                heartbeats,
                invalidSignatures
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('21.2.3. updatePriceFeeds unsuccessfully with invalid heartbeat', async () => {
            const { admin, admins, priceWatcher } = await beforePriceWatcherTest({});
            const currencyAddresses = [];
            const priceFeeds = [];
            for (let i = 0; i < 5; ++i) {
                currencyAddresses.push(ethers.utils.computeAddress(ethers.utils.id(`currency_${i}`)));
                priceFeeds.push(ethers.utils.computeAddress(ethers.utils.id(`priceFeed_${i}`)));
            }
            const heartbeats = [40, 50, 0, 70, 80];

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'address[]', 'uint40[]'],
                [priceWatcher.address, 'updatePriceFeeds', currencyAddresses, priceFeeds, heartbeats]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(priceWatcher.updatePriceFeeds(
                currencyAddresses,
                priceFeeds,
                heartbeats,
                signatures
            )).to.be.revertedWithCustomError(priceWatcher, 'InvalidInput');
        });

        it('21.2.4. updatePriceFeeds unsuccessfully with conflicting params length', async () => {
            const { admin, admins, priceWatcher } = await beforePriceWatcherTest({});

            async function testForInvalidInput(currencyAddresses: string[], priceFeeds: string[], heartbeats: number[]) {
                const message = ethers.utils.defaultAbiCoder.encode(
                    ['address', 'string', 'address[]', 'address[]', 'uint40[]'],
                    [priceWatcher.address, 'updatePriceFeeds', currencyAddresses, priceFeeds, heartbeats]
                );
                const signatures = await getSignatures(message, admins, await admin.nonce());
    
                await expect(priceWatcher.updatePriceFeeds(
                    currencyAddresses,
                    priceFeeds,
                    heartbeats,
                    signatures
                )).to.be.revertedWithCustomError(priceWatcher, 'InvalidInput');
            }

            const currencyAddresses = [];
            const priceFeeds = [];
            for (let i = 0; i < 5; ++i) {
                currencyAddresses.push(ethers.utils.computeAddress(ethers.utils.id(`currency_${i}`)));
                priceFeeds.push(ethers.utils.computeAddress(ethers.utils.id(`priceFeed_${i}`)));
            }
            const heartbeats = [40, 50, 60, 70, 80];

            await testForInvalidInput(currencyAddresses.slice(0, 4), priceFeeds, heartbeats);
            await testForInvalidInput(currencyAddresses, priceFeeds.slice(0, 4), heartbeats);
            await testForInvalidInput(currencyAddresses, priceFeeds, heartbeats.slice(0, 4));
        });
    });

    describe('21.3. updateDefaultRates(address[], uint256[], uint8[], bytes[])', async () => {
        it('21.3.1. updateDefaultRates successfully with valid signatures', async () => {
            const { admin, admins, priceWatcher } = await beforePriceWatcherTest();
            
            const currencyAddresses = [];
            for (let i = 0; i < 5; ++i) {
                currencyAddresses.push(ethers.utils.computeAddress(ethers.utils.id(`currency_${i}`)));
            }
            const values = [10, 20_0, 30_00, 40_000, 50_0000];
            const decimals = [0, 1, 2, 3, 4];

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'uint256[]', 'uint8[]'],
                [priceWatcher.address, 'updateDefaultRates', currencyAddresses, values, decimals]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await priceWatcher.updateDefaultRates(
                currencyAddresses,
                values,
                decimals,
                signatures
            );
            await tx.wait();

            for (let i = 0; i < currencyAddresses.length; ++i) {
                await expect(tx).to
                    .emit(priceWatcher, 'DefaultRateUpdate')
                    .withArgs(currencyAddresses[i], values[i], decimals[i]);
                    
                const defaultRate = await priceWatcher.getDefaultRate(currencyAddresses[i]);
                expect(defaultRate.value).to.equal(values[i]);
                expect(defaultRate.decimals).to.equal(decimals[i]);
            }
        });

        it('21.3.2. updateDefaultRates unsuccessfully with invalid signatures', async () => {
            const { admin, admins, priceWatcher } = await beforePriceWatcherTest({});
            const currencyAddresses = [];
            for (let i = 0; i < 5; ++i) {
                currencyAddresses.push(ethers.utils.computeAddress(ethers.utils.id(`currency_${i}`)));
            }
            const values = [10, 20_0, 30_00, 40_000, 50_0000];
            const decimals = [0, 1, 2, 3, 4];

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'uint256[]', 'uint8[]'],
                [priceWatcher.address, 'updateDefaultRates', currencyAddresses, values, decimals]
            );
            const invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(priceWatcher.updateDefaultRates(
                currencyAddresses,
                values,
                decimals,
                invalidSignatures
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('21.3.3. updateDefaultRates unsuccessfully with invalid decimals', async () => {
            const { admin, admins, priceWatcher } = await beforePriceWatcherTest({});
            const currencyAddresses = [];
            for (let i = 0; i < 5; ++i) {
                currencyAddresses.push(ethers.utils.computeAddress(ethers.utils.id(`currency_${i}`)));
            }
            const values = [10, 20_0, 30_00, 40_000, 50_0000];
            const decimals = [0, 1, 19, 3, 4];

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'uint256[]', 'uint8[]'],
                [priceWatcher.address, 'updateDefaultRates', currencyAddresses, values, decimals]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(priceWatcher.updateDefaultRates(
                currencyAddresses,
                values,
                decimals,
                signatures
            )).to.be.revertedWithCustomError(priceWatcher, 'InvalidInput');
        });

        it('21.3.4. updateDefaultRates unsuccessfully with conflicting params length', async () => {
            const { admin, admins, priceWatcher } = await beforePriceWatcherTest({});

            async function testForInvalidInput(currencyAddresses: string[], values: number[], decimals: number[]) {
                const message = ethers.utils.defaultAbiCoder.encode(
                    ['address', 'string', 'address[]', 'uint256[]', 'uint8[]'],
                    [priceWatcher.address, 'updateDefaultRates', currencyAddresses, values, decimals]
                );
                const signatures = await getSignatures(message, admins, await admin.nonce());
    
                await expect(priceWatcher.updateDefaultRates(
                    currencyAddresses,
                    values,
                    decimals,
                    signatures
                )).to.be.revertedWithCustomError(priceWatcher, 'InvalidInput');
            }

            const currencyAddresses = [];
            for (let i = 0; i < 5; ++i) {
                currencyAddresses.push(ethers.utils.computeAddress(ethers.utils.id(`currency_${i}`)));
            }
            const values = [10, 20_0, 30_00, 40_000, 50_0000];
            const decimals = [0, 1, 2, 3, 4];

            await testForInvalidInput(currencyAddresses.slice(0, 4), values, decimals);
            await testForInvalidInput(currencyAddresses, values.slice(0, 4), decimals);
            await testForInvalidInput(currencyAddresses, values, decimals.slice(0, 4));
        });
    });

    describe('21.4. isPriceInRange(address, uint256, uint256, uint256)', async () => {
        it('21.4.1. return correct value when currency have price feed', async () => {
            const fixture = await beforePriceWatcherTest({
                listSampleCurrencies: true,
            });

            const { priceWatcher } = fixture;

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

        it('21.4.2. return correct value when currency have default price', async () => {
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
                [2_0000],
                [4]
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

        it('21.4.3. revert when currency is unavailable', async () => {
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
                [100_000],
                [3]
            );

            await expect(priceWatcher.isPriceInRange(
                unavailableCurrency.address,
                1000,
                100 * 1000,
                100 * 1000,
            )).to.be.revertedWithCustomError(priceWatcher, 'InvalidCurrency');
        });

        it('21.4.4. revert when currency rate is missing', async () => {
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
                [0],
                [0]
            );

            await expect(priceWatcher.isPriceInRange(
                unavailableCurrency.address,
                1000,
                100 * 1000,
                100 * 1000,
            )).to.be.revertedWithCustomError(priceWatcher, 'MissingCurrencyRate');
        });
        
        it('21.4.5. revert when price feed is stale', async () => {
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

        it('21.4.6. revert when price feed return invalid data', async () => {
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
                [10000_000],
                [3],
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
                [50_000],
                [3],
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
