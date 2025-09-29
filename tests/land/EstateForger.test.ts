import chai from 'chai';
import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import {
    Admin,
    CommissionToken,
    Currency,
    EstateToken,
    FeeReceiver,
    EstateForger,
    MockPriceFeed,
    MockEstateForger,
    IEstateTokenizer__factory,
    IEstateTokenReceiver__factory,
    ICommon__factory,
    IERC1155ReceiverUpgradeable__factory,
    ReserveVault,
    PriceWatcher,
    IERC165Upgradeable__factory,
    IEstateForger__factory,
    ICommissionDispatchable__factory,
    IValidatable__factory,
} from '@typechain-types';
import { callTransaction, callTransactionAtTimestamp, getBalance, getSignatures, prepareERC20, prepareNativeToken, randomWallet, resetERC20, resetNativeToken, testReentrancy } from '@utils/blockchain';
import { Constant, DAY } from '@tests/test.constant';
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployFeeReceiver } from '@utils/deployments/common/feeReceiver';
import { deployCurrency } from '@utils/deployments/common/currency';
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { applyDiscount } from '@utils/formula';
import { MockContract, smock } from '@defi-wonderland/smock';

import {
    callAdmin_ActivateIn,
    callAdmin_AuthorizeManagers,
    callAdmin_AuthorizeModerators,
    callAdmin_DeclareZone,
    callAdmin_UpdateCurrencyRegistries,
} from '@utils/call/common/admin';
import {
    callEstateToken_UpdateCommissionToken,
    callEstateToken_AuthorizeTokenizers,
} from '@utils/call/land/estateToken';
import { BigNumber, BigNumberish, Contract, ContractTransaction, Wallet } from 'ethers';
import { randomInt } from 'crypto';
import { getBytes4Hex, getInterfaceID, randomBigNumber, structToObject } from '@utils/utils';
import { OrderedMap } from '@utils/utils';
import { deployEstateForger } from '@utils/deployments/land/estateForger';
import { addCurrencyToAdminAndPriceWatcher } from '@utils/call/Common';
import { callEstateForger_UpdateBaseUnitPriceRange, callEstateForger_Whitelist } from '@utils/call/estateForger';
import { deployMockPriceFeed } from '@utils/deployments/mock/mockPriceFeed';
import { deployFailReceiver } from '@utils/deployments/mock/failReceiver';
import { deployReentrancy } from '@utils/deployments/mock/mockReentrancy/reentrancy';
import { deployEstateToken } from '@utils/deployments/land/estateToken';
import { deployMockEstateForger } from '@utils/deployments/mock/mockEstateForger';
import { deployReentrancyERC1155Holder } from '@utils/deployments/mock/mockReentrancy/reentrancyERC1155Holder';
import { request } from 'http';
import { Initialization as LandInitialization } from '@tests/land/test.initialization';
import { callReserveVault_AuthorizeProvider } from '@utils/call/ReserveVault';
import { remain, scaleRate } from '@utils/formula';
import { RequestQuote, RequestAgenda, RequestEstate, RequestQuota, SafeDepositParams, DepositParams, ConfirmParams } from '@utils/models/land/estateForger';
import { deployPriceWatcher } from '@utils/deployments/common/priceWatcher';
import { Rate } from '@utils/models/common/common';
import { MockValidator } from '@utils/mockValidator';
import { RegisterSellerInParams, RequestTokenizationParams, UpdateRequestEstateURIParams, UpdateRequestAgendaParams } from '@utils/models/land/estateForger';
import { getRegisterSellerInValidation, getRequestTokenizationValidation, getRegisterSellerInInvalidValidation, getRequestTokenizationInvalidValidation, getUpdateRequestEstateURIValidation, getUpdateRequestEstateURIInvalidValidation } from '@utils/validation/EstateForger';
import { RegisterCustodianParams } from '@utils/models/land/estateToken';
import { getRegisterCustodianTx } from '@utils/transaction/land/estateToken';
import { getRequestTokenizationTx, getSafeConfirmTx, getSafeConfirmTxByParams, getSafeDepositTx, getSafeDepositTxByParams, getUpdateRequestAgendaTx, getUpdateRequestEstateURITx } from '@utils/transaction/land/estateForger';
import { getActivateBrokerTx, getRegisterBrokerTx } from '@utils/transaction/land/commissionToken';
import { callPausable_Pause } from '@utils/call/common/pausable';

chai.use(smock.matchers);

export interface EstateForgerFixture {
    admin: Admin;
    feeReceiver: FeeReceiver;
    currencies: Currency[];
    estateToken: MockContract<EstateToken>;
    commissionToken: MockContract<CommissionToken>;
    reserveVault: MockContract<ReserveVault>;
    priceWatcher: PriceWatcher;
    estateForger: MockEstateForger;
    nativePriceFeed: MockPriceFeed;
    currencyPriceFeed: MockPriceFeed;
    validator: MockValidator;
    
    deployer: any;
    admins: any[];

    manager: any;
    moderator: any;
    user: any;
    custodian1: any, custodian2: any, custodian3: any;
    depositor1: any, depositor2: any, depositor3: any;
    depositors: any[];
    broker1: any, broker2: any;
    failReceiver: any;
    reentrancy: any;

    zone1: string, zone2: string;
}

async function testReentrancy_estateForger(
    estateForger: EstateForger,
    reentrancyContract: Contract,
    assertion: any,
) {
    let data = [
        estateForger.interface.encodeFunctionData("deposit", [0, 0]),
        estateForger.interface.encodeFunctionData("safeConfirm", [0, ethers.utils.keccak256(ethers.utils.toUtf8Bytes(""))]),
        estateForger.interface.encodeFunctionData("withdrawDeposit", [0]),
    ];

    await testReentrancy(
        reentrancyContract,
        estateForger,
        data,
        assertion,
    );
}

export async function getCommissionDenomination(
    commissionToken: CommissionToken,
    feeDenomination: BigNumber,
    zone: string,
    broker: string,
) {
    return scaleRate(
        feeDenomination,
        await commissionToken.getBrokerCommissionRate(zone, broker),
    )
}

export async function getCashbackBaseDenomination(
    feeDenomination: BigNumber,
    commissionDenomination: BigNumber,
    cashbackBaseRate: Rate,
) {
    return scaleRate(
        feeDenomination.sub(commissionDenomination),
        cashbackBaseRate,
    );
}

