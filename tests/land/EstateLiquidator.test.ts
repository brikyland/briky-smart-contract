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
import { Constant, DAY } from '@tests/test.constant';
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployFeeReceiver } from '@utils/deployments/common/feeReceiver';
import { deployCurrency } from '@utils/deployments/common/currency';
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

import { MockContract, smock } from '@defi-wonderland/smock';

import {
    callAdmin_ActivateIn,
    callAdmin_AuthorizeGovernor,
    callAdmin_AuthorizeManagers,
    callAdmin_AuthorizeModerators,
    callAdmin_DeclareZones,
    callAdmin_UpdateCurrencyRegistries,
} from '@utils/callWithSignatures/admin';
import {
    callEstateToken_UpdateCommissionToken,
    callEstateToken_Pause,
    callEstateToken_AuthorizeTokenizers,
    callEstateToken_AuthorizeExtractors,
} from '@utils/callWithSignatures/estateToken';
import { BigNumber, BigNumberish, Contract, Wallet } from 'ethers';
import { randomInt } from 'crypto';
import { getBytes4Hex, getInterfaceID, randomBigNumber, structToObject } from '@utils/utils';
import { OrderedMap } from '@utils/utils';
import { deployEstateLiquidator } from '@utils/deployments/land/estateLiquidator';
import { addCurrencyToAdminAndPriceWatcher } from '@utils/callWithSignatures/common';
import { callEstateLiquidator_Pause } from '@utils/callWithSignatures/estateLiquidator';
import { deployMockPriceFeed } from '@utils/deployments/mocks/mockPriceFeed';
import { deployFailReceiver } from '@utils/deployments/mocks/failReceiver';
import { deployReentrancy } from '@utils/deployments/mocks/mockReentrancy/reentrancy';
import { deployEstateToken } from '@utils/deployments/land/estateToken';
import { deployMockEstateLiquidator } from '@utils/deployments/mocks/mockEstateLiquidator';
import { deployReentrancyERC1155Holder } from '@utils/deployments/mocks/mockReentrancy/reentrancyERC1155Holder';
import { request } from 'http';
import { Initialization as LandInitialization } from '@tests/land/test.initialization';
import { callReserveVault_AuthorizeProvider } from '@utils/callWithSignatures/reserveVault';
import { remain, scale } from '@utils/formula';
import { deployPriceWatcher } from '@utils/deployments/common/priceWatcher';
import { Rate } from '@utils/models/Common';
import { MockValidator } from '@utils/mockValidator';
import { deployMockEstateForger } from '@utils/deployments/mocks/mockEstateForger';
import { getRequestExtractionInvalidValidation, getRequestExtractionValidation } from '@utils/validation/EstateLiquidator';
import { ProposalRule, ProposalState } from '@utils/models/Proposal';
import { getRegisterSellerInValidation } from '@utils/validation/EstateForger';
import { deployReentrancyERC20 } from '@utils/deployments/mocks/mockReentrancy/reentrancyERC20';
import { RequestExtractionParams } from '@utils/models/EstateLiquidator';

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
    commissionReceiver1: any, commissionReceiver2: any;
    
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
        value: ethers.utils.parseEther('10'),
        currency: reentrancyContract.address,
        uuid: ethers.utils.formatBytes32String("uuid_1"),
    }
    
    let timestamp = await time.latest() + 20;
    
    const requestExtractionValidation = await getRequestExtractionValidation(
        estateToken as any,
        estateLiquidator as any,
        governanceHub as any,
        validator,
        timestamp,
        operator,
        requestExtractionParams,
    );

    await callTransaction(reentrancyContract.updateReentrancyPlan(
        estateLiquidator.address,
        estateLiquidator.interface.encodeFunctionData("requestExtraction", [
            requestExtractionParams.estateId,
            requestExtractionParams.value,
            requestExtractionParams.currency,
            requestExtractionParams.uuid,
            requestExtractionValidation,
        ])
    ));

    await assertion(timestamp);

    timestamp += 10;

    await callTransaction(reentrancyContract.updateReentrancyPlan(
        estateLiquidator.address,
        estateLiquidator.interface.encodeFunctionData("conclude", [1])
    ));
    
    await assertion(timestamp);
}

export async function applyDiscount(
    admin: Admin,
    feeAmount: BigNumber,
    currency: Contract | null,
) {
    const isExclusive = currency ? await admin.isExclusiveCurrency(currency.address) : false;
    if (isExclusive) {
        const exclusiveRate = currency ? (await currency.exclusiveDiscount()).value : ethers.BigNumber.from(0);
        console.log("exclusiveRate", exclusiveRate);
        console.log("feeAmount", feeAmount);
        console.log("remain", remain(feeAmount, exclusiveRate));
        return remain(feeAmount, exclusiveRate);
    }
    return feeAmount;
}

export async function getFeeDenomination(
    estateLiquidator: EstateLiquidator,
    admin: Admin,
    _unitPrice: BigNumber,
    currency: Contract | null,
) {
    return applyDiscount(
        admin,
        scale(_unitPrice, await estateLiquidator.getFeeRate()),
        currency,
    )
}

export async function getCommissionDenomination(
    commissionToken: CommissionToken,
    feeDenomination: BigNumber,
) {
    return scale(
        feeDenomination,
        await commissionToken.getCommissionRate(),
    )
}

