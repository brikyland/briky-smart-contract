import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import {
    Admin,
    CommissionToken,
    Currency,
    EstateToken,
    FeeReceiver,
    IERC165Upgradeable__factory,
    IERC2981Upgradeable__factory,
    MockEstateToken,
    MockEstateForger__factory,
    IERC4906Upgradeable__factory,
    IERC721Upgradeable__factory,
    IRoyaltyRateProposer__factory,
    ICommon__factory,
    IERC721MetadataUpgradeable__factory,
    ReserveVault,
    ProxyCaller__factory,
    ProxyCaller,
    ReserveVault__factory,
    MockInitiator,
} from '@typechain-types';
import { callTransaction, getSignatures, prepareERC20, prepareNativeToken, randomWallet } from '@utils/blockchain';
import { Constant } from '@tests/test.constant';
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployFeeReceiver } from '@utils/deployments/common/feeReceiver';
import { deployCurrency } from '@utils/deployments/common/currency';
import { deployMockEstateToken } from '@utils/deployments/mocks/mockEstateToken';
import { deployCommissionToken } from '@utils/deployments/land/commissionToken';
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

import { MockContract, smock } from '@defi-wonderland/smock';

import {
    callAdmin_AuthorizeManagers,
    callAdmin_AuthorizeModerators,
    callAdmin_UpdateCurrencyRegistries,
} from '@utils/callWithSignatures/admin';
import { BigNumber } from 'ethers';
import { randomInt } from 'crypto';
import { getBytes4Hex, getInterfaceID, randomBigNumber } from '@utils/utils';
import { OrderedMap } from '@utils/utils';
import { Initialization as LandInitialization } from '@tests/land/test.initialization';
import { callCommissionToken_Pause } from '@utils/callWithSignatures/commissionToken';
import { deployProxyCaller } from '@utils/deployments/mocks/proxyCaller';
import { deployReserveVault } from '@utils/deployments/common/reserveVault';
import { callReserveVault_AuthorizeInitiator, callReserveVault_Pause } from '@utils/callWithSignatures/reserveVault';
import { deployMockInitiator } from '@utils/deployments/mocks/mockInitiator';

interface ReserveVaultFixture {
    admin: Admin;
    reserveVault: MockContract<ReserveVault>;
    initiators: MockInitiator[];
    currencies: Currency[];

    deployer: any;
    admins: any[];
    funder1: any;
    funder2: any;
    withdrawer1: any;
    withdrawer2: any;
}