describe('2.2. EstateForger', async () => {
    async function estateForgerFixture(): Promise<EstateForgerFixture> {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        const admins = [];
        for (let i = 1; i <= Constant.ADMIN_NUMBER; ++i) admins.push(accounts[i]);
        const user = accounts[Constant.ADMIN_NUMBER + 1];
        const manager = accounts[Constant.ADMIN_NUMBER + 2];
        const moderator = accounts[Constant.ADMIN_NUMBER + 3];
        const custodian1 = accounts[Constant.ADMIN_NUMBER + 4];
        const custodian2 = accounts[Constant.ADMIN_NUMBER + 5];
        const custodian3 = accounts[Constant.ADMIN_NUMBER + 6];
        const depositor1 = accounts[Constant.ADMIN_NUMBER + 7];
        const depositor2 = accounts[Constant.ADMIN_NUMBER + 8];
        const depositor3 = accounts[Constant.ADMIN_NUMBER + 9];
        const broker1 = accounts[Constant.ADMIN_NUMBER + 10];
        const broker2 = accounts[Constant.ADMIN_NUMBER + 11];

        const depositors = [depositor1, depositor2, depositor3];

        const adminAddresses: string[] = admins.map(signer => signer.address);
        const admin = await deployAdmin(
            deployer.address,
            adminAddresses[0],
            adminAddresses[1],
            adminAddresses[2],
            adminAddresses[3],
            adminAddresses[4],
        ) as Admin;

        const feeReceiver = await deployFeeReceiver(
            deployer.address,
            admin.address
        ) as FeeReceiver;

        const SmockCurrencyFactory = await smock.mock('Currency') as any;
        const currency1 = await SmockCurrencyFactory.deploy();
        const currency2 = await SmockCurrencyFactory.deploy();
        const currency3 = await SmockCurrencyFactory.deploy();
        await callTransaction(currency1.initialize('MockCurrency1', 'MCK1'));
        await callTransaction(currency2.initialize('MockCurrency2', 'MCK2'));
        await callTransaction(currency3.initialize('MockCurrency3', 'MCK3'));

        await callTransaction(currency1.setExclusiveDiscount(ethers.utils.parseEther('0.3'), Constant.COMMON_RATE_DECIMALS));
        await callTransaction(currency2.setExclusiveDiscount(ethers.utils.parseEther('0.4'), Constant.COMMON_RATE_DECIMALS));
        await callTransaction(currency3.setExclusiveDiscount(ethers.utils.parseEther('0.5'), Constant.COMMON_RATE_DECIMALS));

        const currencies = [currency1, currency2, currency3];

        const validator = new MockValidator(deployer as any);

        const nativePriceFeed = await deployMockPriceFeed(deployer.address, 0, 0) as MockPriceFeed;
        const currencyPriceFeed = await deployMockPriceFeed(deployer.address, 0, 0) as MockPriceFeed;
        
        const MockEstateTokenFactory = await smock.mock('EstateToken') as any;
        const estateToken = await MockEstateTokenFactory.deploy() as MockContract<EstateToken>;
        await callTransaction(estateToken.initialize(
            admin.address,
            feeReceiver.address,
            validator.getAddress(),
            LandInitialization.ESTATE_TOKEN_BaseURI,
        ));

        const SmockCommissionTokenFactory = await smock.mock('CommissionToken') as any;
        const commissionToken = await SmockCommissionTokenFactory.deploy() as MockContract<CommissionToken>;
        await callTransaction(commissionToken.initialize(
            admin.address,
            estateToken.address,
            feeReceiver.address,
            LandInitialization.COMMISSION_TOKEN_Name,
            LandInitialization.COMMISSION_TOKEN_Symbol,
            LandInitialization.COMMISSION_TOKEN_BaseURI,
            LandInitialization.COMMISSION_TOKEN_RoyaltyRate,
        ));

        await callEstateToken_UpdateCommissionToken(
            estateToken,
            admins,
            commissionToken.address,
            await admin.nonce()
        );

        const SmockReserveVaultFactory = await smock.mock('ReserveVault') as any;
        const reserveVault = await SmockReserveVaultFactory.deploy() as MockContract<ReserveVault>;
        await callTransaction(reserveVault.initialize(
            admin.address,
        ));

        const priceWatcher = await deployPriceWatcher(
            deployer.address,
            admin.address
        ) as PriceWatcher;

        const estateForger = await deployMockEstateForger(
            deployer,
            admin.address,
            estateToken.address,
            commissionToken.address,
            priceWatcher.address,
            feeReceiver.address,
            reserveVault.address,
            validator.getAddress(),
            LandInitialization.ESTATE_FORGER_BaseMinUnitPrice,
            LandInitialization.ESTATE_FORGER_BaseMaxUnitPrice,
        ) as MockEstateForger;

        const zone1 = ethers.utils.formatBytes32String("TestZone1");
        const zone2 = ethers.utils.formatBytes32String("TestZone2");

        const failReceiver = await deployFailReceiver(deployer, false, false);
        const reentrancy = await deployReentrancyERC1155Holder(deployer);

        return {
            admin,
            feeReceiver,
            currencies,
            estateToken,
            commissionToken,
            reserveVault,
            priceWatcher,
            estateForger,
            nativePriceFeed,
            currencyPriceFeed,
            validator,
            deployer,
            admins,
            manager,
            moderator,
            user,
            custodian1,
            custodian2,
            custodian3,
            depositor1,
            depositor2,
            depositor3,
            depositors,
            broker1,
            broker2,
            zone1,
            zone2,
            failReceiver,
            reentrancy,
        };
    };

    async function beforeEstateForgerTest({
        skipDeclareZone = false,
        registerBrokers = false,
        listSampleCurrencies = false,
        fundERC20ForDepositors = false,
        fundERC20ForManagers = false,
        addZoneForExecutive = false,
        addEstateForgerToVault = false,
        whitelistDepositors = false,
        whitelistDepositorsForRequests = false,
        useFailReceiverAsBroker = false,
        useReentrancyAsBroker = false,
        listSampleCustodians = false,
        addSampleRequests = false,
        useNoCashback = false,
        addDepositions = false,
        confirmRequests = false,        
        pause = false,
    } = {}): Promise<EstateForgerFixture> {
        const fixture = await loadFixture(estateForgerFixture);
        const {
            deployer,
            admin,
            admins,
            manager,
            moderator,
            estateToken,
            estateForger,
            commissionToken,
            priceWatcher,
            currencies,
            nativePriceFeed,
            currencyPriceFeed,
            broker2,
            zone1,
            zone2,
            custodian1,
            custodian2,
            custodian3,
            depositor1,
            depositor2,
            depositor3,
            depositors,
            reserveVault,
            validator,
            failReceiver,
            reentrancy,
        } = fixture;

        let broker1 = fixture.broker1;
        if (useFailReceiverAsBroker) {
            broker1 = failReceiver;
        }
        if (useReentrancyAsBroker) {
            broker1 = reentrancy;
        }

        await callAdmin_AuthorizeManagers(
            admin,
            admins,
            [manager.address],
            true,
            await admin.nonce()
        );

        await callAdmin_AuthorizeModerators(
            admin,
            admins,
            [moderator.address],
            true,
            await admin.nonce()
        );

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
                [{ value: BigNumber.from(10000_000), decimals: 3 }],
            );
            
            await addCurrencyToAdminAndPriceWatcher(
                admin,
                priceWatcher,
                admins,
                [currencies[0].address],
                [true],
                [true],
                [currencyPriceFeed.address],
                [24 * 3600],
                [{ value: BigNumber.from(50_000), decimals: 3 }],
            );

            await callAdmin_UpdateCurrencyRegistries(
                admin,
                admins,
                [currencies[1].address, currencies[2].address],
                [true, true],
                [false, false],
                await admin.nonce(),
            );
        }

        if (fundERC20ForDepositors) {
            await prepareERC20(
                currencies[0],
                [depositor1, depositor2, depositor3],
                [estateForger],
                ethers.utils.parseEther('1000000000'),
            );
        }

        if (!skipDeclareZone) {
            for (const zone of [zone1, zone2]) {
                await callAdmin_DeclareZone(
                    admin,
                    admins,
                    zone,
                    await admin.nonce()
                );
            }
        }

        await callEstateToken_AuthorizeTokenizers(
            estateToken,
            admins,
            [estateForger.address],
            true,
            await admin.nonce()
        );

        let timestamp = await time.latest() + 1000;

        if (addZoneForExecutive) {
            for (const zone of [zone1, zone2]) {
                await callAdmin_ActivateIn(
                    admin,
                    admins,
                    zone,
                    [manager.address, moderator.address],
                    true,
                    await admin.nonce()
                );
            }
        }

        if (addEstateForgerToVault) {
            await callReserveVault_AuthorizeProvider(
                reserveVault,
                admins,
                [estateForger.address],
                true,
                await admin.nonce()
            );
        }

        if (registerBrokers) {
            await callTransaction(getRegisterBrokerTx(commissionToken as any, manager, {
                zone: zone1,
                broker: broker1.address,
                commissionRate: ethers.utils.parseEther('0.01'),
            }));
            await callTransaction(getRegisterBrokerTx(commissionToken as any, manager, {
                zone: zone2,
                broker: broker2.address,
                commissionRate: ethers.utils.parseEther('0.02'),
            }));
        }

        if (whitelistDepositors) {
            await callEstateForger_Whitelist(
                estateForger,
                admins,
                [depositor1.address, depositor2.address, depositor3.address],
                true,
                await admin.nonce()
            );
        }

        if (listSampleCustodians) {
            for (const [zoneIndex, zone] of [zone1, zone2].entries()) {
                for (const [custodianIndex, custodian] of [custodian1, custodian2, custodian3].entries()) {
                    const params: RegisterCustodianParams = {
                        zone,
                        custodian: custodian.address,
                        uri: `custodian${custodianIndex+1}_zone${zoneIndex+1}_uri`,
                    };
                    await callTransaction(getRegisterCustodianTx(estateToken as any, validator, manager, params));
                }
            }
        }

        if (addSampleRequests) {
            let params1: RequestTokenizationParams = {
                requester: custodian1.address,
                estate: {
                    zone: zone1,
                    uri: 'TestingURI1',
                    expireAt: timestamp + 1e9,
                },
                quota: {
                    totalQuantity: BigNumber.from('70'),
                    minSellingQuantity: BigNumber.from('10'),
                    maxSellingQuantity: BigNumber.from('30'),                    
                },
                quote: {
                    unitPrice: ethers.utils.parseEther('0.2'),
                    currency: ethers.constants.AddressZero,
                    cashbackThreshold: BigNumber.from('5'),
                    cashbackBaseRate: ethers.utils.parseEther("0.1"),
                    cashbackCurrencies: [currencies[0].address, currencies[1].address],
                    cashbackDenominations: [ethers.utils.parseEther('0.01'), ethers.utils.parseEther('0.02')],
                    feeDenomination: ethers.utils.parseEther('0.03'),
                    broker: broker1.address,
                },
                agenda: {
                    saleStartsAt: timestamp + 10,
                    privateSaleDuration: 20 * DAY,
                    publicSaleDuration: 40 * DAY,
                },
            };
            if (useNoCashback) {
                params1.quote.cashbackBaseRate = BigNumber.from(0);
                params1.quote.cashbackCurrencies = [];
                params1.quote.cashbackDenominations = [];
                params1.quote.cashbackThreshold = BigNumber.from(0);
            }

            await callTransaction(getRequestTokenizationTx(estateForger, validator, manager, params1));

            const params2: RequestTokenizationParams = {
                requester: custodian2.address,
                estate: {
                    zone: zone2,
                    uri: 'TestingURI2',
                    expireAt: timestamp + 1e9,
                },
                quota: {
                    totalQuantity: BigNumber.from('1000'),
                    minSellingQuantity: BigNumber.from('200'),
                    maxSellingQuantity: BigNumber.from('1000'),
                },
                quote: {
                    unitPrice: ethers.utils.parseEther('100'),
                    currency: currencies[0].address,
                    cashbackThreshold: BigNumber.from('50'),
                    cashbackBaseRate: ethers.utils.parseEther("0.2"),
                    cashbackCurrencies: [currencies[1].address, ethers.constants.AddressZero],
                    cashbackDenominations: [ethers.utils.parseEther('0.01'), ethers.utils.parseEther('0.02')],
                    feeDenomination: ethers.utils.parseEther('20'),
                    broker: broker2.address,
                },
                agenda: {
                    saleStartsAt: timestamp + 20,
                    privateSaleDuration: 30 * DAY,
                    publicSaleDuration: 60 * DAY,
                },
            };
            if (useNoCashback) {
                params2.quote.cashbackBaseRate = BigNumber.from(0);
                params2.quote.cashbackCurrencies = [];
                params2.quote.cashbackDenominations = [];
                params2.quote.cashbackThreshold = BigNumber.from(0);
            }

            await callTransaction(getRequestTokenizationTx(estateForger, validator, manager, params2));
        }

        if (whitelistDepositorsForRequests) {
            for (const requestId of [1, 2]) {
                await callTransaction(estateForger.connect(manager).whitelistFor(
                    requestId,
                    depositors.map(x => x.address),
                    true,
                ));
            }
        }

        if (addDepositions) {
            timestamp = Math.max(
                (await estateForger.getRequest(1)).agenda.privateSaleEndsAt,
                (await estateForger.getRequest(2)).agenda.privateSaleEndsAt,
            )
            await time.setNextBlockTimestamp(timestamp);

            await callTransaction(estateForger.connect(depositor1).deposit(1, 2, { value: ethers.utils.parseEther('10') }));
            await callTransaction(estateForger.connect(depositor2).deposit(1, 5, { value: ethers.utils.parseEther('10') }));
            await callTransaction(estateForger.connect(depositor3).deposit(1, 10, { value: ethers.utils.parseEther('10') }));

            await callTransaction(estateForger.connect(depositor1).deposit(2, 200));
            await callTransaction(estateForger.connect(depositor2).deposit(2, 300));
            await callTransaction(estateForger.connect(depositor3).deposit(2, 500));
        }

        if (fundERC20ForManagers) {
            // await prepareNativeToken(ethers.provider, deployer, [manager], ethers.utils.parseEther('10000'));

            for(const currency of currencies) {
                await prepareERC20(currency, [manager], [estateForger], ethers.utils.parseEther('10000'));
            }
        }

        if (confirmRequests) {
            const params1: ConfirmParams = {
                requestId: BigNumber.from(1),
            }
            await callTransaction(getSafeConfirmTxByParams(
                estateForger,
                manager,
                params1,
                { value: ethers.utils.parseEther('1000') }
            ));

            const params2: ConfirmParams = {
                requestId: BigNumber.from(2),
            }
            await callTransaction(getSafeConfirmTxByParams(
                estateForger,
                manager,
                params2,
                { value: ethers.utils.parseEther('1000')}
            ));
        }

        if (pause) {
            await callPausable_Pause(estateForger, deployer, admins, admin);
        }

        return fixture;
    }

    describe('2.2.1. initialize(address, address, string, uint256, uint256, uint256, uint256)', async () => {
        it('2.2.1.1. Deploy successfully', async () => {
            const { admin, estateForger, estateToken, feeReceiver, commissionToken, priceWatcher, reserveVault, validator } = await beforeEstateForgerTest({});
            
            expect(await estateForger.paused()).to.equal(false);

            expect(await estateForger.admin()).to.equal(admin.address);
            expect(await estateForger.estateToken()).to.equal(estateToken.address);
            expect(await estateForger.commissionToken()).to.equal(commissionToken.address);
            expect(await estateForger.feeReceiver()).to.equal(feeReceiver.address);
            expect(await estateForger.priceWatcher()).to.equal(priceWatcher.address);
            expect(await estateForger.reserveVault()).to.equal(reserveVault.address);

            expect(await estateForger.baseMinUnitPrice()).to.equal(LandInitialization.ESTATE_FORGER_BaseMinUnitPrice);
            expect(await estateForger.baseMaxUnitPrice()).to.equal(LandInitialization.ESTATE_FORGER_BaseMaxUnitPrice);

            expect(await estateForger.validator()).to.equal(validator.getAddress());

            expect(await estateForger.requestNumber()).to.equal(0);
        });
    });

    describe('2.2.2. updateBaseUnitPriceRange(uint256, uint256, bytes[])', async () => {
        it('2.2.2.1. updateBaseUnitPriceRange successfully with valid signatures', async () => {
            const { admin, admins, estateForger } = await beforeEstateForgerTest({});
            
            const baseMinUnitPrice = 20;
            const baseMaxUnitPrice = 100;

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'uint256', 'uint256'],
                [estateForger.address, 'updateBaseUnitPriceRange', baseMinUnitPrice, baseMaxUnitPrice]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await estateForger.updateBaseUnitPriceRange(
                baseMinUnitPrice,
                baseMaxUnitPrice,
                signatures
            );
            await tx.wait();

            await expect(tx).to
                .emit(estateForger, 'BaseUnitPriceRangeUpdate')
                .withArgs(baseMinUnitPrice, baseMaxUnitPrice);

            expect(await estateForger.baseMinUnitPrice()).to.equal(baseMinUnitPrice);
            expect(await estateForger.baseMaxUnitPrice()).to.equal(baseMaxUnitPrice);
        });

        it('2.2.2.2. updateBaseUnitPriceRange unsuccessfully with invalid signatures', async () => {
            const { admin, admins, estateForger } = await beforeEstateForgerTest({});
            const baseMinUnitPrice = 20;
            const baseMaxUnitPrice = 100;

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'uint256', 'uint256'],
                [estateForger.address, 'updateBaseUnitPriceRange', baseMinUnitPrice, baseMaxUnitPrice]
            );
            const invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(estateForger.updateBaseUnitPriceRange(
                baseMinUnitPrice,
                baseMaxUnitPrice,
                invalidSignatures
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('2.2.2.3. updateBaseUnitPriceRange unsuccessfully with invalid price range', async () => {
            const { admin, admins, estateForger } = await beforeEstateForgerTest({});
            const baseMinUnitPrice = 101;
            const baseMaxUnitPrice = 100;

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'uint256', 'uint256'],
                [estateForger.address, 'updateBaseUnitPriceRange', baseMinUnitPrice, baseMaxUnitPrice]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(estateForger.updateBaseUnitPriceRange(
                baseMinUnitPrice,
                baseMaxUnitPrice,
                signatures
            )).to.be.revertedWithCustomError(estateForger, 'InvalidInput');
        });
    });

    describe('2.2.3. whitelist(address[], bool, bytes[])', async () => {
        it('2.2.3.1. Whitelist user successfully', async () => {
            const fixture = await beforeEstateForgerTest();
            const { admins, admin, estateForger, depositor1, depositor2, depositor3 } = fixture;            

            const depositors = [depositor1, depositor2, depositor3];

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [estateForger.address, 'whitelist', depositors.map(x => x.address), true]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());
            
            const tx = await estateForger.whitelist(depositors.map(x => x.address), true, signatures);
            await tx.wait();
            
            for(const depositor of depositors) {
                await expect(tx).to
                    .emit(estateForger, 'Whitelist')
                    .withArgs(depositor.address);
            }

            for (let i = 0; i < depositors.length; ++i) {
                const isWhitelisted = await estateForger.isWhitelisted(depositors[i].address);
                expect(isWhitelisted).to.be.true;
            }
        });

        it('2.2.3.2. Whitelist unsuccessfully with invalid signatures', async () => {
            const fixture = await beforeEstateForgerTest();
            const { admins, admin, estateForger, depositor1, depositor2, depositor3 } = fixture;            

            const depositors = [depositor1, depositor2, depositor3];

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [estateForger.address, 'whitelist', depositors.map(x => x.address), true]
            );
            const signatures = await getSignatures(message, admins, (await admin.nonce()).add(1));
            
            await expect(estateForger.whitelist(
                depositors.map(x => x.address),
                true,
                signatures
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('2.2.3.3. Whitelist unsuccessfully when whitelisting same account twice on same tx', async () => {
            const fixture = await beforeEstateForgerTest();
            const { admins, admin, estateForger, depositor1, depositor2, depositor3 } = fixture;            

            const depositors = [depositor1, depositor2, depositor3, depositor1];

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [estateForger.address, 'whitelist', depositors.map(x => x.address), true]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());
            
            await expect(estateForger.whitelist(
                depositors.map(x => x.address),
                true,
                signatures
            )).to.be.revertedWithCustomError(estateForger, 'WhitelistedAccount')
        });

        it('2.2.3.4. Whitelist unsuccessfully when whitelisting same account twice on different tx', async () => {
            const fixture = await beforeEstateForgerTest();
            const { admins, admin, estateForger, depositor1, depositor2, depositor3 } = fixture;            

            let depositors = [depositor1, depositor3];
            await callEstateForger_Whitelist(estateForger, admins, depositors.map(x => x.address), true, await admin.nonce());

            depositors = [depositor2, depositor3];
            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [estateForger.address, 'whitelist', depositors.map(x => x.address), true]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(estateForger.whitelist(
                depositors.map(x => x.address),
                true,
                signatures
            )).to.be.revertedWithCustomError(estateForger, 'WhitelistedAccount')
        });

        
        it('2.2.3.5. Unwhitelist account successfully', async () => {
            const fixture = await beforeEstateForgerTest({
                whitelistDepositors: true,
            });
            const { admins, admin, estateForger, depositor1, depositor2, depositor3 } = fixture;            

            const depositors = [depositor1, depositor2, depositor3];
            const toUnwhitelistDepositors = [depositor1, depositor3];

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [estateForger.address, 'whitelist', toUnwhitelistDepositors.map(x => x.address), false]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());
            
            const tx = await estateForger.whitelist(
                toUnwhitelistDepositors.map(x => x.address),
                false,
                signatures
            );
            await tx.wait();
            
            for(const depositor of toUnwhitelistDepositors) {
                await expect(tx).to
                    .emit(estateForger, 'Unwhitelist')
                    .withArgs(depositor.address);
            }

            for(const depositor of depositors) {
                if (toUnwhitelistDepositors.includes(depositor)) {
                    expect(await estateForger.isWhitelisted(depositor.address)).to.be.false;
                } else {
                    expect(await estateForger.isWhitelisted(depositor.address)).to.be.true;
                }
            }
        });

        it('2.2.3.6. Unwhitelist account unsuccessfully with not whitelisted account', async () => {
            const fixture = await beforeEstateForgerTest();
            const { admins, admin, estateForger, depositor1, depositor2, depositor3 } = fixture;            

            const toUnwhitelistDepositors = [depositor1, depositor2, depositor3];
            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [estateForger.address, 'whitelist', toUnwhitelistDepositors.map(x => x.address), false]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(estateForger.whitelist(
                toUnwhitelistDepositors.map(x => x.address),
                false,
                signatures
            )).to.be.revertedWithCustomError(estateForger, 'NotWhitelistedAccount')
        });

        it('2.2.3.7. Unwhitelist account unsuccessfully when unwhitelisting same account twice on same tx', async () => {
            const fixture = await beforeEstateForgerTest({
                whitelistDepositors: true,
            });
            const { admins, admin, estateForger, depositor1, depositor2, depositor3 } = fixture;            

            const toUnwhitelistDepositors = [depositor1, depositor2, depositor3, depositor1];

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [estateForger.address, 'whitelist', toUnwhitelistDepositors.map(x => x.address), false]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());
            
            await expect(estateForger.whitelist(
                toUnwhitelistDepositors.map(x => x.address),
                false,
                signatures
            )).to.be.revertedWithCustomError(estateForger, 'NotWhitelistedAccount')
        });

        it('2.2.3.8. Unwhitelist account unsuccessfully when unwhitelisting same account twice on different tx', async () => {
            const fixture = await beforeEstateForgerTest({
                whitelistDepositors: true,
            });
            const { admins, admin, estateForger, depositor1, depositor2, depositor3 } = fixture;            

            const tx1_depositors = [depositor1, depositor2];
            await callEstateForger_Whitelist(estateForger, admins, tx1_depositors.map(x => x.address), false, await admin.nonce());
            
            const tx2_depositors = [depositor3, depositor2];
            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [estateForger.address, 'whitelist', tx2_depositors.map(x => x.address), false]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(estateForger.whitelist(
                tx2_depositors.map(x => x.address),
                false,
                signatures
            )).to.be.revertedWithCustomError(estateForger, 'NotWhitelistedAccount')
        });
    });

    describe('2.2.4. getRequest(uint256)', async () => {
        it('2.2.4.1. return successfully', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                registerBrokers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { estateForger } = fixture;

            await expect(estateForger.getRequest(1)).to.not.be.reverted;
            await expect(estateForger.getRequest(2)).to.not.be.reverted;
        });

        it('2.2.4.2. revert with invalid request id', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                registerBrokers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { estateForger } = fixture;

            await expect(estateForger.getRequest(0))
                .to.be.revertedWithCustomError(estateForger, 'InvalidRequestId');
            await expect(estateForger.getRequest(3))
                .to.be.revertedWithCustomError(estateForger, 'InvalidRequestId');
        });
    });

    describe('2.2.5. requestTokenization(address, (bytes32, string, uint8, uint40), (uint256, uint256, uint256), (uint256, address, uint256, uint256, address[], uint256[]), (uint40, uint40, uint40))', async () => {
        async function getDefaultParams(
            fixture: EstateForgerFixture,
        ): Promise<RequestTokenizationParams> {
            const { custodian1, zone1, currencies, broker1 } = fixture;
            let timestamp = await time.latest() + 1000;

            const defaultParams: RequestTokenizationParams = {
                requester: custodian1.address,
                estate: {
                    zone: zone1,
                    uri: 'TestingURI1',
                    expireAt: timestamp + 1e9,
                },
                quota: {
                    totalQuantity: BigNumber.from('70'),
                    minSellingQuantity: BigNumber.from('10'),
                    maxSellingQuantity: BigNumber.from('30'),                    
                },
                quote: {
                    unitPrice: ethers.utils.parseEther('0.2'),
                    currency: ethers.constants.AddressZero,
                    cashbackThreshold: BigNumber.from(5),
                    cashbackBaseRate: ethers.utils.parseEther("0.1"),
                    cashbackCurrencies: [currencies[0].address, currencies[1].address],
                    cashbackDenominations: [ethers.utils.parseEther('0.01'), ethers.utils.parseEther('0.02')],
                    feeDenomination: ethers.utils.parseEther('0.03'),
                    broker: broker1.address,
                },
                agenda: {
                    saleStartsAt: timestamp + 10,
                    privateSaleDuration: 20 * DAY,
                    publicSaleDuration: 40 * DAY,
                },
            }

            return defaultParams;
        }

        it('2.2.5.1. requestTokenization successfully by manager', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addEstateForgerToVault: true,
                registerBrokers: true,
            });
            const { manager, estateForger, reserveVault, commissionToken, admin, validator } = fixture;

            const defaultParams = await getDefaultParams(fixture);

            const data = defaultParams;

            // By manager
            const tx = await getRequestTokenizationTx(estateForger, validator, manager, data);
            const receipt = await tx.wait();

            const fundId = await reserveVault.fundNumber();
            
            const commissionDenomination = await getCommissionDenomination(
                commissionToken as any,
                data.quote.feeDenomination,
                data.estate.zone,
                data.quote.broker,
            );
            const mainDenomination = await getCashbackBaseDenomination(
                data.quote.feeDenomination,
                commissionDenomination,
                {
                    value: data.quote.cashbackBaseRate,
                    decimals: 18,
                },
            );

            const fund = await reserveVault.getFund(fundId);
            expect(fund.mainCurrency).to.equal(data.quote.currency);
            expect(fund.mainDenomination).to.equal(mainDenomination);
            expect(fund.extraCurrencies).to.deep.equal(data.quote.cashbackCurrencies);
            expect(fund.extraDenominations).to.deep.equal(data.quote.cashbackDenominations);

            const requestEstate: RequestEstate = {
                ...data.estate,
                estateId: ethers.BigNumber.from(0),
            }
            const requestQuota: RequestQuota = {
                ...data.quota,
                soldQuantity: ethers.BigNumber.from(0),
            }
            const requestQuote: RequestQuote = {
                unitPrice: data.quote.unitPrice,
                currency: data.quote.currency,
                cashbackThreshold: data.quote.cashbackThreshold,
                cashbackFundId: fundId,
                feeDenomination: data.quote.feeDenomination,
                commissionDenomination: commissionDenomination,
                broker: data.quote.broker,
            }
            const requestAgenda: RequestAgenda = {
                saleStartsAt: data.agenda.saleStartsAt,
                privateSaleEndsAt: data.agenda.saleStartsAt + data.agenda.privateSaleDuration,
                publicSaleEndsAt: data.agenda.saleStartsAt + data.agenda.privateSaleDuration + data.agenda.publicSaleDuration,
                confirmAt: 0,
            }

            const newRequestEvent = receipt.events!.find(e => e.event === 'NewRequest')!;
            expect(newRequestEvent.args![0]).to.equal(1);
            expect(newRequestEvent.args![1]).to.equal(fundId);
            expect(newRequestEvent.args![2]).to.equal(data.requester);
            expect(structToObject(newRequestEvent.args![3])).to.deep.equal(data.estate);
            expect(structToObject(newRequestEvent.args![4])).to.deep.equal(data.quota);
            expect(structToObject(newRequestEvent.args![5])).to.deep.equal(data.quote);
            expect(structToObject(newRequestEvent.args![6])).to.deep.equal(data.agenda);

            const tokenizationRequestNumber = await estateForger.requestNumber();
            expect(tokenizationRequestNumber).to.equal(1);

            const tokenizationRequest = await estateForger.getRequest(tokenizationRequestNumber);
            expect(structToObject(tokenizationRequest.estate)).to.deep.equal(requestEstate);
            expect(structToObject(tokenizationRequest.quota)).to.deep.equal(requestQuota);
            expect(structToObject(tokenizationRequest.quote)).to.deep.equal(requestQuote);
            expect(structToObject(tokenizationRequest.agenda)).to.deep.equal(requestAgenda);
        });

        it('2.2.5.2. requestTokenization successfully by moderator and without cashback', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addEstateForgerToVault: true,
                registerBrokers: true,
            });
            const { manager, estateForger, reserveVault, commissionToken, admin, validator, broker1 } = fixture;

            const defaultParams = await getDefaultParams(fixture);

            const data: RequestTokenizationParams = {
                ...defaultParams,
                quote: {
                    ...defaultParams.quote,
                    cashbackBaseRate: BigNumber.from(0),
                    cashbackCurrencies: [],
                    cashbackDenominations: [],
                    cashbackThreshold: BigNumber.from(0),
                },
            };
            const tx = await getRequestTokenizationTx(estateForger, validator, manager, data);
            const receipt = await tx.wait();

            const fundId = ethers.BigNumber.from(0);
            expect(await reserveVault.fundNumber()).to.equal(0);

            const commissionDenomination = await getCommissionDenomination(
                commissionToken as any,
                data.quote.feeDenomination,
                data.estate.zone,
                data.quote.broker,
            );

            const requestEstate: RequestEstate = {
                ...data.estate,
                estateId: ethers.BigNumber.from(0),
            }
            const requestQuota: RequestQuota = {
                ...data.quota,
                soldQuantity: ethers.BigNumber.from(0),
            }
            const requestQuote: RequestQuote = {
                unitPrice: data.quote.unitPrice,
                currency: data.quote.currency,
                cashbackThreshold: data.quote.cashbackThreshold,
                cashbackFundId: fundId,
                feeDenomination: data.quote.feeDenomination,
                commissionDenomination: commissionDenomination,
                broker: broker1.address,
            }
            const requestAgenda: RequestAgenda = {
                saleStartsAt: data.agenda.saleStartsAt,
                privateSaleEndsAt: data.agenda.saleStartsAt + data.agenda.privateSaleDuration,
                publicSaleEndsAt: data.agenda.saleStartsAt + data.agenda.privateSaleDuration + data.agenda.publicSaleDuration,
                confirmAt: 0,
            }

            const newRequestEvent = receipt.events!.find(e => e.event === 'NewRequest')!;
            expect(newRequestEvent.args![0]).to.equal(1);
            expect(newRequestEvent.args![1]).to.equal(fundId);
            expect(newRequestEvent.args![2]).to.equal(data.requester);
            expect(structToObject(newRequestEvent.args![3])).to.deep.equal(data.estate);
            expect(structToObject(newRequestEvent.args![4])).to.deep.equal(data.quota);
            expect(structToObject(newRequestEvent.args![5])).to.deep.equal(data.quote);
            expect(structToObject(newRequestEvent.args![6])).to.deep.equal(data.agenda);

            const tokenizationRequestNumber = await estateForger.requestNumber();
            expect(tokenizationRequestNumber).to.equal(1);

            const tokenizationRequest = await estateForger.getRequest(tokenizationRequestNumber);
            expect(structToObject(tokenizationRequest.estate)).to.deep.equal(requestEstate);
            expect(structToObject(tokenizationRequest.quota)).to.deep.equal(requestQuota);
            expect(structToObject(tokenizationRequest.quote)).to.deep.equal(requestQuote);
            expect(structToObject(tokenizationRequest.agenda)).to.deep.equal(requestAgenda);
        });

        it('2.2.5.3. requestTokenization unsuccessfully with invalid validation', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addEstateForgerToVault: true,
                registerBrokers: true,
            });

            const { manager, estateForger, validator } = fixture;

            const defaultParams = await getDefaultParams(fixture);
            const validation = await getRequestTokenizationInvalidValidation(
                estateForger,
                validator,
                defaultParams,
            );
            
            await expect(estateForger.connect(manager).requestTokenization(
                defaultParams.requester,
                defaultParams.estate,
                defaultParams.quota,
                defaultParams.quote,
                defaultParams.agenda,
                validation,
            )).to.be.revertedWithCustomError(estateForger, 'InvalidSignature');
        });

        it('2.2.5.4. requestTokenization unsuccessfully by non-executive', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addEstateForgerToVault: true,
                registerBrokers: true,
            });

            const { user, estateForger, validator } = fixture;

            const defaultParams = await getDefaultParams(fixture);
            
            await expect(getRequestTokenizationTx(estateForger, validator, user, defaultParams))
                .to.be.revertedWithCustomError(estateForger, 'Unauthorized');
        });

        it('2.2.5.5. requestTokenization unsuccessfully when paused', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addEstateForgerToVault: true,
                registerBrokers: true,
                pause: true,
            });

            const { manager, estateForger, validator } = fixture;

            const defaultParams = await getDefaultParams(fixture);

            await expect(getRequestTokenizationTx(estateForger, validator, manager, defaultParams))
                .to.be.revertedWith('Pausable: paused');
        })

        it('2.2.5.7. requestTokenization unsuccessfully by inactive zone', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addEstateForgerToVault: true,
                registerBrokers: true,
            });

            const { moderator, manager, estateForger, validator } = fixture;

            const defaultParams = await getDefaultParams(fixture);
            const invalidZone = ethers.utils.formatBytes32String('InvalidZone');

            const params: RequestTokenizationParams = {
                ...defaultParams,
                estate: {
                    ...defaultParams.estate,
                    zone: invalidZone,
                },
            };

            await expect(getRequestTokenizationTx(estateForger, validator, moderator, params))
                .to.be.revertedWithCustomError(estateForger, 'Unauthorized');
            await expect(getRequestTokenizationTx(estateForger, validator, manager, params))
                .to.be.revertedWithCustomError(estateForger, 'Unauthorized');
        });

        it('2.2.5.7. requestTokenization unsuccessfully by inactive executive in zone', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addEstateForgerToVault: true,
                registerBrokers: true,
            });

            const { admin, admins, moderator, manager, zone1, estateForger, validator } = fixture;

            await callAdmin_ActivateIn(
                admin,
                admins,
                zone1,
                [moderator.address, manager.address],
                false,
                await admin.nonce(),
            )

            const defaultParams = await getDefaultParams(fixture);

            await expect(getRequestTokenizationTx(estateForger, validator, moderator, defaultParams))
                .to.be.revertedWithCustomError(estateForger, 'Unauthorized');
            await expect(getRequestTokenizationTx(estateForger, validator, manager, defaultParams))
                .to.be.revertedWithCustomError(estateForger, 'Unauthorized');
        });

        it('2.2.5.8. requestTokenization unsuccessfully with unit price out of base range', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addEstateForgerToVault: true,
                registerBrokers: true,
            });

            const { manager, currencies, estateForger, validator } = fixture;

            const currency = currencies[0];

            const defaultParams = await getDefaultParams(fixture);

            const data1: RequestTokenizationParams = {
                ...defaultParams,
                quote: {
                    ...defaultParams.quote,
                    currency: currency.address,
                    unitPrice: ethers.utils.parseEther('19'),
                },
            }
            await expect(getRequestTokenizationTx(estateForger, validator, manager, data1))
                .to.be.revertedWithCustomError(estateForger, 'InvalidUnitPrice');

            const data2: RequestTokenizationParams = {
                ...defaultParams,
                quote: {
                    ...defaultParams.quote,
                    currency: currency.address,
                    unitPrice: ethers.utils.parseEther('201'),
                },
            }
            await expect(getRequestTokenizationTx(estateForger, validator, manager, data2))
                .to.be.revertedWithCustomError(estateForger, 'InvalidUnitPrice');
        });

        it('2.2.5.9. requestTokenization unsuccessfully with inactive custodian in zone', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                addEstateForgerToVault: true,
                registerBrokers: true,
            });

            const { manager, estateForger, validator } = fixture;

            const defaultParams = await getDefaultParams(fixture);
            const data: RequestTokenizationParams = {
                ...defaultParams,
                requester: ethers.constants.AddressZero,
            }
            await expect(getRequestTokenizationTx(estateForger, validator, manager, data))
                .to.be.revertedWithCustomError(estateForger, 'NotRegisteredCustodian');
        });

        it('2.2.5.10. requestTokenization unsuccessfully with expired estate', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addEstateForgerToVault: true,
                registerBrokers: true,
            });

            const { manager, estateForger, validator } = fixture;
            
            const timestamp = await time.latest() + 1000;
            await time.setNextBlockTimestamp(timestamp);

            const defaultParams = await getDefaultParams(fixture);
            const data: RequestTokenizationParams = {
                ...defaultParams,
                estate: {
                    ...defaultParams.estate,
                    expireAt: timestamp - 1,
                },
            };
            await expect(getRequestTokenizationTx(estateForger, validator, manager, data))
                .to.be.revertedWithCustomError(estateForger, 'InvalidTimestamp');
        });

        it('2.2.5.11. requestTokenization unsuccessfully when minimum selling amount exceeds maximum', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addEstateForgerToVault: true,
                registerBrokers: true,
            });

            const { manager, estateForger, validator } = fixture;

            const defaultParams = await getDefaultParams(fixture);
            const data: RequestTokenizationParams = {
                ...defaultParams,
                quota: {
                    ...defaultParams.quota,
                    minSellingQuantity: defaultParams.quota.maxSellingQuantity.add(1),
                },
            }
            await expect(getRequestTokenizationTx(estateForger, validator, manager, data))
                .to.be.revertedWithCustomError(estateForger, 'InvalidInput');
        });

        it('2.2.5.12. requestTokenization unsuccessfully when maximum selling amount exceeds total supply', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addEstateForgerToVault: true,
                registerBrokers: true,
            });

            const { manager, estateForger, validator } = fixture;

            const defaultParams = await getDefaultParams(fixture);
            const data: RequestTokenizationParams = {
                ...defaultParams,
                quota: {
                    ...defaultParams.quota,
                    maxSellingQuantity: defaultParams.quota.totalQuantity.add(1),
                },
            }
            await expect(getRequestTokenizationTx(estateForger, validator, manager, data))
                .to.be.revertedWithCustomError(estateForger, 'InvalidInput');
        });

        it('2.2.5.13. requestTokenization unsuccessfully with invalid cashback threshold', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addEstateForgerToVault: true,
                registerBrokers: true,
            });

            const { manager, estateForger, validator } = fixture;

            const defaultParams = await getDefaultParams(fixture);
            const data: RequestTokenizationParams = {
                ...defaultParams,
                quote: {
                    ...defaultParams.quote,
                    cashbackThreshold: defaultParams.quota.totalQuantity.add(1),
                },
            }
            await expect(getRequestTokenizationTx(estateForger, validator, manager, data))
                .to.be.revertedWithCustomError(estateForger, 'InvalidInput');
        });

        it('2.2.5.14. requestTokenization unsuccessfully with invalid cashback base rate', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addEstateForgerToVault: true,
                registerBrokers: true,
            });

            const { manager, estateForger, validator } = fixture;

            const defaultParams = await getDefaultParams(fixture);
            const data: RequestTokenizationParams = {
                ...defaultParams,
                quote: {
                    ...defaultParams.quote,
                    cashbackBaseRate: Constant.COMMON_RATE_MAX_FRACTION.add(1),
                },
            }
            await expect(getRequestTokenizationTx(estateForger, validator, manager, data))
                .to.be.revertedWithCustomError(estateForger, 'InvalidInput');
        });

        it('2.2.5.15. requestTokenization unsuccessfully with invalid cashback params length', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addEstateForgerToVault: true,
                registerBrokers: true,
            });

            const { manager, estateForger, validator } = fixture;

            const defaultParams = await getDefaultParams(fixture);
            const data: RequestTokenizationParams = {
                ...defaultParams,
                quote: {
                    ...defaultParams.quote,
                    cashbackCurrencies: defaultParams.quote.cashbackCurrencies.slice(0, -2),
                }
            };

            await expect(getRequestTokenizationTx(estateForger, validator, manager, data))
                .to.be.revertedWithCustomError(estateForger, 'InvalidInput');
        });
        
        it('2.2.5.16. requestTokenization unsuccessfully with invalid sale start time', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addEstateForgerToVault: true,
                registerBrokers: true,
            });

            const { manager, estateForger, validator } = fixture;

            let timestamp = await time.latest() + 1000;
            await time.setNextBlockTimestamp(timestamp);

            const defaultParams = await getDefaultParams(fixture);

            const data1: RequestTokenizationParams = {
                ...defaultParams,
                agenda: {
                    ...defaultParams.agenda,
                    saleStartsAt: timestamp - 1,
                },
            }
            await expect(getRequestTokenizationTx(estateForger, validator, manager, data1))
                .to.be.revertedWithCustomError(estateForger, 'InvalidInput');

            timestamp += 10;
            await time.setNextBlockTimestamp(timestamp);

            const data2: RequestTokenizationParams = {
                ...defaultParams,
                agenda: {
                    ...defaultParams.agenda,
                    saleStartsAt: timestamp,
                },
            }
            await expect(getRequestTokenizationTx(estateForger, validator, manager, data2))
                .to.be.revertedWithCustomError(estateForger, 'InvalidInput');
        });

        it('2.2.5.17. requestTokenization unsuccessfully with invalid sale durations', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addEstateForgerToVault: true,
                registerBrokers: true,
            });

            const { manager, estateForger, validator } = fixture;

            const defaultParams = await getDefaultParams(fixture);
            // Not enough minimum sale duration (7 days)
            const data1: RequestTokenizationParams = {
                ...defaultParams,
                agenda: {
                    ...defaultParams.agenda,
                    privateSaleDuration: 3 * DAY,
                    publicSaleDuration: 4 * DAY - 1,
                },
            }
            await expect(getRequestTokenizationTx(estateForger, validator, manager, data1))
                .to.be.revertedWithCustomError(estateForger, 'InvalidInput');

            // Zero sale duration
            const data2: RequestTokenizationParams = {
                ...defaultParams,
                agenda: {
                    ...defaultParams.agenda,
                    privateSaleDuration: 0,
                    publicSaleDuration: 0,
                },
            }
            await expect(getRequestTokenizationTx(estateForger, validator, manager, data2))
                .to.be.revertedWithCustomError(estateForger, 'InvalidInput');

            // Zero private sale duration is allowed
            const data3: RequestTokenizationParams = {
                ...defaultParams,
                agenda: {
                    ...defaultParams.agenda,
                    privateSaleDuration: Constant.ESTATE_FORGER_MINIMUM_SALE_DURATION,
                    publicSaleDuration: 0,
                },
            }
            await expect(getRequestTokenizationTx(estateForger, validator, manager, data3))
                .to.not.be.reverted;

            // Zero public sale duration is allowed
            const data4: RequestTokenizationParams = {
                ...defaultParams,
                agenda: {
                    ...defaultParams.agenda,
                    privateSaleDuration: 0,
                    publicSaleDuration: Constant.ESTATE_FORGER_MINIMUM_SALE_DURATION,
                },
            }
            await expect(getRequestTokenizationTx(estateForger, validator, manager, data4))
                .to.not.be.reverted;
        });

        it('2.2.5.18. requestTokenization unsuccessfully with unregistered broker', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addEstateForgerToVault: true,
            });

            const { manager, estateForger, validator } = fixture;

            const defaultParams = await getDefaultParams(fixture);

            await expect(getRequestTokenizationTx(estateForger, validator, manager, defaultParams))
                .to.be.revertedWithCustomError(estateForger, 'InvalidBroker');
        });

        it('2.2.5.19. requestTokenization unsuccessfully with inactive broker', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addEstateForgerToVault: true,
            });

            const { manager, estateForger, validator, commissionToken } = fixture;

            const params = await getDefaultParams(fixture);

            await callTransaction(getRegisterBrokerTx(commissionToken as any, manager, {
                zone: params.estate.zone,
                broker: params.quote.broker,
                commissionRate: ethers.utils.parseEther('0.01'),
            }));
            await callTransaction(getActivateBrokerTx(commissionToken as any, manager, {
                zone: params.estate.zone,
                broker: params.quote.broker,
                isActive: false,
            }));

            await expect(getRequestTokenizationTx(estateForger, validator, manager, params))
                .to.be.revertedWithCustomError(estateForger, 'InvalidBroker');
        });

        it('2.2.5.20. requestTokenization unsuccessfully when estate forger is not vault initiator', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                registerBrokers: true,
            });

            const { manager, estateForger, validator } = fixture;

            const defaultParams = await getDefaultParams(fixture);
            await expect(getRequestTokenizationTx(estateForger, validator, manager, defaultParams))
                .to.be.revertedWithCustomError(estateForger, 'Unauthorized');
        });

        it('2.2.5.21. requestTokenization unsuccessfully without cashback params but with cashback threshold', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                registerBrokers: true,
            });

            const { manager, estateForger, validator } = fixture;

            const defaultParams = await getDefaultParams(fixture);
            const params: RequestTokenizationParams = {
                ...defaultParams,
                quote: {
                    ...defaultParams.quote,
                    cashbackCurrencies: [],
                    cashbackBaseRate: BigNumber.from(0),
                },
            }

            await expect(getRequestTokenizationTx(estateForger, validator, manager, params))
                .to.be.revertedWithCustomError(estateForger, 'InvalidInput');
        });

        it('2.2.5.22. requestTokenization unsuccessfully with cashback params but without cashback threshold', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                registerBrokers: true,
            });

            const { manager, estateForger, validator } = fixture;

            const defaultParams = await getDefaultParams(fixture);
            const params: RequestTokenizationParams = {
                ...defaultParams,
                quote: {
                    ...defaultParams.quote,
                    cashbackThreshold: BigNumber.from(0),
                },
            }
            await expect(getRequestTokenizationTx(estateForger, validator, manager, params))
                .to.be.revertedWithCustomError(estateForger, 'InvalidInput');
        });
    });

    describe('2.2.6. whitelistFor(uint256, address[], bool)', async () => {
        it('2.2.6.1. Whitelist user for request successfully', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addEstateForgerToVault: true,
                registerBrokers: true,
                addSampleRequests: true,              
            });
            const { estateForger, manager, moderator, depositor1, depositor2, depositor3 } = fixture;            

            // By manager
            const depositors_tx1 = [depositor1, depositor2, depositor3];
            const tx1 = await estateForger.connect(manager).whitelistFor(
                1,
                depositors_tx1.map(x => x.address),
                true,
            );
            await tx1.wait();
            
            for(const depositor of depositors_tx1) {
                await expect(tx1).to
                    .emit(estateForger, 'RequestWhitelist')
                    .withArgs(1, depositor.address);
            }

            expect(await estateForger.isWhitelistedFor(1, depositor1.address)).to.be.true;
            expect(await estateForger.isWhitelistedFor(1, depositor2.address)).to.be.true;
            expect(await estateForger.isWhitelistedFor(1, depositor3.address)).to.be.true;
            expect(await estateForger.isWhitelistedFor(2, depositor1.address)).to.be.false;
            expect(await estateForger.isWhitelistedFor(2, depositor2.address)).to.be.false;
            expect(await estateForger.isWhitelistedFor(2, depositor3.address)).to.be.false;

            // By moderator
            const depositors_tx2 = [depositor1];
            const tx2 = await estateForger.connect(moderator).whitelistFor(
                2,
                depositors_tx2.map(x => x.address),
                true,
            );
            await tx2.wait();

            for(const depositor of depositors_tx2) {
                await expect(tx2).to
                    .emit(estateForger, 'RequestWhitelist')
                    .withArgs(2, depositor.address);
            }

            expect(await estateForger.isWhitelistedFor(1, depositor1.address)).to.be.true;
            expect(await estateForger.isWhitelistedFor(1, depositor2.address)).to.be.true;
            expect(await estateForger.isWhitelistedFor(1, depositor3.address)).to.be.true;
            expect(await estateForger.isWhitelistedFor(2, depositor1.address)).to.be.true;
            expect(await estateForger.isWhitelistedFor(2, depositor2.address)).to.be.false;
            expect(await estateForger.isWhitelistedFor(2, depositor3.address)).to.be.false;
        });

        it('2.2.6.2. Whitelist user for request unsuccessfully with invalid request id', async () => {
            const fixture = await beforeEstateForgerTest();
            const { estateForger, depositor1, depositor2 } = fixture;            
            
            await expect(estateForger.whitelistFor(
                0,
                [depositor1.address, depositor2.address],
                true,
            )).to.be.revertedWithCustomError(estateForger, 'InvalidRequestId');
            
            await expect(estateForger.whitelistFor(
                100,
                [depositor1.address, depositor2.address],
                true,
            )).to.be.revertedWithCustomError(estateForger, 'InvalidRequestId');
        });

        it('2.2.6.3. Whitelist user for request unsuccessfully by non-executive', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addEstateForgerToVault: true,
                registerBrokers: true,                
                addSampleRequests: true,
            });
            const { admins, admin, estateForger, user, depositor1, depositor2, zone1 } = fixture;   
            
            await callAdmin_ActivateIn(
                admin,
                admins,
                zone1,
                [user.address],
                true,
                await admin.nonce(),
            );

            await expect(estateForger.connect(user).whitelistFor(
                1,
                [depositor1.address, depositor2.address],
                true,
            )).to.be.revertedWithCustomError(estateForger, 'Unauthorized');
        });

        it('2.2.6.5. Whitelist user for request unsuccessfully with inactive executive in zone', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addEstateForgerToVault: true,
                registerBrokers: true,                
                addSampleRequests: true,
            });
            const { admins, admin, estateForger, manager, moderator, depositor1, depositor2, zone1 } = fixture;

            await callAdmin_ActivateIn(
                admin,
                admins,
                zone1,
                [manager.address, moderator.address],
                false,
                await admin.nonce(),
            );

            await expect(estateForger.connect(manager).whitelistFor(
                1,
                [depositor1.address, depositor2.address],
                true,
            )).to.be.revertedWithCustomError(estateForger, 'Unauthorized');

            await expect(estateForger.connect(moderator).whitelistFor(
                1,
                [depositor1.address, depositor2.address],
                true,
            )).to.be.revertedWithCustomError(estateForger, 'Unauthorized');
        });

        it('2.2.6.6. Whitelist user for request unsuccessfully when whitelisting same account twice on same tx', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addEstateForgerToVault: true,
                registerBrokers: true,                
                addSampleRequests: true,
            });
            const { estateForger, manager, depositor1, depositor2, depositor3 } = fixture;            

            const depositors = [depositor1, depositor2, depositor3, depositor1];

            await expect(estateForger.connect(manager).whitelistFor(
                1,
                depositors.map(x => x.address),
                true,
            )).to.be.revertedWithCustomError(estateForger, 'WhitelistedAccount')
        });

        it('2.2.6.7. Whitelist user for request unsuccessfully when whitelisting same account twice on different tx', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addEstateForgerToVault: true,
                registerBrokers: true,                
                addSampleRequests: true,
            });
            const { estateForger, manager, depositor1, depositor2, depositor3 } = fixture;            

            await callTransaction(estateForger.connect(manager).whitelistFor(
                1,
                [depositor1.address, depositor3.address],
                true,
            ));
            
            await expect(estateForger.connect(manager).whitelistFor(
                1,
                [depositor2.address, depositor3.address],
                true,
            )).to.be.revertedWithCustomError(estateForger, 'WhitelistedAccount');
        });
        
        it('2.2.6.8. Unwhitelist account successfully', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addEstateForgerToVault: true,
                registerBrokers: true,                
                addSampleRequests: true,
            });
            const { admins, admin, estateForger, manager, moderator, depositor1, depositor2, depositor3, depositors } = fixture;            

            await callTransaction(estateForger.connect(manager).whitelistFor(
                1,
                depositors.map(x => x.address),
                true,
            ));
            await callTransaction(estateForger.connect(manager).whitelistFor(
                2,
                depositors.map(x => x.address),
                true,
            ));

            // By manager
            const tx1 = await estateForger.connect(manager).whitelistFor(
                1,
                [depositor1.address, depositor2.address],
                false,
            );
            await tx1.wait();
            
            for(const depositor of [depositor1, depositor2]) {
                await expect(tx1).to
                    .emit(estateForger, 'RequestUnwhitelist')
                    .withArgs(1, depositor.address);
            }

            expect(await estateForger.isWhitelistedFor(1, depositor1.address)).to.be.false;
            expect(await estateForger.isWhitelistedFor(1, depositor2.address)).to.be.false;
            expect(await estateForger.isWhitelistedFor(1, depositor3.address)).to.be.true;
            expect(await estateForger.isWhitelistedFor(2, depositor1.address)).to.be.true;
            expect(await estateForger.isWhitelistedFor(2, depositor2.address)).to.be.true;
            expect(await estateForger.isWhitelistedFor(2, depositor3.address)).to.be.true;

            // By moderator
            const tx2 = await estateForger.connect(moderator).whitelistFor(
                2,
                [depositor1.address, depositor3.address],
                false,
            );
            await tx2.wait();
            
            for(const depositor of [depositor1, depositor3]) {
                await expect(tx2).to
                    .emit(estateForger, 'RequestUnwhitelist')
                    .withArgs(2, depositor.address);
            }
            
            expect(await estateForger.isWhitelistedFor(1, depositor1.address)).to.be.false;
            expect(await estateForger.isWhitelistedFor(1, depositor2.address)).to.be.false;
            expect(await estateForger.isWhitelistedFor(1, depositor3.address)).to.be.true;
            expect(await estateForger.isWhitelistedFor(2, depositor1.address)).to.be.false;
            expect(await estateForger.isWhitelistedFor(2, depositor2.address)).to.be.true;
            expect(await estateForger.isWhitelistedFor(2, depositor3.address)).to.be.false;
        });

        it('2.2.6.9. Unwhitelist account unsuccessfully with not whitelisted account', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addEstateForgerToVault: true,
                registerBrokers: true,                
                addSampleRequests: true,
            });
            const { manager, estateForger, depositor1, depositor2 } = fixture;            

            await expect(estateForger.connect(manager).whitelistFor(
                1,
                [depositor1.address, depositor2.address],
                false,
            )).to.be.revertedWithCustomError(estateForger, 'NotWhitelistedAccount')
        });

        it('2.2.6.10. Unwhitelist account unsuccessfully when unwhitelisting same account twice on same tx', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addEstateForgerToVault: true,
                registerBrokers: true,                
                addSampleRequests: true,
            });
            const { admins, admin, estateForger, manager, depositor1, depositor2, depositor3, depositors } = fixture;            

            await callTransaction(estateForger.connect(manager).whitelistFor(
                1,
                depositors.map(x => x.address),
                true,
            ));

            await expect(estateForger.connect(manager).whitelistFor(
                1,
                [depositor1.address, depositor2.address, depositor3.address, depositor1.address],
                false,
            )).to.be.revertedWithCustomError(estateForger, 'NotWhitelistedAccount')
        });

        it('2.2.6.11. Unwhitelist account unsuccessfully when unwhitelisting same account twice on different tx', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addEstateForgerToVault: true,
                registerBrokers: true,                
                addSampleRequests: true,
            });
            const { admins, admin, estateForger, manager, depositor1, depositor2, depositor3, depositors } = fixture;            

            await callTransaction(estateForger.connect(manager).whitelistFor(
                1,
                depositors.map(x => x.address),
                true,
            ));
            
            await callTransaction(estateForger.connect(manager).whitelistFor(
                1,
                [depositor1.address, depositor3.address],
                false,
            ));

            await expect(estateForger.connect(manager).whitelistFor(
                1,
                [depositor2.address, depositor3.address],
                false,
            )).to.be.revertedWithCustomError(estateForger, 'NotWhitelistedAccount')
        });
    });

    describe('2.2.7. updateRequestEstateURI(uint256, string)', async () => {
        async function beforeUpdateRequestEstateURI(
            fixture: EstateForgerFixture,
        ): Promise<{ defaultParams: UpdateRequestEstateURIParams }> {
            return {
                defaultParams: {
                    requestId: BigNumber.from(1),
                    uri: 'NewTestingURI',
                }
            }
        }

        it('2.2.7.1. update tokenization request URI successfully', async () => {            
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
                registerBrokers: true,
            });
            const { moderator, manager, estateForger, validator } = fixture;

            // Tx1: by manager
            const params1 = {
                requestId: BigNumber.from(1),
                uri: 'new_uri_1',
            }
    
            const tx1 = await getUpdateRequestEstateURITx(estateForger, validator, manager, params1);
            await tx1.wait();

            await expect(tx1).to.emit(estateForger, 'RequestEstateURIUpdate').withArgs(
                params1.requestId,
                params1.uri,
            );

            const request1 = await estateForger.getRequest(params1.requestId);
            expect(request1.estate.uri).to.equal(params1.uri);

            // Tx2: by moderator
            const params2 = {
                requestId: BigNumber.from(1),
                uri: 'new_uri_2',
            }

            const tx2 = await getUpdateRequestEstateURITx(estateForger, validator, moderator, params2);
            await tx2.wait();

            await expect(tx2).to.emit(estateForger, 'RequestEstateURIUpdate').withArgs(
                params2.requestId,
                params2.uri,
            );

            const request2 = await estateForger.getRequest(params2.requestId);
            expect(request2.estate.uri).to.equal(params2.uri);
        });

        it('2.2.7.2. update tokenization request URI unsuccessfully with invalid request id', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
                registerBrokers: true,
            });
            const { manager, estateForger, validator } = fixture;
            
            const { defaultParams } = await beforeUpdateRequestEstateURI(fixture);
            const invalidValidation = await getUpdateRequestEstateURIInvalidValidation(estateForger, validator, defaultParams);

            await expect(estateForger.connect(manager).updateRequestEstateURI(
                defaultParams.requestId,
                defaultParams.uri,
                invalidValidation,
            )).to.be.revertedWithCustomError(estateForger, 'InvalidSignature');
        });

        it('2.2.7.3. update tokenization request URI unsuccessfully by non-executive', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
                registerBrokers: true,
            });
            const { user, estateForger, validator } = fixture;
            const { defaultParams } = await beforeUpdateRequestEstateURI(fixture);
    
            await expect(getUpdateRequestEstateURITx(estateForger, validator, user, defaultParams))
                .to.be.revertedWithCustomError(estateForger, 'Unauthorized');
        });

        it('2.2.7.4. update tokenization request URI unsuccessfully with invalid request id', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
                registerBrokers: true,
            });
            const { manager, estateForger, validator } = fixture;
            const { defaultParams } = await beforeUpdateRequestEstateURI(fixture);

            const params1: UpdateRequestEstateURIParams = {
                ...defaultParams,
                requestId: BigNumber.from(0),
            }
            await expect(getUpdateRequestEstateURITx(estateForger, validator, manager, params1))
                .to.be.revertedWithCustomError(estateForger, 'InvalidRequestId');

            const params2: UpdateRequestEstateURIParams = {
                ...defaultParams,
                requestId: BigNumber.from(100),
            }    
            await expect(getUpdateRequestEstateURITx(estateForger, validator, manager, params2))
                .to.be.revertedWithCustomError(estateForger, 'InvalidRequestId');
        });

        it('2.2.7.5. update tokenization request URI unsuccessfully with cancelled request', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
                registerBrokers: true,
            });
            const { manager, estateForger, validator } = fixture;
            const { defaultParams } = await beforeUpdateRequestEstateURI(fixture);

            await callTransaction(estateForger.connect(manager).cancel(defaultParams.requestId));

            await expect(getUpdateRequestEstateURITx(estateForger, validator, manager, defaultParams))
                .to.be.revertedWithCustomError(estateForger, 'AlreadyCancelled');
        });

        it('2.2.7.6. update tokenization request URI unsuccessfully with confirmed request', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                registerBrokers: true,
                addDepositions: true,
                confirmRequests: true,
                addEstateForgerToVault: true,
                fundERC20ForManagers: true,
            });
            const { manager, estateForger, validator } = fixture;
            const { defaultParams } = await beforeUpdateRequestEstateURI(fixture);

            await expect(getUpdateRequestEstateURITx(estateForger, validator, manager, defaultParams))
                .to.be.revertedWithCustomError(estateForger, 'AlreadyConfirmed');
        });

        it('2.2.7.8. update tokenization request URI unsuccessfully by inactive manager in zone', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
                registerBrokers: true,
            });
            const { manager, estateForger, admin, admins, validator } = fixture;
            const { defaultParams } = await beforeUpdateRequestEstateURI(fixture);

            const zone = (await estateForger.getRequest(defaultParams.requestId)).estate.zone;
            await callAdmin_ActivateIn(
                admin,
                admins,
                zone,
                [manager.address],
                false,
                await admin.nonce()
            );

            await expect(getUpdateRequestEstateURITx(estateForger, validator, manager, defaultParams))
                .to.be.revertedWithCustomError(estateForger, 'Unauthorized');
        });
    });

    describe('2.2.8. updateRequestAgenda(uint256, (uint40, uint40))', async () => {        
        async function getDefaultParams(
            fixture: EstateForgerFixture,
        ): Promise<UpdateRequestAgendaParams> {
            const { estateForger } = fixture;
            let saleStartsAt = (await estateForger.getRequest(1)).agenda.saleStartsAt;
            return {
                requestId: BigNumber.from(1),
                agenda: {
                    saleStartsAt: 0,
                    privateSaleDuration: 100 * DAY,
                    publicSaleDuration: 200 * DAY,
                },
            }
        }

        it('2.2.8.1. update tokenization request agenda successfully without updating start time', async () => {            
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
                registerBrokers: true,
            });
            const { manager, estateForger } = fixture;
            
            const defaultParams = await getDefaultParams(fixture);
    
            const tx = await getUpdateRequestAgendaTx(estateForger, manager, defaultParams);
            const receipt = await tx.wait();

            const currentSaleStartsAt = (await estateForger.getRequest(defaultParams.requestId)).agenda.saleStartsAt;

            const event = receipt.events!.find(e => e.event === 'RequestAgendaUpdate')!;
            const agenda: RequestAgenda = {
                saleStartsAt: currentSaleStartsAt,
                privateSaleEndsAt: currentSaleStartsAt + defaultParams.agenda.privateSaleDuration,
                publicSaleEndsAt: currentSaleStartsAt + defaultParams.agenda.privateSaleDuration + defaultParams.agenda.publicSaleDuration,
                confirmAt: 0,
            }
            expect(event.args!.requestId).to.equal(defaultParams.requestId);
            expect(structToObject(event.args!.agenda)).to.deep.equal(defaultParams.agenda);

            const request = await estateForger.getRequest(defaultParams.requestId);
            expect(request.agenda.saleStartsAt).to.equal(currentSaleStartsAt);
            expect(request.agenda.privateSaleEndsAt).to.equal(agenda.privateSaleEndsAt);
            expect(request.agenda.publicSaleEndsAt).to.equal(agenda.publicSaleEndsAt);
        });

        it('2.2.8.2. update tokenization request agenda successfully with updating start time', async () => {            
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
                registerBrokers: true,
            });
            const { manager, estateForger } = fixture;

            const defaultParams = await getDefaultParams(fixture);

            let timestamp = await time.latest() + 5;
            const params1 = {
                ...defaultParams,
                agenda: {
                    ...defaultParams.agenda,
                    saleStartsAt: timestamp + 1000,
                },
            }

            await time.setNextBlockTimestamp(timestamp);
            const tx1 = await getUpdateRequestAgendaTx(estateForger, manager, params1);
            const receipt1 = await tx1.wait();

            const event1 = receipt1.events!.find(e => e.event === 'RequestAgendaUpdate')!;
            const agenda1: RequestAgenda = {
                saleStartsAt: params1.agenda.saleStartsAt,
                privateSaleEndsAt: params1.agenda.saleStartsAt + params1.agenda.privateSaleDuration,
                publicSaleEndsAt: params1.agenda.saleStartsAt + params1.agenda.privateSaleDuration + params1.agenda.publicSaleDuration,
                confirmAt: 0,
            }
            expect(event1.args!.requestId).to.equal(params1.requestId);
            expect(structToObject(event1.args!.agenda)).to.deep.equal(params1.agenda);

            const request1 = await estateForger.getRequest(params1.requestId);
            expect(request1.agenda.saleStartsAt).to.equal(params1.agenda.saleStartsAt);
            expect(request1.agenda.privateSaleEndsAt).to.equal(agenda1.privateSaleEndsAt);
            expect(request1.agenda.publicSaleEndsAt).to.equal(agenda1.publicSaleEndsAt);
        });

        it('2.2.8.3. update tokenization request agenda unsuccessfully when paused', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
                registerBrokers: true,
                pause: true,
            });
            const { manager, estateForger } = fixture;
            const defaultParams = await getDefaultParams(fixture);
    
            await expect(getUpdateRequestAgendaTx(estateForger, manager, defaultParams))
                .to.be.revertedWith('Pausable: paused');
        });

        it('2.2.8.4. update tokenization request agenda unsuccessfully by non-executive', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
                registerBrokers: true,
            });
            const { user, estateForger } = fixture;
            const defaultParams = await getDefaultParams(fixture);
    
            let currentTimestamp = await time.latest() + 1000;
            await time.setNextBlockTimestamp(currentTimestamp);

            await expect(getUpdateRequestAgendaTx(estateForger, user, defaultParams))
                .to.be.revertedWithCustomError(estateForger, 'Unauthorized');
        });

        it('2.2.8.5. update tokenization request agenda unsuccessfully with invalid request id', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
                registerBrokers: true,
            });
            const { manager, estateForger } = fixture;
            const defaultParams = await getDefaultParams(fixture);

            const params1: UpdateRequestAgendaParams = {
                ...defaultParams,
                requestId: BigNumber.from(0),
            }
            await expect(getUpdateRequestAgendaTx(estateForger, manager, params1))
                .to.be.revertedWithCustomError(estateForger, 'InvalidRequestId');

            const params2: UpdateRequestAgendaParams = {
                ...defaultParams,
                requestId: BigNumber.from(100),
            }
            await expect(getUpdateRequestAgendaTx(estateForger, manager, params2))
                .to.be.revertedWithCustomError(estateForger, 'InvalidRequestId');
        });

        it('2.2.8.6. update tokenization request agenda unsuccessfully with cancelled request', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
                registerBrokers: true,
            });
            const { manager, estateForger } = fixture;
            const defaultParams = await getDefaultParams(fixture);

            await estateForger.connect(manager).cancel(defaultParams.requestId);

            await expect(getUpdateRequestAgendaTx(estateForger, manager, defaultParams))
                .to.be.revertedWithCustomError(estateForger, 'AlreadyCancelled');
        });

        it('2.2.8.7. update tokenization request agenda unsuccessfully with confirmed request', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                registerBrokers: true,
                addSampleRequests: true,
                addDepositions: true,
                confirmRequests: true,
                fundERC20ForDepositors: true,
                addEstateForgerToVault: true,
                fundERC20ForManagers: true,
            });
            const { manager, estateForger } = fixture;
            const defaultParams = await getDefaultParams(fixture);

            await expect(getUpdateRequestAgendaTx(estateForger, manager, defaultParams))
                .to.be.revertedWithCustomError(estateForger, 'AlreadyConfirmed');
        });

        it('2.2.8.8. update tokenization request agenda unsuccessfully when request already have deposits', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addSampleRequests: true,
                addDepositions: true,
                fundERC20ForDepositors: true,
                addEstateForgerToVault: true,
                registerBrokers: true,
            });
            const { manager, estateForger } = fixture;
            const defaultParams = await getDefaultParams(fixture);

            await expect(getUpdateRequestAgendaTx(estateForger, manager, defaultParams))
                .to.be.revertedWithCustomError(estateForger, 'AlreadyHadDeposit');
        }); 

        it('2.2.8.10. update tokenization request agenda unsuccessfully by inactive executive in zone', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
                registerBrokers: true,
            });
            const { admin, admins, moderator, manager, estateForger } = fixture;
            const defaultParams = await getDefaultParams(fixture);

            const zone = (await estateForger.getRequest(defaultParams.requestId)).estate.zone;
            await callAdmin_ActivateIn(
                admin,
                admins,
                zone,
                [moderator.address, manager.address],
                false,
                await admin.nonce()
            );

            await expect(getUpdateRequestAgendaTx(estateForger, moderator, defaultParams))
                .to.be.revertedWithCustomError(estateForger, 'Unauthorized');
            await expect(getUpdateRequestAgendaTx(estateForger, manager, defaultParams))
                .to.be.revertedWithCustomError(estateForger, 'Unauthorized');
        });

        it('2.2.8.11. update tokenization request agenda unsuccessfully with invalid sale durations', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
                registerBrokers: true,
            });

            const { manager, estateForger } = fixture;

            const defaultParams = await getDefaultParams(fixture);
            // Not enough minimum sale duration (7 days)
            const data1 = {
                ...defaultParams,
                agenda: {
                    ...defaultParams.agenda,
                    privateSaleDuration: 3 * DAY,
                    publicSaleDuration: 4 * DAY - 1,
                },
            }
            await expect(getUpdateRequestAgendaTx(estateForger, manager, data1))
                .to.be.revertedWithCustomError(estateForger, 'InvalidInput');

            // Zero sale duration
            const data2 = {
                ...defaultParams,
                agenda: {
                    ...defaultParams.agenda,
                    privateSaleDuration: 0,
                    publicSaleDuration: 0,
                },
            }
            await expect(getUpdateRequestAgendaTx(estateForger, manager, data2))
                .to.be.revertedWithCustomError(estateForger, 'InvalidInput');

            // Zero private sale duration is allowed
            const data3 = {
                ...defaultParams,
                agenda: {
                    ...defaultParams.agenda,
                    privateSaleDuration: Constant.ESTATE_FORGER_MINIMUM_SALE_DURATION,
                    publicSaleDuration: 0,
                },
            }
            await expect(getUpdateRequestAgendaTx(estateForger, manager, data3))
                .to.not.be.reverted;

            // Zero public sale duration is allowed
            const data4 = {
                ...defaultParams,
                agenda: {
                    ...defaultParams.agenda,
                    privateSaleDuration: 0,
                    publicSaleDuration: Constant.ESTATE_FORGER_MINIMUM_SALE_DURATION,
                },
            }
            await expect(getUpdateRequestAgendaTx(estateForger, manager, data4))
                .to.not.be.reverted;
        });

        it('2.2.8.12. update tokenization request agenda unsuccessfully when updating start time of already sales started request', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
                registerBrokers: true,
            });

            const { manager, estateForger } = fixture;
            
            const defaultParams = await getDefaultParams(fixture);
            
            const saleStartsAt = (await estateForger.getRequest(defaultParams.requestId)).agenda.saleStartsAt;
            const params = {
                ...defaultParams,
                agenda: {
                    ...defaultParams.agenda,
                    saleStartsAt: saleStartsAt + 1000,
                },
            }
            
            await time.setNextBlockTimestamp(saleStartsAt);

            await expect(getUpdateRequestAgendaTx(estateForger, manager, params))
                .to.be.revertedWithCustomError(estateForger, 'InvalidInput');
        });

        it('2.2.8.13. update tokenization request agenda unsuccessfully with invalid sale start time', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
                registerBrokers: true,
            });
            const { manager, estateForger } = fixture;

            let timestamp = await time.latest() + 5;

            const defaultParams = await getDefaultParams(fixture);

            const params1 = {
                ...defaultParams,
                agenda: {
                    ...defaultParams.agenda,
                    saleStartsAt: timestamp - 1,
                },
            }

            await time.setNextBlockTimestamp(timestamp);
            await expect(getUpdateRequestAgendaTx(estateForger, manager, params1))
                .to.be.revertedWithCustomError(estateForger, 'InvalidTimestamp');

            timestamp += 3;
            const params2 = {
                ...defaultParams,
                agenda: {
                    ...defaultParams.agenda,
                    saleStartsAt: timestamp,
                },
            };

            await time.setNextBlockTimestamp(timestamp);
            await expect(getUpdateRequestAgendaTx(estateForger, manager, params2))
                .to.be.revertedWithCustomError(estateForger, 'InvalidTimestamp');
        });
    });

    describe('2.2.9. deposit(uint256, uint256)', async () => {
        it('2.2.9.1. deposit tokenization successfully and correctly refund native currency', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addEstateForgerToVault: true,
                whitelistDepositors: true,
                whitelistDepositorsForRequests: true,
                registerBrokers: true,
            });
            const { estateForger, depositor1, depositor2, depositors, reserveVault } = fixture;

            let initBalance1 = await ethers.provider.getBalance(depositor1.address);
            let initBalance2 = await ethers.provider.getBalance(depositor2.address);

            // During private sale
            // Fund not expanded

            const requestId = 1;
            const quantity1 = 2;
            let value1 = (await estateForger.getRequest(requestId)).quote.unitPrice.mul(quantity1);

            let saleStartsAt = (await estateForger.getRequest(requestId)).agenda.saleStartsAt;
            await time.setNextBlockTimestamp(saleStartsAt);

            let tx = await estateForger.connect(depositor1).deposit(
                requestId, quantity1, { value: value1.mul(10) }
            );
            await tx.wait();

            await expect(tx).to
                .emit(estateForger, 'Deposit')
                .withArgs(requestId, depositor1.address, quantity1, value1);

            let receipt = await tx.wait();
            const gasFee1 = receipt.effectiveGasPrice.mul(receipt.gasUsed);

            expect(await ethers.provider.getBalance(depositor1.address)).to.equal(
                initBalance1.sub(gasFee1).sub(value1)
            );
            expect(await ethers.provider.getBalance(estateForger.address)).to.equal(value1);

            let request = await estateForger.getRequest(requestId);
            expect(request.quota.soldQuantity).to.equal(quantity1);
            expect(await estateForger.deposits(requestId, depositor1.address)).to.equal(quantity1);

            expect((await reserveVault.getFund(1)).quantity).to.equal(0);

            // During public sale
            // Another user deposit
            initBalance1 = await ethers.provider.getBalance(depositor1.address);
            initBalance2 = await ethers.provider.getBalance(depositor2.address);

            const timestamp = (await estateForger.getRequest(requestId)).agenda.privateSaleEndsAt;
            await time.setNextBlockTimestamp(timestamp);

            const quantity2 = 4;
            let value2 = (await estateForger.getRequest(requestId)).quote.unitPrice.mul(quantity2);

            tx = await estateForger.connect(depositor2).deposit(
                requestId, quantity2, { value: value2.mul(10) }
            );
            receipt = await tx.wait();
            const gasFee2 = receipt.effectiveGasPrice.mul(receipt.gasUsed);

            await expect(tx).to
                .emit(estateForger, 'Deposit')
                .withArgs(requestId, depositor2.address, 4, value2);

            expect(await ethers.provider.getBalance(depositor2.address)).to.equal(
                initBalance2.sub(gasFee2).sub(value2)
            );
            expect(await ethers.provider.getBalance(estateForger.address)).to.equal(value1.add(value2));

            request = await estateForger.getRequest(requestId);
            expect(request.quota.soldQuantity).to.equal(quantity1 + quantity2);
            expect(await estateForger.deposits(requestId, depositor2.address)).to.equal(quantity2);

            expect((await reserveVault.getFund(1)).quantity).to.equal(0);

            // Fund expanded to total quantity (2 + 5 = 7)
            initBalance1 = await ethers.provider.getBalance(depositor1.address);
            initBalance2 = await ethers.provider.getBalance(depositor2.address);

            const quantity3 = 5;
            let value3 = (await estateForger.getRequest(requestId)).quote.unitPrice.mul(quantity3);

            tx = await estateForger.connect(depositor1).deposit(
                requestId, quantity3, { value: value3.mul(10) }
            );
            receipt = await tx.wait();
            const gasFee3 = receipt.effectiveGasPrice.mul(receipt.gasUsed);

            await expect(tx).to
                .emit(estateForger, 'Deposit')
                .withArgs(requestId, depositor1.address, quantity3, value3);

            expect(await ethers.provider.getBalance(depositor1.address)).to.equal(
                initBalance1.sub(gasFee3).sub(value3)
            );
            expect(await ethers.provider.getBalance(estateForger.address)).to.equal(value1.add(value2).add(value3));

            request = await estateForger.getRequest(requestId);
            expect(request.quota.soldQuantity).to.equal(quantity1 + quantity2 + quantity3);
            expect(await estateForger.deposits(requestId, depositor1.address)).to.equal(quantity1 + quantity3);

            expect((await reserveVault.getFund(1)).quantity).to.equal(quantity1 + quantity3);

            // Fund expanded by quantity4
            initBalance1 = await ethers.provider.getBalance(depositor1.address);
            initBalance2 = await ethers.provider.getBalance(depositor2.address);

            const quantity4 = 8;
            let value4 = (await estateForger.getRequest(requestId)).quote.unitPrice.mul(quantity4);

            tx = await estateForger.connect(depositor1).deposit(
                requestId, quantity4, { value: value4.mul(10) }
            );
            receipt = await tx.wait();
            const gasFee4 = receipt.effectiveGasPrice.mul(receipt.gasUsed);

            await expect(tx).to
                .emit(estateForger, 'Deposit')
                .withArgs(requestId, depositor1.address, quantity4, value4);

            expect(await ethers.provider.getBalance(depositor1.address)).to.equal(
                initBalance1.sub(gasFee4).sub(value4)
            );
            expect(await ethers.provider.getBalance(estateForger.address)).to.equal(value1.add(value2).add(value3).add(value4));

            request = await estateForger.getRequest(requestId);
            expect(request.quota.soldQuantity).to.equal(quantity1 + quantity2 + quantity3 + quantity4);
            expect(await estateForger.deposits(requestId, depositor1.address)).to.equal(quantity1 + quantity3 + quantity4);

            expect((await reserveVault.getFund(1)).quantity).to.equal(quantity1 + quantity3 + quantity4);
        });

        it('2.2.9.2. deposit tokenization successfully with ERC20 currency', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addEstateForgerToVault: true,
                registerBrokers: true,
                whitelistDepositors: true,
                whitelistDepositorsForRequests: true,
            });
            const { admin, admins, manager, estateForger, depositor1, depositor2, currencies } = fixture;
            const currency = currencies[0];
            const initBalance1 = await currency.balanceOf(depositor1.address);
            const initBalance2 = await currency.balanceOf(depositor2.address);
            const initNativeBalance1 = await ethers.provider.getBalance(depositor1.address);
            const initNativeBalance2 = await ethers.provider.getBalance(depositor2.address);
            const requestId = 2;

            // During private sale
            let value1 = (await estateForger.getRequest(requestId)).quote.unitPrice.mul(100);

            let saleStartsAt = (await estateForger.getRequest(requestId)).agenda.saleStartsAt;
            await time.setNextBlockTimestamp(saleStartsAt + 1);

            let tx = await estateForger.connect(depositor1).deposit(requestId, 100);
            await tx.wait();

            await expect(tx).to
                .emit(estateForger, 'Deposit')
                .withArgs(requestId, depositor1.address, 100, value1);

            expect(await currency.balanceOf(depositor1.address)).to.equal(
                initBalance1.sub(value1)
            );
            expect(await currency.balanceOf(estateForger.address)).to.equal(value1);

            let receipt = await tx.wait();
            expect(await ethers.provider.getBalance(depositor1.address)).to.equal(
                initNativeBalance1.sub(receipt.effectiveGasPrice.mul(receipt.gasUsed))
            );
            expect(await ethers.provider.getBalance(estateForger.address)).to.equal(0);

            let tokenizationRequest = await estateForger.getRequest(requestId);
            expect(tokenizationRequest.quota.soldQuantity).to.equal(100);
            expect(await estateForger.deposits(requestId, depositor1.address)).to.equal(100);

            // During public sale
            const timestamp = (await estateForger.getRequest(requestId)).agenda.privateSaleEndsAt;
            await time.setNextBlockTimestamp(timestamp);

            let value2 = (await estateForger.getRequest(requestId)).quote.unitPrice.mul(200);

            tx = await estateForger.connect(depositor2).deposit(
                requestId, 200,
            );
            await tx.wait();

            await expect(tx).to
                .emit(estateForger, 'Deposit')
                .withArgs(requestId, depositor2.address, 200, value2);

            expect(await currency.balanceOf(depositor2.address)).to.equal(
                initBalance2.sub(value2)
            );
            expect(await currency.balanceOf(estateForger.address)).to.equal(value1.add(value2));

            receipt = await tx.wait();
            expect(await ethers.provider.getBalance(depositor2.address)).to.equal(
                initNativeBalance2.sub(receipt.effectiveGasPrice.mul(receipt.gasUsed))
            );
            expect(await ethers.provider.getBalance(estateForger.address)).to.equal(0);

            tokenizationRequest = await estateForger.getRequest(requestId);
            expect(tokenizationRequest.quota.soldQuantity).to.equal(300);
            expect(await estateForger.deposits(requestId, depositor2.address)).to.equal(200);
        });

        it('2.2.9.3. deposit tokenization successfully when no cashback', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addEstateForgerToVault: true,
                registerBrokers: true,
                whitelistDepositors: true,
                whitelistDepositorsForRequests: true,
            });
            const { estateForger, depositor1, depositor2 } = fixture;

            let initBalance1 = await ethers.provider.getBalance(depositor1.address);
            let initBalance2 = await ethers.provider.getBalance(depositor2.address);

            // During private sale
            const requestId = 1;
            const quantity1 = 2;
            let value1 = (await estateForger.getRequest(requestId)).quote.unitPrice.mul(quantity1);

            let saleStartsAt = (await estateForger.getRequest(requestId)).agenda.saleStartsAt;
            await time.setNextBlockTimestamp(saleStartsAt);

            let tx = await estateForger.connect(depositor1).deposit(
                requestId, quantity1, { value: value1.mul(10) }
            );
            await tx.wait();

            await expect(tx).to
                .emit(estateForger, 'Deposit')
                .withArgs(requestId, depositor1.address, quantity1, value1);

            let receipt = await tx.wait();
            const gasFee1 = receipt.effectiveGasPrice.mul(receipt.gasUsed);

            expect(await ethers.provider.getBalance(depositor1.address)).to.equal(
                initBalance1.sub(gasFee1).sub(value1)
            );
            expect(await ethers.provider.getBalance(estateForger.address)).to.equal(value1);

            let request = await estateForger.getRequest(requestId);
            expect(request.quota.soldQuantity).to.equal(quantity1);
            expect(await estateForger.deposits(requestId, depositor1.address)).to.equal(quantity1);

            // During public sale
            // Another user deposit
            initBalance1 = await ethers.provider.getBalance(depositor1.address);
            initBalance2 = await ethers.provider.getBalance(depositor2.address);

            const timestamp = (await estateForger.getRequest(requestId)).agenda.privateSaleEndsAt;
            await time.setNextBlockTimestamp(timestamp);

            const quantity2 = 4;
            let value2 = (await estateForger.getRequest(requestId)).quote.unitPrice.mul(quantity2);

            tx = await estateForger.connect(depositor2).deposit(
                requestId, quantity2, { value: value2.mul(10) }
            );
            receipt = await tx.wait();
            const gasFee2 = receipt.effectiveGasPrice.mul(receipt.gasUsed);

            await expect(tx).to
                .emit(estateForger, 'Deposit')
                .withArgs(requestId, depositor2.address, 4, value2);

            expect(await ethers.provider.getBalance(depositor2.address)).to.equal(
                initBalance2.sub(gasFee2).sub(value2)
            );
            expect(await ethers.provider.getBalance(estateForger.address)).to.equal(value1.add(value2));

            request = await estateForger.getRequest(requestId);
            expect(request.quota.soldQuantity).to.equal(quantity1 + quantity2);
            expect(await estateForger.deposits(requestId, depositor2.address)).to.equal(quantity2);
        });

        it('2.2.9.4. deposit tokenization unsuccessfully when paused', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                whitelistDepositors: true,
                whitelistDepositorsForRequests: true,
                listSampleCustodians: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                registerBrokers: true,
                pause: true,
                addEstateForgerToVault: true,
            });
            const { estateForger, depositor1 } = fixture;

            let saleStartsAt = Math.max(
                (await estateForger.getRequest(1)).agenda.saleStartsAt,
                (await estateForger.getRequest(2)).agenda.saleStartsAt
            );
            await time.setNextBlockTimestamp(saleStartsAt);

            await expect(estateForger.connect(depositor1).deposit(
                1, 2, { value: ethers.utils.parseEther('100') },
            )).to.be.revertedWith("Pausable: paused");

            await expect(estateForger.connect(depositor1).deposit(
                2, 100,
            )).to.be.revertedWith("Pausable: paused");
        });

        it('2.2.9.5. deposit tokenization unsuccessfully with invalid request id', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addEstateForgerToVault: true,
                registerBrokers: true,
                whitelistDepositors: true,
                whitelistDepositorsForRequests: true,
            });
            const { estateForger, depositor1 } = fixture;

            await expect(estateForger.connect(depositor1).deposit(
                0, 2,
            )).to.be.revertedWithCustomError(estateForger, "InvalidRequestId");

            await expect(estateForger.connect(depositor1).deposit(
                100, 2,
            )).to.be.revertedWithCustomError(estateForger, "InvalidRequestId");
        });

        it('2.2.9.6. deposit tokenization unsuccessfully with cancelled request', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                whitelistDepositors: true,
                whitelistDepositorsForRequests: true,
                listSampleCustodians: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addEstateForgerToVault: true,
                registerBrokers: true,
            });
            const { manager, estateForger, depositor1 } = fixture;

            await callTransaction(estateForger.connect(manager).cancel(1));

            let saleStartsAt = Math.max(
                (await estateForger.getRequest(1)).agenda.saleStartsAt,
                (await estateForger.getRequest(2)).agenda.saleStartsAt
            );
            await time.setNextBlockTimestamp(saleStartsAt);

            await expect(estateForger.connect(depositor1).deposit(
                1, 2, { value: ethers.utils.parseEther('100') },
            )).to.be.revertedWithCustomError(estateForger, "AlreadyCancelled");

            await callTransaction(estateForger.connect(depositor1).deposit(
                2, 100,
            ));

            await callTransaction(estateForger.connect(manager).cancel(2));

            await expect(estateForger.connect(depositor1).deposit(
                1, 2, { value: ethers.utils.parseEther('100') },
            )).to.be.revertedWithCustomError(estateForger, "AlreadyCancelled");

            await expect(estateForger.connect(depositor1).deposit(
                2, 100,
            )).to.be.revertedWithCustomError(estateForger, "AlreadyCancelled");
        });

        it('2.2.9.7. deposit tokenization unsuccessfully with confirmed request', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                whitelistDepositors: true,
                whitelistDepositorsForRequests: true,
                listSampleCustodians: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
                confirmRequests: true,
                addEstateForgerToVault: true,
                fundERC20ForManagers: true,
                registerBrokers: true,
            });
            const { manager, estateForger, depositor1 } = fixture;

            await expect(estateForger.connect(depositor1).deposit(
                1, 2, { value: 1e9 },
            )).to.be.revertedWithCustomError(estateForger, "AlreadyConfirmed");

            await expect(estateForger.connect(depositor1).deposit(
                2, 100,
            )).to.be.revertedWithCustomError(estateForger, "AlreadyConfirmed");
        });

        it('2.2.9.8. deposit tokenization unsuccessfully by whitelisted account before private sale start', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addEstateForgerToVault: true,
                whitelistDepositors: true,
                registerBrokers: true,
            });
            const { estateForger, depositor1 } = fixture;

            await expect(estateForger.connect(depositor1).deposit(
                1, 2, { value: ethers.utils.parseEther('100') },
            )).to.be.revertedWithCustomError(estateForger, "InvalidDepositing");

            let saleStartsAt = (await estateForger.getRequest(1)).agenda.saleStartsAt;
            await time.setNextBlockTimestamp(saleStartsAt - 1);

            await expect(estateForger.connect(depositor1).deposit(
                1, 2, { value: ethers.utils.parseEther('100') },
            )).to.be.revertedWithCustomError(estateForger, "InvalidDepositing");
        });

        it('2.2.9.9. deposit tokenization unsuccessfully by unwhitelisted account before public sale start', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addEstateForgerToVault: true,
                whitelistDepositorsForRequests: true,
                registerBrokers: true,
            });
            const { estateForger, depositor1 } = fixture;

            let saleStartsAt = (await estateForger.getRequest(1)).agenda.saleStartsAt;
            await time.setNextBlockTimestamp(saleStartsAt);

            await expect(estateForger.connect(depositor1).deposit(
                1, 2, { value: ethers.utils.parseEther('100') },
            )).to.be.revertedWithCustomError(estateForger, "InvalidDepositing");

            const privateSaleEndsAt = (await estateForger.getRequest(1)).agenda.privateSaleEndsAt;
            await time.setNextBlockTimestamp(privateSaleEndsAt - 1);

            await expect(estateForger.connect(depositor1).deposit(
                1, 2, { value: ethers.utils.parseEther('100') },
            )).to.be.revertedWithCustomError(estateForger, "InvalidDepositing");
        });

        it('2.2.9.10. deposit tokenization unsuccessfully by unwhitelisted for request account before public sale start', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addEstateForgerToVault: true,
                whitelistDepositors: true,
                registerBrokers: true,
            });
            const { estateForger, depositor1 } = fixture;

            let saleStartsAt = (await estateForger.getRequest(1)).agenda.saleStartsAt;
            await time.setNextBlockTimestamp(saleStartsAt);

            await expect(estateForger.connect(depositor1).deposit(
                1, 2, { value: ethers.utils.parseEther('100') },
            )).to.be.revertedWithCustomError(estateForger, "InvalidDepositing");

            const privateSaleEndsAt = (await estateForger.getRequest(1)).agenda.privateSaleEndsAt;
            await time.setNextBlockTimestamp(privateSaleEndsAt - 1);

            await expect(estateForger.connect(depositor1).deposit(
                1, 2, { value: ethers.utils.parseEther('100') },
            )).to.be.revertedWithCustomError(estateForger, "InvalidDepositing");
        });

        it('2.2.9.11. deposit tokenization unsuccessfully after public sale ended', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                whitelistDepositors: true,
                whitelistDepositorsForRequests: true,
                listSampleCustodians: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addEstateForgerToVault: true,
                registerBrokers: true,
            });
            const { manager, estateForger, depositor1 } = fixture;

            const publicSaleEndsAt1 = (await estateForger.getRequest(1)).agenda.publicSaleEndsAt;
            await time.setNextBlockTimestamp(publicSaleEndsAt1);

            await expect(estateForger.connect(depositor1).deposit(
                1, 2, { value: ethers.utils.parseEther('100') },
            )).to.be.revertedWithCustomError(estateForger, "InvalidDepositing");

            await callTransaction(estateForger.connect(depositor1).deposit(
                2, 100,
            ));

            const publicSaleEndsAt2 = (await estateForger.getRequest(2)).agenda.publicSaleEndsAt;
            await time.setNextBlockTimestamp(publicSaleEndsAt2);

            await expect(estateForger.connect(depositor1).deposit(
                1, 2, { value: ethers.utils.parseEther('100') },
            )).to.be.revertedWithCustomError(estateForger, "InvalidDepositing");

            await expect(estateForger.connect(depositor1).deposit(
                2, 100,
            )).to.be.revertedWithCustomError(estateForger, "InvalidDepositing");
        });

        it('2.2.9.12. deposit tokenization unsuccessfully with max selling amount exceeded', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                whitelistDepositors: true,
                whitelistDepositorsForRequests: true,
                addEstateForgerToVault: true,
                registerBrokers: true,
            });
            const { manager, estateForger, depositor1, depositor2 } = fixture;

            let saleStartsAt = Math.max(
                (await estateForger.getRequest(1)).agenda.saleStartsAt,
                (await estateForger.getRequest(2)).agenda.saleStartsAt
            );
            await time.setNextBlockTimestamp(saleStartsAt);

            await callTransaction(estateForger.connect(depositor1).deposit(
                1, 10, { value: ethers.utils.parseEther('100') },
            ));
            await callTransaction(estateForger.connect(depositor2).deposit(
                2, 100, { value: ethers.utils.parseEther('100') }
            ));
            
            await expect(estateForger.connect(depositor1).deposit(
                1, 41, { value: ethers.utils.parseEther('100') }
            )).to.be.revertedWithCustomError(estateForger, "MaxSellingQuantityExceeded");

            await expect(estateForger.connect(depositor1).deposit(
                2, 901,
            )).to.be.revertedWithCustomError(estateForger, "MaxSellingQuantityExceeded");
        });

        it('2.2.9.13. deposit tokenization request unsuccessfully with insufficient native token', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                whitelistDepositors: true,
                whitelistDepositorsForRequests: true,
                listSampleCustodians: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addEstateForgerToVault: true,
                registerBrokers: true,
            });
            const { estateForger, depositor1 } = fixture;

            let saleStartsAt = (await estateForger.getRequest(1)).agenda.saleStartsAt;
            await time.setNextBlockTimestamp(saleStartsAt);

            await expect(estateForger.connect(depositor1).deposit(
                1, 2,
            )).to.be.reverted;
        });

        it('2.2.9.14. deposit tokenization request unsuccessfully with insufficient ERC20 token allowance', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                whitelistDepositors: true,
                whitelistDepositorsForRequests: true,
                listSampleCustodians: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
                registerBrokers: true,
            });
            const { estateForger, depositor1 } = fixture;

            let saleStartsAt = (await estateForger.getRequest(2)).agenda.saleStartsAt;
            await time.setNextBlockTimestamp(saleStartsAt);

            await expect(estateForger.connect(depositor1).deposit(
                2, 100,
            )).to.be.revertedWith("ERC20: insufficient allowance");
        });

        it('2.2.9.15. deposit tokenization request unsuccessfully when refunding failed', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                whitelistDepositors: true,
                whitelistDepositorsForRequests: true,
                listSampleCustodians: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addEstateForgerToVault: true,
                registerBrokers: true,
            });
            const { deployer, estateForger } = fixture;

            const failReceiver = await deployFailReceiver(deployer, true, false);

            const message = estateForger.interface.encodeFunctionData('deposit', [1, 2]);

            const privateSaleEndsAt = (await estateForger.getRequest(1)).agenda.privateSaleEndsAt;
            await time.setNextBlockTimestamp(privateSaleEndsAt);

            await expect(failReceiver.call(estateForger.address, message, { value: ethers.utils.parseEther('100') }))
                .to.be.revertedWithCustomError(estateForger, "FailedRefund");
        });

        it('2.2.9.16. deposit tokenization request unsuccessfully when this contract is reentered', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addEstateForgerToVault: true,
                registerBrokers: true,
            });
            const { deployer, estateForger } = fixture;

            let reentrancyData = estateForger.interface.encodeFunctionData('deposit', [1, 2]);

            let reentrancy = await deployReentrancy(deployer);
            await callTransaction(reentrancy.updateReentrancyPlan(estateForger.address, reentrancyData));

            let message = estateForger.interface.encodeFunctionData('deposit', [1, 2]);

            const privateSaleEndsAt = (await estateForger.getRequest(1)).agenda.privateSaleEndsAt;
            await time.setNextBlockTimestamp(privateSaleEndsAt);

            await testReentrancy_estateForger(
                estateForger,
                reentrancy,
                async () => {
                    await expect(reentrancy.call(estateForger.address, message, { value: ethers.utils.parseEther('100') }))
                        .to.be.revertedWithCustomError(estateForger, "FailedRefund");
                }
            );
        });
    });

    describe('2.2.10. safeDeposit(uint256, uint256, string)', async () => {
        it('2.2.10.1. deposit tokenization successfully and correctly refund native currency', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addEstateForgerToVault: true,
                whitelistDepositors: true,
                whitelistDepositorsForRequests: true,
                registerBrokers: true,
            });
            const { estateForger, depositor1 } = fixture;

            // During private sale
            const initBalance1 = await ethers.provider.getBalance(depositor1.address);

            const params: DepositParams = {
                requestId: BigNumber.from(1),
                quantity: BigNumber.from(2),
            }
            let value1 = (await estateForger.getRequest(params.requestId)).quote.unitPrice.mul(params.quantity);

            let saleStartsAt = (await estateForger.getRequest(params.requestId)).agenda.saleStartsAt;
            await time.setNextBlockTimestamp(saleStartsAt);

            let tx = await getSafeDepositTxByParams(
                estateForger,
                depositor1,
                params,
                { value: value1.mul(10) }
            );
            await tx.wait();

            await expect(tx).to.emit(estateForger, 'Deposit').withArgs(
                params.requestId,
                depositor1.address,
                params.quantity,
                value1
            );

            let receipt = await tx.wait();

            expect(await ethers.provider.getBalance(depositor1.address)).to.equal(
                initBalance1.sub(receipt.effectiveGasPrice.mul(receipt.gasUsed)).sub(value1)
            );
            expect(await ethers.provider.getBalance(estateForger.address)).to.equal(value1);

            let tokenizationRequest = await estateForger.getRequest(params.requestId);
            expect(tokenizationRequest.quota.soldQuantity).to.equal(params.quantity);
            expect(await estateForger.deposits(params.requestId, depositor1.address)).to.equal(params.quantity);
        });

        it('2.2.10.2. deposit tokenization unsuccessfully with invalid request id', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                whitelistDepositors: true,
                listSampleCustodians: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addEstateForgerToVault: true,
                registerBrokers: true,
            });
            const { estateForger, depositor1 } = fixture;

            const params1: DepositParams = {
                requestId: BigNumber.from(0),
                quantity: BigNumber.from(2),
            }
            await expect(getSafeDepositTxByParams(
                estateForger,
                depositor1,
                params1,
                { value: ethers.utils.parseEther('100') }
            )).to.be.revertedWithCustomError(estateForger, "InvalidRequestId");

            const params2: DepositParams = {
                requestId: BigNumber.from(100),
                quantity: BigNumber.from(2),
            }
            await expect(getSafeDepositTxByParams(
                estateForger,
                depositor1,
                params2,
                { value: ethers.utils.parseEther('100') }
            )).to.be.revertedWithCustomError(estateForger, "InvalidRequestId");});

        it('2.2.10.3. deposit tokenization unsuccessfully with invalid anchor', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                whitelistDepositors: true,
                listSampleCustodians: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addEstateForgerToVault: true,
                registerBrokers: true,
            });
            const { estateForger, depositor1 } = fixture;

            const params1: SafeDepositParams = {
                requestId: BigNumber.from(1),
                quantity: BigNumber.from(2),
                anchor: ethers.utils.solidityKeccak256(["string"], ["invalid anchor"]),
            }
            await expect(getSafeDepositTx(
                estateForger,
                depositor1,
                params1, { value: ethers.utils.parseEther('100') }
            )).to.be.revertedWithCustomError(estateForger, "BadAnchor");

            const params2: SafeDepositParams = {
                requestId: BigNumber.from(2),
                quantity: BigNumber.from(2),
                anchor: ethers.utils.solidityKeccak256(["string"], ["invalid anchor"]),
            }
            await expect(getSafeDepositTx(
                estateForger,
                depositor1,
                params2, { value: ethers.utils.parseEther('100') }
            )).to.be.revertedWithCustomError(estateForger, "BadAnchor");
        });

        it('2.2.10.4. deposit tokenization unsuccessfully when paused', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addEstateForgerToVault: true,
                whitelistDepositors: true,
                whitelistDepositorsForRequests: true,
                registerBrokers: true,
            });
            const { estateForger, depositor1 } = fixture;

            const params1: DepositParams = {
                requestId: BigNumber.from(0),
                quantity: BigNumber.from(2),
            }
            await expect(getSafeDepositTxByParams(
                estateForger,
                depositor1,
                params1,
                { value: ethers.utils.parseEther('100') }
            )).to.be.revertedWithCustomError(estateForger, "InvalidRequestId");
        });
    });

    describe('2.2.11. cancel(uint256)', async () => {
        it('2.2.11.1. cancel tokenization successfully', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                registerBrokers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger, depositor1 } = fixture;

            for (let requestId = 1; requestId <= 2; requestId++) {
                const tx = await estateForger.connect(manager).cancel(requestId);
                await tx.wait();

                await expect(tx).to
                    .emit(estateForger, 'RequestCancellation')
                    .withArgs(requestId);

                const request = await estateForger.getRequest(requestId);
                expect(request.estate.estateId).to.equal(0);
                expect(request.quota.totalQuantity).to.equal(0);
            }
        });

        it('2.2.11.2. cancel tokenization unsuccessfully by non-manager', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                registerBrokers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger, user, moderator } = fixture;

            await expect(estateForger.connect(user).cancel(1))
                .to.be.revertedWithCustomError(estateForger, "Unauthorized");

            await expect(estateForger.connect(moderator).cancel(2))
                .to.be.revertedWithCustomError(estateForger, "Unauthorized");
        });

        it('2.2.11.3. cancel tokenization unsuccessfully with invalid request id', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                registerBrokers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger, depositor1 } = fixture;

            await expect(estateForger.connect(manager).cancel(0))
                .to.be.revertedWithCustomError(estateForger, "InvalidRequestId");

            await expect(estateForger.connect(manager).cancel(100))
                .to.be.revertedWithCustomError(estateForger, "InvalidRequestId");
        });

        it('2.2.11.4. cancel tokenization unsuccessfully when paused', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                registerBrokers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addEstateForgerToVault: true,
                pause: true,
            });
            const { manager, estateForger, admin, admins } = fixture;

            await expect(estateForger.connect(manager).cancel(1))
                .to.be.revertedWith("Pausable: paused");

            await expect(estateForger.connect(manager).cancel(2))
                .to.be.revertedWith("Pausable: paused");
        });

        it('2.2.11.6. cancel tokenization unsuccessfully by inactive manager in zone', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                registerBrokers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger, admin, admins } = fixture;
            
            const zone = (await estateForger.getRequest(1)).estate.zone;
            await callAdmin_ActivateIn(
                admin,
                admins,
                zone,
                [manager.address],
                false,
                await admin.nonce()
            );

            await expect(estateForger.connect(manager).cancel(1))
                .to.be.revertedWithCustomError(estateForger, "Unauthorized");
        });

        it('2.2.11.7. cancel tokenization unsuccessfully with cancelled request', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                registerBrokers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addEstateForgerToVault: true,
            });
            const { manager, estateForger } = fixture;

            await estateForger.connect(manager).cancel(1);
            await expect(estateForger.connect(manager).cancel(1))
                .to.be.revertedWithCustomError(estateForger, "AlreadyCancelled");

            await estateForger.connect(manager).cancel(2);
            await expect(estateForger.connect(manager).cancel(2))
                .to.be.revertedWithCustomError(estateForger, "AlreadyCancelled");
        });

        it('2.2.11.8. cancel tokenization unsuccessfully with confirmed request', async () => {
            const fixture = await beforeEstateForgerTest({
                listSampleCurrencies: true,
                addZoneForExecutive: true,
                listSampleCustodians: true,
                registerBrokers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
                confirmRequests: true,
                addEstateForgerToVault: true,
                fundERC20ForManagers: true,
            });
            const { manager, estateForger } = fixture;

            await expect(estateForger.connect(manager).cancel(1))
                .to.be.revertedWithCustomError(estateForger, "AlreadyConfirmed");
        });
    });

    describe('2.2.12. safeConfirm(uint256, address, bytes32)', async () => {
        async function testConfirmTokenization(
            currentRequestId: number,
            fixture: EstateForgerFixture,
            feeDenomination: BigNumber,
            exclusiveRate: BigNumber,
            currency: Currency | null,
            isERC20: boolean,
            isExclusive: boolean,
            minSellingQuantity: BigNumber,
            maxSellingQuantity: BigNumber,
            totalSupply: BigNumber,
            unitPrice: BigNumber,
            cashbackThreshold: BigNumber,
            cashbackBaseRate: BigNumber,
            cashbackCurrencies: string[],
            cashbackDenominations: BigNumber[],
            deposits: any[],
            broker: any,
            brokerCommissionRate: BigNumber,
        ) {
            const { admin, admins, zone1, deployer, manager, estateForger, currencies: _currencies, custodian1, estateToken, feeReceiver, commissionToken, priceWatcher, reserveVault, validator } = fixture;
            const decimals = Constant.ESTATE_TOKEN_TOKEN_DECIMALS;
            const currencies = _currencies.slice();

            let timestamp = await time.latest() + 1000;

            const zone = zone1;
            const custodian = custodian1;

            let newCurrency: Currency | undefined;
            let newCurrencyAddress: string;

            if (currency) {
                newCurrency = currency;
                newCurrencyAddress = currency.address;
            } else {
                if (isERC20) {
                    newCurrency = await deployCurrency(
                        deployer.address,
                        `NewMockCurrency_${currentRequestId}`,
                        `NMC_${currentRequestId}`
                    ) as Currency;
                    await callTransaction(newCurrency.setExclusiveDiscount(exclusiveRate, Constant.COMMON_RATE_DECIMALS));
                    currencies.push(newCurrency);
                    newCurrencyAddress = newCurrency.address;
                } else {
                    newCurrencyAddress = ethers.constants.AddressZero;
                }
            }

            const currentEstateId = currentRequestId;

            const allCashbackCurrencies = [newCurrencyAddress, ...cashbackCurrencies];

            await callAdmin_UpdateCurrencyRegistries(
                admin,
                admins,
                allCashbackCurrencies,
                allCashbackCurrencies.map(_ => true),
                allCashbackCurrencies.map(_ => false),
                await admin.nonce(),
            );
            await addCurrencyToAdminAndPriceWatcher(
                admin,
                priceWatcher,
                admins,
                [newCurrencyAddress],
                [true],
                [isExclusive],
                [ethers.constants.AddressZero],
                [100],
                [{ value: BigNumber.from(100), decimals: 0 }],
            );

            await callTransaction(getRegisterBrokerTx(commissionToken as any, manager, {
                zone: zone,
                broker: broker.address,
                commissionRate: brokerCommissionRate,
            }));

            await time.setNextBlockTimestamp(timestamp);

            const requestParams = {
                requester: custodian.address,
                estate: {
                    zone: zone,
                    uri: `Token_${currentRequestId}`,
                    expireAt: timestamp + 1e9,
                },
                quota: {
                    totalQuantity: totalSupply,
                    minSellingQuantity: minSellingQuantity,
                    maxSellingQuantity: maxSellingQuantity,
                },
                quote: {
                    currency: newCurrencyAddress,
                    unitPrice: unitPrice,
                    cashbackThreshold: cashbackThreshold,
                    cashbackBaseRate: cashbackBaseRate,
                    cashbackCurrencies: cashbackCurrencies,
                    cashbackDenominations: cashbackDenominations,
                    feeDenomination: feeDenomination,
                    broker: broker.address,
                },
                agenda: {
                    saleStartsAt: timestamp + 10,
                    privateSaleDuration: 20 * DAY,
                    publicSaleDuration: 40 * DAY,
                }
            }

            await callTransaction(getRequestTokenizationTx(estateForger, validator, manager, requestParams));

            timestamp += 10 + 20 * DAY;
            await time.setNextBlockTimestamp(timestamp);

            for (const record of deposits) {
                const value = record.depositedValue.mul(unitPrice);
                let ethValue = ethers.BigNumber.from(0);
                await prepareNativeToken(ethers.provider, deployer, [record.depositor], ethers.utils.parseEther("1.0"));
                if (isERC20) {
                    await prepareERC20(newCurrency!, [record.depositor], [estateForger], value);
                } else {
                    ethValue = value;
                    await prepareNativeToken(ethers.provider, deployer, [record.depositor], value);
                }

                await callTransaction(estateForger.connect(record.depositor).deposit(
                    currentRequestId,
                    record.depositedValue,
                    { value: ethValue }
                ));
            }
            
            const walletToReset = [custodian, feeReceiver, broker];

            if (isERC20) {
                await resetERC20(newCurrency!, walletToReset);
            } else {
                await resetNativeToken(ethers.provider, walletToReset);
            }

            let cashbackBaseAmount = ethers.BigNumber.from(0);            
            let confirmValue = ethers.utils.parseEther("1");

            const fundId = (await estateForger.getRequest(currentRequestId)).quote.cashbackFundId;

            const expectedVaultReceives = new Map<string, BigNumber>();
            const expectedManagerSends = new Map<string, BigNumber>();

            if (!fundId.eq(ethers.constants.Zero)) {
                const fund = await reserveVault.getFund(fundId);

                cashbackBaseAmount = fund.mainDenomination.mul(fund.quantity);

                expectedVaultReceives.set(fund.mainCurrency, cashbackBaseAmount);
                for(let i = 0; i < fund.extraCurrencies.length; ++i) {
                    const current = expectedVaultReceives.get(fund.extraCurrencies[i]) || ethers.BigNumber.from(0);
                    expectedVaultReceives.set(fund.extraCurrencies[i], current.add(fund.extraDenominations[i].mul(fund.quantity)));
                }

                for(let i = 0; i < fund.extraCurrencies.length; ++i) {
                    const current = expectedManagerSends.get(fund.extraCurrencies[i]) || ethers.BigNumber.from(0);
                    expectedManagerSends.set(fund.extraCurrencies[i], current.add(fund.extraDenominations[i].mul(fund.quantity)));
                }
                for(let i = 0; i < allCashbackCurrencies.length; ++i) {
                    const currencyAddress = allCashbackCurrencies[i];
                    const currencyContract = currencies.find(c => c.address === currencyAddress);
                    if (currencyContract) {
                        await prepareERC20(currencyContract, [manager], [estateForger], expectedManagerSends.get(currencyAddress) || ethers.BigNumber.from(0));
                    } else {
                        confirmValue = confirmValue.add(expectedManagerSends.get(currencyAddress) || ethers.BigNumber.from(0));
                    }
                }
            }

            await prepareNativeToken(ethers.provider, deployer, [manager], confirmValue);
            
            const initManagerBalances = new Map<string, BigNumber>();
            const initVaultBalances = new Map<string, BigNumber>();
            const initEstateForgerBalances = new Map<string, BigNumber>();

            for(let i = 0; i < allCashbackCurrencies.length; ++i) {
                const currencyAddress = allCashbackCurrencies[i];
                const currencyContract = currencies.find(c => c.address === currencyAddress) || null;
                initManagerBalances.set(currencyAddress, await getBalance(ethers.provider, manager.address, currencyContract));
                initVaultBalances.set(currencyAddress, await getBalance(ethers.provider, reserveVault.address, currencyContract));
                initEstateForgerBalances.set(currencyAddress, await getBalance(ethers.provider, estateForger.address, currencyContract));
            }

            timestamp += 100;
            await time.setNextBlockTimestamp(timestamp);
            
            const confirmParams: ConfirmParams = {
                requestId: BigNumber.from(currentRequestId),
            }
            const tx = await getSafeConfirmTxByParams(
                estateForger, manager, confirmParams, { value: confirmValue }
            );
            const receipt = await tx.wait();
            const gasFee = receipt.gasUsed.mul(receipt.effectiveGasPrice);;

            const request = await estateForger.getRequest(currentRequestId);
            expect(request.estate.estateId).to.equal(currentEstateId);

            const soldQuantity = request.quota.soldQuantity;

            let value = ethers.BigNumber.from(soldQuantity).mul(unitPrice);
            let fee = ethers.BigNumber.from(soldQuantity).mul(request.quote.feeDenomination);
            let commissionAmount = ethers.BigNumber.from(soldQuantity).mul(request.quote.commissionDenomination);

            await expect(tx).to.emit(estateForger, 'CommissionDispatch').withArgs(
                broker.address,
                commissionAmount,
                request.quote.currency,
            )

            await expect(tx).to.emit(estateForger, 'RequestConfirmation').withArgs(
                currentRequestId,
                currentEstateId,
                soldQuantity,
                value,
                fee,
                cashbackBaseAmount,
            )

            const requestAfter = await estateForger.getRequest(currentRequestId);
            expect(requestAfter.agenda.publicSaleEndsAt).to.equal(timestamp);
            expect(requestAfter.agenda.confirmAt).to.equal(timestamp);
            
            if (!fundId.eq(ethers.constants.Zero)) {
                const fundAfter = await reserveVault.getFund(fundId);
                expect(fundAfter.isSufficient).to.equal(true);
            }

            expect(estateToken.tokenizeEstate).to.have.been.calledWith(
                request.quota.totalQuantity.mul(ethers.BigNumber.from(10).pow(decimals)),
                request.estate.zone,
                currentRequestId,
                request.estate.uri,
                request.estate.expireAt,
                custodian.address,
                request.quote.broker,
            );

            for(let i = 0; i < allCashbackCurrencies.length; ++i) {
                const currencyAddress = allCashbackCurrencies[i];
                const currencyContract = currencies.find(c => c.address === currencyAddress) || null;

                const vaultReceives = expectedVaultReceives.get(currencyAddress) || ethers.BigNumber.from(0);
                expect(await getBalance(ethers.provider, reserveVault.address, currencyContract)).to.equal(initVaultBalances.get(currencyAddress)!.add(vaultReceives));

                let managerSends = expectedManagerSends.get(currencyAddress) || ethers.BigNumber.from(0);
                if (currencyAddress == ethers.constants.AddressZero) {
                    managerSends = managerSends.add(gasFee);
                }
                expect(await getBalance(ethers.provider, manager.address, currencyContract)).to.equal(initManagerBalances.get(currencyAddress)!.sub(managerSends));

                let valueInCurrency = (currencyAddress == request.quote.currency) ? value : ethers.BigNumber.from(0);
                expect(await getBalance(ethers.provider, estateForger.address, currencyContract)).to.equal(initEstateForgerBalances.get(currencyAddress)!.sub(valueInCurrency));
            }
            
            if (isERC20) {
                expect(await newCurrency!.balanceOf(custodian.address)).to.equal(value.sub(fee));
                expect(await newCurrency!.balanceOf(feeReceiver.address)).to.equal(fee.sub(commissionAmount).sub(cashbackBaseAmount));
                expect(await newCurrency!.balanceOf(broker.address)).to.equal(commissionAmount);
                
            } else {
                expect(await ethers.provider.getBalance(custodian.address)).to.equal(value.sub(fee));
                expect(await ethers.provider.getBalance(feeReceiver.address)).to.equal(fee.sub(commissionAmount).sub(cashbackBaseAmount));
                expect(await ethers.provider.getBalance(broker.address)).to.equal(commissionAmount);
            }

            expect(await estateToken.balanceOf(custodian.address, currentEstateId)).to.equal(
                (totalSupply.sub(soldQuantity)).mul(ethers.BigNumber.from(10).pow(decimals))
            );
            expect(await estateToken.balanceOf(estateForger.address, currentEstateId)).to.equal(
                soldQuantity.mul(ethers.BigNumber.from(10).pow(decimals))
            );

            expect(await commissionToken.ownerOf(currentEstateId)).to.equal(broker.address);
        }

        it('2.2.12.1. confirm tokenization successfully (small test)', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addEstateForgerToVault: true,
            });
            const {estateForger, admin, admins, depositor1, depositor2, depositor3, commissionToken, currencies, broker1, broker2} = fixture;
        
            await callEstateForger_UpdateBaseUnitPriceRange(
                estateForger,
                admins,
                ethers.BigNumber.from(0),
                ethers.constants.MaxUint256,
                await admin.nonce()
            );

            // Native token as main currency, ERC20 as extra currency
            await testConfirmTokenization(
                1,
                fixture,
                ethers.utils.parseEther("0.02"),
                ethers.utils.parseEther("0.3"),
                null,
                false,
                false,
                ethers.BigNumber.from(10),
                ethers.BigNumber.from(30),
                ethers.BigNumber.from(70),
                ethers.utils.parseEther('0.2'),
                ethers.BigNumber.from(5),
                ethers.utils.parseEther("0.001"),
                [currencies[0].address, currencies[1].address],
                [ethers.utils.parseEther('0.01'), ethers.utils.parseEther('0.02')],
                [
                    { depositor: depositor1, depositedValue: ethers.BigNumber.from(1) },
                    { depositor: depositor2, depositedValue: ethers.BigNumber.from(2) },
                    { depositor: depositor2, depositedValue: ethers.BigNumber.from(4) },
                    { depositor: depositor3, depositedValue: ethers.BigNumber.from(8) },
                ],
                broker1,
                ethers.utils.parseEther("0.1"),
            );

            // ERC20 as main currency, native token as extra currency
            await testConfirmTokenization(
                2,
                fixture,
                ethers.utils.parseEther("0.002"),
                ethers.utils.parseEther("0.3"),
                currencies[1],
                true,
                true,
                ethers.BigNumber.from(200),
                ethers.BigNumber.from(1000),
                ethers.BigNumber.from(1000),
                ethers.utils.parseEther("0.02"),
                ethers.BigNumber.from(50),
                ethers.utils.parseEther("0.00001"),
                [currencies[1].address, ethers.constants.AddressZero],
                [ethers.utils.parseEther('0.01'), ethers.utils.parseEther('0.02')],                
                [{ depositor: depositor1, depositedValue: ethers.BigNumber.from(1000) }],
                broker2,
                ethers.utils.parseEther("0.2"),
            );
        });

        it('2.2.12.2. confirm tokenization successfully with duplicated currency', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addEstateForgerToVault: true,
            });
            const {estateForger, admin, admins, depositor1, depositor2, depositor3, currencies, broker1, broker2} = fixture;
        
            await callEstateForger_UpdateBaseUnitPriceRange(
                estateForger,
                admins,
                ethers.BigNumber.from(0),
                ethers.constants.MaxUint256,
                await admin.nonce()
            );

            // Native token as main currency and as extra currency
            await testConfirmTokenization(
                1,
                fixture,
                ethers.utils.parseEther("0.02"),
                ethers.utils.parseEther("0.3"),
                null,
                false,
                false,
                ethers.BigNumber.from(10),
                ethers.BigNumber.from(30),
                ethers.BigNumber.from(70),
                ethers.utils.parseEther('0.2'),
                ethers.BigNumber.from(5),
                ethers.utils.parseEther("0.001"),
                [currencies[0].address, ethers.constants.AddressZero],
                [ethers.utils.parseEther('0.01'), ethers.utils.parseEther('0.02')],
                [
                    { depositor: depositor1, depositedValue: ethers.BigNumber.from(1) },
                    { depositor: depositor2, depositedValue: ethers.BigNumber.from(2) },
                    { depositor: depositor2, depositedValue: ethers.BigNumber.from(4) },
                    { depositor: depositor3, depositedValue: ethers.BigNumber.from(8) },
                ],
                broker1,
                ethers.utils.parseEther("0.1"),
            );

            // ERC20 as main currency, native token as extra currency
            await testConfirmTokenization(
                2,
                fixture,
                ethers.utils.parseEther("0.006"),
                ethers.utils.parseEther("0.3"),
                currencies[0],
                true,
                true,
                ethers.BigNumber.from(200),
                ethers.BigNumber.from(1000),
                ethers.BigNumber.from(1000),
                ethers.utils.parseEther("0.02"),
                ethers.BigNumber.from(50),
                ethers.utils.parseEther("0.00001"),
                [ethers.constants.AddressZero, currencies[0].address],
                [ethers.utils.parseEther('0.01'), ethers.utils.parseEther('0.02')],                
                [{ depositor: fixture.depositor1, depositedValue: ethers.BigNumber.from(1000) }],
                broker2,
                ethers.utils.parseEther("0.2"),
            );
        });

        it('2.2.12.3. confirm tokenization successfully with no cashback currency', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addEstateForgerToVault: true,
            });
            const {estateForger, admin, admins, depositor1, depositor2, depositor3, currencies, broker1, broker2} = fixture;
        
            await callEstateForger_UpdateBaseUnitPriceRange(
                estateForger,
                admins,
                ethers.BigNumber.from(0),
                ethers.constants.MaxUint256,
                await admin.nonce()
            );

            // Native token as main currency
            await testConfirmTokenization(
                1,
                fixture,
                ethers.utils.parseEther("0.02"),
                ethers.utils.parseEther("0.3"),
                null,
                false,
                false,
                ethers.BigNumber.from(10),
                ethers.BigNumber.from(30),
                ethers.BigNumber.from(70),
                ethers.utils.parseEther('0.2'),
                ethers.BigNumber.from(0),
                ethers.utils.parseEther("0"),
                [],
                [],
                [
                    { depositor: depositor1, depositedValue: ethers.BigNumber.from(1) },
                    { depositor: depositor2, depositedValue: ethers.BigNumber.from(2) },
                    { depositor: depositor2, depositedValue: ethers.BigNumber.from(4) },
                    { depositor: depositor3, depositedValue: ethers.BigNumber.from(8) },
                ],
                broker1,
                ethers.utils.parseEther("0.1"),
            );

            // ERC20 as main currency, native token as extra currency
            await testConfirmTokenization(
                2,
                fixture,
                ethers.utils.parseEther("0.006"),
                ethers.utils.parseEther("0.3"),
                currencies[0],
                true,
                true,
                ethers.BigNumber.from(200),
                ethers.BigNumber.from(1000),
                ethers.BigNumber.from(1000),
                ethers.utils.parseEther("0.02"),
                ethers.BigNumber.from(0),
                ethers.utils.parseEther("0"),
                [],
                [],                
                [{ depositor: fixture.depositor1, depositedValue: ethers.BigNumber.from(1000) }],
                broker2,
                ethers.utils.parseEther("0.2"),
            );
        });

        it('2.2.12.4. confirm tokenization successfully with different native/erc20 and exclusive/non-exclusive combinations', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addEstateForgerToVault: true,
            });
            const {estateForger, admin, admins, depositor1, depositor2, depositor3, commissionToken, currencies, broker1, broker2} = fixture;
        
            await callEstateForger_UpdateBaseUnitPriceRange(
                estateForger,
                admins,
                ethers.BigNumber.from(0),
                ethers.constants.MaxUint256,
                await admin.nonce()
            );

            let currentRequestId = 0;
            for (const isERC20 of [false, true]) {
                for (const isExclusive of [false, true]) {
                    if (isExclusive && !isERC20) continue;
                    const broker = randomWallet();
                    await testConfirmTokenization(
                        ++currentRequestId,
                        fixture,
                        ethers.utils.parseEther("0.02"),
                        ethers.utils.parseEther("0.3"),
                        null,
                        isERC20,
                        isExclusive,
                        ethers.BigNumber.from(10),
                        ethers.BigNumber.from(30),
                        ethers.BigNumber.from(70),
                        ethers.utils.parseEther("0.1"),
                        ethers.BigNumber.from(5),
                        ethers.utils.parseEther("0.001"),
                        [currencies[1].address, ethers.constants.AddressZero],
                        [ethers.utils.parseEther('0.01'), ethers.utils.parseEther('0.02')],                
                        [
                            { depositor: depositor1, depositedValue: ethers.BigNumber.from(1) },
                            { depositor: depositor2, depositedValue: ethers.BigNumber.from(2) },
                            { depositor: depositor2, depositedValue: ethers.BigNumber.from(4) },
                            { depositor: depositor3, depositedValue: ethers.BigNumber.from(8) },
                        ],
                        broker,
                        ethers.utils.parseEther("0.1"),
                    );
                }
            }
        });

        it('2.2.12.5. confirm tokenization successfully with very large deposition', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addEstateForgerToVault: true,
            });
            const {estateForger, admin, admins, depositor1, currencies, broker1} = fixture;
        
            await callEstateForger_UpdateBaseUnitPriceRange(
                estateForger,
                admins,
                ethers.BigNumber.from(0),
                ethers.constants.MaxUint256,
                await admin.nonce()
            );

            let currentRequestId = 0;
            for (const isERC20 of [false, true]) {
                for (const isExclusive of [false, true]) {
                    if (isExclusive && !isERC20) continue;

                    const broker = randomWallet();
                    await testConfirmTokenization(
                        ++currentRequestId,
                        fixture,
                        ethers.BigNumber.from(0),
                        ethers.utils.parseEther("0.9"),
                        null,
                        isERC20,
                        isExclusive,
                        ethers.BigNumber.from(2).pow(255).div(Constant.COMMON_RATE_MAX_FRACTION),
                        ethers.BigNumber.from(2).pow(256).sub(1).div(Constant.COMMON_RATE_MAX_FRACTION),
                        ethers.BigNumber.from(2).pow(256).sub(1).div(Constant.COMMON_RATE_MAX_FRACTION),
                        ethers.BigNumber.from(1),
                        ethers.BigNumber.from(1000),
                        ethers.utils.parseEther("0.99"),
                        [currencies[0].address, ethers.constants.AddressZero],
                        [ethers.utils.parseEther('0.01'), ethers.utils.parseEther('0.02')],                
                        [
                            { depositor: depositor1, depositedValue: ethers.BigNumber.from(2).pow(255).div(Constant.COMMON_RATE_MAX_FRACTION) },
                        ],
                        broker,
                        ethers.utils.parseEther("0.9"),
                    );
                }
            }
        });

        it('2.2.12.6. confirm tokenization successfully in 100 random test cases', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCustodians: true,
                addEstateForgerToVault: true,
            });
            const {estateForger, admin, admins, depositor1, currencies, broker1 } = fixture;
        
            await callEstateForger_UpdateBaseUnitPriceRange(
                estateForger,
                admins,
                ethers.BigNumber.from(0),
                ethers.constants.MaxUint256,
                await admin.nonce()
            );

            let currentRequestId = 0;
            for (let testcase = 0; testcase < 100; testcase++) {
                const isERC20 = Math.random() < 0.5;
                const isExclusive = Math.random() < 0.5;
                if (isExclusive && !isERC20) { --testcase; continue; }

                const feeRate = randomBigNumber(ethers.BigNumber.from(0), Constant.COMMON_RATE_MAX_FRACTION);
                const exclusiveRate = randomBigNumber(ethers.BigNumber.from(0), Constant.COMMON_RATE_MAX_FRACTION);
                const commissionRate = randomBigNumber(ethers.BigNumber.from(0), Constant.COMMON_RATE_MAX_FRACTION);
                const decimals = Constant.ESTATE_TOKEN_TOKEN_DECIMALS;

                const randomNums = []
                for (let i = 0; i < 3; ++i) {
                    const maxSupply = ethers.BigNumber.from(2).pow(256).sub(1).div(ethers.BigNumber.from(10).pow(decimals)).div(Constant.COMMON_RATE_MAX_FRACTION);
                    randomNums.push(ethers.BigNumber.from(ethers.utils.randomBytes(32)).mod(maxSupply).add(1));
                }
                randomNums.sort((a, b) => a.sub(b).lt(0) ? -1 : 1);

                const minSellingAmount = randomNums[0];
                const maxSellingAmount = randomNums[1];
                const totalSupply = randomNums[2];

                const unitPrice = randomBigNumber(ethers.BigNumber.from(1), ethers.BigNumber.from(2).pow(256).sub(1).div(Constant.COMMON_RATE_MAX_FRACTION).div(totalSupply));
                const deposits = [
                    { depositor: depositor1, depositedValue: randomBigNumber(minSellingAmount, maxSellingAmount) },
                ];

                const broker = randomWallet();

                await testConfirmTokenization(
                    ++currentRequestId,
                    fixture,
                    unitPrice.mul(feeRate).div(Constant.COMMON_RATE_MAX_FRACTION),
                    exclusiveRate,
                    null,
                    isERC20,
                    isExclusive,
                    minSellingAmount,
                    maxSellingAmount,
                    totalSupply,
                    unitPrice,
                    ethers.BigNumber.from(1000),
                    ethers.utils.parseEther("0.001"),
                    [currencies[0].address, currencies[1].address, ethers.constants.AddressZero],
                    [ethers.utils.parseEther('0.01'), ethers.utils.parseEther('0.02'), ethers.utils.parseEther('0.04')],                
                    deposits,
                    broker,
                    commissionRate,
                );                
            }
        });

        it('2.2.12.7. confirm tokenization unsuccessfully by unauthorized account', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleCustodians: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
                addEstateForgerToVault: true,
                registerBrokers: true,
            });
            
            const {admin, admins, estateForger, user, moderator, currencies} = fixture;

            const zone1 = (await estateForger.getRequest(1)).estate.zone;
            await callAdmin_ActivateIn(
                admin,
                admins,
                zone1,
                [user.address],
                true,
                await admin.nonce()
            )

            for (const currency of currencies) {
                await prepareERC20(
                    currency,
                    [user, moderator],
                    [estateForger],
                    ethers.utils.parseEther(String(1e9)),
                )    
            }
            
            const params1: ConfirmParams = {
                requestId: BigNumber.from(1),
            }
            await expect(getSafeConfirmTxByParams(
                estateForger,
                user,
                params1,
                { value: ethers.utils.parseEther("1000")}
            )).to.be.revertedWithCustomError(estateForger, "Unauthorized");

            const params2: ConfirmParams = {
                requestId: BigNumber.from(2),
            }
            await expect(getSafeConfirmTxByParams(
                estateForger,
                moderator,
                params2,
                { value: ethers.utils.parseEther("1000")}
            )).to.be.revertedWithCustomError(estateForger, "Unauthorized");
        });

        it('2.2.12.8. confirm tokenization unsuccessfully with invalid request id', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleCustodians: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
                addEstateForgerToVault: true,
                registerBrokers: true,
                fundERC20ForManagers: true,
            });
            const {estateForger, manager} = fixture;
            
            const params1: ConfirmParams = {
                requestId: BigNumber.from(0),
            }
            await expect(getSafeConfirmTxByParams(
                estateForger,
                manager,
                params1,
                { value: ethers.utils.parseEther("1000") }
            )).to.be.revertedWithCustomError(estateForger, "InvalidRequestId");

            const params2: ConfirmParams = {
                requestId: BigNumber.from(100),
            }
            await expect(getSafeConfirmTxByParams(
                estateForger,
                manager,
                params2,
                { value: ethers.utils.parseEther("1000") }
            )).to.be.revertedWithCustomError(estateForger, "InvalidRequestId");
        });

        it('2.2.12.9. confirm tokenization unsuccessfully when paused', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleCustodians: true,
                registerBrokers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
                addEstateForgerToVault: true,
                fundERC20ForManagers: true,
            });
            const {deployer, estateForger, admin, admins, manager} = fixture;

            await callPausable_Pause(estateForger, deployer, admins, admin);

            const params1: ConfirmParams = {
                requestId: BigNumber.from(1),
            }
            await expect(getSafeConfirmTxByParams(
                estateForger,
                manager,
                params1,
                { value: ethers.utils.parseEther("1000") }
            )).to.be.revertedWith("Pausable: paused");

            const params2: ConfirmParams = {
                requestId: BigNumber.from(2),
            }
            await expect(getSafeConfirmTxByParams(
                estateForger,
                manager,
                params2,
                { value: ethers.utils.parseEther("1000") }
            )).to.be.revertedWith("Pausable: paused");
        });

        it('2.2.12.11. confirm tokenization unsuccessfully with inactive manager in zone', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleCustodians: true,
                registerBrokers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
                addEstateForgerToVault: true,
                fundERC20ForManagers: true,
            });
            const {estateForger, manager, admin, admins} = fixture;

            const zone = (await estateForger.getRequest(1)).estate.zone;
            await callAdmin_ActivateIn(
                admin,
                admins,
                zone,
                [manager.address],
                false,
                await admin.nonce()
            );

            const params1: ConfirmParams = {
                requestId: BigNumber.from(1),
            }
            await expect(getSafeConfirmTxByParams(
                estateForger,
                manager,
                params1,
                { value: ethers.utils.parseEther("1000") }
            )).to.be.revertedWithCustomError(estateForger, "Unauthorized");
        });

        it('2.2.12.12. confirm tokenization unsuccessfully when confirm before sale starts', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleCustodians: true,
                registerBrokers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
                fundERC20ForManagers: true,
            });
            const {estateForger, manager} = fixture;

            const params1: ConfirmParams = {
                requestId: BigNumber.from(1),
            }
            await expect(getSafeConfirmTxByParams(
                estateForger,
                manager,
                params1,
                { value: ethers.utils.parseEther("1000") }
            )).to.be.revertedWithCustomError(estateForger, "InvalidConfirming");
        });

        it('2.2.12.13. confirm tokenization unsuccessfully with cancelled request id', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleCustodians: true,
                registerBrokers: true,
                addSampleRequests: true,
                addEstateForgerToVault: true,
                fundERC20ForManagers: true,
            });
            const {estateForger, manager} = fixture;

            await callTransaction(estateForger.connect(manager).cancel(1));
            await callTransaction(estateForger.connect(manager).cancel(2));

            const saleStartsAt1 = (await estateForger.getRequest(1)).agenda.saleStartsAt;
            await time.setNextBlockTimestamp(saleStartsAt1);

            const params1: ConfirmParams = {
                requestId: BigNumber.from(1),
            }
            await expect(getSafeConfirmTxByParams(
                estateForger,
                manager,
                params1,
                { value: ethers.utils.parseEther("1000") }
            )).to.be.revertedWithCustomError(estateForger, "AlreadyCancelled");

            const saleStartsAt2 = (await estateForger.getRequest(2)).agenda.saleStartsAt;
            await time.setNextBlockTimestamp(saleStartsAt2);

            const params2: ConfirmParams = {
                requestId: BigNumber.from(2),
            }
            await expect(getSafeConfirmTxByParams(
                estateForger,
                manager,
                params2,
                { value: ethers.utils.parseEther("1000") }
            )).to.be.revertedWithCustomError(estateForger, "AlreadyCancelled");
        });

        it('2.2.12.14. confirm tokenization unsuccessfully with confirmed request id', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleCustodians: true,
                registerBrokers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
                confirmRequests: true,
                addEstateForgerToVault: true,
                fundERC20ForManagers: true,
            });
            const {estateForger, manager} = fixture;

            const params1: ConfirmParams = {
                requestId: BigNumber.from(1),
            }
            await expect(getSafeConfirmTxByParams(
                estateForger,
                manager,
                params1,
                { value: ethers.utils.parseEther("1000") }
            )).to.be.revertedWithCustomError(estateForger, "AlreadyConfirmed");

            const params2: ConfirmParams = {
                requestId: BigNumber.from(2),
            }
            await expect(getSafeConfirmTxByParams(
                estateForger,
                manager,
                params2,
                { value: ethers.utils.parseEther("1000") }
            )).to.be.revertedWithCustomError(estateForger, "AlreadyConfirmed");
        });

        it('2.2.12.15. confirm tokenization successfully within 30 days after public sale ends', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleCustodians: true,
                registerBrokers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
                addEstateForgerToVault: true,
                fundERC20ForManagers: true,
            });
            const {estateForger, manager} = fixture;

            const confirmationTimeLimit = Constant.ESTATE_TOKEN_CONFIRMATION_TIME_LIMIT;

            const request = await estateForger.getRequest(1);
            const publicSaleEndsAt = request.agenda.publicSaleEndsAt;
            await time.setNextBlockTimestamp(publicSaleEndsAt + confirmationTimeLimit - 1);

            const params1: ConfirmParams = {
                requestId: BigNumber.from(1),
            }
            await callTransaction(getSafeConfirmTxByParams(
                estateForger,
                manager,
                params1,
                { value: ethers.utils.parseEther("1000")})
            );

            expect((await estateForger.getRequest(1)).agenda.publicSaleEndsAt).to.equal(publicSaleEndsAt);
        });

        it('2.2.12.16. confirm tokenization unsuccessfully after 30 days after public sale ends', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleCustodians: true,
                registerBrokers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
                addEstateForgerToVault: true,
                fundERC20ForManagers: true,
            });
            const {estateForger, manager} = fixture;

            const confirmationTimeLimit = Constant.ESTATE_TOKEN_CONFIRMATION_TIME_LIMIT;

            const request = await estateForger.getRequest(1);
            const publicSaleEndsAt = request.agenda.publicSaleEndsAt;
            await time.setNextBlockTimestamp(publicSaleEndsAt + confirmationTimeLimit);

            const params1: ConfirmParams = {
                requestId: BigNumber.from(1),
            }
            await expect(getSafeConfirmTxByParams(
                estateForger,
                manager,
                params1,
                { value: ethers.utils.parseEther("1000") }
            )).to.be.revertedWithCustomError(estateForger, "Timeout");
        });

        it('2.2.12.17. confirm tokenization unsuccessfully when sold amount is less than min selling amount', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleCustodians: true,
                registerBrokers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addEstateForgerToVault: true,
                fundERC20ForManagers: true,
            });
            const {estateForger, manager, depositor1} = fixture;
            
            const privateSaleEndsAt1 = (await estateForger.getRequest(1)).agenda.privateSaleEndsAt;
            await time.setNextBlockTimestamp(privateSaleEndsAt1);
            await callTransaction(estateForger.connect(depositor1).deposit(1, 9, { value: ethers.utils.parseEther("100") }));

            const privateSaleEndsAt2 = (await estateForger.getRequest(2)).agenda.privateSaleEndsAt;
            await time.setNextBlockTimestamp(privateSaleEndsAt2);
            await callTransaction(estateForger.connect(depositor1).deposit(2, 199));

            const params1: ConfirmParams = {
                requestId: BigNumber.from(1),
            }
            await expect(getSafeConfirmTxByParams(
                estateForger,
                manager,
                params1,
                { value: ethers.utils.parseEther("1000") }
            )).to.be.revertedWithCustomError(estateForger, "NotEnoughSoldQuantity");
        });

        it('2.2.12.18. confirm tokenization unsuccessfully with insufficient native token', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleCustodians: true,
                registerBrokers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
                addEstateForgerToVault: true,
                fundERC20ForManagers: true,
            });
            const {estateForger, manager} = fixture;

            const params2: ConfirmParams = {
                requestId: BigNumber.from(2),
            }
            await expect(getSafeConfirmTxByParams(
                estateForger,
                manager,
                params2
            )).to.be.revertedWithCustomError(estateForger, "InsufficientValue");            
        });

        it('2.2.12.19. confirm tokenization unsuccessfully with insufficient erc20 allowance or balance', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleCustodians: true,
                registerBrokers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
                addEstateForgerToVault: true,
            });
            const {estateForger, manager} = fixture;

            const params1: ConfirmParams = {
                requestId: BigNumber.from(1),
            }
            await expect(getSafeConfirmTxByParams(
                estateForger,
                manager,
                params1,
                { value: ethers.utils.parseEther("1000") }
            )).to.be.revertedWith("ERC20: insufficient allowance");  
        });

        it('2.2.12.20. confirm tokenization unsuccessfully when native token transfer to requester failed', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleCustodians: true,
                registerBrokers: true,
                addEstateForgerToVault: true,
                fundERC20ForManagers: true,
            });
            const {estateForger, estateToken, zone1, manager, depositor1, deployer, admin, admins, currencies, validator, broker1} = fixture;
            const baseTimestamp = await time.latest();

            await callEstateForger_UpdateBaseUnitPriceRange(
                estateForger,
                admins,
                ethers.BigNumber.from(0),
                ethers.constants.MaxUint256,
                await admin.nonce()
            );

            const failReceiver = await deployFailReceiver(deployer, true, false);

            await callTransaction(getRegisterCustodianTx(estateToken as any, validator, manager, {
                zone: zone1,
                custodian: failReceiver.address,
                uri: "uri",
            }));

            const requestParams: RequestTokenizationParams = {
                requester: failReceiver.address,
                estate: {
                    zone: zone1,
                    uri: "uri",
                    expireAt: baseTimestamp + 1e9,
                },
                quota: {
                    totalQuantity: ethers.BigNumber.from(70),
                    minSellingQuantity: ethers.BigNumber.from(10),
                    maxSellingQuantity: ethers.BigNumber.from(20),
                },
                quote: {
                    unitPrice: ethers.BigNumber.from(1000000),
                    currency: ethers.constants.AddressZero,
                    cashbackThreshold: ethers.BigNumber.from(5),
                    cashbackBaseRate: ethers.utils.parseEther("0.01"),
                    cashbackCurrencies: [],
                    cashbackDenominations: [],
                    feeDenomination: ethers.BigNumber.from(100000),
                    broker: broker1.address,
                },
                agenda: {
                    saleStartsAt: baseTimestamp + 10,
                    privateSaleDuration: 20 * DAY,
                    publicSaleDuration: 40 * DAY,
                }
            };

            const receipt = await callTransaction(getRequestTokenizationTx(estateForger, validator, manager, requestParams));

            const requestId = receipt.events!.filter(e => e.event === "NewRequest")[0].args![0];

            const privateSaleEndsAt = (await estateForger.getRequest(requestId)).agenda.privateSaleEndsAt;
            await time.setNextBlockTimestamp(privateSaleEndsAt);

            await callTransaction(estateForger.connect(depositor1).deposit(requestId, 10, { value: ethers.utils.parseEther("100") }));

            const params1: ConfirmParams = {
                requestId: BigNumber.from(requestId),
            }
            await expect(getSafeConfirmTxByParams(
                estateForger,
                manager,
                params1,
                { value: ethers.utils.parseEther("1000") }
            )).to.be.revertedWithCustomError(estateForger, "FailedTransfer");
        });

        it('2.2.12.21. confirm tokenization unsuccessfully when native token transfer to fee receiver failed', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleCustodians: true,
                registerBrokers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
                addEstateForgerToVault: true,
                fundERC20ForManagers: true,
            });
            const {estateForger, manager, deployer} = fixture;

            const failReceiver = await deployFailReceiver(deployer, true, false);

            await callTransaction(estateForger.setFeeReceiver(failReceiver.address));

            const params1: ConfirmParams = {
                requestId: BigNumber.from(1),
            }
            await expect(getSafeConfirmTxByParams(
                estateForger,
                manager,
                params1,
                { value: ethers.utils.parseEther("1000") }
            )).to.be.revertedWithCustomError(estateForger, "FailedTransfer");
        });

        it('2.2.12.22. confirm tokenization unsuccessfully when native token transfer to broker failed', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleCustodians: true,
                registerBrokers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
                fundERC20ForManagers: true,
                addEstateForgerToVault: true,
                useFailReceiverAsBroker: true,
            });
            const {estateForger, manager, failReceiver} = fixture;

            await callTransaction(failReceiver.activate(true));

            const params1: ConfirmParams = {
                requestId: BigNumber.from(1),
            }
            await expect(getSafeConfirmTxByParams(
                estateForger,
                manager,
                params1,
                { value: ethers.utils.parseEther("1000") }
            )).to.be.revertedWithCustomError(estateForger, "FailedTransfer");
        });

        it('2.2.12.23. confirm tokenization unsuccessfully when this contract is reentered', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleCustodians: true,
                registerBrokers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
                fundERC20ForManagers: true,
                addEstateForgerToVault: true,
                useReentrancyAsBroker: true,
            });
            const {estateForger, reentrancy, manager} = fixture;

            await testReentrancy_estateForger(
                estateForger,
                reentrancy,
                async () => {
                    const params1: ConfirmParams = {
                        requestId: BigNumber.from(1),
                    }
                    await expect(getSafeConfirmTxByParams(
                        estateForger,
                        manager,
                        params1,
                        { value: ethers.utils.parseEther("1000") }
                    )).to.be.revertedWithCustomError(estateForger, "FailedTransfer");
                }
            );
        });
    });

    describe('2.2.13. withdrawDeposit(uint256)', () => {
        it('2.2.13.1. withdraw deposit successfully when request is cancelled', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleCustodians: true,
                registerBrokers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
                addEstateForgerToVault: true,
            });
            const {estateForger, manager, depositor1, depositor2, currencies} = fixture;

            const currency = currencies[0];

            await callTransaction(estateForger.connect(manager).cancel(1));
            await callTransaction(estateForger.connect(manager).cancel(2));

            let depositAmount = await estateForger.deposits(1, depositor1.address);
            let request = await estateForger.getRequest(1);

            const depositor1InitBalance = await ethers.provider.getBalance(depositor1.address);
            const depositor2InitCurrencyBalance = await currency.balanceOf(depositor2.address);

            let tx = await estateForger.connect(depositor1).withdrawDeposit(1);
            let receipt = await tx.wait();

            let value = depositAmount.mul(request.quote.unitPrice);
            await expect(tx)
                .emit(estateForger, "DepositWithdrawal")
                .withArgs(1, depositor1.address, depositAmount, value);

            expect(await estateForger.deposits(1, depositor1.address)).to.be.equal(0);

            expect(await ethers.provider.getBalance(depositor1.address))
                .to.be.equal(depositor1InitBalance.sub(receipt.gasUsed.mul(receipt.effectiveGasPrice)).add(value));

            depositAmount = await estateForger.deposits(2, depositor2.address);
            request = await estateForger.getRequest(2);

            tx = await estateForger.connect(depositor2).withdrawDeposit(2);
            receipt = await tx.wait();

            value = depositAmount.mul(request.quote.unitPrice);
            await expect(tx)
                .emit(estateForger, "DepositWithdrawal")
                .withArgs(2, depositor2.address, depositAmount, value);

            expect(await estateForger.deposits(2, depositor2.address)).to.be.equal(0);

            expect(await currency.balanceOf(depositor2.address))
                .to.be.equal(depositor2InitCurrencyBalance.add(value));
        });

        it('2.2.13.2. withdraw deposit successfully when request is not confirmable (sold amount is less than minimum selling amount', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleCustodians: true,
                registerBrokers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addEstateForgerToVault: true,
            });
            const {estateForger, depositor1, depositor2} = fixture;

            let timestamp = Math.max(
                (await estateForger.getRequest(1)).agenda.privateSaleEndsAt,
                (await estateForger.getRequest(2)).agenda.privateSaleEndsAt,
            )
            await time.setNextBlockTimestamp(timestamp);

            const minSellingQuantity1 = (await estateForger.getRequest(1)).quota.minSellingQuantity;
            const minSellingQuantity2 = (await estateForger.getRequest(2)).quota.minSellingQuantity;

            await callTransaction(estateForger.connect(depositor1).deposit(1, minSellingQuantity1.sub(1), { value: ethers.utils.parseEther('10') }));
            await callTransaction(estateForger.connect(depositor2).deposit(2, minSellingQuantity2.sub(1), { value: ethers.utils.parseEther('10') }));

            const request1 = await estateForger.getRequest(1); 
            await time.setNextBlockTimestamp(request1.agenda.publicSaleEndsAt + 1);
            await callTransaction(estateForger.connect(depositor1).withdrawDeposit(1))

            const request2 = await estateForger.getRequest(2);
            await time.setNextBlockTimestamp(request2.agenda.publicSaleEndsAt + 1);
            await callTransaction(estateForger.connect(depositor2).withdrawDeposit(2))
        });

        it('2.2.13.3. withdraw deposit successfully after request is no longer confirmable (30 days after public sale ended', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleCustodians: true,
                registerBrokers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
                addEstateForgerToVault: true,
            });
            const {estateForger, depositor1, depositor2} = fixture;

            const request1 = await estateForger.getRequest(1);
            const request2 = await estateForger.getRequest(2);

            const days_60 = 60 * 24 * 60 * 60;

            await time.setNextBlockTimestamp(request1.agenda.publicSaleEndsAt + days_60 + 1);
            await callTransaction(estateForger.connect(depositor1).withdrawDeposit(1))

            await time.setNextBlockTimestamp(request2.agenda.publicSaleEndsAt + days_60 + 1);
            await callTransaction(estateForger.connect(depositor2).withdrawDeposit(2))
        });

        it('2.2.13.4. withdraw deposit unsuccessfully when paused', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleCustodians: true,
                registerBrokers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
                pause: true,
                addEstateForgerToVault: true,
            });
            const {estateForger, depositor1, depositor2} = fixture;

            await expect(estateForger.connect(depositor1).withdrawDeposit(1))
                .to.be.revertedWith("Pausable: paused");
            await expect(estateForger.connect(depositor2).withdrawDeposit(2))
                .to.be.revertedWith("Pausable: paused");
        });

        it('2.2.13.5. withdraw deposit unsuccessfully with invalid request id', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleCustodians: true,
                registerBrokers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
                addEstateForgerToVault: true,
            });
            const {estateForger, manager, depositor1, depositor2} = fixture;

            await callTransaction(estateForger.connect(manager).cancel(1));
            await callTransaction(estateForger.connect(manager).cancel(2));

            await expect(estateForger.connect(depositor1).withdrawDeposit(0))
                .to.be.revertedWithCustomError(estateForger, "InvalidRequestId");
            await expect(estateForger.connect(depositor2).withdrawDeposit(100))
                .to.be.revertedWithCustomError(estateForger, "InvalidRequestId");
        });

        it('2.2.13.6. withdraw deposit unsuccessfully with confirmed request', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleCustodians: true,
                registerBrokers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
                confirmRequests: true,
                addEstateForgerToVault: true,
                fundERC20ForManagers: true,
            });
            const {estateForger, depositor1, depositor2} = fixture;

            await expect(estateForger.connect(depositor1).withdrawDeposit(1))
                .to.be.revertedWithCustomError(estateForger, "AlreadyConfirmed");
            await expect(estateForger.connect(depositor2).withdrawDeposit(2))
                .to.be.revertedWithCustomError(estateForger, "AlreadyConfirmed");
        });

        it('2.2.13.7. withdraw deposit unsuccessfully when public sale not ended', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleCustodians: true,
                registerBrokers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
                addEstateForgerToVault: true,
            });
            const {estateForger, depositor1, depositor2} = fixture;

            await expect(estateForger.connect(depositor1).withdrawDeposit(1))
                .to.be.revertedWithCustomError(estateForger, "StillSelling");
            await expect(estateForger.connect(depositor2).withdrawDeposit(2))
                .to.be.revertedWithCustomError(estateForger, "StillSelling");
        });

        it('2.2.13.8. withdraw deposit unsuccessfully with confirmable request', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleCustodians: true,
                registerBrokers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
                addEstateForgerToVault: true,
            });
            const {estateForger, depositor1, depositor2} = fixture;

            const request1 = await estateForger.getRequest(1);
            const request2 = await estateForger.getRequest(2);

            await time.setNextBlockTimestamp(request1.agenda.publicSaleEndsAt + 1);
            await expect(estateForger.connect(depositor1).withdrawDeposit(1))
                .to.be.revertedWithCustomError(estateForger, "InvalidWithdrawing");

            await time.setNextBlockTimestamp(request2.agenda.publicSaleEndsAt + 1);
            await expect(estateForger.connect(depositor2).withdrawDeposit(2))
                .to.be.revertedWithCustomError(estateForger, "InvalidWithdrawing");
        });

        it('2.2.13.9. withdraw deposit unsuccessfully by already withdrawn user', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleCustodians: true,
                registerBrokers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
                addEstateForgerToVault: true,
            });
            const {estateForger, manager, depositor1, depositor2} = fixture;

            await callTransaction(estateForger.connect(manager).cancel(1));
            await callTransaction(estateForger.connect(manager).cancel(2));

            await callTransaction(estateForger.connect(depositor1).withdrawDeposit(1));
            await callTransaction(estateForger.connect(depositor1).withdrawDeposit(2));
            await callTransaction(estateForger.connect(depositor2).withdrawDeposit(1));
            await callTransaction(estateForger.connect(depositor2).withdrawDeposit(2));

            await expect(estateForger.connect(depositor1).withdrawDeposit(1))
                .to.be.revertedWithCustomError(estateForger, "NothingToWithdraw");
            await expect(estateForger.connect(depositor1).withdrawDeposit(2))
                .to.be.revertedWithCustomError(estateForger, "NothingToWithdraw");
            await expect(estateForger.connect(depositor2).withdrawDeposit(1))
                .to.be.revertedWithCustomError(estateForger, "NothingToWithdraw");
            await expect(estateForger.connect(depositor2).withdrawDeposit(2))
                .to.be.revertedWithCustomError(estateForger, "NothingToWithdraw");
        });

        it('2.2.13.10. withdraw deposit unsuccessfully when native transfer to sender failed', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleCustodians: true,
                registerBrokers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
                addEstateForgerToVault: true,
            });
            const {estateForger, deployer, manager} = fixture;

            const request = await estateForger.getRequest(1);

            const failedReceiver = await deployFailReceiver(deployer, true, false);

            let message = estateForger.interface.encodeFunctionData("deposit", [1, 5]);

            await callTransaction(failedReceiver.call(estateForger.address, message, { value: request.quote.unitPrice.mul(5) }));

            await callTransaction(estateForger.connect(manager).cancel(1));

            message = estateForger.interface.encodeFunctionData("withdrawDeposit", [1]);

            await expect(failedReceiver.call(estateForger.address, message))
                .to.be.revertedWithCustomError(estateForger, "FailedTransfer");
        });

        it('2.2.13.11. withdraw deposit unsuccessfully when this contract is reentered', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleCustodians: true,
                registerBrokers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
                addEstateForgerToVault: true,
            });
            const {estateForger, deployer, manager} = fixture;

            const reentrancy = await deployReentrancy(deployer);

            let message = estateForger.interface.encodeFunctionData("deposit", [1, 10]);

            await callTransaction(reentrancy.call(estateForger.address, message, { value: ethers.utils.parseEther("100") }));

            await callTransaction(estateForger.connect(manager).cancel(1));

            message = estateForger.interface.encodeFunctionData("withdrawDeposit", [1]);
            await callTransaction(reentrancy.updateReentrancyPlan(estateForger.address, message));

            await testReentrancy_estateForger(
                estateForger,
                reentrancy,
                async () => {
                    await expect(reentrancy.call(estateForger.address, message))
                        .to.be.revertedWithCustomError(estateForger, "FailedTransfer");
                }
            );
        });
    });

    describe('2.2.14. withdrawEstateToken(uint256)', () => {
        it('2.2.14.1. withdraw token successfully after request is confirmed', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleCustodians: true,
                registerBrokers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
                confirmRequests: true,
                addEstateForgerToVault: true,
                fundERC20ForManagers: true,
            });
            const {estateForger, estateToken, depositor1, depositor2, depositor3, reserveVault, currencies} = fixture;

            let timestamp = await time.latest() + 100;

            const request1 = await estateForger.getRequest(1);
            const request2 = await estateForger.getRequest(2);
            const fund1 = await reserveVault.getFund(request1.quote.cashbackFundId);
            const fund2 = await reserveVault.getFund(request2.quote.cashbackFundId);

            const unit = BigNumber.from(10).pow(Constant.ESTATE_TOKEN_TOKEN_DECIMALS);
            
            const request1TotalQuantity = request1.quota.soldQuantity;
            const request1TotalAmount = request1TotalQuantity.mul(unit);
            const request2TotalQuantity = request2.quota.soldQuantity;
            const request2TotalAmount = request2TotalQuantity.mul(unit);
 
            // Depositor 1 on request 1
            let depositor1InitNativeBalance = await ethers.provider.getBalance(depositor1.address);
            let depositor1InitCurrency0Balance = await currencies[0].balanceOf(depositor1.address);
            let depositor1InitCurrency1Balance = await currencies[1].balanceOf(depositor1.address);
            const quantity1 = 2;
            const amount1 = unit.mul(quantity1);

            await time.setNextBlockTimestamp(timestamp);

            const estate1deposit1 = await estateForger.deposits(1, depositor1.address);
            
            const tx1 = await estateForger.connect(depositor1).withdrawEstateToken(1);
            const receipt1 = await tx1.wait();
            const gasFee1 = receipt1.gasUsed.mul(receipt1.effectiveGasPrice);
            await expect(tx1)
                .emit(estateForger, "EstateTokenWithdrawal")
                .withArgs(1, depositor1.address, amount1);

            expect(await estateForger.deposits(1, depositor1.address)).to.be.equal(estate1deposit1);
            expect(await estateToken.balanceOf(depositor1.address, 1)).to.be.equal(amount1);
            expect(await estateToken.balanceOf(estateForger.address, 1)).to.be.equal(request1TotalAmount.sub(amount1));
            expect(await estateToken.balanceOf(estateForger.address, 2)).to.be.equal(request2TotalAmount);

            expect(await ethers.provider.getBalance(depositor1.address)).to.be.equal(depositor1InitNativeBalance.sub(gasFee1));
            expect(await currencies[0].balanceOf(depositor1.address)).to.be.equal(depositor1InitCurrency0Balance);
            expect(await currencies[1].balanceOf(depositor1.address)).to.be.equal(depositor1InitCurrency1Balance);

            expect(await estateForger.withdrawAt(1, depositor1.address)).to.be.equal(timestamp);

            // Depositor 2 on request 1
            let depositor2InitNativeBalance = await ethers.provider.getBalance(depositor2.address);
            let depositor2InitCurrency0Balance = await currencies[0].balanceOf(depositor2.address);
            let depositor2InitCurrency1Balance = await currencies[1].balanceOf(depositor2.address);
            const quantity2 = 5;
            const amount2 = unit.mul(quantity2);

            timestamp += 10;
            await time.setNextBlockTimestamp(timestamp);

            const estate1deposit2 = await estateForger.deposits(1, depositor2.address);

            const tx2 = await estateForger.connect(depositor2).withdrawEstateToken(1);
            const receipt2 = await tx2.wait();
            const gasFee2 = receipt2.gasUsed.mul(receipt2.effectiveGasPrice);
            await expect(tx2)
                .emit(estateForger, "EstateTokenWithdrawal")
                .withArgs(1, depositor2.address, amount2);
            expect(await estateForger.deposits(1, depositor2.address)).to.be.equal(estate1deposit2);
            expect(await estateToken.balanceOf(depositor2.address, 1)).to.be.equal(amount2);
            expect(await estateToken.balanceOf(estateForger.address, 1)).to.be.equal(request1TotalAmount.sub(amount1).sub(amount2));
            expect(await estateToken.balanceOf(estateForger.address, 2)).to.be.equal(request2TotalAmount);

            const expectedNativeCashback2 = fund1.mainDenomination.mul(quantity2);
            const expectedCurrency0Cashback2 = fund1.extraDenominations[0].mul(quantity2);
            const expectedCurrency1Cashback2 = fund1.extraDenominations[1].mul(quantity2);
            expect(await ethers.provider.getBalance(depositor2.address)).to.be.equal(depositor2InitNativeBalance.add(expectedNativeCashback2).sub(gasFee2));
            expect(await currencies[0].balanceOf(depositor2.address)).to.be.equal(depositor2InitCurrency0Balance.add(expectedCurrency0Cashback2));
            expect(await currencies[1].balanceOf(depositor2.address)).to.be.equal(depositor2InitCurrency1Balance.add(expectedCurrency1Cashback2));

            expect(await estateForger.withdrawAt(1, depositor2.address)).to.be.equal(timestamp);

            // Depositor 3 on request 1
            let depositor3InitNativeBalance = await ethers.provider.getBalance(depositor3.address);
            let depositor3InitCurrency0Balance = await currencies[0].balanceOf(depositor3.address);
            let depositor3InitCurrency1Balance = await currencies[1].balanceOf(depositor3.address);
            const quantity3 = 10;
            const amount3 = unit.mul(quantity3);

            timestamp += 10;
            await time.setNextBlockTimestamp(timestamp);

            const estate1deposit3 = await estateForger.deposits(1, depositor3.address);

            const tx3 = await estateForger.connect(depositor3).withdrawEstateToken(1);
            const receipt3 = await tx3.wait();
            const gasFee3 = receipt3.gasUsed.mul(receipt3.effectiveGasPrice);
            await expect(tx3)
                .emit(estateForger, "EstateTokenWithdrawal")
                .withArgs(1, depositor3.address, amount3);
            expect(await estateForger.deposits(1, depositor3.address)).to.be.equal(estate1deposit3);
            expect(await estateToken.balanceOf(depositor3.address, 1)).to.be.equal(amount3);
            expect(await estateToken.balanceOf(estateForger.address, 1)).to.be.equal(0);
            expect(await estateToken.balanceOf(estateForger.address, 2)).to.be.equal(request2TotalAmount);

            const expectedNativeCashback3 = fund1.mainDenomination.mul(quantity3);
            const expectedCurrency0Cashback3 = fund1.extraDenominations[0].mul(quantity3);
            const expectedCurrency1Cashback3 = fund1.extraDenominations[1].mul(quantity3);
            expect(await ethers.provider.getBalance(depositor3.address)).to.be.equal(depositor3InitNativeBalance.add(expectedNativeCashback3).sub(gasFee3));
            expect(await currencies[0].balanceOf(depositor3.address)).to.be.equal(depositor3InitCurrency0Balance.add(expectedCurrency0Cashback3));
            expect(await currencies[1].balanceOf(depositor3.address)).to.be.equal(depositor3InitCurrency1Balance.add(expectedCurrency1Cashback3));

            expect(await estateForger.withdrawAt(1, depositor3.address)).to.be.equal(timestamp);

            // Depositor 1 on request 2
            depositor1InitNativeBalance = await ethers.provider.getBalance(depositor1.address);
            depositor1InitCurrency0Balance = await currencies[0].balanceOf(depositor1.address);
            depositor1InitCurrency1Balance = await currencies[1].balanceOf(depositor1.address);            
            const quantity4 = 200;
            const amount4 = unit.mul(quantity4);

            timestamp += 10;
            await time.setNextBlockTimestamp(timestamp);

            const estate2deposit1 = await estateForger.deposits(2, depositor1.address);

            const tx4 = await estateForger.connect(depositor1).withdrawEstateToken(2);
            const receipt4 = await tx4.wait();
            const gasFee4 = receipt4.gasUsed.mul(receipt4.effectiveGasPrice);
            await expect(tx4)
                .emit(estateForger, "EstateTokenWithdrawal")
                .withArgs(2, depositor1.address, amount4);
            expect(await estateForger.deposits(2, depositor1.address)).to.be.equal(estate2deposit1);
            expect(await estateToken.balanceOf(depositor1.address, 2)).to.be.equal(amount4);
            expect(await estateToken.balanceOf(estateForger.address, 1)).to.be.equal(0);
            expect(await estateToken.balanceOf(estateForger.address, 2)).to.be.equal(request2TotalAmount.sub(amount4));

            const expectedCurrency0Cashback4 = fund2.mainDenomination.mul(quantity4);
            const expectedCurrency1Cashback4 = fund2.extraDenominations[0].mul(quantity4);
            const expectedNativeCashback4 = fund2.extraDenominations[1].mul(quantity4);
            expect(await ethers.provider.getBalance(depositor1.address)).to.be.equal(depositor1InitNativeBalance.add(expectedNativeCashback4).sub(gasFee4));
            expect(await currencies[0].balanceOf(depositor1.address)).to.be.equal(depositor1InitCurrency0Balance.add(expectedCurrency0Cashback4));
            expect(await currencies[1].balanceOf(depositor1.address)).to.be.equal(depositor1InitCurrency1Balance.add(expectedCurrency1Cashback4));

            expect(await estateForger.withdrawAt(2, depositor1.address)).to.be.equal(timestamp);

            // Depositor 2 on request 2
            depositor2InitNativeBalance = await ethers.provider.getBalance(depositor2.address);
            depositor2InitCurrency0Balance = await currencies[0].balanceOf(depositor2.address);
            depositor2InitCurrency1Balance = await currencies[1].balanceOf(depositor2.address);            
            const quantity5 = 300;
            const amount5 = unit.mul(quantity5);

            timestamp += 10;
            await time.setNextBlockTimestamp(timestamp);

            const estate2deposit2 = await estateForger.deposits(2, depositor2.address);

            const tx5 = await estateForger.connect(depositor2).withdrawEstateToken(2);
            const receipt5 = await tx5.wait();
            const gasFee5 = receipt5.gasUsed.mul(receipt5.effectiveGasPrice);
            await expect(tx5)
                .emit(estateForger, "EstateTokenWithdrawal")
                .withArgs(2, depositor2.address, amount5);
            expect(await estateForger.deposits(2, depositor2.address)).to.be.equal(estate2deposit2);
            expect(await estateToken.balanceOf(depositor2.address, 2)).to.be.equal(amount5);
            expect(await estateToken.balanceOf(estateForger.address, 1)).to.be.equal(0);
            expect(await estateToken.balanceOf(estateForger.address, 2)).to.be.equal(request2TotalAmount.sub(amount4).sub(amount5));

            const expectedCurrency0Cashback5 = fund2.mainDenomination.mul(quantity5);
            const expectedCurrency1Cashback5 = fund2.extraDenominations[0].mul(quantity5);
            const expectedNativeCashback5 = fund2.extraDenominations[1].mul(quantity5);
            expect(await ethers.provider.getBalance(depositor2.address)).to.be.equal(depositor2InitNativeBalance.add(expectedNativeCashback5).sub(gasFee5));
            expect(await currencies[0].balanceOf(depositor2.address)).to.be.equal(depositor2InitCurrency0Balance.add(expectedCurrency0Cashback5));
            expect(await currencies[1].balanceOf(depositor2.address)).to.be.equal(depositor2InitCurrency1Balance.add(expectedCurrency1Cashback5));

            expect(await estateForger.withdrawAt(2, depositor2.address)).to.be.equal(timestamp);

            // Depositor 3 on request 2
            depositor3InitNativeBalance = await ethers.provider.getBalance(depositor3.address);
            depositor3InitCurrency0Balance = await currencies[0].balanceOf(depositor3.address);
            depositor3InitCurrency1Balance = await currencies[1].balanceOf(depositor3.address);
            const quantity6 = 500;
            const amount6 = unit.mul(quantity6);

            timestamp += 10;
            await time.setNextBlockTimestamp(timestamp);

            const estate2deposit3 = await estateForger.deposits(2, depositor3.address);

            const tx6 = await estateForger.connect(depositor3).withdrawEstateToken(2);
            const receipt6 = await tx6.wait();
            const gasFee6 = receipt6.gasUsed.mul(receipt6.effectiveGasPrice);
            await expect(tx6)
                .emit(estateForger, "EstateTokenWithdrawal")
                .withArgs(2, depositor3.address, amount6);
            expect(await estateForger.deposits(2, depositor3.address)).to.be.equal(estate2deposit3);
            expect(await estateToken.balanceOf(depositor3.address, 2)).to.be.equal(amount6);
            expect(await estateToken.balanceOf(estateForger.address, 1)).to.be.equal(0);
            expect(await estateToken.balanceOf(estateForger.address, 2)).to.be.equal(0);

            const expectedCurrency0Cashback6 = fund2.mainDenomination.mul(quantity6);
            const expectedCurrency1Cashback6 = fund2.extraDenominations[0].mul(quantity6);
            const expectedNativeCashback6 = fund2.extraDenominations[1].mul(quantity6);
            expect(await ethers.provider.getBalance(depositor3.address)).to.be.equal(depositor3InitNativeBalance.add(expectedNativeCashback6).sub(gasFee6));
            expect(await currencies[0].balanceOf(depositor3.address)).to.be.equal(depositor3InitCurrency0Balance.add(expectedCurrency0Cashback6));
            expect(await currencies[1].balanceOf(depositor3.address)).to.be.equal(depositor3InitCurrency1Balance.add(expectedCurrency1Cashback6));

            expect(await estateForger.withdrawAt(2, depositor3.address)).to.be.equal(timestamp);
        });

        it('2.2.14.2. withdraw token successfully when request has no cashback', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleCustodians: true,
                registerBrokers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
                confirmRequests: true,
                addEstateForgerToVault: true,
                fundERC20ForManagers: true,
                useNoCashback: true,
            });
            const {estateForger, estateToken, depositor1, depositor2, depositor3, reserveVault, currencies} = fixture;

            let timestamp = await time.latest() + 100;

            const request1 = await estateForger.getRequest(1);
            const request2 = await estateForger.getRequest(2);

            const unit = BigNumber.from(10).pow(Constant.ESTATE_TOKEN_TOKEN_DECIMALS);
            
            const request1TotalQuantity = request1.quota.soldQuantity;
            const request1TotalAmount = request1TotalQuantity.mul(unit);
            const request2TotalQuantity = request2.quota.soldQuantity;
            const request2TotalAmount = request2TotalQuantity.mul(unit);
 
            // Depositor 1 on request 1
            let depositor1InitNativeBalance = await ethers.provider.getBalance(depositor1.address);
            let depositor1InitCurrency0Balance = await currencies[0].balanceOf(depositor1.address);
            const quantity1 = 2;
            const amount1 = unit.mul(quantity1);

            await time.setNextBlockTimestamp(timestamp);

            const estate1deposit1 = await estateForger.deposits(1, depositor1.address);
            
            const tx1 = await estateForger.connect(depositor1).withdrawEstateToken(1);
            const receipt1 = await tx1.wait();
            const gasFee1 = receipt1.gasUsed.mul(receipt1.effectiveGasPrice);
            await expect(tx1)
                .emit(estateForger, "EstateTokenWithdrawal")
                .withArgs(1, depositor1.address, amount1);
            expect(await estateForger.deposits(1, depositor1.address)).to.be.equal(estate1deposit1);
            expect(await estateToken.balanceOf(depositor1.address, 1)).to.be.equal(amount1);
            expect(await estateToken.balanceOf(estateForger.address, 1)).to.be.equal(request1TotalAmount.sub(amount1));
            expect(await estateToken.balanceOf(estateForger.address, 2)).to.be.equal(request2TotalAmount);

            expect(await ethers.provider.getBalance(depositor1.address)).to.be.equal(depositor1InitNativeBalance.sub(gasFee1));
            expect(await currencies[0].balanceOf(depositor1.address)).to.be.equal(depositor1InitCurrency0Balance);

            expect(await estateForger.withdrawAt(1, depositor1.address)).to.be.equal(timestamp);

            // Depositor 1 on request 2
            depositor1InitNativeBalance = await ethers.provider.getBalance(depositor1.address);
            depositor1InitCurrency0Balance = await currencies[0].balanceOf(depositor1.address);
            const quantity2 = 200;
            const amount2 = unit.mul(quantity2);

            timestamp += 10;
            await time.setNextBlockTimestamp(timestamp);

            const estate2deposit1 = await estateForger.deposits(2, depositor1.address);

            const tx2 = await estateForger.connect(depositor1).withdrawEstateToken(2);
            const receipt2 = await tx2.wait();
            const gasFee2 = receipt2.gasUsed.mul(receipt2.effectiveGasPrice);
            await expect(tx2)
                .emit(estateForger, "EstateTokenWithdrawal")
                .withArgs(2, depositor1.address, amount2);
            expect(await estateForger.deposits(2, depositor1.address)).to.be.equal(estate2deposit1);
            expect(await estateToken.balanceOf(depositor1.address, 2)).to.be.equal(amount2);
            expect(await estateToken.balanceOf(estateForger.address, 1)).to.be.equal(request1TotalAmount.sub(amount1));
            expect(await estateToken.balanceOf(estateForger.address, 2)).to.be.equal(request2TotalAmount.sub(amount2));

            expect(await ethers.provider.getBalance(depositor1.address)).to.be.equal(depositor1InitNativeBalance.sub(gasFee2));
            expect(await currencies[0].balanceOf(depositor1.address)).to.be.equal(depositor1InitCurrency0Balance);

            expect(await estateForger.withdrawAt(2, depositor1.address)).to.be.equal(timestamp);
        });

        it('2.2.14.3. withdraw token unsuccessfully when paused', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleCustodians: true,
                registerBrokers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
                confirmRequests: true,
                pause: true,
                addEstateForgerToVault: true,
                fundERC20ForManagers: true,
            });
            
            const {estateForger, depositor1, depositor2} = fixture;
            
            await expect(estateForger.connect(depositor1).withdrawEstateToken(1))
                .to.be.revertedWith("Pausable: paused");
            await expect(estateForger.connect(depositor2).withdrawEstateToken(2))
                .to.be.revertedWith("Pausable: paused");
        });

        it('2.2.14.4. withdraw token unsuccessfully with invalid request id', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleCustodians: true,
                registerBrokers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
                confirmRequests: true,
                addEstateForgerToVault: true,
                fundERC20ForManagers: true,
            });
            const {estateForger, depositor1, depositor2} = fixture;

            await expect(estateForger.connect(depositor1).withdrawEstateToken(0))
                .to.be.revertedWithCustomError(estateForger, "InvalidRequestId");
            await expect(estateForger.connect(depositor2).withdrawEstateToken(100))
                .to.be.revertedWithCustomError(estateForger, "InvalidRequestId");
        });

        it('2.2.14.5. withdraw token unsuccessfully with untokenized request', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleCustodians: true,
                registerBrokers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
                addEstateForgerToVault: true,
                fundERC20ForManagers: true,
            });
            const {estateForger, depositor1, depositor2} = fixture;

            await expect(estateForger.connect(depositor1).withdrawEstateToken(1))
                .to.be.revertedWithCustomError(estateForger, "NotTokenized");
        });

        it('2.2.14.6. withdraw token unsuccessfully when sender is already withdrawn', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleCustodians: true,
                registerBrokers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
                confirmRequests: true,
                addEstateForgerToVault: true,
                fundERC20ForManagers: true,
            });

            const {estateForger, depositor1, depositor2} = fixture;

            await callTransaction(estateForger.connect(depositor1).withdrawEstateToken(1));
            await callTransaction(estateForger.connect(depositor1).withdrawEstateToken(2));
            await callTransaction(estateForger.connect(depositor2).withdrawEstateToken(1));
            await callTransaction(estateForger.connect(depositor2).withdrawEstateToken(2));

            await expect(estateForger.connect(depositor1).withdrawEstateToken(1))
                .to.be.revertedWithCustomError(estateForger, "AlreadyWithdrawn");
            await expect(estateForger.connect(depositor1).withdrawEstateToken(2))
                .to.be.revertedWithCustomError(estateForger, "AlreadyWithdrawn");
            await expect(estateForger.connect(depositor2).withdrawEstateToken(1))
                .to.be.revertedWithCustomError(estateForger, "AlreadyWithdrawn");
            await expect(estateForger.connect(depositor2).withdrawEstateToken(2))
                .to.be.revertedWithCustomError(estateForger, "AlreadyWithdrawn");
        });
    });

    // TODO:
    describe('2.2.15. allocationOfAt(address, uint256, uint256)', () => {
        it('2.2.15.1. succeed with existing estate id', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleCustodians: true,
                registerBrokers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
                confirmRequests: true,
                addEstateForgerToVault: true,
                fundERC20ForManagers: true,
            });

            const { estateForger, depositor1, estateToken } = fixture;

            const requestId = 1;
            const depositor = depositor1;

            const units = BigNumber.from(10).pow(await estateToken.decimals());

            const expectedAllocations = new OrderedMap<number, BigNumber>(ethers.BigNumber.from(0));
            expectedAllocations.set(0, BigNumber.from(0));

            const timePivots = new Set<number>();
            function addTimePivot(timestamp: number) {
                if (timestamp > 0) {
                    timePivots.add(timestamp - 1);
                }
                timePivots.add(timestamp);
                timePivots.add(timestamp + 1);
            }

            async function assertCorrectAllocation(currentTimestamp: number) {
                for (const timestamp of timePivots) {
                    if (timestamp > currentTimestamp) {
                        break;
                    }
                    expect(await estateForger.allocationOfAt(depositor.address, requestId, timestamp))
                        .to.equal(expectedAllocations.get(timestamp));
                }
            }
            
            const deposit = await estateForger.deposits(requestId, depositor.address);
            const confirmAt = (await estateForger.getRequest(requestId)).agenda.confirmAt;

            expectedAllocations.set(confirmAt, deposit.mul(units));

            addTimePivot(0);
            addTimePivot(confirmAt);
            
            await time.setNextBlockTimestamp(confirmAt + 5);
            await assertCorrectAllocation(0);

            let timestamp = confirmAt + 10;
            await callTransactionAtTimestamp(
                estateForger.connect(depositor).withdrawEstateToken(requestId),
                timestamp
            );

            expectedAllocations.set(timestamp, BigNumber.from(0));

            addTimePivot(timestamp);

            await time.setNextBlockTimestamp(timestamp + 5);
            await assertCorrectAllocation(timestamp);
        });

        it('2.2.15.2. revert with unconfirmed request', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleCustodians: true,
                registerBrokers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
                addEstateForgerToVault: true,
            });

            const { estateForger, depositor1, depositor2 } = fixture;

            const publicSaleEndsAt1 = (await estateForger.getRequest(1)).agenda.publicSaleEndsAt;

            await expect(estateForger.allocationOfAt(depositor1.address, 1, publicSaleEndsAt1 - 1))
                .to.be.revertedWithCustomError(estateForger, "InvalidTimestamp");
            await expect(estateForger.allocationOfAt(depositor1.address, 1, publicSaleEndsAt1))
                .to.be.revertedWithCustomError(estateForger, "InvalidTimestamp");
            await expect(estateForger.allocationOfAt(depositor1.address, 1, publicSaleEndsAt1 + 1))
                .to.be.revertedWithCustomError(estateForger, "InvalidTimestamp");

            await expect(estateForger.allocationOfAt(depositor2.address, 1, publicSaleEndsAt1 - 1))
                .to.be.revertedWithCustomError(estateForger, "InvalidTimestamp");
            await expect(estateForger.allocationOfAt(depositor2.address, 1, publicSaleEndsAt1))
                .to.be.revertedWithCustomError(estateForger, "InvalidTimestamp");
            await expect(estateForger.allocationOfAt(depositor2.address, 1, publicSaleEndsAt1 + 1))
                .to.be.revertedWithCustomError(estateForger, "InvalidTimestamp");

            const publicSaleEndsAt2 = (await estateForger.getRequest(2)).agenda.publicSaleEndsAt;

            await expect(estateForger.allocationOfAt(depositor1.address, 2, publicSaleEndsAt2 - 1))
                .to.be.revertedWithCustomError(estateForger, "InvalidTimestamp");
            await expect(estateForger.allocationOfAt(depositor1.address, 2, publicSaleEndsAt2))
                .to.be.revertedWithCustomError(estateForger, "InvalidTimestamp");
            await expect(estateForger.allocationOfAt(depositor1.address, 2, publicSaleEndsAt2 + 1))
                .to.be.revertedWithCustomError(estateForger, "InvalidTimestamp");

            await expect(estateForger.allocationOfAt(depositor2.address, 2, publicSaleEndsAt2 - 1))
                .to.be.revertedWithCustomError(estateForger, "InvalidTimestamp");
            await expect(estateForger.allocationOfAt(depositor2.address, 2, publicSaleEndsAt2))
                .to.be.revertedWithCustomError(estateForger, "InvalidTimestamp");
            await expect(estateForger.allocationOfAt(depositor2.address, 2, publicSaleEndsAt2 + 1))
                .to.be.revertedWithCustomError(estateForger, "InvalidTimestamp");
        });

        it('2.2.15.3. revert with non-existing estate id', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleCustodians: true,
                registerBrokers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
                confirmRequests: true,
                addEstateForgerToVault: true,
                fundERC20ForManagers: true,
            });
            const { estateForger, depositor1 } = fixture;

            await expect(estateForger.allocationOfAt(depositor1.address, 0, 0))
                .to.be.revertedWithCustomError(estateForger, "InvalidRequestId");
            await expect(estateForger.allocationOfAt(depositor1.address, 3, 0))
                .to.be.revertedWithCustomError(estateForger, "InvalidRequestId");
            await expect(estateForger.allocationOfAt(depositor1.address, 100, 0))
                .to.be.revertedWithCustomError(estateForger, "InvalidRequestId");
        });

        it('2.2.15.4. revert with timestamp after current block timestamp', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleCustodians: true,
                registerBrokers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
                confirmRequests: true,
                addEstateForgerToVault: true,
                fundERC20ForManagers: true,
            });

            const { estateForger, depositor1 } = fixture;

            let timestamp = await time.latest();

            await expect(estateForger.allocationOfAt(depositor1.address, 1, timestamp - 1))
                .to.not.be.reverted;
            await expect(estateForger.allocationOfAt(depositor1.address, 1, timestamp))
                .to.not.be.reverted;
            await expect(estateForger.allocationOfAt(depositor1.address, 1, timestamp + 1))
                .to.be.revertedWithCustomError(estateForger, "InvalidTimestamp");
        });
    });

    describe('2.2.16. isTokenized(uint256)', () => {
        it('2.2.16.1. return true for tokenized estate', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleCustodians: true,
                registerBrokers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
                confirmRequests: true,
                addEstateForgerToVault: true,
                fundERC20ForManagers: true,
            });

            const { estateForger } = fixture;

            expect(await estateForger.isTokenized(1)).to.be.equal(true);
            expect(await estateForger.isTokenized(2)).to.be.equal(true);
        });

        it('2.2.16.2. return false for not tokenized estate', async () => {
            const fixture = await beforeEstateForgerTest({
                addZoneForExecutive: true,
                listSampleCurrencies: true,
                listSampleCustodians: true,
                registerBrokers: true,
                addSampleRequests: true,
                fundERC20ForDepositors: true,
                addDepositions: true,
                addEstateForgerToVault: true,
                fundERC20ForManagers: true,
            });

            const { estateForger } = fixture;

            expect(await estateForger.isTokenized(1)).to.be.equal(false);
            expect(await estateForger.isTokenized(2)).to.be.equal(false);

            expect(await estateForger.isTokenized(0)).to.be.equal(false);
            expect(await estateForger.isTokenized(100)).to.be.equal(false);
        });
    });

    describe('2.2.17. supportsInterface(bytes4)', () => {
        it('2.2.17.1. return true for appropriate interface', async () => {
            const fixture = await beforeEstateForgerTest();
            const { estateForger } = fixture;

            const ICommon = ICommon__factory.createInterface();
            const IERC1155ReceiverUpgradeable = IERC1155ReceiverUpgradeable__factory.createInterface();
            const IEstateTokenReceiver = IEstateTokenReceiver__factory.createInterface();
            const IEstateTokenizer = IEstateTokenizer__factory.createInterface();
            const IERC165Upgradeable = IERC165Upgradeable__factory.createInterface();

            const IEstateTokenReceiverInterfaceId = getInterfaceID(IEstateTokenReceiver, [IERC1155ReceiverUpgradeable])
            const IEstateTokenizerInterfaceId = getInterfaceID(IEstateTokenizer, [ICommon, IEstateTokenReceiver])
            const IERC165UpgradeableInterfaceId = getInterfaceID(IERC165Upgradeable, []);

            expect(await estateForger.supportsInterface(getBytes4Hex(IEstateTokenReceiverInterfaceId))).to.equal(true);
            expect(await estateForger.supportsInterface(getBytes4Hex(IEstateTokenizerInterfaceId))).to.equal(true);
            expect(await estateForger.supportsInterface(getBytes4Hex(IERC165UpgradeableInterfaceId))).to.equal(true);
        });
    });
});