export async function getCashbackBaseDenomination(
    feeDenomination: BigNumber,
    commissionDenomination: BigNumber,
    cashbackBaseRate: Rate,
) {
    return scale(
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
        const commissionReceiver1 = accounts[Constant.ADMIN_NUMBER + 7];
        const commissionReceiver2 = accounts[Constant.ADMIN_NUMBER + 8];

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
            LandInitialization.ESTATE_TOKEN_RoyaltyRate,
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
            LandInitialization.COMMISSION_TOKEN_CommissionRate,
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
            Constant.GOVERNANCE_HUB_FEE,
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
            LandInitialization.ESTATE_FORGER_FeeRate,
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
            LandInitialization.ESTATE_LIQUIDATOR_FeeRate,
        ) as MockEstateLiquidator;

        const zone1 = ethers.utils.formatBytes32String("TestZone1");
        const zone2 = ethers.utils.formatBytes32String("TestZone2");
        
        const failReceiver = await deployFailReceiver(deployer.address, false) as FailReceiver;
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
            commissionReceiver1,
            commissionReceiver2,
            zone1,
            zone2,
            failReceiver,
            reentrancyERC20,
        };
    };

    async function beforeEstateLiquidatorTest({
        skipAuthorizeExtractor = false,
        skipAuthorizeGovernor = false,
        skipPrepareERC20ForOperators = false,
        listSampleExtractionRequests = false,
        useReentrancyERC20 = false,
        pause = false,
    } = {}): Promise<EstateLiquidatorFixture> {
        const fixture = await loadFixture(estateLiquidatorFixture);
        const { 
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
            commissionReceiver1,
            commissionReceiver2,
            zone1, zone2,
            operator1, operator2, operator3,
            deployer,
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

        await callAdmin_DeclareZones(
            admin,
            admins,
            [zone1, zone2],
            true,
            await admin.nonce(),
        );

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

        await callEstateToken_AuthorizeTokenizers(
            estateToken,
            admins,
            [estateForger.address],
            true,
            await admin.nonce()
        );

        await callTransaction(estateForger.call(
            estateToken.address,
            estateToken.interface.encodeFunctionData("tokenizeEstate", [
                ethers.utils.parseEther('100'),
                zone1,
                10,
                "Token1_URI",
                timestamp + 1e9,
                commissionReceiver1.address,
            ])
        ));

        await callTransaction(estateForger.call(
            estateToken.address,
            estateToken.interface.encodeFunctionData("tokenizeEstate", [
                ethers.utils.parseEther('200'),
                zone2,
                10,
                "Token2_URI",
                timestamp + 1e9,
                commissionReceiver2.address,
            ])
        ));

        if (!skipAuthorizeGovernor) {
            await callAdmin_AuthorizeGovernor(
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

        if (!skipPrepareERC20ForOperators) {
            for (const currency of currencies) {
                await prepareERC20(
                    currency,
                    [operator1, operator2],
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
                value: ethers.utils.parseEther('100'),
                currency: ethers.constants.AddressZero,
                uuid: ethers.utils.formatBytes32String("uuid_1"),
            };
            const validation1 = await getRequestExtractionValidation(
                estateToken as any,
                estateLiquidator as any,
                governanceHub as any,
                validator,
                timestamp,
                operator1,
                params1,
            );
            await callTransaction(estateLiquidator.connect(operator1).requestExtraction(
                params1.estateId,
                params1.value,
                params1.currency,
                params1.uuid,
                validation1,
                { value: params1.value.add(fee) },
            ));

            timestamp += 10;
            await time.setNextBlockTimestamp(timestamp);

            const params2: RequestExtractionParams = {
                estateId: BigNumber.from(2),
                value: ethers.utils.parseEther('200'),
                currency: currencies[0].address,
                uuid: ethers.utils.formatBytes32String("uuid_2"),
            };
            const validation2 = await getRequestExtractionValidation(
                estateToken as any,
                estateLiquidator as any,
                governanceHub as any,
                validator,
                timestamp,
                operator2,
                params2,
            );
            await callTransaction(estateLiquidator.connect(operator2).requestExtraction(
                params2.estateId,
                params2.value,
                params2.currency,
                params2.uuid,
                validation2,
                { value: fee },
            ));
        }

        if (pause) {
            await callEstateLiquidator_Pause(estateLiquidator, admins, await admin.nonce());
        }

        return fixture;
    }

    describe('2.3.1. initialize(address, address, string, uint256, uint256, uint256, uint256)', async () => {
        it('2.3.1.1. Deploy successfully', async () => {
            const { admin, estateLiquidator, estateToken, feeReceiver, commissionToken, governanceHub, dividendHub } = await beforeEstateLiquidatorTest({});

            const tx = estateLiquidator.deployTransaction;
            await expect(tx).to.emit(estateLiquidator, 'FeeRateUpdate').withArgs(
                LandInitialization.ESTATE_LIQUIDATOR_FeeRate
            );
            
            expect(await estateLiquidator.paused()).to.equal(false);

            expect(await estateLiquidator.admin()).to.equal(admin.address);
            expect(await estateLiquidator.estateToken()).to.equal(estateToken.address);
            expect(await estateLiquidator.commissionToken()).to.equal(commissionToken.address);
            expect(await estateLiquidator.governanceHub()).to.equal(governanceHub.address);
            expect(await estateLiquidator.dividendHub()).to.equal(dividendHub.address);
            expect(await estateLiquidator.feeReceiver()).to.equal(feeReceiver.address);

            const feeRate = await estateLiquidator.getFeeRate();
            expect(feeRate.value).to.equal(LandInitialization.ESTATE_LIQUIDATOR_FeeRate);
            expect(feeRate.decimals).to.equal(Constant.COMMON_RATE_DECIMALS);

            expect(await estateLiquidator.requestNumber()).to.equal(0);
        });

        it('2.3.1.2. revert with invalid fee rate', async () => {
            const { admin, feeReceiver, estateToken, commissionToken, governanceHub, dividendHub, validator } = await beforeEstateLiquidatorTest({});
            const EstateLiquidator = await ethers.getContractFactory("EstateLiquidator");

            await expect(upgrades.deployProxy(EstateLiquidator, [
                admin.address,
                estateToken.address,
                commissionToken.address,
                governanceHub.address,
                dividendHub.address,
                feeReceiver.address,
                validator.getAddress(),
                Constant.COMMON_RATE_MAX_FRACTION.add(1),
            ])).to.be.reverted;
        });
    });

    describe('2.3.2. updateFeeRate(uint256, bytes[])', async () => {
        it('2.3.2.1. updateFeeRate successfully with valid signatures', async () => {
            const { admin, admins, estateLiquidator } = await beforeEstateLiquidatorTest({});
            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256"],
                [estateLiquidator.address, "updateFeeRate", ethers.utils.parseEther('0.2')]
            );

            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await estateLiquidator.updateFeeRate(ethers.utils.parseEther('0.2'), signatures);
            await tx.wait();

            await expect(tx).to
                .emit(estateLiquidator, 'FeeRateUpdate')
                .withArgs(ethers.utils.parseEther('0.2'));

            const feeRate = await estateLiquidator.getFeeRate();
            expect(feeRate.value).to.equal(ethers.utils.parseEther('0.2'));
            expect(feeRate.decimals).to.equal(Constant.COMMON_RATE_DECIMALS);
        });

        it('2.3.2.2. updateFeeRate unsuccessfully with invalid signatures', async () => {
            const { admin, admins, estateLiquidator } = await beforeEstateLiquidatorTest({});

            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256"],
                [estateLiquidator.address, "updateFeeRate", ethers.utils.parseEther('0.2')]
            );
            const invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(estateLiquidator.updateFeeRate(
                ethers.utils.parseEther('0.2'),
                invalidSignatures
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('2.3.2.3. updateFeeRate unsuccessfully with invalid rate', async () => {
            const { admin, admins, estateLiquidator } = await beforeEstateLiquidatorTest({});
            
            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256"],
                [estateLiquidator.address, "updateFeeRate", Constant.COMMON_RATE_MAX_FRACTION.add(1)]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(estateLiquidator.updateFeeRate(
                Constant.COMMON_RATE_MAX_FRACTION.add(1),
                signatures
            )).to.be.revertedWithCustomError(estateLiquidator, 'InvalidRate');
        });
    });

    describe('2.3.3. getRequest(uint256)', async () => {
        it('2.3.3.1. return correct request', async () => {
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

        it('2.3.3.2. revert with invalid request id', async () => {
            const { estateLiquidator } = await beforeEstateLiquidatorTest();

            await expect(estateLiquidator.getRequest(0)).to.be.reverted;
            await expect(estateLiquidator.getRequest(100)).to.be.reverted;
        });
    });

    describe('2.3.4. requestExtraction(uint256, uint256, address, bytes32, (uint256, uint256, bytes32))', async () => {
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

            const validation = await getRequestExtractionValidation(
                estateToken as any,
                estateLiquidator as any,
                governanceHub as any,
                validator,
                timestamp,
                signer,
                params,
            )

            await expect(estateLiquidator.connect(signer).requestExtraction(
                params.estateId,
                params.value,
                params.currency,
                params.uuid,
                validation,
                { value: value }
            )).to.be.revertedWithCustomError(errorContract, error);
        }

        async function expectRevertWith(
            fixture: EstateLiquidatorFixture,
            params: RequestExtractionParams,
            signer: Wallet,
            timestamp: number,
            error: string,
            value?: BigNumber,
        ) {
            const { estateLiquidator, validator, estateToken, governanceHub } = fixture;
            
            const validation = await getRequestExtractionValidation(
                estateToken as any,
                estateLiquidator as any,
                governanceHub as any,
                validator,
                timestamp,
                signer,
                params,
            )

            await expect(estateLiquidator.connect(signer).requestExtraction(
                params.estateId,
                params.value,
                params.currency,
                params.uuid,
                validation,
                { value: value }
            )).to.be.revertedWith(error);
        }

        async function expectRevert(
            fixture: EstateLiquidatorFixture,
            params: RequestExtractionParams,
            signer: Wallet,
            timestamp: number,
            value?: BigNumber,
        ) {
            const { estateLiquidator, validator, estateToken, governanceHub } = fixture;
            
            const validation = await getRequestExtractionValidation(
                estateToken as any,
                estateLiquidator as any,
                governanceHub as any,
                validator,
                timestamp,
                signer,
                params,
            )

            await expect(estateLiquidator.connect(signer).requestExtraction(
                params.estateId,
                params.value,
                params.currency,
                params.uuid,
                validation,
                { value: value }
            )).to.be.reverted;
        }

        async function beforeRequestExtractionTest(fixture: EstateLiquidatorFixture): Promise<{
            defaultParams: RequestExtractionParams
        }> {
            const defaultParams = {
                estateId: BigNumber.from(1),
                value: ethers.utils.parseEther('10'),
                currency: ethers.constants.AddressZero,
                uuid: ethers.utils.formatBytes32String("uuid_1"),
            }
            return { defaultParams };
        }

        it('2.3.4.1. request extraction successfully', async () => {
            const { estateLiquidator, estateToken, governanceHub, validator, operator1, operator2, currencies } = await beforeEstateLiquidatorTest();

            const governanceFee = await governanceHub.fee();

            // Tx1: Request extraction with native token before unanimous guard due, with just enough native token
            const params1 = {
                estateId: BigNumber.from(1),
                value: ethers.utils.parseEther('10'),
                currency: ethers.constants.AddressZero,
                uuid: ethers.utils.formatBytes32String("uuid_1"),
            }

            let timestamp = await time.latest() + 10;
            await time.setNextBlockTimestamp(timestamp);

            const expectedRequestId1 = (await estateLiquidator.requestNumber()).add(1);
            const expectedProposalId1 = (await governanceHub.proposalNumber()).add(1);

            let initOperator1NativeBalance = await ethers.provider.getBalance(operator1.address);
            let initEstateLiquidatorNativeBalance = await ethers.provider.getBalance(estateLiquidator.address);
            let initGovernanceHubNativeBalance = await ethers.provider.getBalance(governanceHub.address);

            const validation1 = await getRequestExtractionValidation(
                estateToken as any,
                estateLiquidator as any,
                governanceHub as any,
                validator,
                timestamp,
                operator1,
                params1,
            )

            const tx1 = await estateLiquidator.connect(operator1).requestExtraction(
                params1.estateId,
                params1.value,
                params1.currency,
                params1.uuid,
                validation1,
                { value: params1.value.add(governanceFee)}
            );
            const receipt1 = await tx1.wait();
            const gasFee1 = receipt1.gasUsed.mul(receipt1.effectiveGasPrice);

            await expect(tx1).to.emit(estateLiquidator, 'NewRequest').withArgs(
                expectedRequestId1,
                params1.estateId,
                expectedProposalId1,
                operator1.address,
                params1.value,
                params1.currency,
            );

            expect(await estateLiquidator.requestNumber()).to.equal(expectedRequestId1);

            const request1 = await estateLiquidator.getRequest(expectedRequestId1);
            expect(request1.estateId).to.equal(params1.estateId);
            expect(request1.proposalId).to.equal(expectedProposalId1);
            expect(request1.value).to.equal(params1.value);
            expect(request1.currency).to.equal(params1.currency.toLowerCase());
            expect(request1.buyer).to.equal(operator1.address);

            const proposal1 = await governanceHub.getProposal(expectedProposalId1);
            expect(proposal1.governor).to.equal(estateToken.address);
            expect(proposal1.tokenId).to.equal(params1.estateId);
            expect(proposal1.proposer).to.equal(estateLiquidator.address);
            expect(proposal1.uuid).to.equal(params1.uuid);
            expect(proposal1.rule).to.equal(ProposalRule.ApprovalBeyondQuorum);
            expect(proposal1.quorum).to.equal(Constant.ESTATE_LIQUIDATOR_UNANIMOUS_QUORUM_RATE);
            expect(proposal1.due).to.equal(Constant.ESTATE_LIQUIDATOR_VOTING_DURATION);
            expect(proposal1.timePivot).to.equal(timestamp + Constant.ESTATE_LIQUIDATOR_VOTING_DURATION);

            expect(await ethers.provider.getBalance(operator1.address)).to.equal(initOperator1NativeBalance.sub(params1.value.add(governanceFee)).sub(gasFee1));
            expect(await ethers.provider.getBalance(estateLiquidator.address)).to.equal(initEstateLiquidatorNativeBalance.add(params1.value));
            expect(await ethers.provider.getBalance(governanceHub.address)).to.equal(initGovernanceHubNativeBalance.add(governanceFee));
            
            // Tx2: Request extraction with native token after unanimous guard due, with excess native token
            const params2 = {
                estateId: BigNumber.from(1),
                value: ethers.utils.parseEther('20'),
                currency: ethers.constants.AddressZero,
                uuid: ethers.utils.formatBytes32String("uuid_2"),
            }

            timestamp = (await estateToken.getEstate(params2.estateId)).tokenizeAt + Constant.ESTATE_LIQUIDATOR_UNANIMOUS_GUARD_DURATION;
            await time.setNextBlockTimestamp(timestamp);

            const expectedRequestId2 = (await estateLiquidator.requestNumber()).add(1);
            const expectedProposalId2 = (await governanceHub.proposalNumber()).add(1);

            let initOperator2NativeBalance = await ethers.provider.getBalance(operator2.address);
            initEstateLiquidatorNativeBalance = await ethers.provider.getBalance(estateLiquidator.address);
            initGovernanceHubNativeBalance = await ethers.provider.getBalance(governanceHub.address);

            const validation2 = await getRequestExtractionValidation(
                estateToken as any,
                estateLiquidator as any,
                governanceHub as any,
                validator,
                timestamp,
                operator2,
                params2,
            )

            const tx2 = await estateLiquidator.connect(operator2).requestExtraction(
                params2.estateId,
                params2.value,
                params2.currency,
                params2.uuid,
                validation2,
                { value: params2.value.add(governanceFee).add(ethers.utils.parseEther('1'))}
            );
            const receipt2 = await tx2.wait();
            const gasFee2 = receipt2.gasUsed.mul(receipt2.effectiveGasPrice);

            await expect(tx2).to.emit(estateLiquidator, 'NewRequest').withArgs(
                expectedRequestId2,
                params2.estateId,
                expectedProposalId2,
                operator2.address,
                params2.value,
                params2.currency,
            );

            expect(await estateLiquidator.requestNumber()).to.equal(expectedRequestId2);

            const request2 = await estateLiquidator.getRequest(expectedRequestId2);
            expect(request2.estateId).to.equal(params2.estateId);
            expect(request2.proposalId).to.equal(expectedProposalId2);
            expect(request2.value).to.equal(params2.value);
            expect(request2.currency).to.equal(params2.currency);
            expect(request2.buyer).to.equal(operator2.address);

            const proposal2 = await governanceHub.getProposal(expectedProposalId2);
            expect(proposal2.governor).to.equal(estateToken.address);
            expect(proposal2.tokenId).to.equal(params2.estateId);
            expect(proposal2.proposer).to.equal(estateLiquidator.address);
            expect(proposal2.uuid).to.equal(params2.uuid);
            expect(proposal2.rule).to.equal(ProposalRule.ApprovalBeyondQuorum);
            expect(proposal2.quorum).to.equal(Constant.ESTATE_LIQUIDATOR_MAJORITY_QUORUM_RATE);
            expect(proposal2.due).to.equal(Constant.ESTATE_LIQUIDATOR_VOTING_DURATION);
            expect(proposal2.timePivot).to.equal(timestamp + Constant.ESTATE_LIQUIDATOR_VOTING_DURATION);
            
            expect(await ethers.provider.getBalance(operator2.address)).to.equal(initOperator2NativeBalance.sub(params2.value.add(governanceFee)).sub(gasFee2));
            expect(await ethers.provider.getBalance(estateLiquidator.address)).to.equal(initEstateLiquidatorNativeBalance.add(params2.value));
            expect(await ethers.provider.getBalance(governanceHub.address)).to.equal(initGovernanceHubNativeBalance.add(governanceFee));

            // Tx3: Request extraction with erc20 token after unanimous guard due, with just enough erc20 token
            const currency = currencies[0];
            const params3 = {
                estateId: BigNumber.from(2),
                value: ethers.utils.parseEther('30'),
                currency: currency.address,
                uuid: ethers.utils.formatBytes32String("uuid_3"),
            }

            timestamp += 10;
            await time.setNextBlockTimestamp(timestamp);

            const expectedRequestId3 = (await estateLiquidator.requestNumber()).add(1);
            const expectedProposalId3 = (await governanceHub.proposalNumber()).add(1);

            let initOperator2CurrencyBalance = await currency.balanceOf(operator2.address);
            let initEstateLiquidatorCurrencyBalance = await currency.balanceOf(estateLiquidator.address);
            let initGovernanceHubCurrencyBalance = await currency.balanceOf(governanceHub.address);
            initOperator2NativeBalance = await ethers.provider.getBalance(operator2.address);
            initEstateLiquidatorNativeBalance = await ethers.provider.getBalance(estateLiquidator.address);
            initGovernanceHubNativeBalance = await ethers.provider.getBalance(governanceHub.address);

            const validation3 = await getRequestExtractionValidation(
                estateToken as any,
                estateLiquidator as any,
                governanceHub as any,
                validator,
                timestamp,
                operator2,
                params3,
            );

            const tx3 = await estateLiquidator.connect(operator2).requestExtraction(
                params3.estateId,
                params3.value,
                params3.currency,
                params3.uuid,
                validation3,
                { value: governanceFee },
            );
            const receipt3 = await tx3.wait();
            const gasFee3 = receipt3.gasUsed.mul(receipt3.effectiveGasPrice);

            await expect(tx3).to.emit(estateLiquidator, 'NewRequest').withArgs(
                expectedRequestId3,
                params3.estateId,
                expectedProposalId3,
                operator2.address,
                params3.value,
                params3.currency,
            );
            
            expect(await estateLiquidator.requestNumber()).to.equal(expectedRequestId3);

            const request3 = await estateLiquidator.getRequest(expectedRequestId3);
            expect(request3.estateId).to.equal(params3.estateId);
            expect(request3.proposalId).to.equal(expectedProposalId3);
            expect(request3.value).to.equal(params3.value);
            expect(request3.currency).to.equal(params3.currency);
            expect(request3.buyer).to.equal(operator2.address);

            const proposal3 = await governanceHub.getProposal(expectedProposalId3);
            expect(proposal3.governor).to.equal(estateToken.address);
            expect(proposal3.tokenId).to.equal(params3.estateId);
            expect(proposal3.proposer).to.equal(estateLiquidator.address);
            expect(proposal3.uuid).to.equal(params3.uuid);
            expect(proposal3.rule).to.equal(ProposalRule.ApprovalBeyondQuorum);
            expect(proposal3.quorum).to.equal(Constant.ESTATE_LIQUIDATOR_MAJORITY_QUORUM_RATE);
            expect(proposal3.due).to.equal(Constant.ESTATE_LIQUIDATOR_VOTING_DURATION);
            expect(proposal3.timePivot).to.equal(timestamp + Constant.ESTATE_LIQUIDATOR_VOTING_DURATION);

            expect(await currency.balanceOf(operator2.address)).to.equal(initOperator2CurrencyBalance.sub(params3.value));
            expect(await currency.balanceOf(estateLiquidator.address)).to.equal(initEstateLiquidatorCurrencyBalance.add(params3.value));
            expect(await currency.balanceOf(governanceHub.address)).to.equal(initGovernanceHubCurrencyBalance);

            expect(await ethers.provider.getBalance(operator2.address)).to.equal(initOperator2NativeBalance.sub(governanceFee).sub(gasFee3));
            expect(await ethers.provider.getBalance(estateLiquidator.address)).to.equal(initEstateLiquidatorNativeBalance);
            expect(await ethers.provider.getBalance(governanceHub.address)).to.equal(initGovernanceHubNativeBalance.add(governanceFee));

            // Tx4: Request extraction with erc20 token after unanimous guard due, with just enough erc20 token
            const params4 = {
                estateId: BigNumber.from(2),
                value: ethers.utils.parseEther('40'),
                currency: currency.address,
                uuid: ethers.utils.formatBytes32String("uuid_4"),
            }

            timestamp += 10;
            await time.setNextBlockTimestamp(timestamp);

            const expectedRequestId4 = (await estateLiquidator.requestNumber()).add(1);
            const expectedProposalId4 = (await governanceHub.proposalNumber()).add(1);

            let initOperator1CurrencyBalance = await currency.balanceOf(operator1.address);
            initEstateLiquidatorCurrencyBalance = await currency.balanceOf(estateLiquidator.address);
            initGovernanceHubCurrencyBalance = await currency.balanceOf(governanceHub.address);
            initOperator1NativeBalance = await ethers.provider.getBalance(operator1.address);
            initEstateLiquidatorNativeBalance = await ethers.provider.getBalance(estateLiquidator.address);
            initGovernanceHubNativeBalance = await ethers.provider.getBalance(governanceHub.address);

            const validation4 = await getRequestExtractionValidation(
                estateToken as any,
                estateLiquidator as any,
                governanceHub as any,
                validator,
                timestamp,
                operator1,
                params4,
            );

            const tx4 = await estateLiquidator.connect(operator1).requestExtraction(
                params4.estateId,
                params4.value,
                params4.currency,
                params4.uuid,
                validation4,
                { value: governanceFee.add(ethers.utils.parseEther('1')) },
            );
            const receipt4 = await tx4.wait();
            const gasFee4 = receipt4.gasUsed.mul(receipt4.effectiveGasPrice);

            await expect(tx4).to.emit(estateLiquidator, 'NewRequest').withArgs(
                expectedRequestId4,
                params4.estateId,
                expectedProposalId4,
                operator1.address,
                params4.value,
                params4.currency,
            );
            
            expect(await estateLiquidator.requestNumber()).to.equal(expectedRequestId4);

            const request4 = await estateLiquidator.getRequest(expectedRequestId4);
            expect(request4.estateId).to.equal(params4.estateId);
            expect(request4.proposalId).to.equal(expectedProposalId4);
            expect(request4.value).to.equal(params4.value);
            expect(request4.currency).to.equal(params4.currency);
            expect(request4.buyer).to.equal(operator1.address);

            const proposal4 = await governanceHub.getProposal(expectedProposalId4);
            expect(proposal4.governor).to.equal(estateToken.address);
            expect(proposal4.tokenId).to.equal(params4.estateId);
            expect(proposal4.proposer).to.equal(estateLiquidator.address);
            expect(proposal4.uuid).to.equal(params4.uuid);
            expect(proposal4.rule).to.equal(ProposalRule.ApprovalBeyondQuorum);
            expect(proposal4.quorum).to.equal(Constant.ESTATE_LIQUIDATOR_MAJORITY_QUORUM_RATE);
            expect(proposal4.due).to.equal(Constant.ESTATE_LIQUIDATOR_VOTING_DURATION);
            expect(proposal4.timePivot).to.equal(timestamp + Constant.ESTATE_LIQUIDATOR_VOTING_DURATION);

            expect(await currency.balanceOf(operator1.address)).to.equal(initOperator1CurrencyBalance.sub(params4.value));
            expect(await currency.balanceOf(estateLiquidator.address)).to.equal(initEstateLiquidatorCurrencyBalance.add(params4.value));
            expect(await currency.balanceOf(governanceHub.address)).to.equal(initGovernanceHubCurrencyBalance);

            expect(await ethers.provider.getBalance(operator1.address)).to.equal(initOperator1NativeBalance.sub(governanceFee).sub(gasFee4));
            expect(await ethers.provider.getBalance(estateLiquidator.address)).to.equal(initEstateLiquidatorNativeBalance);
            expect(await ethers.provider.getBalance(governanceHub.address)).to.equal(initGovernanceHubNativeBalance.add(governanceFee));
        });

        it('2.3.4.2. request extraction unsuccessfully when paused', async () => {
            const fixture = await beforeEstateLiquidatorTest({
                pause: true
            });            
            const { operator1, governanceHub } = fixture;

            const { defaultParams } = await beforeRequestExtractionTest(fixture);
            const fee = await governanceHub.fee();

            let timestamp = await time.latest() + 10;

            await expectRevertWith(
                fixture,
                defaultParams,
                operator1,
                timestamp,
                'Pausable: paused',
                defaultParams.value.add(fee),
            );
        });

        it('2.3.4.3. request extraction unsuccessfully when the contract is reentered', async () => {
            const fixture = await beforeEstateLiquidatorTest({
                useReentrancyERC20: true,
            });

            const { estateLiquidator, reentrancyERC20, operator1, estateToken, governanceHub, validator } = fixture;

            const { defaultParams } = await beforeRequestExtractionTest(fixture);
            const params = { ...defaultParams, currency: reentrancyERC20.address };

            const fee = await governanceHub.fee();

            await testReentrancy_estateLiquidator(
                fixture,
                operator1,
                reentrancyERC20,
                async (timestamp: number) => {
                    await time.setNextBlockTimestamp(timestamp);

                    const validation = await getRequestExtractionValidation(
                        estateToken as any,
                        estateLiquidator as any,
                        governanceHub as any,
                        validator,
                        timestamp,
                        operator1,
                        params,
                    );

                    await expect(estateLiquidator.connect(operator1).requestExtraction(
                        params.estateId,
                        params.value,
                        params.currency,
                        params.uuid,
                        validation,
                        { value: fee },
                    )).to.be.revertedWith('ReentrancyGuard: reentrant call');
                }
            );
        });

        it('2.3.4.4. request extraction unsuccessfully with invalid validation', async () => {
            const fixture = await beforeEstateLiquidatorTest();

            const { estateLiquidator, operator1, estateToken, governanceHub, validator } = fixture;

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
                operator1,
                defaultParams,
            );

            await expect(estateLiquidator.connect(operator1).requestExtraction(
                defaultParams.estateId,
                defaultParams.value,
                defaultParams.currency,
                defaultParams.uuid,
                validation,
                { value: defaultParams.value.add(fee) },
            )).to.be.revertedWithCustomError(governanceHub, 'InvalidSignature');
        });

        it('2.3.4.5. request extraction unsuccessfully with expired estate', async () => {
            const fixture = await beforeEstateLiquidatorTest();

            const { operator1, estateToken, governanceHub, estateLiquidator } = fixture;

            const { defaultParams } = await beforeRequestExtractionTest(fixture);

            const fee = await governanceHub.fee();
            
            let expireAt = (await estateToken.getEstate(defaultParams.estateId)).expireAt;

            await expectRevertWithCustomError(
                fixture,
                defaultParams,
                operator1,
                expireAt,
                estateLiquidator,
                'UnavailableEstate',
                defaultParams.value.add(fee),
            )

            await expectRevertWithCustomError(
                fixture,
                defaultParams,
                operator1,
                expireAt + 10,
                estateLiquidator,
                'UnavailableEstate',
                defaultParams.value.add(fee),
            )
        });

        it('2.3.4.6. request extraction unsuccessfully with deprecated estate', async () => {
            const fixture = await beforeEstateLiquidatorTest();

            const { operator1, estateToken, manager, governanceHub, estateLiquidator } = fixture;

            const { defaultParams } = await beforeRequestExtractionTest(fixture);

            const fee = await governanceHub.fee();

            await callTransaction(estateToken.connect(manager).deprecateEstate(defaultParams.estateId));
            
            let timestamp = await time.latest() + 10;

            await expectRevertWithCustomError(
                fixture,
                defaultParams,
                operator1,
                timestamp,
                estateLiquidator,
                'UnavailableEstate',
                defaultParams.value.add(fee),
            )
        });

        it('2.3.4.7. request extraction unsuccessfully with zero value', async () => {
            const fixture = await beforeEstateLiquidatorTest();

            const { operator1, governanceHub, estateLiquidator } = fixture;

            const { defaultParams } = await beforeRequestExtractionTest(fixture);

            const fee = await governanceHub.fee();

            let timestamp = await time.latest() + 10;

            await expectRevertWithCustomError(
                fixture,
                { ...defaultParams, value: ethers.constants.Zero },
                operator1,
                timestamp,
                estateLiquidator,
                'InvalidInput',
                fee,
            )
        });

        it('2.3.4.8. request extraction unsuccessfully with insufficient native token', async () => {
            const fixture = await beforeEstateLiquidatorTest();

            const { operator1, currencies, estateLiquidator } = fixture;

            const { defaultParams } = await beforeRequestExtractionTest(fixture);

            let timestamp = await time.latest() + 10;

            await expectRevertWithCustomError(
                fixture,
                defaultParams,
                operator1,
                timestamp,
                estateLiquidator,
                'InsufficientValue',
                ethers.constants.Zero,
            )

            await expectRevertWithCustomError(
                fixture,
                { ...defaultParams, currency: currencies[0].address },
                operator1,
                timestamp + 10,
                estateLiquidator,
                'InsufficientValue',
                ethers.constants.Zero,
            )
        });

        it('2.3.4.9. request extraction unsuccessfully with insufficient erc20 allowance', async () => {
            const fixture = await beforeEstateLiquidatorTest({
                skipPrepareERC20ForOperators: true,
            });

            const { operator1, governanceHub, currencies } = fixture;

            const { defaultParams } = await beforeRequestExtractionTest(fixture);

            const fee = await governanceHub.fee();

            const currency = currencies[0];
            await currency.mint(operator1.address, ethers.utils.parseEther('1000000000'));

            let timestamp = await time.latest() + 10;

            await expectRevertWith(
                fixture,
                { ...defaultParams, currency: currencies[0].address },
                operator1,
                timestamp,
                'ERC20: insufficient allowance',
                fee,
            )
        });

        it('2.3.4.10. request extraction unsuccessfully with insufficient erc20 balance', async () => {
            const fixture = await beforeEstateLiquidatorTest({
                skipPrepareERC20ForOperators: true,
            });

            const { operator1, governanceHub, currencies, estateLiquidator } = fixture;

            const { defaultParams } = await beforeRequestExtractionTest(fixture);

            const fee = await governanceHub.fee();

            const currency = currencies[0];
            await currency.connect(operator1).approve(estateLiquidator.address, ethers.constants.MaxUint256);

            let timestamp = await time.latest() + 10;

            await expectRevertWith(
                fixture,
                { ...defaultParams, currency: currencies[0].address },
                operator1,
                timestamp,
                'ERC20: transfer amount exceeds balance',
                fee,
            )
        });

        it('2.3.4.11. request extraction unsuccessfully when refund to operator failed', async () => {
            const fixture = await beforeEstateLiquidatorTest();

            const { governanceHub, failReceiver, estateLiquidator, validator, estateToken } = fixture;

            const { defaultParams } = await beforeRequestExtractionTest(fixture);

            const fee = await governanceHub.fee();

            await callTransaction(failReceiver.activate(true));

            let timestamp = await time.latest() + 10;
            await time.setNextBlockTimestamp(timestamp);

            const validation = await getRequestExtractionValidation(
                estateToken as any,
                estateLiquidator as any,
                governanceHub as any,
                validator,
                timestamp,
                failReceiver,
                defaultParams,
            )

            await expect(failReceiver.call(
                estateLiquidator.address,
                estateLiquidator.interface.encodeFunctionData('requestExtraction', [
                    defaultParams.estateId,
                    defaultParams.value,
                    defaultParams.currency,
                    defaultParams.uuid,
                    validation,
                ]),
                { value: defaultParams.value.add(fee).add(ethers.utils.parseEther('1')) }
            )).to.be.revertedWithCustomError(estateLiquidator, "FailedRefund");
        });

        it('2.3.4.12. request extraction unsuccessfully when the estate is not tokenized', async () => {
            const fixture = await beforeEstateLiquidatorTest();

            const { operator1, governanceHub, estateLiquidator } = fixture;

            const { defaultParams } = await beforeRequestExtractionTest(fixture);

            const fee = await governanceHub.fee();

            let timestamp = await time.latest() + 100;

            await expectRevertWithCustomError(
                fixture,
                { ...defaultParams, estateId: BigNumber.from(0) },
                operator1,
                timestamp,
                estateLiquidator as any,
                "UnavailableEstate",
                defaultParams.value.add(fee),
            )
            await expectRevertWithCustomError(
                fixture,
                { ...defaultParams, estateId: BigNumber.from(100) },
                operator1,
                timestamp + 10,
                estateLiquidator as any,
                "UnavailableEstate",
                defaultParams.value.add(fee),
            )
        });

        it('2.3.4.13. request extraction unsuccessfully when estate token is not authorized as governor', async () => {
            const fixture = await beforeEstateLiquidatorTest({
                skipAuthorizeGovernor: true,
            });

            const { operator1, governanceHub } = fixture;

            const { defaultParams } = await beforeRequestExtractionTest(fixture);

            const fee = await governanceHub.fee();

            let timestamp = await time.latest() + 10;

            await expectRevertWithCustomError(
                fixture,
                defaultParams,
                operator1,
                timestamp,
                governanceHub as any,
                "InvalidGovernor",
                defaultParams.value.add(fee),
            )
        });
    });

    describe('2.3.5. conclude(uint256)', async () => {
        it('2.3.5.1. conclude successfully with successfully executed proposal', async () => {
            const fixture = await beforeEstateLiquidatorTest({
                listSampleExtractionRequests: true,
            });

            const { admin, operator1, operator2, governanceHub, estateLiquidator, commissionToken, estateToken, commissionReceiver1, commissionReceiver2, feeReceiver, dividendHub, currencies } = fixture;

            let timestamp = await time.latest() + 10;
            await time.setNextBlockTimestamp(timestamp);

            const feeRate = await estateLiquidator.getFeeRate();

            // Tx1: Conclude request with native token
            governanceHub.getProposalState.whenCalledWith(1).returns(ProposalState.SuccessfulExecuted);
            const estateId1 = 1;
            const requestId1 = 1;
            const totalVote1 = await estateToken.totalSupply(estateId1);

            let operator1InitNativeBalance = await ethers.provider.getBalance(operator1.address);
            let estateLiquidatorInitNativeBalance = await ethers.provider.getBalance(estateLiquidator.address);
            let dividendHubInitNativeBalance = await ethers.provider.getBalance(dividendHub.address);
            let commissionReceiver1InitNativeBalance = await ethers.provider.getBalance(commissionReceiver1.address);
            let feeReceiverInitNativeBalance = await ethers.provider.getBalance(feeReceiver.address);

            const value1 = (await estateLiquidator.getRequest(requestId1)).value;

            const feeAmount1 = await applyDiscount(
                admin,
                scale(value1, feeRate),
                null,
            );
            const commissionAmount1 = (await commissionToken.commissionInfo(1, feeAmount1))[1];

            const tx1 = await estateLiquidator.connect(operator1).conclude(requestId1);
            const receipt1 = await tx1.wait();
            const gasFee1 = receipt1.gasUsed.mul(receipt1.effectiveGasPrice);

            await expect(tx1).to.emit(estateToken, 'EstateExtraction').withArgs(
                estateId1,
                requestId1
            );
            await expect(tx1).to.emit(estateLiquidator, 'CommissionDispatch').withArgs(
                commissionReceiver1.address,
                commissionAmount1,
                ethers.constants.AddressZero
            );
            await expect(tx1).to.emit(estateLiquidator, 'RequestApproval').withArgs(
                requestId1,
                feeAmount1,
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
            expect(await ethers.provider.getBalance(commissionReceiver1.address)).to.equal(
                commissionReceiver1InitNativeBalance.add(commissionAmount1)
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
            let commissionReceiver2InitNativeBalance = await ethers.provider.getBalance(commissionReceiver2.address);
            feeReceiverInitNativeBalance = await ethers.provider.getBalance(feeReceiver.address);

            const currency = currencies[0];
            let operator2InitERC20Balance = await currency.balanceOf(operator2.address);
            let estateLiquidatorInitERC20Balance = await currency.balanceOf(estateLiquidator.address);
            let dividendHubInitERC20Balance = await currency.balanceOf(dividendHub.address);
            let commissionReceiver2InitERC20Balance = await currency.balanceOf(commissionReceiver2.address);
            let feeReceiverInitERC20Balance = await currency.balanceOf(feeReceiver.address);

            const value2 = (await estateLiquidator.getRequest(requestId2)).value;

            const feeAmount2 = await applyDiscount(
                admin,
                scale(value2, feeRate),
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
                commissionReceiver2.address,
                commissionAmount2,
                currency.address
            );
            await expect(tx2).to.emit(estateLiquidator, 'RequestApproval').withArgs(
                requestId2,
                feeAmount2,
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
            expect(await ethers.provider.getBalance(commissionReceiver2.address)).to.equal(
                commissionReceiver2InitNativeBalance
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
            expect(await currency.balanceOf(commissionReceiver2.address)).to.equal(
                commissionReceiver2InitERC20Balance.add(commissionAmount2)
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

        it('2.3.5.2. conclude successfully with successfully executed proposal with ERC20 exclusive token', async () => {
            const fixture = await beforeEstateLiquidatorTest();

            const { admin, operator2, governanceHub, estateLiquidator, commissionToken, estateToken, commissionReceiver2, feeReceiver, dividendHub, currencies, validator } = fixture;

            const currency = currencies[1];
            const feeRate = await estateLiquidator.getFeeRate();
            const fee = await governanceHub.fee();
            
            let timestamp = await time.latest() + 100;
            await time.setNextBlockTimestamp(timestamp);

            const params: RequestExtractionParams = {
                estateId: BigNumber.from(2),
                value: ethers.utils.parseEther('200'),
                currency: currency.address,
                uuid: ethers.utils.formatBytes32String("uuid_2"),
            };
            const validation = await getRequestExtractionValidation(
                estateToken as any,
                estateLiquidator as any,
                governanceHub as any,
                validator,
                timestamp,
                operator2,
                params,
            );
            await callTransaction(estateLiquidator.connect(operator2).requestExtraction(
                params.estateId,
                params.value,
                params.currency,
                params.uuid,
                validation,
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
            let commissionReceiver2InitNativeBalance = await ethers.provider.getBalance(commissionReceiver2.address);
            let feeReceiverInitNativeBalance = await ethers.provider.getBalance(feeReceiver.address);

            let operator2InitERC20Balance = await currency.balanceOf(operator2.address);
            let estateLiquidatorInitERC20Balance = await currency.balanceOf(estateLiquidator.address);
            let dividendHubInitERC20Balance = await currency.balanceOf(dividendHub.address);
            let commissionReceiver2InitERC20Balance = await currency.balanceOf(commissionReceiver2.address);
            let feeReceiverInitERC20Balance = await currency.balanceOf(feeReceiver.address);

            const value = (await estateLiquidator.getRequest(requestId)).value;

            const feeAmount = await applyDiscount(
                admin,
                scale(value, feeRate),
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
                commissionReceiver2.address,
                commissionAmount,
                currency.address
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
            expect(await ethers.provider.getBalance(commissionReceiver2.address)).to.equal(
                commissionReceiver2InitNativeBalance
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
            expect(await currency.balanceOf(commissionReceiver2.address)).to.equal(
                commissionReceiver2InitERC20Balance.add(commissionAmount)
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

        it('2.3.5.3. conclude successfully with disqualified proposal', async () => {
            const fixture = await beforeEstateLiquidatorTest({
                listSampleExtractionRequests: true,
            });

            await testDisapprovalRequest(fixture, ProposalState.Disqualified);
        });

        it('2.3.5.4. conclude successfully with rejected proposal', async () => {
            const fixture = await beforeEstateLiquidatorTest({
                listSampleExtractionRequests: true,
            });

            await testDisapprovalRequest(fixture, ProposalState.Rejected);
        });

        it('2.3.5.5. conclude successfully with unsuccessful executed proposal', async () => {
            const fixture = await beforeEstateLiquidatorTest({
                listSampleExtractionRequests: true,
            });

            await testDisapprovalRequest(fixture, ProposalState.UnsuccessfulExecuted);
        });

        it('2.3.5.6. conclude unsuccessfully when paused', async () => {
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

        it('2.3.5.7. conclude unsuccessfully when the contract is reentered', async () => {
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

        it('2.3.5.8. conclude unsuccessfully with invalid request id', async () => {
            const fixture = await beforeEstateLiquidatorTest();

            const { estateLiquidator, operator1 } = fixture;

            await expect(estateLiquidator.connect(operator1).conclude(0))
                .to.be.revertedWithCustomError(estateLiquidator, 'InvalidRequestId');
            await expect(estateLiquidator.connect(operator1).conclude(100))
                .to.be.revertedWithCustomError(estateLiquidator, 'InvalidRequestId');
        });

        it('2.3.5.9. conclude unsuccessfully with already disapproved request', async () => {
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

        it('2.3.5.10. conclude unsuccessfully with already approved request', async () => {
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

        it('2.3.5.11. conclude unsuccessfully with deprecated estate', async () => {
            const fixture = await beforeEstateLiquidatorTest({
                listSampleExtractionRequests: true,
            });

            const { estateLiquidator, operator1, governanceHub, estateToken, manager } = fixture;

            governanceHub.getProposalState.whenCalledWith(1).returns(ProposalState.SuccessfulExecuted);

            await callTransaction(estateToken.connect(manager).deprecateEstate(1));

            await expect(estateLiquidator.connect(operator1).conclude(1))
                .to.be.revertedWithCustomError(estateLiquidator, 'UnavailableEstate');

            governanceHub.getProposalState.reset();
        });

        it('2.3.5.12. conclude unsuccessfully with expired estate', async () => {
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

        it('2.3.5.13. conclude unsuccessfully when liquidator is not authorized as extractor', async () => {
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

        it('2.3.5.14. conclude unsuccessfully when estate token is not authorized as governor', async () => {
            const fixture = await beforeEstateLiquidatorTest({
                listSampleExtractionRequests: true,
            });

            const { admin, admins, estateToken, estateLiquidator, governanceHub, operator1, dividendHub } = fixture;
            
            await callAdmin_AuthorizeGovernor(
                admin as any,
                admins,
                [estateToken.address],
                false,
                await admin.nonce(),
            );
            
            governanceHub.getProposalState.whenCalledWith(1).returns(ProposalState.SuccessfulExecuted);

            await expect(estateLiquidator.connect(operator1).conclude(1))
                .to.be.revertedWithCustomError(dividendHub, 'InvalidGovernor');
            
            governanceHub.getProposalState.reset();
        });
        
        it('2.3.5.15. conclude unsuccessfully when proposal is pending', async () => {
            const fixture = await beforeEstateLiquidatorTest({
                listSampleExtractionRequests: true,
            });

            const { estateLiquidator, operator1, governanceHub } = fixture;
            
            await expect(estateLiquidator.connect(operator1).conclude(1))
                .to.be.revertedWithCustomError(estateLiquidator, 'InvalidConclusion');
        });

        it('2.3.5.16. conclude unsuccessfully when proposal is voting', async () => {
            const fixture = await beforeEstateLiquidatorTest({
                listSampleExtractionRequests: true,
            });

            const { estateLiquidator, operator1, governanceHub } = fixture;

            governanceHub.getProposalState.whenCalledWith(1).returns(ProposalState.Voting);
            
            await expect(estateLiquidator.connect(operator1).conclude(1))
                .to.be.revertedWithCustomError(estateLiquidator, 'InvalidConclusion');

            governanceHub.getProposalState.reset();
        });

        it('2.3.5.17. conclude unsuccessfully when proposal is executing', async () => {
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
