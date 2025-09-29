import chai from 'chai';
import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import {
    Admin,
    CommissionToken,
    Currency,
    EstateToken,
    FeeReceiver,
    EstateLiquidator,
    MockPriceFeed,
    MockEstateLiquidator,
    IEstateTokenizer__factory,
    IEstateTokenReceiver__factory,
    ICommon__factory,
    IERC1155ReceiverUpgradeable__factory,
    ReserveVault,
    PriceWatcher,
    GovernanceHub,
    DividendHub,
    MockEstateForger,
    FailReceiver,
    ReentrancyERC20,
} from '@typechain-types';
import { callTransaction, getBalance, getSignatures, parseEther, prepareERC20, prepareNativeToken, randomWallet, resetERC20, resetNativeToken, testReentrancy } from '@utils/blockchain';
import { applyDiscount, scale } from '@utils/formula';
import { Constant, DAY } from '@tests/test.constant';
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployFeeReceiver } from '@utils/deployments/common/feeReceiver';
import { deployCurrency } from '@utils/deployments/common/currency';
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

import { MockContract, smock } from '@defi-wonderland/smock';

import {
    callAdmin_ActivateIn,
    callAdmin_AuthorizeGovernors,
    callAdmin_AuthorizeManagers,
    callAdmin_AuthorizeModerators,
    callAdmin_DeclareZone,
    callAdmin_UpdateCurrencyRegistries,
} from '@utils/call/common/admin';
import {
    callEstateToken_UpdateCommissionToken,
    callEstateToken_AuthorizeTokenizers,
    callEstateToken_AuthorizeExtractors,
} from '@utils/call/land/estateToken';
import { BigNumber, BigNumberish, Contract, Wallet } from 'ethers';
import { randomInt } from 'crypto';
import { getBytes4Hex, getInterfaceID, randomBigNumber, structToObject } from '@utils/utils';
import { OrderedMap } from '@utils/utils';
import { deployEstateLiquidator } from '@utils/deployments/land/estateLiquidator';
import { addCurrencyToAdminAndPriceWatcher } from '@utils/call/common/common';
import { deployMockPriceFeed } from '@utils/deployments/mock/mockPriceFeed';
import { deployFailReceiver } from '@utils/deployments/mock/failReceiver';
import { deployReentrancy } from '@utils/deployments/mock/mockReentrancy/reentrancy';
import { deployEstateToken } from '@utils/deployments/land/estateToken';
import { deployMockEstateLiquidator } from '@utils/deployments/mock/mockEstateLiquidator';
import { deployReentrancyERC1155Holder } from '@utils/deployments/mock/mockReentrancy/reentrancyERC1155Holder';
import { request } from 'http';
import { Initialization as LandInitialization } from '@tests/land/test.initialization';
import { callReserveVault_AuthorizeProvider } from '@utils/call/common/reserveVault';
import { remain, scaleRate } from '@utils/formula';
import { deployPriceWatcher } from '@utils/deployments/common/priceWatcher';
import { Rate } from '@utils/models/common/common';
import { MockValidator } from '@utils/mockValidator';
import { deployMockEstateForger } from '@utils/deployments/mock/mockEstateForger';
import { getRequestExtractionInvalidValidation, getRequestExtractionValidation } from '@utils/validation/land/estateLiquidator';
import { ProposalState } from "@utils/models/common/governanceHub";
import { ProposalRule } from "@utils/models/common/governanceHub";
import { getRegisterSellerInValidation } from '@utils/validation/land/estateForger';
import { deployReentrancyERC20 } from '@utils/deployments/mock/mockReentrancy/reentrancyERC20';
import { RequestExtractionParams } from '@utils/models/land/estateLiquidator';
import { DeprecateEstateParams, RegisterCustodianParams } from '@utils/models/land/estateToken';
import { getCallTokenizeEstateTx, getRegisterCustodianTx, getSafeDeprecateEstateTxByParams } from '@utils/transaction/land/estateToken';
import { getRequestExtractionTx } from '@utils/transaction/land/estateLiquidator';
import { getRegisterBrokerTx } from '@utils/transaction/land/commissionToken';
import { Initialization as CommonInitialization } from '@tests/common/test.initialization';
import { callPausable_Pause } from '@utils/call/common/pausable';

chai.use(smock.matchers);

interface EstateLiquidatorFixture {
    admin: Admin;
    feeReceiver: FeeReceiver;
    currencies: Currency[];
    estateToken: MockContract<EstateToken>;
    commissionToken: MockContract<CommissionToken>;
    governanceHub: MockContract<GovernanceHub>;
    dividendHub: MockContract<DividendHub>;
    estateForger: MockEstateForger;
    estateLiquidator: MockEstateLiquidator;
    nativePriceFeed: MockPriceFeed;
    currencyPriceFeed: MockPriceFeed;
    failReceiver: FailReceiver;
    reentrancyERC20: ReentrancyERC20;
    validator: MockValidator;
    
    deployer: any;
    admins: any[];

    manager: any;
    moderator: any;
    user: any;
    operator1: any, operator2: any, operator3: any;
    custodian1: any, custodian2: any;
    broker1: any, broker2: any;
    
    zone1: string, zone2: string;
}

async function testReentrancy_estateLiquidator(
    fixture: EstateLiquidatorFixture,
    operator: Wallet,
    reentrancyContract: Contract,
    assertion: any,
) {
    const { validator, estateLiquidator, estateToken, governanceHub } = fixture;
    const requestExtractionParams = {
        estateId: BigNumber.from(1),
        buyer: operator.address,
        value: ethers.utils.parseEther('10'),
        currency: reentrancyContract.address,
        feeRate: ethers.utils.parseEther('0.1'),
        uuid: ethers.utils.formatBytes32String("uuid_1"),
    }
    
    let timestamp = await time.latest() + 20;
    
    // const requestExtractionValidation = await getRequestExtractionValidation(
    //     estateToken as any,
    //     estateLiquidator as any,
    //     governanceHub as any,
    //     validator,
    //     timestamp,
    //     requestExtractionParams,
    // );

    // await callTransaction(reentrancyContract.updateReentrancyPlan(
    //     estateLiquidator.address,
    //     estateLiquidator.interface.encodeFunctionData("requestExtraction", [
    //         requestExtractionParams.estateId,
    //         requestExtractionParams.buyer,
    //         requestExtractionParams.value,
    //         requestExtractionParams.currency,
    //         requestExtractionParams.feeRate,
    //         requestExtractionParams.uuid,
    //         requestExtractionValidation,
    //     ]),
    // ));

    // await assertion(timestamp);

    timestamp += 10;

    await callTransaction(reentrancyContract.updateReentrancyPlan(
        estateLiquidator.address,
        estateLiquidator.interface.encodeFunctionData("conclude", [1])
    ));
    
    await assertion(timestamp);
}