describe('20. ReserveVault', async () => {
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

        const initiator1 = await deployMockInitiator(deployer) as MockInitiator;
        const initiator2 = await deployMockInitiator(deployer) as MockInitiator;
        const initiator3 = await deployMockInitiator(deployer) as MockInitiator;
        const initiators = [initiator1, initiator2, initiator3];

        const currency1 = await deployCurrency(deployer.address, 'MockCurrency1', 'MCK1') as Currency;
        const currency2 = await deployCurrency(deployer.address, 'MockCurrency2', 'MCK2') as Currency;
        const currency3 = await deployCurrency(deployer.address, 'MockCurrency3', 'MCK3') as Currency;
        const currency4 = await deployCurrency(deployer.address, 'MockCurrency4', 'MCK4') as Currency;
        const currencies = [currency1, currency2, currency3, currency4];

        const SmockReserveVaultFactory = await smock.mock<ReserveVault__factory>('ReserveVault');
        const reserveVault = await SmockReserveVaultFactory.deploy();
        await callTransaction(reserveVault.initialize(
            admin.address,
        ));

        return {
            admin,
            reserveVault,
            initiators,
            currencies,
            deployer,
            admins,
            funder1,
            funder2,
            withdrawer1,
            withdrawer2,
        };
    };

    async function beforeReserveVaultTest({
        listSampleCurrencies = false,
        authorizeInitiators = false,
        listSampleFunds = false,
        listSampleDeposits = false,
        fundInitiator = false,
        pause = false,
    } = {}): Promise<ReserveVaultFixture> {
        const fixture = await loadFixture(reserveVaultFixture);
        const { deployer, admin, admins, reserveVault, initiators, currencies } = fixture;

        if (authorizeInitiators) {
            await callReserveVault_AuthorizeInitiator(
                reserveVault,
                admins,
                initiators.map(x => x.address),
                true,
                await admin.nonce(),
            )
        }

        if (listSampleCurrencies) {
            const currencyAddresses = [
                ethers.constants.AddressZero,
                ...currencies.map(x => x.address),
            ];

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
            await callTransaction(initiators[0].call(
                reserveVault.address,
                reserveVault.interface.encodeFunctionData(
                    'initiateFund',
                    [
                        currencies[0].address,
                        100,
                        [currencies[1].address, ethers.constants.AddressZero],
                        [200, 400],
                    ]
                )
            ));
        }

        if (listSampleDeposits) {
            reserveVault.setVariable('funds', {
                1: {
                    supply: 1000,
                }
            })
        }

        if (fundInitiator) {            
            await prepareNativeToken(
                ethers.provider,
                deployer,
                initiators,
                ethers.utils.parseEther('100')
            );
            for (const currency of currencies) {
                await prepareERC20(
                    currency,
                    initiators,
                    [reserveVault],
                    ethers.utils.parseEther('100')
                );
            }
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

    describe('20.1. initialize(address, address, address)', async () => {
        it('20.1.1. Deploy successfully', async () => {
            const { admin, reserveVault } = await beforeReserveVaultTest();

            expect(await reserveVault.admin()).to.equal(admin.address);

            expect(await reserveVault.fundNumber()).to.equal(0);
        });
    });

    describe('20.2. authorizeInitiator(address[], bool, bytes[])', async () => {
        it('20.2.1. Authorize initiators successfully with valid signatures', async () => {
            const { reserveVault, admin, admins, initiators } = await beforeReserveVaultTest();

            const toBeInitiators = initiators.slice(0, 2);

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [reserveVault.address, 'authorizeInitiator', toBeInitiators.map(x => x.address), true]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await reserveVault.authorizeInitiator(
                toBeInitiators.map(x => x.address),
                true,
                signatures
            );
            await tx.wait();

            for (const initiator of toBeInitiators) {
                await expect(tx).to
                    .emit(reserveVault, 'InitiatorAuthorization')
                    .withArgs(initiator.address);
            }

            for (const initiator of initiators) {
                const isInitiator = await reserveVault.isInitiator(initiator.address);
                if (toBeInitiators.includes(initiator)) {
                    expect(isInitiator).to.be.true;
                } else {
                    expect(isInitiator).to.be.false;
                }
            }
        });

        it('20.2.2. Authorize initiator unsuccessfully with invalid signatures', async () => {
            const { reserveVault, admin, admins, initiators } = await beforeReserveVaultTest();

            const toBeInitiators = initiators.slice(0, 2);

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [reserveVault.address, 'authorizeInitiator', toBeInitiators.map(x => x.address), true]
            );
            const invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(reserveVault.authorizeInitiator(
                toBeInitiators.map(x => x.address),
                true,
                invalidSignatures
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('20.2.3. Authorize initiator unsuccessfully when authorizing same account twice on same tx', async () => {
            const { reserveVault, admin, admins, initiators } = await beforeReserveVaultTest();

            const toBeInitiators = [initiators[0], initiators[1], initiators[2], initiators[0]];

            let message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [reserveVault.address, 'authorizeInitiator', toBeInitiators.map(x => x.address), true]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(reserveVault.authorizeInitiator(
                toBeInitiators.map(x => x.address),
                true,
                signatures
            )).to.be.revertedWithCustomError(reserveVault, `AuthorizedAccount`)
                .withArgs(initiators[0].address);
        });

        it('20.2.4. Authorize initiator unsuccessfully when authorizing same account twice on different tx', async () => {
            const { reserveVault, admin, admins, initiators } = await beforeReserveVaultTest();

            const tx1Initiators = initiators.slice(0, 2);

            let message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [reserveVault.address, 'authorizeInitiator', tx1Initiators.map(x => x.address), true]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            await callTransaction(reserveVault.authorizeInitiator(
                tx1Initiators.map(x => x.address),
                true,
                signatures
            ));

            const tx2Initiators = [initiators[2], initiators[1]];

            message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [reserveVault.address, 'authorizeInitiator', tx2Initiators.map(x => x.address), true]
            );
            signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(reserveVault.authorizeInitiator(
                tx2Initiators.map(x => x.address),
                true,
                signatures
            )).to.be.revertedWithCustomError(reserveVault, `AuthorizedAccount`)
                .withArgs(initiators[1].address);
        })

        it('20.2.5. Deauthorize initiator successfully', async () => {
            const { reserveVault, admin, admins, initiators } = await beforeReserveVaultTest({
                authorizeInitiators: true,
            });

            const toDeauth = initiators.slice(0, 2);

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [reserveVault.address, 'authorizeInitiator', toDeauth.map(x => x.address), false]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await reserveVault.authorizeInitiator(
                toDeauth.map(x => x.address),
                false,
                signatures
            );
            await tx.wait();

            for (const initiator of toDeauth) {
                await expect(tx).to
                    .emit(reserveVault, 'InitiatorDeauthorization')
                    .withArgs(initiator.address);
            }

            for (const initiator of initiators) {
                const isInitiator = await reserveVault.isInitiator(initiator.address);
                if (toDeauth.includes(initiator)) {
                    expect(isInitiator).to.be.false;
                } else {
                    expect(isInitiator).to.be.true;
                }
            }            
        });

        it('20.2.6. Deauthorize initiator unsuccessfully with unauthorized account', async () => {
            const { reserveVault, admin, admins, initiators } = await beforeReserveVaultTest({
                authorizeInitiators: true,
            });

            const account = randomWallet();
            const toDeauth = [initiators[0], account];

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [reserveVault.address, 'authorizeInitiator', toDeauth.map(x => x.address), false]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(reserveVault.authorizeInitiator(
                toDeauth.map(x => x.address),
                false,
                signatures
            )).to.be.revertedWithCustomError(reserveVault, `NotAuthorizedAccount`)
                .withArgs(account.address);
        });

        it('20.2.7. Deauthorize initiator unsuccessfully when unauthorizing same accounts twice on same tx', async () => {
            const { reserveVault, admin, admins, initiators } = await beforeReserveVaultTest({
                authorizeInitiators: true,
            });

            const toDeauth = [initiators[0], initiators[1], initiators[0]];

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [reserveVault.address, 'authorizeInitiator', toDeauth.map(x => x.address), false]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(reserveVault.authorizeInitiator(
                toDeauth.map(x => x.address),
                false,
                signatures
            )).to.be.revertedWithCustomError(reserveVault, `NotAuthorizedAccount`)
                .withArgs(initiators[0].address);
        });

        it('20.2.8. Deauthorize initiator unsuccessfully when unauthorizing same accounts twice on different tx', async () => {
            const { reserveVault, admin, admins, initiators } = await beforeReserveVaultTest({
                authorizeInitiators: true,
            });

            const tx1Initiators = [initiators[0], initiators[1]];

            await callReserveVault_AuthorizeInitiator(
                reserveVault,
                admins,
                tx1Initiators.map(x => x.address),
                false,
                await admin.nonce()
            );

            const tx2Initiators = [initiators[2], initiators[1]];

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [reserveVault.address, 'authorizeInitiator', tx2Initiators.map(x => x.address), false]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(reserveVault.authorizeInitiator(
                tx2Initiators.map(x => x.address),
                false,
                signatures
            )).to.be.revertedWithCustomError(reserveVault, `NotAuthorizedAccount`)
                .withArgs(initiators[1].address);
        });
    });

    describe('20.3. initiateFund(address, uint256, address[], uint256[])', async () => {
        it('20.3.1. initiate fund successfully', async () => {
            const { reserveVault, initiators, currencies } = await beforeReserveVaultTest({
                authorizeInitiators: true,
                listSampleCurrencies: true,
            });

            const initiator = initiators[0];

            // Tx1: Native main currency
            const mainCurrencyAddress1 = ethers.constants.AddressZero;
            const mainDenomination1 = 100;
            const subCurrencyAddresses1 = [currencies[0].address, currencies[1].address, ethers.constants.AddressZero];
            const subDenominations1 = [200, 400, 800];

            const callData1 = reserveVault.interface.encodeFunctionData(
                'initiateFund',
                [
                    mainCurrencyAddress1,
                    mainDenomination1,
                    subCurrencyAddresses1,
                    subDenominations1,
                ]
            );
            const tx1 = await initiator.call(reserveVault.address, callData1);
            await tx1.wait();

            const fundId1 = 1;

            await expect(tx1).to
                .emit(reserveVault, 'FundInitiation')
                .withArgs(
                    fundId1,
                    initiator.address,
                    mainCurrencyAddress1,
                    mainDenomination1,
                    subCurrencyAddresses1,
                    subDenominations1,
                );

            expect(await reserveVault.fundNumber()).to.equal(1);

            const fund1 = await reserveVault.getFund(fundId1);
            expect(fund1.currencies).to.deep.equal([mainCurrencyAddress1, ...subCurrencyAddresses1]);
            expect(fund1.denominations).to.deep.equal([mainDenomination1, ...subDenominations1]);
            expect(fund1.supply).to.equal(0);
            expect(fund1.initiator).to.equal(initiator.address);
            expect(fund1.isSufficient).to.equal(false);

            // Tx2: ERC20 main currency

            const mainCurrencyAddress2 = currencies[0].address;
            const mainDenomination2 = 1600;
            const subCurrencyAddresses2 = [currencies[1].address, currencies[2].address, ethers.constants.AddressZero];
            const subDenominations2 = [3200, 6400, 12800];

            const callData2 = reserveVault.interface.encodeFunctionData(
                'initiateFund',
                [
                    mainCurrencyAddress2,
                    mainDenomination2,
                    subCurrencyAddresses2,
                    subDenominations2,
                ]
            );
            const tx2 = await initiator.call(reserveVault.address, callData2);
            await tx2.wait();

            const fundId2 = 2;

            await expect(tx2).to
                .emit(reserveVault, 'FundInitiation')
                .withArgs(
                    fundId2,
                    initiator.address,
                    mainCurrencyAddress2,
                    mainDenomination2,
                    subCurrencyAddresses2,
                    subDenominations2,
                );

            expect(await reserveVault.fundNumber()).to.equal(2);

            const fund2 = await reserveVault.getFund(fundId2);
            expect(fund2.currencies).to.deep.equal([mainCurrencyAddress2, ...subCurrencyAddresses2]);
            expect(fund2.denominations).to.deep.equal([mainDenomination2, ...subDenominations2]);
            expect(fund2.supply).to.equal(0);
            expect(fund2.initiator).to.equal(initiator.address);
            expect(fund2.isSufficient).to.equal(false);
        });

        it('20.3.2. initiate fund successfully with zero denomination main currency', async () => {
            const { reserveVault, initiators, currencies } = await beforeReserveVaultTest({
                authorizeInitiators: true,
                listSampleCurrencies: true,
            });

            const initiator = initiators[0];

            const mainCurrencyAddress = currencies[0].address;
            const mainDenomination = 0;
            const subCurrencyAddresses = [currencies[1].address, currencies[2].address, ethers.constants.AddressZero];
            const subDenominations = [100, 200, 400];

            const callData = reserveVault.interface.encodeFunctionData(
                'initiateFund',
                [
                    mainCurrencyAddress,
                    mainDenomination,
                    subCurrencyAddresses,
                    subDenominations,
                ]
            );
            const tx = await initiator.call(reserveVault.address, callData);
            await tx.wait();
            
            const fundId = 1;

            await expect(tx).to
                .emit(reserveVault, 'FundInitiation')
                .withArgs(
                    fundId,
                    initiator.address,
                    mainCurrencyAddress,
                    mainDenomination,
                    subCurrencyAddresses,
                    subDenominations,
                );

            expect(await reserveVault.fundNumber()).to.equal(1);

            const fund = await reserveVault.getFund(fundId);
            expect(fund.currencies).to.deep.equal(subCurrencyAddresses);
            expect(fund.denominations).to.deep.equal(subDenominations);
            expect(fund.supply).to.equal(0);
            expect(fund.initiator).to.equal(initiator.address);
            expect(fund.isSufficient).to.equal(false);
        });

        it('20.3.3. initiate fund unsuccessfully when paused', async () => {
            const { reserveVault, initiators, currencies } = await beforeReserveVaultTest({
                authorizeInitiators: true,
                listSampleCurrencies: true,
                pause: true,
            });

            const initiator = initiators[0];

            const mainCurrencyAddress = currencies[0].address;
            const mainDenomination = 100;
            const subCurrencyAddresses = [currencies[1].address, currencies[2].address, ethers.constants.AddressZero];
            const subDenominations = [200, 400, 800];

            const callData = reserveVault.interface.encodeFunctionData(
                'initiateFund',
                [
                    mainCurrencyAddress,
                    mainDenomination,
                    subCurrencyAddresses,
                    subDenominations,
                ]
            );
            await expect(initiator.call(reserveVault.address, callData))
                .to.be.revertedWith('Pausable: paused');
        });

        it('20.3.4. initiate fund unsuccessfully by unauthorized account', async () => {
            const { reserveVault, currencies } = await beforeReserveVaultTest({
                authorizeInitiators: true,
                listSampleCurrencies: true,
            });

            const mainCurrencyAddress = currencies[0].address;
            const mainDenomination = 100;
            const subCurrencyAddresses = [currencies[1].address, currencies[2].address, ethers.constants.AddressZero];
            const subDenominations = [200, 400, 800];

            await expect(reserveVault.initiateFund(
                mainCurrencyAddress,
                mainDenomination,
                subCurrencyAddresses,
                subDenominations,
            )).to.be.revertedWithCustomError(reserveVault, 'Unauthorized');
        });

        it('20.3.5. initiate fund unsuccessfully with invalid params length', async () => {
            const { reserveVault, initiators, currencies } = await beforeReserveVaultTest({
                authorizeInitiators: true,
                listSampleCurrencies: true,
            });

            const initiator = initiators[0];

            const mainCurrencyAddress = currencies[0].address;
            const mainDenomination = 100;
            const subCurrencyAddresses = [currencies[1].address, currencies[2].address, ethers.constants.AddressZero];
            const subDenominations = [200, 400];
            
            const callData = reserveVault.interface.encodeFunctionData(
                'initiateFund',
                [
                    mainCurrencyAddress,
                    mainDenomination,
                    subCurrencyAddresses,
                    subDenominations,
                ]
            );
            await expect(initiator.call(reserveVault.address, callData))
                .to.be.revertedWithCustomError(reserveVault, 'InvalidInput');
        });

        it('20.3.6. initiate fund unsuccessfully with invalid main currency', async () => {
            const { reserveVault, initiators, currencies } = await beforeReserveVaultTest({
                authorizeInitiators: true,
                listSampleCurrencies: true,
            });

            const initiator = initiators[0];
            
            const mainCurrencyAddress = randomWallet().address;
            const mainDenomination = 100;
            const subCurrencyAddresses = [currencies[1].address, currencies[2].address, ethers.constants.AddressZero];
            const subDenominations = [200, 400, 800];

            const callData = reserveVault.interface.encodeFunctionData(
                'initiateFund',
                [
                    mainCurrencyAddress,
                    mainDenomination,
                    subCurrencyAddresses,
                    subDenominations,
                ]
            );
            await expect(initiator.call(reserveVault.address, callData))
                .to.be.revertedWithCustomError(reserveVault, 'InvalidCurrency');
        });

        it('20.3.7. initiate fund unsuccessfully with invalid sub currencies', async () => {
            const { reserveVault, initiators, currencies } = await beforeReserveVaultTest({
                authorizeInitiators: true,
                listSampleCurrencies: true,
            });

            const initiator = initiators[0];
            
            const mainCurrencyAddress = currencies[0].address;
            const mainDenomination = 100;
            const subCurrencyAddresses = [currencies[1].address, currencies[2].address, randomWallet().address];
            const subDenominations = [200, 400, 800];

            const callData = reserveVault.interface.encodeFunctionData(
                'initiateFund',
                [
                    mainCurrencyAddress,
                    mainDenomination,
                    subCurrencyAddresses,
                    subDenominations,
                ]
            );
            await expect(initiator.call(reserveVault.address, callData))
                .to.be.revertedWithCustomError(reserveVault, 'InvalidCurrency');
        });

        it('20.3.8. initiate fund unsuccessfully with zero denomination sub currencies', async () => {
            const { reserveVault, initiators, currencies } = await beforeReserveVaultTest({
                authorizeInitiators: true,
                listSampleCurrencies: true,
            });

            const initiator = initiators[0];
            
            const mainCurrencyAddress = currencies[0].address;
            const mainDenomination = 100;
            const subCurrencyAddresses = [currencies[1].address, currencies[2].address, ethers.constants.AddressZero];
            const subDenominations = [200, 400, 0];

            const callData = reserveVault.interface.encodeFunctionData(
                'initiateFund',
                [
                    mainCurrencyAddress,
                    mainDenomination,
                    subCurrencyAddresses,
                    subDenominations,
                ]
            );
            await expect(initiator.call(reserveVault.address, callData))
                .to.be.revertedWithCustomError(reserveVault, 'InvalidDenomination');
        });
    });

    describe('20.4. expandFund(uint256, uint256)', async () => {
        it.only('20.4.1. expand fund successfully', async () => {

        });

        it.only('20.4.2. expand fund unsuccessfully with invalid fund id', async () => {

        });

        it.only('20.4.3. expand fund unsuccessfully when paused', async () => {

        });

        it.only('20.4.4. expand fund unsuccessfully by unauthorized account', async () => {

        });

        it.only('20.4.5. expand fund unsuccessfully with already provided fund', async () => {

        });
    });

    describe('20.5. safeExpandFund(uint256, uint256, uint256)', async () => {
        it.only('20.5.1. safe expand fund successfully', async () => {

        });

        it.only('20.5.2. safe expand fund unsuccessfully with invalid fund id', async () => {

        });

        it.only('20.5.3. safe expand fund unsuccessfully with invalid anchor', async () => {

        });
    });

    describe('20.6. provideFund(uint256)', async () => {
        it.only('20.6.1. provide fund successfully with just enough native currency', async () => {
            const { reserveVault, initiators, currencies, deployer } = await beforeReserveVaultTest({
                authorizeInitiators: true,
                listSampleCurrencies: true,
                listSampleFunds: true,
                listSampleDeposits: true,
                fundInitiator: true,
            });

            const initiator = initiators[0];
            
            const fundId = 1;
            const initSupply = (await reserveVault.getFund(fundId)).supply;
            const anchor = initSupply;

            const currency0Denomination = 100;
            const currency1Denomination = 200;
            const nativeDenomination = 400;

            const deployerInitNativeBalance = await ethers.provider.getBalance(deployer.address);
            const initiatorInitNativeBalance = await ethers.provider.getBalance(initiator.address);
            const initiatorInitCurrency0Balance = await currencies[0].balanceOf(initiator.address);
            const initiatorInitCurrency1Balance = await currencies[1].balanceOf(initiator.address);
            const initiatorInitCurrency2Balance = await currencies[2].balanceOf(initiator.address);

            const callData = reserveVault.interface.encodeFunctionData(
                'safeProvideFund',
                [fundId, anchor],
            );
            const tx = await initiator.call(reserveVault.address, callData, { value: initSupply.mul(nativeDenomination) });
            const receipt = await tx.wait();
            const gasFee = receipt.gasUsed.mul(receipt.effectiveGasPrice);

            await expect(tx).to
                .emit(reserveVault, 'FundProvision')
                .withArgs(fundId);

            expect(await ethers.provider.getBalance(deployer.address)).to.equal(deployerInitNativeBalance.sub(gasFee).sub(initSupply.mul(nativeDenomination)));
            expect(await ethers.provider.getBalance(initiator.address)).to.equal(initiatorInitNativeBalance);
            expect(await currencies[0].balanceOf(initiator.address)).to.equal(initiatorInitCurrency0Balance.sub(initSupply.mul(currency0Denomination)));
            expect(await currencies[1].balanceOf(initiator.address)).to.equal(initiatorInitCurrency1Balance.sub(initSupply.mul(currency1Denomination)));
            expect(await currencies[2].balanceOf(initiator.address)).to.equal(initiatorInitCurrency2Balance);

            const fund = await reserveVault.getFund(fundId);
            expect(fund.supply).to.equal(initSupply);
            expect(fund.isSufficient).to.equal(true);
        });

        it.only('20.6.2. provide fund successfully with excess native currency', async () => {
            const { reserveVault, initiators, currencies, deployer } = await beforeReserveVaultTest({
                authorizeInitiators: true,
                listSampleCurrencies: true,
                listSampleFunds: true,
                listSampleDeposits: true,
                fundInitiator: true,
            });

            const initiator = initiators[0];
            
            const fundId = 1;
            const initSupply = (await reserveVault.getFund(fundId)).supply;
            const anchor = initSupply;

            const currency0Denomination = 100;
            const currency1Denomination = 200;
            const nativeDenomination = 400;

            const deployerInitNativeBalance = await ethers.provider.getBalance(deployer.address);
            const initiatorInitNativeBalance = await ethers.provider.getBalance(initiator.address);
            const initiatorInitCurrency0Balance = await currencies[0].balanceOf(initiator.address);
            const initiatorInitCurrency1Balance = await currencies[1].balanceOf(initiator.address);
            const initiatorInitCurrency2Balance = await currencies[2].balanceOf(initiator.address);

            const callData = reserveVault.interface.encodeFunctionData(
                'safeProvideFund',
                [fundId, anchor],
            );
            const tx = await initiator.call(reserveVault.address, callData, { value: initSupply.mul(nativeDenomination).add(ethers.utils.parseEther('100')) });
            const receipt = await tx.wait();
            const gasFee = receipt.gasUsed.mul(receipt.effectiveGasPrice);

            await expect(tx).to
                .emit(reserveVault, 'FundProvision')
                .withArgs(fundId);

            expect(await ethers.provider.getBalance(deployer.address)).to.equal(deployerInitNativeBalance.sub(gasFee).sub(initSupply.mul(nativeDenomination)));
            expect(await ethers.provider.getBalance(initiator.address)).to.equal(initiatorInitNativeBalance);
            expect(await currencies[0].balanceOf(initiator.address)).to.equal(initiatorInitCurrency0Balance.sub(initSupply.mul(currency0Denomination)));
            expect(await currencies[1].balanceOf(initiator.address)).to.equal(initiatorInitCurrency1Balance.sub(initSupply.mul(currency1Denomination)));
            expect(await currencies[2].balanceOf(initiator.address)).to.equal(initiatorInitCurrency2Balance);

            const fund = await reserveVault.getFund(fundId);
            expect(fund.supply).to.equal(initSupply);
            expect(fund.isSufficient).to.equal(true);
        });

        it('20.6.3. provide fund unsuccessfully with invalid fund id', async () => {
        });

        it('20.6.4. provide fund unsuccessfully when paused', async () => {
        });

        it('20.6.5. provide fund unsuccessfully by unauthorized account', async () => {
        });

        it('20.6.6. provide fund unsuccessfully with already provided fund', async () => {
        });

        it('20.6.7. provide fund unsuccessfully with insufficient native currency', async () => {
        });

        it('20.6.8. provide fund unsuccessfully with insufficient ERC20 currencies', async () => {
        });

        it('20.6.9. provide fund unsuccessfully when receiving native currency failed', async () => {
        });

        it('20.6.10. provide fund unsuccessfully when this contract is reentered', async () => {
        });        
    });

    describe('20.7. safeProvideFund(uint256, uint256)', async () => {
        it.only('20.7.1. safe provide fund successfully', async () => {
            const { reserveVault, initiators, currencies, deployer } = await beforeReserveVaultTest({
                authorizeInitiators: true,
                listSampleCurrencies: true,
                listSampleFunds: true,
                listSampleDeposits: true,
                fundInitiator: true,
            });

            const initiator = initiators[0];
            
            const fundId = 1;
            const initSupply = (await reserveVault.getFund(fundId)).supply;
            const anchor = initSupply;

            const currency0Denomination = 100;
            const currency1Denomination = 200;
            const nativeDenomination = 400;

            const deployerInitNativeBalance = await ethers.provider.getBalance(deployer.address);
            const initiatorInitNativeBalance = await ethers.provider.getBalance(initiator.address);
            const initiatorInitCurrency0Balance = await currencies[0].balanceOf(initiator.address);
            const initiatorInitCurrency1Balance = await currencies[1].balanceOf(initiator.address);
            const initiatorInitCurrency2Balance = await currencies[2].balanceOf(initiator.address);

            const callData = reserveVault.interface.encodeFunctionData(
                'safeProvideFund',
                [fundId, anchor],
            );
            const tx = await initiator.call(reserveVault.address, callData, { value: initSupply.mul(nativeDenomination) });
            const receipt = await tx.wait();
            const gasFee = receipt.gasUsed.mul(receipt.effectiveGasPrice);

            await expect(tx).to
                .emit(reserveVault, 'FundProvision')
                .withArgs(fundId);

            expect(await ethers.provider.getBalance(deployer.address)).to.equal(deployerInitNativeBalance.sub(gasFee).sub(initSupply.mul(nativeDenomination)));
            expect(await ethers.provider.getBalance(initiator.address)).to.equal(initiatorInitNativeBalance);
            expect(await currencies[0].balanceOf(initiator.address)).to.equal(initiatorInitCurrency0Balance.sub(initSupply.mul(currency0Denomination)));
            expect(await currencies[1].balanceOf(initiator.address)).to.equal(initiatorInitCurrency1Balance.sub(initSupply.mul(currency1Denomination)));
            expect(await currencies[2].balanceOf(initiator.address)).to.equal(initiatorInitCurrency2Balance);

            const fund = await reserveVault.getFund(fundId);
            expect(fund.supply).to.equal(initSupply);
            expect(fund.isSufficient).to.equal(true);
        });

        it('20.7.2. safe provide fund unsuccessfully with invalid fund id', async () => {
        });

        it('20.7.3. safe provide fund unsuccessfully with invalid anchor', async () => {
        });
    });

    describe('20.8. withdrawFund(uint256, address, uint256)', async () => {
        it.only('20.8.1. withdraw fund successfully', async () => {
            
        });

        it.only('20.8.2. withdraw fund unsuccessfully with invalid fund id', async () => {

        });

        it.only('20.8.3. withdraw fund unsuccessfully when paused', async () => {
            
        });

        it.only('20.8.4. withdraw fund unsuccessfully by unauthorized account', async () => {
            
        });

        it.only('20.8.5. withdraw fund unsuccessfully with unprovided fund', async () => {

        });

        it.only('20.8.6. withdraw fund unsuccessfully when withdraw quantity exceed fund quantity', async () => {

        });
    });

    describe('20.9. safeWithdrawFund(uint256, address, uint256, uint256)', async () => {
        it.only('20.9.1. safe withdraw fund successfully', async () => {

        });

        it.only('20.9.2. safe withdraw fund unsuccessfully with invalid fund id', async () => {

        });

        it.only('20.9.3. safe withdraw fund unsuccessfully with invalid anchor', async () => {

        });
    });
});