export async function getCommissionDenomination(
    commissionToken: CommissionToken,
    feeDenomination: BigNumber,
    estateId: BigNumber,
) {
    return scaleRate(
        feeDenomination,
        await commissionToken.getCommissionRate(estateId),
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

describe('2.3. EstateLiquidator', async () => {
    async function estateLiquidatorFixture(): Promise<EstateLiquidatorFixture> {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        const admins = [];
        for (let i = 1; i <= Constant.ADMIN_NUMBER; ++i) admins.push(accounts[i]);
        const user = accounts[Constant.ADMIN_NUMBER + 1];
        const manager = accounts[Constant.ADMIN_NUMBER + 2];
        const moderator = accounts[Constant.ADMIN_NUMBER + 3];
        const operator1 = accounts[Constant.ADMIN_NUMBER + 4];
        const operator2 = accounts[Constant.ADMIN_NUMBER + 5];
        const operator3 = accounts[Constant.ADMIN_NUMBER + 6];
        const broker1 = accounts[Constant.ADMIN_NUMBER + 7];
        const broker2 = accounts[Constant.ADMIN_NUMBER + 8];
        const custodian1 = accounts[Constant.ADMIN_NUMBER + 9];
        const custodian2 = accounts[Constant.ADMIN_NUMBER + 10];

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

        const SmockGovernanceHubFactory = await smock.mock('GovernanceHub') as any;
        const governanceHub = await SmockGovernanceHubFactory.deploy() as MockContract<GovernanceHub>;
        await callTransaction(governanceHub.initialize(
            admin.address,
            validator.getAddress(),
            CommonInitialization.GOVERNANCE_HUB_Fee,
        ));
        
        const SmockDividendHubFactory = await smock.mock('DividendHub') as any;
        const dividendHub = await SmockDividendHubFactory.deploy() as MockContract<DividendHub>;
        await callTransaction(dividendHub.initialize(
            admin.address,
        ));

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

        const estateLiquidator = await deployMockEstateLiquidator(
            deployer,
            admin.address,
            estateToken.address,
            commissionToken.address,
            governanceHub.address,
            dividendHub.address,
            feeReceiver.address,
            validator.getAddress(),
        ) as MockEstateLiquidator;

        const zone1 = ethers.utils.formatBytes32String("TestZone1");
        const zone2 = ethers.utils.formatBytes32String("TestZone2");
        
        const failReceiver = await deployFailReceiver(deployer.address, false, false) as FailReceiver;
        const reentrancyERC20 = await deployReentrancyERC20(deployer.address) as ReentrancyERC20;

        return {
            admin,
            feeReceiver,
            currencies,
            estateToken,
            commissionToken,
            governanceHub,
            dividendHub,
            estateForger,
            estateLiquidator,
            nativePriceFeed,
            currencyPriceFeed,
            validator,
            deployer,
            admins,
            manager,
            moderator,
            user,
            operator1,
            operator2,
            operator3,
            custodian1,
            custodian2,
            broker1,
            broker2,
            zone1,
            zone2,
            failReceiver,
            reentrancyERC20,
        };
    };

    async function beforeEstateLiquidatorTest({
        skipAuthorizeExtractor = false,
        skipAuthorizeGovernors = false,
        skipDeclareZone = false,
        skipPrepareERC20ForOperators: skipPrepareERC20ForManager = false,
        listSampleExtractionRequests = false,
        useReentrancyERC20 = false,
        pause = false,
    } = {}): Promise<EstateLiquidatorFixture> {
        const fixture = await loadFixture(estateLiquidatorFixture);
        const { 
            deployer,
            admin,
            admins,
            manager,
            moderator,
            estateToken,
            estateLiquidator,
            commissionToken,
            governanceHub,
            dividendHub,
            nativePriceFeed,
            currencyPriceFeed,
            custodian1, custodian2,
            zone1, zone2,
            operator1, operator2, operator3,
            broker1, broker2,
            estateForger,
            failReceiver,
            reentrancyERC20,
            validator,
        } = fixture;

        let currencies = fixture.currencies;
        if (useReentrancyERC20) {
            currencies = [reentrancyERC20 as any, ...currencies];
        }

        let timestamp = await time.latest();

        const fee = await governanceHub.fee();

        const currenciesConfig = [
            { currency: ethers.constants.AddressZero, isAvailable: true, isExclusive: false },
            { currency: fixture.currencies[0].address, isAvailable: true, isExclusive: true },
            { currency: fixture.currencies[1].address, isAvailable: true, isExclusive: false },
            { currency: fixture.currencies[2].address, isAvailable: false, isExclusive: true },
        ];
        if (useReentrancyERC20) {
            currenciesConfig.push({ currency: reentrancyERC20.address, isAvailable: true, isExclusive: false });
        }

        await callAdmin_UpdateCurrencyRegistries(
            admin,
            admins,
            currenciesConfig.map(config => config.currency),
            currenciesConfig.map(config => config.isAvailable),
            currenciesConfig.map(config => config.isExclusive),
            await admin.nonce(),
        );

        if (!skipDeclareZone) {
            for (const zone of [zone1, zone2]) {
                await callAdmin_DeclareZone(
                    admin,
                    admins,
                    zone,
                    await admin.nonce(),
                );
            }
        }

        await callAdmin_AuthorizeManagers(
            admin,
            admins,
            [manager.address],
            true,
            await admin.nonce(),
        );

        await callAdmin_AuthorizeModerators(
            admin,
            admins,
            [moderator.address],
            true,
            await admin.nonce(),
        );

        for (const zone of [zone1, zone2]) {
            await callAdmin_ActivateIn(
                admin,
                admins,
                zone,
                [manager.address, moderator.address],
                true,
                await admin.nonce(),
            );
        }

        await callTransaction(getRegisterBrokerTx(commissionToken as any, manager, {
            zone: zone1,
            broker: broker1.address,
            commissionRate: ethers.utils.parseEther('0.1'),
        }));
        await callTransaction(getRegisterBrokerTx(commissionToken as any, manager, {
            zone: zone2,
            broker: broker2.address,
            commissionRate: ethers.utils.parseEther('0.2'),
        }));

        await callEstateToken_AuthorizeTokenizers(
            estateToken,
            admins,
            [estateForger.address],
            true,
            await admin.nonce()
        );

        for (const zone of [zone1, zone2]) {
            for (const custodian of [custodian1, custodian2]) {
                const params: RegisterCustodianParams = {
                    zone,
                    custodian: custodian.address,
                    uri: "TestURI",
                };
                await callTransaction(getRegisterCustodianTx(estateToken as any, validator, manager, params))
            }
        }
        
        await callTransaction(getCallTokenizeEstateTx(estateToken as any, estateForger, {
            totalSupply: ethers.utils.parseEther('100'),
            zone: zone1,
            tokenizationId: BigNumber.from(10),
            uri: "Token1_URI",
            expireAt: timestamp + 1e9,
            custodian: custodian1.address,
            broker: broker1.address,
        }));

        await callTransaction(getCallTokenizeEstateTx(estateToken as any, estateForger, {
            totalSupply: ethers.utils.parseEther('200'),
            zone: zone2,
            tokenizationId: BigNumber.from(10),
            uri: "Token2_URI",
            expireAt: timestamp + 1e9,
            custodian: custodian2.address,
            broker: broker2.address,
        }));

        if (!skipAuthorizeGovernors) {
            await callAdmin_AuthorizeGovernors(
                admin,
                admins,
                [estateToken.address],
                true,
                await admin.nonce(),
            );
        }

        if (!skipAuthorizeExtractor) {
            await callEstateToken_AuthorizeExtractors(
                estateToken,
                admins,
                [estateLiquidator.address],
                true,
                await admin.nonce(),
            );
        }

        await prepareNativeToken(
            ethers.provider,
            deployer,
            [failReceiver],
            ethers.utils.parseEther('10000'),
        );

        if (!skipPrepareERC20ForManager) {
            for (const currency of currencies) {
                await prepareERC20(
                    currency,
                    [manager],
                    [estateLiquidator],
                    ethers.utils.parseEther("1000000000"),
                );
            }
        }

        if (listSampleExtractionRequests) {
            timestamp += 100;
            await time.setNextBlockTimestamp(timestamp);
            
            const params1: RequestExtractionParams = {
                estateId: BigNumber.from(1),
                buyer: operator1.address,
                value: ethers.utils.parseEther('100'),
                currency: ethers.constants.AddressZero,
                feeRate: ethers.utils.parseEther('0.1'),
                uuid: ethers.utils.formatBytes32String("uuid_1"),
                admissionExpiry: timestamp + 1e9,
            };
            await callTransaction(getRequestExtractionTx(
                estateLiquidator as any,
                estateToken as any,
                governanceHub as any,
                validator,
                params1,
                manager,
                timestamp,
                { value: params1.value.add(fee) }
            ));

            timestamp += 10;
            await time.setNextBlockTimestamp(timestamp);

            const params2: RequestExtractionParams = {
                estateId: BigNumber.from(2),
                buyer: operator2.address,
                value: ethers.utils.parseEther('200'),
                currency: currencies[0].address,
                feeRate: ethers.utils.parseEther('0.2'),
                uuid: ethers.utils.formatBytes32String("uuid_2"),
                admissionExpiry: timestamp + 1e9,
            };
            await callTransaction(getRequestExtractionTx(
                estateLiquidator as any,
                estateToken as any,
                governanceHub as any,
                validator,
                params2,
                manager,
                timestamp,
                { value: params2.value.add(fee) }
            ));
        }

        if (pause) {
            await callPausable_Pause(estateLiquidator, deployer, admins, admin);
        }

        return fixture;
    }

    describe('2.3.1. initialize(address, address, string, uint256, uint256, uint256, uint256)', async () => {
        it('2.3.1.1. Deploy successfully', async () => {
            const { admin, estateLiquidator, estateToken, feeReceiver, commissionToken, governanceHub, dividendHub, validator } = await beforeEstateLiquidatorTest({});

            expect(await estateLiquidator.paused()).to.equal(false);

            expect(await estateLiquidator.admin()).to.equal(admin.address);
            expect(await estateLiquidator.estateToken()).to.equal(estateToken.address);
            expect(await estateLiquidator.commissionToken()).to.equal(commissionToken.address);
            expect(await estateLiquidator.governanceHub()).to.equal(governanceHub.address);
            expect(await estateLiquidator.dividendHub()).to.equal(dividendHub.address);
            expect(await estateLiquidator.feeReceiver()).to.equal(feeReceiver.address);

            expect(await estateLiquidator.validator()).to.equal(validator.getAddress());

            expect(await estateLiquidator.requestNumber()).to.equal(0);
        });
    });

    describe('2.3.2. getRequest(uint256)', async () => {
        it('2.3.2.1. return correct request', async () => {
            const fixture = await beforeEstateLiquidatorTest({
                listSampleExtractionRequests: true,
            });

            const { estateLiquidator, operator1 } = fixture;

            const request = await estateLiquidator.getRequest(1);
            expect(request.estateId).to.equal(1);
            expect(request.proposalId).to.equal(1);
            expect(request.value).to.equal(ethers.utils.parseEther('100'));
            expect(request.currency).to.equal(ethers.constants.AddressZero);
            expect(request.buyer).to.equal(operator1.address);
        });

        it('2.3.2.2. revert with invalid request id', async () => {
            const { estateLiquidator } = await beforeEstateLiquidatorTest();

            await expect(estateLiquidator.getRequest(0)).to.be.reverted;
            await expect(estateLiquidator.getRequest(100)).to.be.reverted;
        });
    });

    describe('2.3.3. requestExtraction(uint256, uint256, address, bytes32, (uint256, uint256, bytes32))', async () => {
        async function expectRevertWithCustomError(
            fixture: EstateLiquidatorFixture,
            params: RequestExtractionParams,
            signer: Wallet,
            timestamp: number,
            errorContract: Contract,
            error: string,
            value: BigNumber,
        ) {
            const { estateLiquidator, validator, estateToken, governanceHub } = fixture;

            await time.setNextBlockTimestamp(timestamp);

            await expect(getRequestExtractionTx(
                estateLiquidator as any,
                estateToken as any,
                governanceHub as any,
                validator,
                params,
                signer,
                timestamp,
                { value }
            )).to.be.revertedWithCustomError(errorContract, error);
        }

        async function expectRevertWith(
            fixture: EstateLiquidatorFixture,
            params: RequestExtractionParams,
            signer: Wallet,
            timestamp: number,
            error: string,
            value: BigNumber,
        ) {
            const { estateLiquidator, validator, estateToken, governanceHub } = fixture;

            await time.setNextBlockTimestamp(timestamp);

            await expect(getRequestExtractionTx(
                estateLiquidator as any,
                estateToken as any,
                governanceHub as any,
                validator,
                params,
                signer,
                timestamp,
                { value }
            )).to.be.revertedWith(error);
        }

        async function beforeRequestExtractionTest(fixture: EstateLiquidatorFixture): Promise<{
            defaultParams: RequestExtractionParams
        }> {
            const { operator1 } = fixture;
            const timestamp = await time.latest();
            const defaultParams = {
                estateId: BigNumber.from(1),
                buyer: operator1.address,
                value: ethers.utils.parseEther('10'),
                currency: ethers.constants.AddressZero,
                feeRate: ethers.utils.parseEther('0.1'),
                uuid: ethers.utils.formatBytes32String("uuid_1"),
                admissionExpiry: timestamp + 1e9,
            };
            return { defaultParams };
        }

        it('2.3.3.1. request extraction successfully', async () => {
            const { estateLiquidator, estateToken, governanceHub, validator, operator1, operator2, currencies, manager, moderator } = await beforeEstateLiquidatorTest();

            const governanceFee = await governanceHub.fee();

            let timestamp = await time.latest() + 10;
            await time.setNextBlockTimestamp(timestamp);

            // Tx1: Request extraction with native token before unanimous guard due, with just enough native token
            const params1 = {
                estateId: BigNumber.from(1),
                buyer: operator1.address,
                value: ethers.utils.parseEther('10'),
                currency: ethers.constants.AddressZero,
                feeRate: ethers.utils.parseEther('0.1'),
                uuid: ethers.utils.formatBytes32String("uuid_1"),
                admissionExpiry: timestamp + 1e9,
            };

            const expectedRequestId1 = (await estateLiquidator.requestNumber()).add(1);
            const expectedProposalId1 = (await governanceHub.proposalNumber()).add(1);

            let initManagerNativeBalance = await ethers.provider.getBalance(manager.address);
            let initEstateLiquidatorNativeBalance = await ethers.provider.getBalance(estateLiquidator.address);
            let initGovernanceHubNativeBalance = await ethers.provider.getBalance(governanceHub.address);

            const tx1 = await getRequestExtractionTx(
                estateLiquidator as any,
                estateToken as any,
                governanceHub as any,
                validator,
                params1,
                manager,
                timestamp,
                { value: params1.value.add(governanceFee) }
            );
            const receipt1 = await tx1.wait();
            const gasFee1 = receipt1.gasUsed.mul(receipt1.effectiveGasPrice);

            const event1 = receipt1.events!.find(e => e.event === 'NewRequest')!;
            expect(event1.args!.requestId).to.equal(expectedRequestId1);
            expect(event1.args!.estateId).to.equal(params1.estateId);
            expect(event1.args!.proposalId).to.equal(expectedProposalId1);
            expect(event1.args!.buyer).to.equal(operator1.address);
            expect(event1.args!.value).to.equal(params1.value);
            expect(event1.args!.currency).to.equal(params1.currency);
            expect(structToObject(event1.args!.feeRate)).to.deep.equal({
                value: params1.feeRate,
                decimals: Constant.COMMON_RATE_DECIMALS,
            });

            expect(await estateLiquidator.requestNumber()).to.equal(expectedRequestId1);

            const request1 = await estateLiquidator.getRequest(expectedRequestId1);
            expect(request1.estateId).to.equal(params1.estateId);
            expect(request1.proposalId).to.equal(expectedProposalId1);
            expect(request1.value).to.equal(params1.value);
            expect(request1.currency).to.equal(params1.currency.toLowerCase());
            expect(structToObject(request1.feeRate)).to.deep.equal({
                value: params1.feeRate,
                decimals: Constant.COMMON_RATE_DECIMALS,
            });
            expect(request1.buyer).to.equal(operator1.address);

            const proposal1 = await governanceHub.getProposal(expectedProposalId1);
            expect(proposal1.governor).to.equal(estateToken.address);
            expect(proposal1.tokenId).to.equal(params1.estateId);
            expect(proposal1.proposer).to.equal(estateLiquidator.address);
            expect(proposal1.uuid).to.equal(params1.uuid);
            expect(proposal1.rule).to.equal(ProposalRule.ApprovalBeyondQuorum);
            expect(proposal1.quorum).to.equal(Constant.ESTATE_LIQUIDATOR_UNANIMOUS_QUORUM_RATE);
            expect(proposal1.due).to.equal(Constant.ESTATE_LIQUIDATOR_VOTING_DURATION);
            expect(proposal1.timePivot).to.equal(params1.admissionExpiry);

            expect(await ethers.provider.getBalance(manager.address)).to.equal(initManagerNativeBalance.sub(params1.value.add(governanceFee)).sub(gasFee1));
            expect(await ethers.provider.getBalance(estateLiquidator.address)).to.equal(initEstateLiquidatorNativeBalance.add(params1.value));
            expect(await ethers.provider.getBalance(governanceHub.address)).to.equal(initGovernanceHubNativeBalance.add(governanceFee));
            
            // Tx2: Request extraction with native token after unanimous guard due, with excess native token
            // Also by moderator
            const params2 = {
                estateId: BigNumber.from(1),
                buyer: operator2.address,
                value: ethers.utils.parseEther('20'),
                currency: ethers.constants.AddressZero,
                feeRate: ethers.utils.parseEther('0.2'),
                uuid: ethers.utils.formatBytes32String("uuid_2"),
                admissionExpiry: timestamp + 1e9,
            };

            timestamp = (await estateToken.getEstate(params2.estateId)).tokenizeAt + Constant.ESTATE_LIQUIDATOR_UNANIMOUS_GUARD_DURATION;
            await time.setNextBlockTimestamp(timestamp);

            const expectedRequestId2 = (await estateLiquidator.requestNumber()).add(1);
            const expectedProposalId2 = (await governanceHub.proposalNumber()).add(1);

            let initModeratorNativeBalance = await ethers.provider.getBalance(moderator.address);
            initEstateLiquidatorNativeBalance = await ethers.provider.getBalance(estateLiquidator.address);
            initGovernanceHubNativeBalance = await ethers.provider.getBalance(governanceHub.address);

            const tx2 = await getRequestExtractionTx(
                estateLiquidator as any,
                estateToken as any,
                governanceHub as any,
                validator,
                params2,
                moderator,
                timestamp,
                { value: params2.value.add(governanceFee).add(ethers.utils.parseEther('1')) }
            );
            const receipt2 = await tx2.wait();
            const gasFee2 = receipt2.gasUsed.mul(receipt2.effectiveGasPrice);

            const event2 = receipt2.events!.find(e => e.event === 'NewRequest')!;
            expect(event2.args!.requestId).to.equal(expectedRequestId2);
            expect(event2.args!.estateId).to.equal(params2.estateId);
            expect(event2.args!.proposalId).to.equal(expectedProposalId2);
            expect(event2.args!.buyer).to.equal(operator2.address);
            expect(event2.args!.value).to.equal(params2.value);
            expect(event2.args!.currency).to.equal(params2.currency);
            expect(structToObject(event2.args!.feeRate)).to.deep.equal({
                value: params2.feeRate,
                decimals: Constant.COMMON_RATE_DECIMALS,
            });

            expect(await estateLiquidator.requestNumber()).to.equal(expectedRequestId2);

            const request2 = await estateLiquidator.getRequest(expectedRequestId2);
            expect(request2.estateId).to.equal(params2.estateId);
            expect(request2.proposalId).to.equal(expectedProposalId2);
            expect(request2.value).to.equal(params2.value);
            expect(request2.currency).to.equal(params2.currency);
            expect(structToObject(request2.feeRate)).to.deep.equal({
                value: params2.feeRate,
                decimals: Constant.COMMON_RATE_DECIMALS,
            });
            expect(request2.buyer).to.equal(operator2.address);

            const proposal2 = await governanceHub.getProposal(expectedProposalId2);
            expect(proposal2.governor).to.equal(estateToken.address);
            expect(proposal2.tokenId).to.equal(params2.estateId);
            expect(proposal2.proposer).to.equal(estateLiquidator.address);
            expect(proposal2.uuid).to.equal(params2.uuid);
            expect(proposal2.rule).to.equal(ProposalRule.ApprovalBeyondQuorum);
            expect(proposal2.quorum).to.equal(Constant.ESTATE_LIQUIDATOR_MAJORITY_QUORUM_RATE);
            expect(proposal2.due).to.equal(Constant.ESTATE_LIQUIDATOR_VOTING_DURATION);
            expect(proposal2.timePivot).to.equal(params2.admissionExpiry);
            
            expect(await ethers.provider.getBalance(moderator.address)).to.equal(initModeratorNativeBalance.sub(params2.value.add(governanceFee)).sub(gasFee2));
            expect(await ethers.provider.getBalance(estateLiquidator.address)).to.equal(initEstateLiquidatorNativeBalance.add(params2.value));
            expect(await ethers.provider.getBalance(governanceHub.address)).to.equal(initGovernanceHubNativeBalance.add(governanceFee));

            // Tx3: Request extraction with erc20 token after unanimous guard due, with just enough erc20 token
            const currency = currencies[0];
            const params3 = {
                estateId: BigNumber.from(2),
                buyer: operator2.address,
                value: ethers.utils.parseEther('30'),
                currency: currency.address,
                feeRate: ethers.utils.parseEther('0.3'),
                uuid: ethers.utils.formatBytes32String("uuid_3"),
                admissionExpiry: timestamp + 1e9,
            };

            timestamp += 10;
            await time.setNextBlockTimestamp(timestamp);

            const expectedRequestId3 = (await estateLiquidator.requestNumber()).add(1);
            const expectedProposalId3 = (await governanceHub.proposalNumber()).add(1);

            let initManagerCurrencyBalance = await currency.balanceOf(manager.address);
            let initEstateLiquidatorCurrencyBalance = await currency.balanceOf(estateLiquidator.address);
            let initGovernanceHubCurrencyBalance = await currency.balanceOf(governanceHub.address);
            initManagerNativeBalance = await ethers.provider.getBalance(manager.address);
            initEstateLiquidatorNativeBalance = await ethers.provider.getBalance(estateLiquidator.address);
            initGovernanceHubNativeBalance = await ethers.provider.getBalance(governanceHub.address);

            const tx3 = await getRequestExtractionTx(
                estateLiquidator as any,
                estateToken as any,
                governanceHub as any,
                validator,
                params3,
                manager,
                timestamp,
                { value: params3.value.add(governanceFee) }
            );
            const receipt3 = await tx3.wait();
            const gasFee3 = receipt3.gasUsed.mul(receipt3.effectiveGasPrice);

            const event3 = receipt3.events!.find(e => e.event === 'NewRequest')!;
            expect(event3.args!.requestId).to.equal(expectedRequestId3);
            expect(event3.args!.estateId).to.equal(params3.estateId);
            expect(event3.args!.proposalId).to.equal(expectedProposalId3);
            expect(event3.args!.buyer).to.equal(operator2.address);
            expect(event3.args!.value).to.equal(params3.value);
            expect(event3.args!.currency).to.equal(params3.currency);
            expect(structToObject(event3.args!.feeRate)).to.deep.equal({
                value: params3.feeRate,
                decimals: Constant.COMMON_RATE_DECIMALS,
            });
            
            expect(await estateLiquidator.requestNumber()).to.equal(expectedRequestId3);

            const request3 = await estateLiquidator.getRequest(expectedRequestId3);
            expect(request3.estateId).to.equal(params3.estateId);
            expect(request3.proposalId).to.equal(expectedProposalId3);
            expect(request3.value).to.equal(params3.value);
            expect(request3.currency).to.equal(params3.currency);
            expect(structToObject(request3.feeRate)).to.deep.equal({
                value: params3.feeRate,
                decimals: Constant.COMMON_RATE_DECIMALS,
            });
            expect(request3.buyer).to.equal(operator2.address);

            const proposal3 = await governanceHub.getProposal(expectedProposalId3);
            expect(proposal3.governor).to.equal(estateToken.address);
            expect(proposal3.tokenId).to.equal(params3.estateId);
            expect(proposal3.proposer).to.equal(estateLiquidator.address);
            expect(proposal3.uuid).to.equal(params3.uuid);
            expect(proposal3.rule).to.equal(ProposalRule.ApprovalBeyondQuorum);
            expect(proposal3.quorum).to.equal(Constant.ESTATE_LIQUIDATOR_MAJORITY_QUORUM_RATE);
            expect(proposal3.due).to.equal(Constant.ESTATE_LIQUIDATOR_VOTING_DURATION);
            expect(proposal3.timePivot).to.equal(params3.admissionExpiry);

            expect(await currency.balanceOf(manager.address)).to.equal(initManagerCurrencyBalance.sub(params3.value));
            expect(await currency.balanceOf(estateLiquidator.address)).to.equal(initEstateLiquidatorCurrencyBalance.add(params3.value));
            expect(await currency.balanceOf(governanceHub.address)).to.equal(initGovernanceHubCurrencyBalance);

            expect(await ethers.provider.getBalance(manager.address)).to.equal(initManagerNativeBalance.sub(governanceFee).sub(gasFee3));
            expect(await ethers.provider.getBalance(estateLiquidator.address)).to.equal(initEstateLiquidatorNativeBalance);
            expect(await ethers.provider.getBalance(governanceHub.address)).to.equal(initGovernanceHubNativeBalance.add(governanceFee));

            // Tx4: Request extraction with erc20 token after unanimous guard due, with just enough erc20 token
            const params4 = {
                estateId: BigNumber.from(2),
                buyer: operator1.address,
                value: ethers.utils.parseEther('40'),
                currency: currency.address,
                feeRate: ethers.utils.parseEther('0.4'),
                uuid: ethers.utils.formatBytes32String("uuid_4"),
                admissionExpiry: timestamp + 1e9,
            };

            timestamp += 10;
            await time.setNextBlockTimestamp(timestamp);

            const expectedRequestId4 = (await estateLiquidator.requestNumber()).add(1);
            const expectedProposalId4 = (await governanceHub.proposalNumber()).add(1);

            initManagerCurrencyBalance = await currency.balanceOf(manager.address);
            initEstateLiquidatorCurrencyBalance = await currency.balanceOf(estateLiquidator.address);
            initGovernanceHubCurrencyBalance = await currency.balanceOf(governanceHub.address);
            initManagerNativeBalance = await ethers.provider.getBalance(manager.address);
            initEstateLiquidatorNativeBalance = await ethers.provider.getBalance(estateLiquidator.address);
            initGovernanceHubNativeBalance = await ethers.provider.getBalance(governanceHub.address);

            const tx4 = await getRequestExtractionTx(
                estateLiquidator as any,
                estateToken as any,
                governanceHub as any,
                validator,
                params4,
                manager,
                timestamp,
                { value: governanceFee.add(ethers.utils.parseEther('1')) },
            );
            const receipt4 = await tx4.wait();
            const gasFee4 = receipt4.gasUsed.mul(receipt4.effectiveGasPrice);

            const event4 = receipt4.events!.find(e => e.event === 'NewRequest')!;
            expect(event4.args!.requestId).to.equal(expectedRequestId4);
            expect(event4.args!.estateId).to.equal(params4.estateId);
            expect(event4.args!.proposalId).to.equal(expectedProposalId4);
            expect(event4.args!.buyer).to.equal(operator1.address);
            expect(event4.args!.value).to.equal(params4.value);
            expect(event4.args!.currency).to.equal(params4.currency);
            expect(structToObject(event4.args!.feeRate)).to.deep.equal({
                value: params4.feeRate,
                decimals: Constant.COMMON_RATE_DECIMALS,
            });
            
            expect(await estateLiquidator.requestNumber()).to.equal(expectedRequestId4);

            const request4 = await estateLiquidator.getRequest(expectedRequestId4);
            expect(request4.estateId).to.equal(params4.estateId);
            expect(request4.proposalId).to.equal(expectedProposalId4);
            expect(request4.value).to.equal(params4.value);
            expect(request4.currency).to.equal(params4.currency);
            expect(structToObject(request4.feeRate)).to.deep.equal({
                value: params4.feeRate,
                decimals: Constant.COMMON_RATE_DECIMALS,
            });
            expect(request4.buyer).to.equal(operator1.address);

            const proposal4 = await governanceHub.getProposal(expectedProposalId4);
            expect(proposal4.governor).to.equal(estateToken.address);
            expect(proposal4.tokenId).to.equal(params4.estateId);
            expect(proposal4.proposer).to.equal(estateLiquidator.address);
            expect(proposal4.uuid).to.equal(params4.uuid);
            expect(proposal4.rule).to.equal(ProposalRule.ApprovalBeyondQuorum);
            expect(proposal4.quorum).to.equal(Constant.ESTATE_LIQUIDATOR_MAJORITY_QUORUM_RATE);
            expect(proposal4.due).to.equal(Constant.ESTATE_LIQUIDATOR_VOTING_DURATION);
            expect(proposal4.timePivot).to.equal(params4.admissionExpiry);

            expect(await currency.balanceOf(manager.address)).to.equal(initManagerCurrencyBalance.sub(params4.value));
            expect(await currency.balanceOf(estateLiquidator.address)).to.equal(initEstateLiquidatorCurrencyBalance.add(params4.value));
            expect(await currency.balanceOf(governanceHub.address)).to.equal(initGovernanceHubCurrencyBalance);

            expect(await ethers.provider.getBalance(manager.address)).to.equal(initManagerNativeBalance.sub(governanceFee).sub(gasFee4));
            expect(await ethers.provider.getBalance(estateLiquidator.address)).to.equal(initEstateLiquidatorNativeBalance);
            expect(await ethers.provider.getBalance(governanceHub.address)).to.equal(initGovernanceHubNativeBalance.add(governanceFee));
        });

        it('2.3.3.2. request extraction unsuccessfully when paused', async () => {
            const fixture = await beforeEstateLiquidatorTest({
                pause: true
            });            
            const { governanceHub, manager } = fixture;

            const { defaultParams } = await beforeRequestExtractionTest(fixture);
            const fee = await governanceHub.fee();

            let timestamp = await time.latest() + 10;

            await expectRevertWith(
                fixture,
                defaultParams,
                manager,
                timestamp,
                'Pausable: paused',
                defaultParams.value.add(fee),
            );
        });

        it('2.3.3.3. request extraction unsuccessfully when the contract is reentered', async () => {
            const fixture = await beforeEstateLiquidatorTest({
                useReentrancyERC20: true,
            });

            const { estateLiquidator, reentrancyERC20, estateToken, governanceHub, validator, manager } = fixture;

            const { defaultParams } = await beforeRequestExtractionTest(fixture);
            const params = { ...defaultParams, currency: reentrancyERC20.address };

            const fee = await governanceHub.fee();

            await testReentrancy_estateLiquidator(
                fixture,
                manager,
                reentrancyERC20,
                async (timestamp: number) => {
                    await time.setNextBlockTimestamp(timestamp);
                    await expect(getRequestExtractionTx(
                        estateLiquidator as any,
                        estateToken as any,
                        governanceHub as any,
                        validator,
                        params,
                        manager,
                        timestamp,
                        { value: params.value.add(fee) },
                    )).to.be.revertedWith('ReentrancyGuard: reentrant call');
                }
            );
        });

        it('2.3.3.4. request extraction unsuccessfully by non-executive', async () => {
            const fixture = await beforeEstateLiquidatorTest();

            const { estateLiquidator, moderator, user, estateToken, governanceHub, validator } = fixture;

            const { defaultParams } = await beforeRequestExtractionTest(fixture);

            const fee = await governanceHub.fee();

            // By user
            let timestamp = await time.latest() + 10;
            timestamp += 10;
            await expect(getRequestExtractionTx(
                estateLiquidator as any,
                estateToken as any,
                governanceHub as any,
                validator,
                defaultParams,
                user,
                timestamp,
                { value: defaultParams.value.add(fee) },
            )).to.be.revertedWithCustomError(estateLiquidator, 'Unauthorized');
        });

        it('2.3.3.6. request extraction unsuccessfully by inactive manager in zone', async () => {
            const fixture = await beforeEstateLiquidatorTest();

            const { admin, admins, zone1, estateLiquidator, manager, estateToken, governanceHub, validator } = fixture;

            const { defaultParams } = await beforeRequestExtractionTest(fixture);

            await callAdmin_ActivateIn(
                admin as any,
                admins,
                zone1,
                [manager.address],
                false,
                await admin.nonce(),
            )

            const fee = await governanceHub.fee();

            let timestamp = await time.latest() + 10;
            await expect(getRequestExtractionTx(
                estateLiquidator as any,
                estateToken as any,
                governanceHub as any,
                validator,
                defaultParams,
                manager,
                timestamp,
                { value: defaultParams.value.add(fee) },
            )).to.be.revertedWithCustomError(estateLiquidator, 'Unauthorized');
        });

        it('2.3.3.7. request extraction unsuccessfully with invalid validation', async () => {
            const fixture = await beforeEstateLiquidatorTest();

            const { estateLiquidator, manager, estateToken, governanceHub, validator } = fixture;

            const { defaultParams } = await beforeRequestExtractionTest(fixture);

            const timestamp = await time.latest() + 10;
            await time.setNextBlockTimestamp(timestamp);

            const fee = await governanceHub.fee();

            const validation = await getRequestExtractionInvalidValidation(
                estateToken as any,
                estateLiquidator as any,
                governanceHub as any,
                validator,
                timestamp,
                defaultParams,
            );

            await expect(estateLiquidator.connect(manager).requestExtraction(
                defaultParams.estateId,
                defaultParams.buyer,
                defaultParams.value,
                defaultParams.currency,
                defaultParams.feeRate,
                defaultParams.uuid,
                defaultParams.admissionExpiry,
                validation,
                { value: defaultParams.value.add(fee) },
            )).to.be.revertedWithCustomError(governanceHub, 'InvalidSignature');
        });

        it('2.3.3.8. request extraction unsuccessfully with expired estate', async () => {
            const fixture = await beforeEstateLiquidatorTest();

            const { estateToken, governanceHub, estateLiquidator, manager } = fixture;

            const { defaultParams } = await beforeRequestExtractionTest(fixture);

            const fee = await governanceHub.fee();
            
            let expireAt = (await estateToken.getEstate(defaultParams.estateId)).expireAt;

            await expectRevertWithCustomError(
                fixture,
                defaultParams,
                manager,
                expireAt,
                estateLiquidator,
                'UnavailableEstate',
                defaultParams.value.add(fee),
            )

            await expectRevertWithCustomError(
                fixture,
                defaultParams,
                manager,
                expireAt + 10,
                estateLiquidator,
                'UnavailableEstate',
                defaultParams.value.add(fee),
            )
        });

        it('2.3.3.9. request extraction unsuccessfully with deprecated estate', async () => {
            const fixture = await beforeEstateLiquidatorTest();

            const { operator1, estateToken, manager, governanceHub, estateLiquidator } = fixture;

            const { defaultParams } = await beforeRequestExtractionTest(fixture);

            const fee = await governanceHub.fee();

            const deprecateParams: DeprecateEstateParams = {
                estateId: defaultParams.estateId,
                data: "deprecate",
            };
            await callTransaction(getSafeDeprecateEstateTxByParams(estateToken as any, manager, deprecateParams));
            
            let timestamp = await time.latest() + 10;

            await expectRevertWithCustomError(
                fixture,
                defaultParams,
                manager,
                timestamp,
                estateLiquidator,
                'UnavailableEstate',
                defaultParams.value.add(fee),
            )
        });


        it('2.3.3.10. request extraction unsuccessfully with invalid currency', async () => {
            const fixture = await beforeEstateLiquidatorTest();

            const { operator1, governanceHub, estateLiquidator } = fixture;

            const { defaultParams } = await beforeRequestExtractionTest(fixture);

            const fee = await governanceHub.fee();
        })

        it('2.3.3.11. request extraction unsuccessfully with unavailable currency', async () => {
            const fixture = await beforeEstateLiquidatorTest();

            const { governanceHub, estateLiquidator, manager } = fixture;

            const { defaultParams } = await beforeRequestExtractionTest(fixture);

            const fee = await governanceHub.fee();

            let timestamp = await time.latest() + 10;

            const invalidCurrency = randomWallet();

            await expectRevertWithCustomError(
                fixture,
                { ...defaultParams, currency: invalidCurrency.address },
                manager,
                timestamp,
                estateLiquidator,
                'InvalidCurrency',
                fee,
            )
        });

        it('2.3.3.12. request extraction unsuccessfully with insufficient native token', async () => {
            const fixture = await beforeEstateLiquidatorTest();

            const { currencies, estateLiquidator, manager } = fixture;

            const { defaultParams } = await beforeRequestExtractionTest(fixture);

            let timestamp = await time.latest() + 10;

            await expectRevertWithCustomError(
                fixture,
                defaultParams,
                manager,
                timestamp,
                estateLiquidator,
                'InsufficientValue',
                ethers.constants.Zero,
            )

            await expectRevertWithCustomError(
                fixture,
                { ...defaultParams, currency: currencies[0].address },
                manager,
                timestamp + 10,
                estateLiquidator,
                'InsufficientValue',
                ethers.constants.Zero,
            )
        });

        it('2.3.3.13. request extraction unsuccessfully with insufficient erc20 allowance', async () => {
            const fixture = await beforeEstateLiquidatorTest({
                skipPrepareERC20ForOperators: true,
            });

            const { operator1, governanceHub, currencies, manager } = fixture;

            const { defaultParams } = await beforeRequestExtractionTest(fixture);

            const fee = await governanceHub.fee();

            const currency = currencies[0];
            await currency.mint(operator1.address, ethers.utils.parseEther('1000000000'));

            let timestamp = await time.latest() + 10;

            await expectRevertWith(
                fixture,
                { ...defaultParams, currency: currencies[0].address },
                manager,
                timestamp,
                'ERC20: insufficient allowance',
                fee,
            )
        });

        it('2.3.3.14. request extraction unsuccessfully with insufficient erc20 balance', async () => {
            const fixture = await beforeEstateLiquidatorTest({
                skipPrepareERC20ForOperators: true,
            });

            const { manager, governanceHub, currencies, estateLiquidator } = fixture;

            const { defaultParams } = await beforeRequestExtractionTest(fixture);

            const fee = await governanceHub.fee();

            const currency = currencies[0];
            await currency.connect(manager).approve(estateLiquidator.address, ethers.constants.MaxUint256);

            let timestamp = await time.latest() + 10;

            await expectRevertWith(
                fixture,
                { ...defaultParams, currency: currencies[0].address },
                manager,
                timestamp,
                'ERC20: transfer amount exceeds balance',
                fee,
            )
        });

        it('2.3.3.15. request extraction unsuccessfully when the estate is not available', async () => {
            const fixture = await beforeEstateLiquidatorTest();

            const { governanceHub, estateLiquidator, manager, estateToken } = fixture;

            const { defaultParams } = await beforeRequestExtractionTest(fixture);

            const fee = await governanceHub.fee();
            
            const deprecateParams: DeprecateEstateParams = {
                estateId: defaultParams.estateId,
                data: "deprecate",
            };
            await callTransaction(getSafeDeprecateEstateTxByParams(estateToken as any, manager, deprecateParams));

            let timestamp = await time.latest() + 100;

            await expectRevertWithCustomError(
                fixture,
                { ...defaultParams, estateId: BigNumber.from(1) },
                manager,
                timestamp,
                estateLiquidator as any,
                "UnavailableEstate",
                defaultParams.value.add(fee),
            );
        });

        it('2.3.3.16. request extraction unsuccessfully when estate token is not authorized as governor', async () => {
            const fixture = await beforeEstateLiquidatorTest({
                skipAuthorizeGovernors: true,
            });

            const { governanceHub, manager } = fixture;

            const { defaultParams } = await beforeRequestExtractionTest(fixture);

            const fee = await governanceHub.fee();

            let timestamp = await time.latest() + 10;

            await expectRevertWithCustomError(
                fixture,
                defaultParams,
                manager,
                timestamp,
                governanceHub as any,
                "Unauthorized",
                defaultParams.value.add(fee),
            )
        });
    });

    describe('2.3.4. conclude(uint256)', async () => {
        it('2.3.4.1. conclude successfully with successfully executed proposal', async () => {
            const fixture = await beforeEstateLiquidatorTest({
                listSampleExtractionRequests: true,
            });

            const { admin, operator1, operator2, governanceHub, estateLiquidator, commissionToken, estateToken, feeReceiver, dividendHub, currencies, broker1, broker2 } = fixture;

            let timestamp = await time.latest() + 10;
            await time.setNextBlockTimestamp(timestamp);

            const feeRate1 = (await estateLiquidator.getRequest(1)).feeRate;
            const feeRate2 = (await estateLiquidator.getRequest(2)).feeRate;

            // Tx1: Conclude request with native token
            governanceHub.getProposalState.whenCalledWith(1).returns(ProposalState.SuccessfulExecuted);
            const estateId1 = 1;
            const requestId1 = 1;
            const totalVote1 = await estateToken.totalSupply(estateId1);

            let operator1InitNativeBalance = await ethers.provider.getBalance(operator1.address);
            let estateLiquidatorInitNativeBalance = await ethers.provider.getBalance(estateLiquidator.address);
            let dividendHubInitNativeBalance = await ethers.provider.getBalance(dividendHub.address);
            let broker1InitNativeBalance = await ethers.provider.getBalance(broker1.address);
            let feeReceiverInitNativeBalance = await ethers.provider.getBalance(feeReceiver.address);

            const value1 = (await estateLiquidator.getRequest(requestId1)).value;

            const feeAmount1 = await applyDiscount(
                admin,
                scaleRate(value1, feeRate1),
                null,
            );
            const commissionAmount1 = (await commissionToken.commissionInfo(estateId1, feeAmount1))[1];

            const tx1 = await estateLiquidator.connect(operator1).conclude(requestId1);
            const receipt1 = await tx1.wait();
            const gasFee1 = receipt1.gasUsed.mul(receipt1.effectiveGasPrice);

            await expect(tx1).to.emit(estateToken, 'EstateExtraction').withArgs(
                estateId1,
                requestId1
            );
            await expect(tx1).to.emit(estateLiquidator, 'CommissionDispatch').withArgs(
                broker1.address,
                commissionAmount1,
                ethers.constants.AddressZero
            );
            await expect(tx1).to.emit(estateLiquidator, 'RequestApproval').withArgs(
                requestId1,
                feeAmount1,
            );
            await expect(tx1).to.emit(dividendHub, 'NewDividend').withArgs(
                estateToken.address,
                estateId1,
                estateLiquidator.address,
                totalVote1,
                value1.sub(feeAmount1),
                ethers.constants.AddressZero,
                Constant.ESTATE_LIQUIDATOR_DIVIDEND_ISSUANCE_DATA
            );
            
            const estate1 = await estateToken.getEstate(estateId1);
            expect(estate1.deprecateAt).to.equal(timestamp);

            expect(await ethers.provider.getBalance(operator1.address)).to.equal(
                operator1InitNativeBalance.sub(gasFee1)
            );
            expect(await ethers.provider.getBalance(estateLiquidator.address)).to.equal(
                estateLiquidatorInitNativeBalance.sub(value1)
            );
            expect(await ethers.provider.getBalance(dividendHub.address)).to.equal(
                dividendHubInitNativeBalance.add(value1.sub(feeAmount1))
            );
            expect(await ethers.provider.getBalance(broker1.address)).to.equal(
                broker1InitNativeBalance.add(commissionAmount1)
            );
            expect(await ethers.provider.getBalance(feeReceiver.address)).to.equal(
                feeReceiverInitNativeBalance.add(feeAmount1.sub(commissionAmount1))
            );

            const dividend1 = await dividendHub.getDividend(1);
            expect(dividend1.tokenId).to.equal(estateId1);
            expect(dividend1.remainWeight).to.equal(totalVote1);
            expect(dividend1.remainValue).to.equal(value1.sub(feeAmount1));
            expect(dividend1.currency).to.equal(ethers.constants.AddressZero);
            expect(dividend1.at(4)).to.equal(timestamp);
            expect(dividend1.governor).to.equal(estateToken.address);

            // Tx2: Conclude request with ERC20 non-exclusive token
            governanceHub.getProposalState.whenCalledWith(2).returns(ProposalState.SuccessfulExecuted);
            const requestId2 = 2;
            const estateId2 = 2;
            const totalVote2 = await estateToken.totalSupply(estateId2);

            timestamp += 10;
            await time.setNextBlockTimestamp(timestamp);

            let operator2InitNativeBalance = await ethers.provider.getBalance(operator2.address);
            estateLiquidatorInitNativeBalance = await ethers.provider.getBalance(estateLiquidator.address);
            dividendHubInitNativeBalance = await ethers.provider.getBalance(dividendHub.address);
            let broker2InitNativeBalance = await ethers.provider.getBalance(broker2.address);
            feeReceiverInitNativeBalance = await ethers.provider.getBalance(feeReceiver.address);

            const currency = currencies[0];
            let operator2InitERC20Balance = await currency.balanceOf(operator2.address);
            let estateLiquidatorInitERC20Balance = await currency.balanceOf(estateLiquidator.address);
            let dividendHubInitERC20Balance = await currency.balanceOf(dividendHub.address);
            let broker2InitERC20Balance = await currency.balanceOf(broker2.address);
            let feeReceiverInitERC20Balance = await currency.balanceOf(feeReceiver.address);

            const value2 = (await estateLiquidator.getRequest(requestId2)).value;

            const feeAmount2 = await applyDiscount(
                admin,
                scaleRate(value2, feeRate2),
                currency,
            );
            const commissionAmount2 = (await commissionToken.commissionInfo(2, feeAmount2))[1];

            const tx2 = await estateLiquidator.connect(operator2).conclude(requestId2);
            const receipt2 = await tx2.wait();
            const gasFee2 = receipt2.gasUsed.mul(receipt2.effectiveGasPrice);

            await expect(tx2).to.emit(estateToken, 'EstateExtraction').withArgs(
                estateId2,
                requestId2
            );
            await expect(tx2).to.emit(estateLiquidator, 'CommissionDispatch').withArgs(
                broker2.address,
                commissionAmount2,
                currency.address
            );
            await expect(tx2).to.emit(estateLiquidator, 'RequestApproval').withArgs(
                requestId2,
                feeAmount2,
            );
            await expect(tx2).to.emit(dividendHub, 'NewDividend').withArgs(
                estateToken.address,
                estateId2,
                estateLiquidator.address,
                totalVote2,
                value2.sub(feeAmount2),
                currency.address,
                Constant.ESTATE_LIQUIDATOR_DIVIDEND_ISSUANCE_DATA
            );

            const estate2 = await estateToken.getEstate(estateId2);
            expect(estate2.deprecateAt).to.equal(timestamp);

            expect(await ethers.provider.getBalance(operator2.address)).to.equal(
                operator2InitNativeBalance.sub(gasFee2)
            );
            expect(await ethers.provider.getBalance(estateLiquidator.address)).to.equal(
                estateLiquidatorInitNativeBalance
            );
            expect(await ethers.provider.getBalance(dividendHub.address)).to.equal(
                dividendHubInitNativeBalance
            );
            expect(await ethers.provider.getBalance(broker2.address)).to.equal(
                broker2InitNativeBalance
            );
            expect(await ethers.provider.getBalance(feeReceiver.address)).to.equal(
                feeReceiverInitNativeBalance
            );

            expect(await currency.balanceOf(operator2.address)).to.equal(
                operator2InitERC20Balance
            );
            expect(await currency.balanceOf(estateLiquidator.address)).to.equal(
                estateLiquidatorInitERC20Balance.sub(value2)
            );
            expect(await currency.balanceOf(dividendHub.address)).to.equal(
                dividendHubInitERC20Balance.add(value2.sub(feeAmount2))
            );
            expect(await currency.balanceOf(broker2.address)).to.equal(
                broker2InitERC20Balance.add(commissionAmount2)
            );
            expect(await currency.balanceOf(feeReceiver.address)).to.equal(
                feeReceiverInitERC20Balance.add(feeAmount2.sub(commissionAmount2))
            );

            const dividend2 = await dividendHub.getDividend(2);
            expect(dividend2.tokenId).to.equal(estateId2);
            expect(dividend2.remainWeight).to.equal(totalVote2);
            expect(dividend2.remainValue).to.equal(value2.sub(feeAmount2));
            expect(dividend2.currency).to.equal(currency.address);
            expect(dividend2.at(4)).to.equal(timestamp);
            expect(dividend2.governor).to.equal(estateToken.address);

            governanceHub.getProposalState.reset();
        });

        it('2.3.4.2. conclude successfully with successfully executed proposal with ERC20 exclusive token', async () => {
            const fixture = await beforeEstateLiquidatorTest();

            const { admin, operator2, governanceHub, estateLiquidator, commissionToken, estateToken, broker2, feeReceiver, dividendHub, currencies, validator, manager } = fixture;

            const currency = currencies[1];
            const fee = await governanceHub.fee();
            
            let timestamp = await time.latest() + 100;
            await time.setNextBlockTimestamp(timestamp);

            const params: RequestExtractionParams = {
                estateId: BigNumber.from(2),
                buyer: operator2.address,
                feeRate: ethers.utils.parseEther('0.1'),
                value: ethers.utils.parseEther('200'),
                currency: currency.address,
                uuid: ethers.utils.formatBytes32String("uuid_2"),
                admissionExpiry: timestamp + 1e9,
            };

            await callTransaction(getRequestExtractionTx(
                estateLiquidator as any,
                estateToken as any,
                governanceHub as any,
                validator,
                params,
                manager,
                timestamp,
                { value: fee },
            ));

            timestamp += 10;
            await time.setNextBlockTimestamp(timestamp);

            // Tx1: Conclude request with ERC20 exclusive token
            governanceHub.getProposalState.whenCalledWith(1).returns(ProposalState.SuccessfulExecuted);
            const requestId = 1;
            const estateId = 2;
            const totalVote = await estateToken.totalSupply(estateId);

            let operator2InitNativeBalance = await ethers.provider.getBalance(operator2.address);
            let estateLiquidatorInitNativeBalance = await ethers.provider.getBalance(estateLiquidator.address);
            let dividendHubInitNativeBalance = await ethers.provider.getBalance(dividendHub.address);
            let broker2InitNativeBalance = await ethers.provider.getBalance(broker2.address);
            let feeReceiverInitNativeBalance = await ethers.provider.getBalance(feeReceiver.address);

            let operator2InitERC20Balance = await currency.balanceOf(operator2.address);
            let estateLiquidatorInitERC20Balance = await currency.balanceOf(estateLiquidator.address);
            let dividendHubInitERC20Balance = await currency.balanceOf(dividendHub.address);
            let broker2InitERC20Balance = await currency.balanceOf(broker2.address);
            let feeReceiverInitERC20Balance = await currency.balanceOf(feeReceiver.address);

            const value = (await estateLiquidator.getRequest(requestId)).value;

            const feeAmount = await applyDiscount(
                admin,
                scale(value, params.feeRate, Constant.COMMON_RATE_DECIMALS),
                currency,
            );
            const commissionAmount = (await commissionToken.commissionInfo(2, feeAmount))[1];

            const tx = await estateLiquidator.connect(operator2).conclude(requestId);
            const receipt = await tx.wait();
            const gasFee = receipt.gasUsed.mul(receipt.effectiveGasPrice);

            await expect(tx).to.emit(estateToken, 'EstateExtraction').withArgs(
                estateId,
                requestId
            );
            await expect(tx).to.emit(estateLiquidator, 'RequestApproval').withArgs(
                requestId,
                feeAmount,
            );
            await expect(tx).to.emit(estateLiquidator, 'CommissionDispatch').withArgs(
                broker2.address,
                commissionAmount,
                currency.address
            );
            await expect(tx).to.emit(dividendHub, 'NewDividend').withArgs(
                estateToken.address,
                estateId,
                estateLiquidator.address,
                totalVote,
                value.sub(feeAmount),
                currency.address,
                Constant.ESTATE_LIQUIDATOR_DIVIDEND_ISSUANCE_DATA
            );
            
            const estate = await estateToken.getEstate(estateId);
            expect(estate.deprecateAt).to.equal(timestamp);

            expect(await ethers.provider.getBalance(operator2.address)).to.equal(
                operator2InitNativeBalance.sub(gasFee)
            );
            expect(await ethers.provider.getBalance(estateLiquidator.address)).to.equal(
                estateLiquidatorInitNativeBalance
            );
            expect(await ethers.provider.getBalance(dividendHub.address)).to.equal(
                dividendHubInitNativeBalance
            );
            expect(await ethers.provider.getBalance(broker2.address)).to.equal(
                broker2InitNativeBalance
            );
            expect(await ethers.provider.getBalance(feeReceiver.address)).to.equal(
                feeReceiverInitNativeBalance
            );

            expect(await currency.balanceOf(operator2.address)).to.equal(
                operator2InitERC20Balance
            );
            expect(await currency.balanceOf(estateLiquidator.address)).to.equal(
                estateLiquidatorInitERC20Balance.sub(value)
            );
            expect(await currency.balanceOf(dividendHub.address)).to.equal(
                dividendHubInitERC20Balance.add(value.sub(feeAmount))
            );
            expect(await currency.balanceOf(broker2.address)).to.equal(
                broker2InitERC20Balance.add(commissionAmount)
            );
            expect(await currency.balanceOf(feeReceiver.address)).to.equal(
                feeReceiverInitERC20Balance.add(feeAmount.sub(commissionAmount))
            );

            const dividend = await dividendHub.getDividend(1);
            expect(dividend.tokenId).to.equal(estateId);
            expect(dividend.remainWeight).to.equal(totalVote);
            expect(dividend.remainValue).to.equal(value.sub(feeAmount));
            expect(dividend.currency).to.equal(currency.address);
            expect(dividend.at(4)).to.equal(timestamp);
            expect(dividend.governor).to.equal(estateToken.address);

            governanceHub.getProposalState.reset();
        });

        async function testDisapprovalRequest(
            fixture: EstateLiquidatorFixture,
            disapproveState: ProposalState,
        ) {
            const { estateLiquidator, governanceHub, operator1, operator2, currencies } = fixture;

            // Tx1: Native token
            governanceHub.getProposalState.whenCalledWith(1).returns(disapproveState);

            const requestId1 = 1;
            let operator1InitNativeBalance = await ethers.provider.getBalance(operator1.address);
            let estateLiquidatorInitNativeBalance = await ethers.provider.getBalance(estateLiquidator.address);

            const tx1 = await estateLiquidator.connect(operator1).conclude(requestId1);
            const receipt1 = await tx1.wait();
            const gasFee1 = receipt1.gasUsed.mul(receipt1.effectiveGasPrice);

            await expect(tx1).to.emit(estateLiquidator, 'RequestDisapproval').withArgs(
                requestId1,
            );

            const value1 = (await estateLiquidator.getRequest(requestId1)).value;

            expect(await ethers.provider.getBalance(operator1.address)).to.equal(
                operator1InitNativeBalance.sub(gasFee1).add(value1)
            );
            expect(await ethers.provider.getBalance(estateLiquidator.address)).to.equal(
                estateLiquidatorInitNativeBalance.sub(value1)
            );

            const request1 = await estateLiquidator.getRequest(requestId1);
            expect(request1.estateId).to.equal(BigNumber.from(0));

            // Tx2: ERC20 token
            governanceHub.getProposalState.whenCalledWith(2).returns(disapproveState);
            const currency = currencies[0];

            const requestId2 = 2;
            let operator2InitNativeBalance = await ethers.provider.getBalance(operator2.address);
            let estateLiquidatorInitNativeBalance2 = await ethers.provider.getBalance(estateLiquidator.address);
            let operator2InitERC20Balance = await currency.balanceOf(operator2.address);
            let estateLiquidatorInitERC20Balance = await currency.balanceOf(estateLiquidator.address);

            const tx2 = await estateLiquidator.connect(operator2).conclude(requestId2);
            const receipt2 = await tx2.wait();
            const gasFee2 = receipt2.gasUsed.mul(receipt2.effectiveGasPrice);

            await expect(tx2).to.emit(estateLiquidator, 'RequestDisapproval').withArgs(
                requestId2,
            );

            const value2 = (await estateLiquidator.getRequest(requestId2)).value;

            expect(await ethers.provider.getBalance(operator2.address)).to.equal(
                operator2InitNativeBalance.sub(gasFee2)
            );
            expect(await ethers.provider.getBalance(estateLiquidator.address)).to.equal(
                estateLiquidatorInitNativeBalance2
            );

            expect(await currency.balanceOf(operator2.address)).to.equal(
                operator2InitERC20Balance.add(value2)
            );
            expect(await currency.balanceOf(estateLiquidator.address)).to.equal(
                estateLiquidatorInitERC20Balance.sub(value2)
            );

            const request2 = await estateLiquidator.getRequest(requestId2);
            expect(request2.estateId).to.equal(BigNumber.from(0));

            governanceHub.getProposalState.reset();            
        }

        it('2.3.4.3. conclude successfully with disqualified proposal', async () => {
            const fixture = await beforeEstateLiquidatorTest({
                listSampleExtractionRequests: true,
            });

            await testDisapprovalRequest(fixture, ProposalState.Disqualified);
        });

        it('2.3.4.4. conclude successfully with rejected proposal', async () => {
            const fixture = await beforeEstateLiquidatorTest({
                listSampleExtractionRequests: true,
            });

            await testDisapprovalRequest(fixture, ProposalState.Rejected);
        });

        it('2.3.4.5. conclude successfully with unsuccessful executed proposal', async () => {
            const fixture = await beforeEstateLiquidatorTest({
                listSampleExtractionRequests: true,
            });

            await testDisapprovalRequest(fixture, ProposalState.UnsuccessfulExecuted);
        });

        it('2.3.4.6. conclude unsuccessfully when paused', async () => {
            const fixture = await beforeEstateLiquidatorTest({
                listSampleExtractionRequests: true,
                pause: true,
            });

            const { estateLiquidator, operator1, governanceHub } = fixture;
            governanceHub.getProposalState.whenCalledWith(1).returns(ProposalState.SuccessfulExecuted);

            await expect(estateLiquidator.connect(operator1).conclude(1))
                .to.be.revertedWith('Pausable: paused');

            governanceHub.getProposalState.reset();
        });

        it('2.3.4.7. conclude unsuccessfully when the contract is reentered', async () => {
            const fixture = await beforeEstateLiquidatorTest({
                listSampleExtractionRequests: true,
                useReentrancyERC20: true,
            });

            const { estateLiquidator, operator1, governanceHub, reentrancyERC20 } = fixture;

            governanceHub.getProposalState.whenCalledWith(2).returns(ProposalState.SuccessfulExecuted);

            await testReentrancy_estateLiquidator(
                fixture,
                operator1,
                reentrancyERC20,
                async (timestamp: number) => {
                    await expect(estateLiquidator.connect(operator1).conclude(2))
                        .to.be.revertedWith('ReentrancyGuard: reentrant call');
                }
            );

            governanceHub.getProposalState.reset();
        });

        it('2.3.4.8. conclude unsuccessfully with invalid request id', async () => {
            const fixture = await beforeEstateLiquidatorTest();

            const { estateLiquidator, operator1 } = fixture;

            await expect(estateLiquidator.connect(operator1).conclude(0))
                .to.be.revertedWithCustomError(estateLiquidator, 'InvalidRequestId');
            await expect(estateLiquidator.connect(operator1).conclude(100))
                .to.be.revertedWithCustomError(estateLiquidator, 'InvalidRequestId');
        });

        it('2.3.4.9. conclude unsuccessfully with already disapproved request', async () => {
            const fixture = await beforeEstateLiquidatorTest({
                listSampleExtractionRequests: true,
            });

            const { estateLiquidator, operator1, governanceHub } = fixture;

            governanceHub.getProposalState.whenCalledWith(1).returns(ProposalState.UnsuccessfulExecuted);

            await callTransaction(estateLiquidator.connect(operator1).conclude(1));

            await expect(estateLiquidator.connect(operator1).conclude(1))
                .to.be.revertedWithCustomError(estateLiquidator, 'AlreadyCancelled');

            governanceHub.getProposalState.reset();
        });

        it('2.3.4.10. conclude unsuccessfully with already approved request', async () => {
            const fixture = await beforeEstateLiquidatorTest({
                listSampleExtractionRequests: true,
            });

            const { estateLiquidator, operator1, governanceHub } = fixture;

            governanceHub.getProposalState.whenCalledWith(1).returns(ProposalState.SuccessfulExecuted);

            await callTransaction(estateLiquidator.connect(operator1).conclude(1));

            await expect(estateLiquidator.connect(operator1).conclude(1))
                .to.be.revertedWithCustomError(estateLiquidator, 'UnavailableEstate');

            governanceHub.getProposalState.reset();
        });

        it('2.3.4.11. conclude unsuccessfully with deprecated estate', async () => {
            const fixture = await beforeEstateLiquidatorTest({
                listSampleExtractionRequests: true,
            });

            const { estateLiquidator, operator1, governanceHub, estateToken, manager } = fixture;

            governanceHub.getProposalState.whenCalledWith(1).returns(ProposalState.SuccessfulExecuted);

            const deprecateParams: DeprecateEstateParams = {
                estateId: BigNumber.from(1),
                data: "deprecate",
            };
            await callTransaction(getSafeDeprecateEstateTxByParams(estateToken as any, manager, deprecateParams));

            await expect(estateLiquidator.connect(operator1).conclude(1))
                .to.be.revertedWithCustomError(estateLiquidator, 'UnavailableEstate');

            governanceHub.getProposalState.reset();
        });

        it('2.3.4.12. conclude unsuccessfully with expired estate', async () => {
            const fixture = await beforeEstateLiquidatorTest({
                listSampleExtractionRequests: true,
            });

            const { estateLiquidator, operator1, estateToken, governanceHub } = fixture;
            
            governanceHub.getProposalState.whenCalledWith(1).returns(ProposalState.SuccessfulExecuted);

            const expireAt = (await estateToken.getEstate(1)).expireAt;
            await time.setNextBlockTimestamp(expireAt);

            await expect(estateLiquidator.connect(operator1).conclude(1))
                .to.be.revertedWithCustomError(estateLiquidator, 'UnavailableEstate');

            governanceHub.getProposalState.reset();
        });

        it('2.3.4.13. conclude unsuccessfully when liquidator is not authorized as extractor', async () => {
            const fixture = await beforeEstateLiquidatorTest({
                listSampleExtractionRequests: true,
            });

            const { admin, admins, estateToken, estateLiquidator, governanceHub, operator1 } = fixture;

            await callEstateToken_AuthorizeExtractors(
                estateToken as any,
                admins,
                [estateLiquidator.address],
                false,
                await admin.nonce(),
            );

            governanceHub.getProposalState.whenCalledWith(1).returns(ProposalState.SuccessfulExecuted);

            await expect(estateLiquidator.connect(operator1).conclude(1))
                .to.be.revertedWithCustomError(estateToken, 'Unauthorized');
            
            governanceHub.getProposalState.reset();
        });

        it('2.3.4.14. conclude unsuccessfully when estate token is not authorized as governor', async () => {
            const fixture = await beforeEstateLiquidatorTest({
                listSampleExtractionRequests: true,
            });

            const { admin, admins, estateToken, estateLiquidator, governanceHub, operator1, dividendHub } = fixture;
            
            await callAdmin_AuthorizeGovernors(
                admin as any,
                admins,
                [estateToken.address],
                false,
                await admin.nonce(),
            );
            
            governanceHub.getProposalState.whenCalledWith(1).returns(ProposalState.SuccessfulExecuted);

            await expect(estateLiquidator.connect(operator1).conclude(1))
                .to.be.revertedWithCustomError(dividendHub, 'Unauthorized');
            
            governanceHub.getProposalState.reset();
        });
        
        it('2.3.4.15. conclude unsuccessfully when proposal is pending', async () => {
            const fixture = await beforeEstateLiquidatorTest({
                listSampleExtractionRequests: true,
            });

            const { estateLiquidator, operator1, governanceHub } = fixture;
            
            await expect(estateLiquidator.connect(operator1).conclude(1))
                .to.be.revertedWithCustomError(estateLiquidator, 'InvalidConclusion');
        });

        it('2.3.4.16. conclude unsuccessfully when proposal is voting', async () => {
            const fixture = await beforeEstateLiquidatorTest({
                listSampleExtractionRequests: true,
            });

            const { estateLiquidator, operator1, governanceHub } = fixture;

            governanceHub.getProposalState.whenCalledWith(1).returns(ProposalState.Voting);
            
            await expect(estateLiquidator.connect(operator1).conclude(1))
                .to.be.revertedWithCustomError(estateLiquidator, 'InvalidConclusion');

            governanceHub.getProposalState.reset();
        });

        it('2.3.4.17. conclude unsuccessfully when proposal is executing', async () => {
            const fixture = await beforeEstateLiquidatorTest({
                listSampleExtractionRequests: true,
            });

            const { estateLiquidator, operator1, governanceHub } = fixture;

            governanceHub.getProposalState.whenCalledWith(1).returns(ProposalState.Executing);
            
            await expect(estateLiquidator.connect(operator1).conclude(1))
                .to.be.revertedWithCustomError(estateLiquidator, 'InvalidConclusion');

            governanceHub.getProposalState.reset();
        });
    });
});
