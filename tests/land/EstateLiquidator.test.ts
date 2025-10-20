import chai from 'chai';
import { expect } from 'chai';
import { BigNumber, Contract, Wallet } from 'ethers';
import { ethers } from 'hardhat';

// @defi-wonderland/smock
import { MockContract, smock } from '@defi-wonderland/smock';

// @nomicfoundation/hardhat-network-helpers
import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';

// @tests
import { Constant } from '@tests/test.constant';

// @tests/common
import { Initialization as CommonInitialization } from '@tests/common/test.initialization';

// @tests/land
import { Initialization as LandInitialization } from '@tests/land/test.initialization';

// @typechain-types
import {
    Admin,
    CommissionToken,
    Currency,
    EstateToken,
    FeeReceiver,
    PriceFeed,
    MockEstateLiquidator,
    ReserveVault,
    PriceWatcher,
    GovernanceHub,
    DividendHub,
    MockEstateForger,
    FailReceiver,
    ReentrancyERC20,
} from '@typechain-types';

// @utils
import { callTransaction, prepareERC20, prepareNativeToken, randomWallet } from '@utils/blockchain';
import { applyDiscount, scale, scaleRate } from '@utils/formula';
import { MockValidator } from '@utils/mockValidator';
import { structToObject } from '@utils/utils';

// @utils/deployments/common
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployFeeReceiver } from '@utils/deployments/common/feeReceiver';
import { deployPriceWatcher } from '@utils/deployments/common/priceWatcher';

// @utils/deployments/mock
import { deployFailReceiver } from '@utils/deployments/mock/utilities/failReceiver';
import { deployPriceFeed } from '@utils/deployments/mock/utilities/priceFeed';
import { deployMockEstateForger } from '@utils/deployments/mock/land/mockEstateForger';
import { deployMockEstateLiquidator } from '@utils/deployments/mock/land/mockEstateLiquidator';
import { deployReentrancyERC20 } from '@utils/deployments/mock/reentrancy/reentrancyERC20';

// @utils/models/common
import { ProposalState } from '@utils/models/common/governanceHub';
import { ProposalRule } from '@utils/models/common/governanceHub';

// @utils/models/land
import { RequestExtractionParams, RequestExtractionParamsInput } from '@utils/models/land/estateLiquidator';

// @utils/transaction/common
import {
    getAdminTxByInput_ActivateIn,
    getAdminTxByInput_AuthorizeGovernors,
    getAdminTxByInput_AuthorizeManagers,
    getAdminTxByInput_AuthorizeModerators,
    getAdminTxByInput_DeclareZone,
    getAdminTxByInput_UpdateCurrencyRegistries,
} from '@utils/transaction/common/admin';
import { getPausableTxByInput_Pause } from '@utils/transaction/common/pausable';

// @utils/transaction/land
import {
    getEstateTokenTxByInput_AuthorizeExtractors,
    getEstateTokenTxByInput_AuthorizeTokenizers,
    getCallEstateTokenTx_TokenizeEstate,
    getEstateTokenTxByInput_RegisterCustodian,
    getEstateTokenTxByParams_SafeDeprecateEstate,
    getEstateTokenTxByInput_UpdateCommissionToken,
} from '@utils/transaction/land/estateToken';
import {
    getEstateLiquidatorTx_Conclude,
    getEstateLiquidatorTx_RequestExtraction,
    getEstateLiquidatorTxByInput_RequestExtraction,
} from '@utils/transaction/land/estateLiquidator';
import { getCommissionTokenTx_RegisterBroker } from '@utils/transaction/land/commissionToken';

// @utils/validation/land
import { getRequestExtractionValidation } from '@utils/validation/land/estateLiquidator';

chai.use(smock.matchers);

interface EstateLiquidatorFixture {
    deployer: any;
    admins: any[];
    manager: any;
    moderator: any;
    user: any;
    operator1: any;
    operator2: any;
    operator3: any;
    custodian1: any;
    custodian2: any;
    broker1: any;
    broker2: any;
    validator: MockValidator;

    currencies: Currency[];
    nativePriceFeed: PriceFeed;
    currencyPriceFeed: PriceFeed;

    admin: Admin;
    feeReceiver: FeeReceiver;
    estateToken: MockContract<EstateToken>;
    commissionToken: MockContract<CommissionToken>;
    governanceHub: MockContract<GovernanceHub>;
    dividendHub: MockContract<DividendHub>;
    estateForger: MockEstateForger;
    estateLiquidator: MockEstateLiquidator;

    failReceiver: FailReceiver;
    reentrancyERC20: ReentrancyERC20;
    zone1: string;
    zone2: string;
}

async function testReentrancy_estateLiquidator(
    fixture: EstateLiquidatorFixture,
    operator: Wallet,
    reentrancyContract: Contract,
    assertion: any
) {
    const { validator, estateLiquidator, estateToken, governanceHub } = fixture;

    let timestamp = (await time.latest()) + 20;

    const requestExtractionParams = {
        estateId: BigNumber.from(1),
        buyer: operator.address,
        value: ethers.utils.parseEther('10'),
        currency: reentrancyContract.address,
        feeRate: ethers.utils.parseEther('0.1'),
        uuid: ethers.utils.formatBytes32String('uuid_1'),
        admissionExpiry: timestamp,
    };

    const requestExtractionValidation = await getRequestExtractionValidation(
        estateLiquidator,
        estateToken as any,
        governanceHub as any,
        requestExtractionParams,
        validator,
        timestamp
    );

    await callTransaction(
        reentrancyContract.updateReentrancyPlan(
            estateLiquidator.address,
            estateLiquidator.interface.encodeFunctionData('requestExtraction', [
                requestExtractionParams.estateId,
                requestExtractionParams.buyer,
                requestExtractionParams.value,
                requestExtractionParams.currency,
                requestExtractionParams.feeRate,
                requestExtractionParams.uuid,
                requestExtractionParams.admissionExpiry,
                requestExtractionValidation,
            ])
        )
    );

    await assertion(timestamp);

    timestamp += 10;

    await callTransaction(
        reentrancyContract.updateReentrancyPlan(
            estateLiquidator.address,
            estateLiquidator.interface.encodeFunctionData('conclude', [1])
        )
    );

    await assertion(timestamp);
}

describe('2.3. EstateLiquidator', async () => {
    async function estateLiquidatorFixture(): Promise<EstateLiquidatorFixture> {
        const [
            deployer,
            admin1,
            admin2,
            admin3,
            admin4,
            admin5,
            user,
            manager,
            moderator,
            operator1,
            operator2,
            operator3,
            broker1,
            broker2,
            custodian1,
            custodian2,
        ] = await ethers.getSigners();
        const admins = [admin1, admin2, admin3, admin4, admin5];

        const validator = new MockValidator(deployer as any);

        const SmockCurrencyFactory = (await smock.mock('Currency')) as any;
        const currency1 = await SmockCurrencyFactory.deploy();
        const currency2 = await SmockCurrencyFactory.deploy();
        const currency3 = await SmockCurrencyFactory.deploy();
        await callTransaction(currency1.initialize('MockCurrency1', 'MCK1'));
        await callTransaction(currency2.initialize('MockCurrency2', 'MCK2'));
        await callTransaction(currency3.initialize('MockCurrency3', 'MCK3'));

        await callTransaction(
            currency1.setExclusiveDiscount(ethers.utils.parseEther('0.3'), Constant.COMMON_RATE_DECIMALS)
        );
        await callTransaction(
            currency2.setExclusiveDiscount(ethers.utils.parseEther('0.4'), Constant.COMMON_RATE_DECIMALS)
        );
        await callTransaction(
            currency3.setExclusiveDiscount(ethers.utils.parseEther('0.5'), Constant.COMMON_RATE_DECIMALS)
        );

        const currencies = [currency1, currency2, currency3];

        const nativePriceFeed = (await deployPriceFeed(deployer.address, 0, 0)) as PriceFeed;
        const currencyPriceFeed = (await deployPriceFeed(deployer.address, 0, 0)) as PriceFeed;

        const adminAddresses: string[] = admins.map((signer) => signer.address);
        const admin = (await deployAdmin(
            deployer.address,
            adminAddresses[0],
            adminAddresses[1],
            adminAddresses[2],
            adminAddresses[3],
            adminAddresses[4]
        )) as Admin;

        const feeReceiver = (await deployFeeReceiver(deployer.address, admin.address)) as FeeReceiver;

        const MockEstateTokenFactory = (await smock.mock('EstateToken')) as any;
        const estateToken = (await MockEstateTokenFactory.deploy()) as MockContract<EstateToken>;
        await callTransaction(
            estateToken.initialize(
                admin.address,
                feeReceiver.address,
                validator.getAddress(),
                LandInitialization.ESTATE_TOKEN_BaseURI
            )
        );

        const SmockCommissionTokenFactory = (await smock.mock('CommissionToken')) as any;
        const commissionToken = (await SmockCommissionTokenFactory.deploy()) as MockContract<CommissionToken>;
        await callTransaction(
            commissionToken.initialize(
                admin.address,
                estateToken.address,
                feeReceiver.address,
                LandInitialization.COMMISSION_TOKEN_Name,
                LandInitialization.COMMISSION_TOKEN_Symbol,
                LandInitialization.COMMISSION_TOKEN_BaseURI,
                LandInitialization.COMMISSION_TOKEN_RoyaltyRate
            )
        );

        await callTransaction(
            getEstateTokenTxByInput_UpdateCommissionToken(
                estateToken as any,
                deployer,
                { commissionToken: commissionToken.address },
                admin,
                admins
            )
        );

        const SmockGovernanceHubFactory = (await smock.mock('GovernanceHub')) as any;
        const governanceHub = (await SmockGovernanceHubFactory.deploy()) as MockContract<GovernanceHub>;
        await callTransaction(
            governanceHub.initialize(admin.address, validator.getAddress(), CommonInitialization.GOVERNANCE_HUB_Fee)
        );

        const SmockDividendHubFactory = (await smock.mock('DividendHub')) as any;
        const dividendHub = (await SmockDividendHubFactory.deploy()) as MockContract<DividendHub>;
        await callTransaction(dividendHub.initialize(admin.address));

        const SmockReserveVaultFactory = (await smock.mock('ReserveVault')) as any;
        const reserveVault = (await SmockReserveVaultFactory.deploy()) as MockContract<ReserveVault>;
        await callTransaction(reserveVault.initialize(admin.address));

        const priceWatcher = (await deployPriceWatcher(deployer.address, admin.address)) as PriceWatcher;

        const estateForger = (await deployMockEstateForger(
            deployer,
            admin.address,
            estateToken.address,
            commissionToken.address,
            priceWatcher.address,
            feeReceiver.address,
            reserveVault.address,
            validator.getAddress(),
            LandInitialization.ESTATE_FORGER_BaseMinUnitPrice,
            LandInitialization.ESTATE_FORGER_BaseMaxUnitPrice
        )) as MockEstateForger;

        const estateLiquidator = (await deployMockEstateLiquidator(
            deployer,
            admin.address,
            estateToken.address,
            commissionToken.address,
            governanceHub.address,
            dividendHub.address,
            feeReceiver.address,
            validator.getAddress()
        )) as MockEstateLiquidator;

        const failReceiver = (await deployFailReceiver(deployer.address, false, false)) as FailReceiver;
        const reentrancyERC20 = (await deployReentrancyERC20(deployer.address, true, false)) as ReentrancyERC20;

        const zone1 = ethers.utils.formatBytes32String('TestZone1');
        const zone2 = ethers.utils.formatBytes32String('TestZone2');

        return {
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
            validator,
            currencies,
            nativePriceFeed,
            currencyPriceFeed,
            admin,
            feeReceiver,
            estateToken,
            commissionToken,
            governanceHub,
            dividendHub,
            estateForger,
            estateLiquidator,
            failReceiver,
            reentrancyERC20,
            zone1,
            zone2,
        };
    }

    async function beforeEstateLiquidatorTest({
        skipAuthorizeExtractor = false,
        skipAuthorizeGovernors = false,
        skipDeclareZone = false,
        skipPrepareERC20ForManager = false,
        listSampleExtractionRequests = false,
        useReentrancyERC20 = false,
        pause = false,
    } = {}): Promise<EstateLiquidatorFixture> {
        const fixture = await loadFixture(estateLiquidatorFixture);
        const {
            deployer,
            admins,
            custodian1,
            custodian2,
            zone1,
            zone2,
            operator1,
            operator2,
            broker1,
            broker2,
            manager,
            moderator,
            validator,
            admin,
            estateToken,
            estateLiquidator,
            commissionToken,
            governanceHub,
            estateForger,
            failReceiver,
            reentrancyERC20,
        } = fixture;

        let currencies = fixture.currencies;
        if (useReentrancyERC20) {
            currencies = [reentrancyERC20 as any, ...currencies];
        }

        let timestamp = await time.latest();

        const fee = await governanceHub.fee();

        const currenciesConfig = [
            {
                currency: ethers.constants.AddressZero,
                isAvailable: true,
                isExclusive: false,
            },
            {
                currency: fixture.currencies[0].address,
                isAvailable: true,
                isExclusive: true,
            },
            {
                currency: fixture.currencies[1].address,
                isAvailable: true,
                isExclusive: false,
            },
            {
                currency: fixture.currencies[2].address,
                isAvailable: false,
                isExclusive: true,
            },
        ];
        if (useReentrancyERC20) {
            currenciesConfig.push({
                currency: reentrancyERC20.address,
                isAvailable: true,
                isExclusive: false,
            });
        }

        await callTransaction(
            getAdminTxByInput_UpdateCurrencyRegistries(
                admin,
                deployer,
                {
                    currencies: currenciesConfig.map((config) => config.currency),
                    isAvailable: currenciesConfig.map((config) => config.isAvailable),
                    isExclusive: currenciesConfig.map((config) => config.isExclusive),
                },
                admins
            )
        );

        if (!skipDeclareZone) {
            for (const zone of [zone1, zone2]) {
                await callTransaction(getAdminTxByInput_DeclareZone(admin, deployer, { zone }, admins));
            }
        }

        await callTransaction(
            getAdminTxByInput_AuthorizeManagers(
                admin,
                deployer,
                {
                    accounts: [manager.address],
                    isManager: true,
                },
                admins
            )
        );

        await callTransaction(
            getAdminTxByInput_AuthorizeModerators(
                admin,
                deployer,
                {
                    accounts: [moderator.address],
                    isModerator: true,
                },
                admins
            )
        );

        for (const zone of [zone1, zone2]) {
            await callTransaction(
                getAdminTxByInput_ActivateIn(
                    admin,
                    deployer,
                    {
                        zone: zone,
                        accounts: [manager.address, moderator.address],
                        isActive: true,
                    },
                    admins
                )
            );
        }

        await callTransaction(
            getCommissionTokenTx_RegisterBroker(commissionToken as any, manager, {
                zone: zone1,
                broker: broker1.address,
                commissionRate: ethers.utils.parseEther('0.1'),
            })
        );
        await callTransaction(
            getCommissionTokenTx_RegisterBroker(commissionToken as any, manager, {
                zone: zone2,
                broker: broker2.address,
                commissionRate: ethers.utils.parseEther('0.2'),
            })
        );

        await callTransaction(
            getEstateTokenTxByInput_AuthorizeTokenizers(
                estateToken as any,
                deployer,
                {
                    accounts: [estateForger.address],
                    isTokenizer: true,
                },
                admin,
                admins
            )
        );

        for (const zone of [zone1, zone2]) {
            for (const custodian of [custodian1, custodian2]) {
                await callTransaction(
                    getEstateTokenTxByInput_RegisterCustodian(
                        estateToken as any,
                        manager,
                        {
                            zone,
                            custodian: custodian.address,
                            uri: 'TestURI',
                        },
                        validator
                    )
                );
            }
        }

        await callTransaction(
            getCallEstateTokenTx_TokenizeEstate(estateToken as any, estateForger, {
                totalSupply: ethers.utils.parseEther('100'),
                zone: zone1,
                tokenizationId: BigNumber.from(10),
                uri: 'Token1_URI',
                expireAt: timestamp + 1e9,
                custodian: custodian1.address,
                broker: broker1.address,
            })
        );

        await callTransaction(
            getCallEstateTokenTx_TokenizeEstate(estateToken as any, estateForger, {
                totalSupply: ethers.utils.parseEther('200'),
                zone: zone2,
                tokenizationId: BigNumber.from(10),
                uri: 'Token2_URI',
                expireAt: timestamp + 1e9,
                custodian: custodian2.address,
                broker: broker2.address,
            })
        );

        if (!skipAuthorizeExtractor) {
            await callTransaction(
                getEstateTokenTxByInput_AuthorizeExtractors(
                    estateToken as any,
                    deployer,
                    { accounts: [estateLiquidator.address], isExtractor: true },
                    admin,
                    admins
                )
            );
        }

        if (!skipAuthorizeGovernors) {
            await callTransaction(
                getAdminTxByInput_AuthorizeGovernors(
                    admin,
                    deployer,
                    {
                        accounts: [estateToken.address],
                        isGovernor: true,
                    },
                    admins
                )
            );
        }

        await prepareNativeToken(ethers.provider, deployer, [failReceiver], ethers.utils.parseEther('10000'));

        if (!skipPrepareERC20ForManager) {
            for (const currency of currencies) {
                await prepareERC20(currency, [manager], [estateLiquidator], ethers.utils.parseEther('1000000000'));
            }
        }

        if (listSampleExtractionRequests) {
            timestamp += 100;
            await time.setNextBlockTimestamp(timestamp);

            const paramsInput1: RequestExtractionParamsInput = {
                estateId: BigNumber.from(1),
                buyer: operator1.address,
                value: ethers.utils.parseEther('100'),
                currency: ethers.constants.AddressZero,
                feeRate: ethers.utils.parseEther('0.1'),
                uuid: ethers.utils.formatBytes32String('uuid_1'),
                admissionExpiry: timestamp + 1e9,
            };
            await callTransaction(
                getEstateLiquidatorTxByInput_RequestExtraction(
                    estateLiquidator as any,
                    estateToken as any,
                    governanceHub as any,
                    validator,
                    paramsInput1,
                    manager,
                    timestamp,
                    { value: paramsInput1.value.add(fee) }
                )
            );

            timestamp += 10;
            await time.setNextBlockTimestamp(timestamp);

            const paramsInput2: RequestExtractionParamsInput = {
                estateId: BigNumber.from(2),
                buyer: operator2.address,
                value: ethers.utils.parseEther('200'),
                currency: currencies[0].address,
                feeRate: ethers.utils.parseEther('0.2'),
                uuid: ethers.utils.formatBytes32String('uuid_2'),
                admissionExpiry: timestamp + 1e9,
            };
            await callTransaction(
                getEstateLiquidatorTxByInput_RequestExtraction(
                    estateLiquidator as any,
                    estateToken as any,
                    governanceHub as any,
                    validator,
                    paramsInput2,
                    manager,
                    timestamp,
                    { value: paramsInput2.value.add(fee) }
                )
            );
        }

        if (pause) {
            await callTransaction(getPausableTxByInput_Pause(estateLiquidator, deployer, admin, admins));
        }

        return fixture;
    }

    /* --- Initialization --- */
    describe('2.3.1. initialize(address,address,address,address,address,address,address)', async () => {
        it('2.3.1.1. Deploy successfully', async () => {
            const {
                admin,
                estateLiquidator,
                estateToken,
                feeReceiver,
                commissionToken,
                governanceHub,
                dividendHub,
                validator,
            } = await beforeEstateLiquidatorTest({});

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

    /* --- Query --- */
    describe('2.3.2. getRequest(uint256)', async () => {
        it('2.3.2.1. Return correct request', async () => {
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

        it('2.3.2.2. Revert with invalid request id', async () => {
            const { estateLiquidator } = await beforeEstateLiquidatorTest();

            await expect(estateLiquidator.getRequest(0)).to.be.reverted;
            await expect(estateLiquidator.getRequest(100)).to.be.reverted;
        });
    });

    /* --- Command --- */
    describe('2.3.3. requestExtraction(uint256,address,uint256,address,uint256,bytes32,uint40,(uint256,uint256,bytes32))', async () => {
        async function beforeRequestExtractionTest(fixture: EstateLiquidatorFixture): Promise<{
            defaultParamsInput: RequestExtractionParamsInput;
        }> {
            const { operator1 } = fixture;
            const timestamp = await time.latest();
            const defaultParamsInput: RequestExtractionParamsInput = {
                estateId: BigNumber.from(1),
                buyer: operator1.address,
                value: ethers.utils.parseEther('10'),
                currency: ethers.constants.AddressZero,
                feeRate: ethers.utils.parseEther('0.1'),
                uuid: ethers.utils.formatBytes32String('uuid_1'),
                admissionExpiry: timestamp + 1e9,
            };
            return { defaultParamsInput };
        }

        it('2.3.3.1. Request extraction successfully', async () => {
            const {
                estateLiquidator,
                estateToken,
                governanceHub,
                validator,
                operator1,
                operator2,
                currencies,
                manager,
                moderator,
            } = await beforeEstateLiquidatorTest();

            const governanceFee = await governanceHub.fee();

            let timestamp = (await time.latest()) + 10;
            await time.setNextBlockTimestamp(timestamp);

            // Tx1: Request extraction with native token before unanimous guard due, with just enough native token
            const paramsInput1: RequestExtractionParamsInput = {
                estateId: BigNumber.from(1),
                buyer: operator1.address,
                value: ethers.utils.parseEther('10'),
                currency: ethers.constants.AddressZero,
                feeRate: ethers.utils.parseEther('0.1'),
                uuid: ethers.utils.formatBytes32String('uuid_1'),
                admissionExpiry: timestamp + 1e9,
            };

            const expectedRequestId1 = (await estateLiquidator.requestNumber()).add(1);
            const expectedProposalId1 = (await governanceHub.proposalNumber()).add(1);

            let initManagerNativeBalance = await ethers.provider.getBalance(manager.address);
            let initEstateLiquidatorNativeBalance = await ethers.provider.getBalance(estateLiquidator.address);
            let initGovernanceHubNativeBalance = await ethers.provider.getBalance(governanceHub.address);

            const tx1 = await getEstateLiquidatorTxByInput_RequestExtraction(
                estateLiquidator as any,
                estateToken as any,
                governanceHub as any,
                validator,
                paramsInput1,
                manager,
                timestamp,
                { value: paramsInput1.value.add(governanceFee) }
            );
            const receipt1 = await tx1.wait();
            const gasFee1 = receipt1.gasUsed.mul(receipt1.effectiveGasPrice);

            const event1 = receipt1.events!.find((e) => e.event === 'NewRequest')!;
            expect(event1.args!.requestId).to.equal(expectedRequestId1);
            expect(event1.args!.estateId).to.equal(paramsInput1.estateId);
            expect(event1.args!.proposalId).to.equal(expectedProposalId1);
            expect(event1.args!.buyer).to.equal(operator1.address);
            expect(event1.args!.value).to.equal(paramsInput1.value);
            expect(event1.args!.currency).to.equal(paramsInput1.currency);
            expect(structToObject(event1.args!.feeRate)).to.deep.equal({
                value: paramsInput1.feeRate,
                decimals: Constant.COMMON_RATE_DECIMALS,
            });

            expect(await estateLiquidator.requestNumber()).to.equal(expectedRequestId1);

            const request1 = await estateLiquidator.getRequest(expectedRequestId1);
            expect(request1.estateId).to.equal(paramsInput1.estateId);
            expect(request1.proposalId).to.equal(expectedProposalId1);
            expect(request1.value).to.equal(paramsInput1.value);
            expect(request1.currency).to.equal(paramsInput1.currency.toLowerCase());
            expect(structToObject(request1.feeRate)).to.deep.equal({
                value: paramsInput1.feeRate,
                decimals: Constant.COMMON_RATE_DECIMALS,
            });
            expect(request1.buyer).to.equal(operator1.address);

            const proposal1 = await governanceHub.getProposal(expectedProposalId1);
            expect(proposal1.governor).to.equal(estateToken.address);
            expect(proposal1.tokenId).to.equal(paramsInput1.estateId);
            expect(proposal1.proposer).to.equal(estateLiquidator.address);
            expect(proposal1.uuid).to.equal(paramsInput1.uuid);
            expect(proposal1.rule).to.equal(ProposalRule.ApprovalBeyondQuorum);
            expect(proposal1.quorum).to.equal(Constant.ESTATE_LIQUIDATOR_UNANIMOUS_QUORUM_RATE);
            expect(proposal1.due).to.equal(Constant.ESTATE_LIQUIDATOR_VOTING_DURATION);
            expect(proposal1.timePivot).to.equal(paramsInput1.admissionExpiry);

            expect(await ethers.provider.getBalance(manager.address)).to.equal(
                initManagerNativeBalance.sub(paramsInput1.value.add(governanceFee)).sub(gasFee1)
            );
            expect(await ethers.provider.getBalance(estateLiquidator.address)).to.equal(
                initEstateLiquidatorNativeBalance.add(paramsInput1.value)
            );
            expect(await ethers.provider.getBalance(governanceHub.address)).to.equal(
                initGovernanceHubNativeBalance.add(governanceFee)
            );

            // Tx2: Request extraction with native token after unanimous guard due, with excess native token
            // Also by moderator
            const paramsInput2 = {
                estateId: BigNumber.from(1),
                buyer: operator2.address,
                value: ethers.utils.parseEther('20'),
                currency: ethers.constants.AddressZero,
                feeRate: ethers.utils.parseEther('0.2'),
                uuid: ethers.utils.formatBytes32String('uuid_2'),
                admissionExpiry: timestamp + 1e9,
            };

            timestamp =
                (await estateToken.getEstate(paramsInput2.estateId)).tokenizeAt +
                Constant.ESTATE_LIQUIDATOR_UNANIMOUS_GUARD_DURATION;
            await time.setNextBlockTimestamp(timestamp);

            const expectedRequestId2 = (await estateLiquidator.requestNumber()).add(1);
            const expectedProposalId2 = (await governanceHub.proposalNumber()).add(1);

            let initModeratorNativeBalance = await ethers.provider.getBalance(moderator.address);
            initEstateLiquidatorNativeBalance = await ethers.provider.getBalance(estateLiquidator.address);
            initGovernanceHubNativeBalance = await ethers.provider.getBalance(governanceHub.address);

            const tx2 = await getEstateLiquidatorTxByInput_RequestExtraction(
                estateLiquidator as any,
                estateToken as any,
                governanceHub as any,
                validator,
                paramsInput2,
                moderator,
                timestamp,
                {
                    value: paramsInput2.value.add(governanceFee).add(ethers.utils.parseEther('1')),
                }
            );
            const receipt2 = await tx2.wait();
            const gasFee2 = receipt2.gasUsed.mul(receipt2.effectiveGasPrice);

            const event2 = receipt2.events!.find((e) => e.event === 'NewRequest')!;
            expect(event2.args!.requestId).to.equal(expectedRequestId2);
            expect(event2.args!.estateId).to.equal(paramsInput2.estateId);
            expect(event2.args!.proposalId).to.equal(expectedProposalId2);
            expect(event2.args!.buyer).to.equal(operator2.address);
            expect(event2.args!.value).to.equal(paramsInput2.value);
            expect(event2.args!.currency).to.equal(paramsInput2.currency);
            expect(structToObject(event2.args!.feeRate)).to.deep.equal({
                value: paramsInput2.feeRate,
                decimals: Constant.COMMON_RATE_DECIMALS,
            });

            expect(await estateLiquidator.requestNumber()).to.equal(expectedRequestId2);

            const request2 = await estateLiquidator.getRequest(expectedRequestId2);
            expect(request2.estateId).to.equal(paramsInput2.estateId);
            expect(request2.proposalId).to.equal(expectedProposalId2);
            expect(request2.value).to.equal(paramsInput2.value);
            expect(request2.currency).to.equal(paramsInput2.currency);
            expect(structToObject(request2.feeRate)).to.deep.equal({
                value: paramsInput2.feeRate,
                decimals: Constant.COMMON_RATE_DECIMALS,
            });
            expect(request2.buyer).to.equal(operator2.address);

            const proposal2 = await governanceHub.getProposal(expectedProposalId2);
            expect(proposal2.governor).to.equal(estateToken.address);
            expect(proposal2.tokenId).to.equal(paramsInput2.estateId);
            expect(proposal2.proposer).to.equal(estateLiquidator.address);
            expect(proposal2.uuid).to.equal(paramsInput2.uuid);
            expect(proposal2.rule).to.equal(ProposalRule.ApprovalBeyondQuorum);
            expect(proposal2.quorum).to.equal(Constant.ESTATE_LIQUIDATOR_MAJORITY_QUORUM_RATE);
            expect(proposal2.due).to.equal(Constant.ESTATE_LIQUIDATOR_VOTING_DURATION);
            expect(proposal2.timePivot).to.equal(paramsInput2.admissionExpiry);

            expect(await ethers.provider.getBalance(moderator.address)).to.equal(
                initModeratorNativeBalance.sub(paramsInput2.value.add(governanceFee)).sub(gasFee2)
            );
            expect(await ethers.provider.getBalance(estateLiquidator.address)).to.equal(
                initEstateLiquidatorNativeBalance.add(paramsInput2.value)
            );
            expect(await ethers.provider.getBalance(governanceHub.address)).to.equal(
                initGovernanceHubNativeBalance.add(governanceFee)
            );

            // Tx3: Request extraction with erc20 token after unanimous guard due, with just enough erc20 token
            const currency = currencies[0];
            const paramsInput3 = {
                estateId: BigNumber.from(2),
                buyer: operator2.address,
                value: ethers.utils.parseEther('30'),
                currency: currency.address,
                feeRate: ethers.utils.parseEther('0.3'),
                uuid: ethers.utils.formatBytes32String('uuid_3'),
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

            const tx3 = await getEstateLiquidatorTxByInput_RequestExtraction(
                estateLiquidator as any,
                estateToken as any,
                governanceHub as any,
                validator,
                paramsInput3,
                manager,
                timestamp,
                { value: paramsInput3.value.add(governanceFee) }
            );
            const receipt3 = await tx3.wait();
            const gasFee3 = receipt3.gasUsed.mul(receipt3.effectiveGasPrice);

            const event3 = receipt3.events!.find((e) => e.event === 'NewRequest')!;
            expect(event3.args!.requestId).to.equal(expectedRequestId3);
            expect(event3.args!.estateId).to.equal(paramsInput3.estateId);
            expect(event3.args!.proposalId).to.equal(expectedProposalId3);
            expect(event3.args!.buyer).to.equal(operator2.address);
            expect(event3.args!.value).to.equal(paramsInput3.value);
            expect(event3.args!.currency).to.equal(paramsInput3.currency);
            expect(structToObject(event3.args!.feeRate)).to.deep.equal({
                value: paramsInput3.feeRate,
                decimals: Constant.COMMON_RATE_DECIMALS,
            });

            expect(await estateLiquidator.requestNumber()).to.equal(expectedRequestId3);

            const request3 = await estateLiquidator.getRequest(expectedRequestId3);
            expect(request3.estateId).to.equal(paramsInput3.estateId);
            expect(request3.proposalId).to.equal(expectedProposalId3);
            expect(request3.value).to.equal(paramsInput3.value);
            expect(request3.currency).to.equal(paramsInput3.currency);
            expect(structToObject(request3.feeRate)).to.deep.equal({
                value: paramsInput3.feeRate,
                decimals: Constant.COMMON_RATE_DECIMALS,
            });
            expect(request3.buyer).to.equal(operator2.address);

            const proposal3 = await governanceHub.getProposal(expectedProposalId3);
            expect(proposal3.governor).to.equal(estateToken.address);
            expect(proposal3.tokenId).to.equal(paramsInput3.estateId);
            expect(proposal3.proposer).to.equal(estateLiquidator.address);
            expect(proposal3.uuid).to.equal(paramsInput3.uuid);
            expect(proposal3.rule).to.equal(ProposalRule.ApprovalBeyondQuorum);
            expect(proposal3.quorum).to.equal(Constant.ESTATE_LIQUIDATOR_MAJORITY_QUORUM_RATE);
            expect(proposal3.due).to.equal(Constant.ESTATE_LIQUIDATOR_VOTING_DURATION);
            expect(proposal3.timePivot).to.equal(paramsInput3.admissionExpiry);

            expect(await currency.balanceOf(manager.address)).to.equal(
                initManagerCurrencyBalance.sub(paramsInput3.value)
            );
            expect(await currency.balanceOf(estateLiquidator.address)).to.equal(
                initEstateLiquidatorCurrencyBalance.add(paramsInput3.value)
            );
            expect(await currency.balanceOf(governanceHub.address)).to.equal(initGovernanceHubCurrencyBalance);

            expect(await ethers.provider.getBalance(manager.address)).to.equal(
                initManagerNativeBalance.sub(governanceFee).sub(gasFee3)
            );
            expect(await ethers.provider.getBalance(estateLiquidator.address)).to.equal(
                initEstateLiquidatorNativeBalance
            );
            expect(await ethers.provider.getBalance(governanceHub.address)).to.equal(
                initGovernanceHubNativeBalance.add(governanceFee)
            );

            // Tx4: Request extraction with erc20 token after unanimous guard due, with just enough erc20 token
            const paramsInput4 = {
                estateId: BigNumber.from(2),
                buyer: operator1.address,
                value: ethers.utils.parseEther('40'),
                currency: currency.address,
                feeRate: ethers.utils.parseEther('0.4'),
                uuid: ethers.utils.formatBytes32String('uuid_4'),
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

            const tx4 = await getEstateLiquidatorTxByInput_RequestExtraction(
                estateLiquidator as any,
                estateToken as any,
                governanceHub as any,
                validator,
                paramsInput4,
                manager,
                timestamp,
                { value: governanceFee.add(ethers.utils.parseEther('1')) }
            );
            const receipt4 = await tx4.wait();
            const gasFee4 = receipt4.gasUsed.mul(receipt4.effectiveGasPrice);

            const event4 = receipt4.events!.find((e) => e.event === 'NewRequest')!;
            expect(event4.args!.requestId).to.equal(expectedRequestId4);
            expect(event4.args!.estateId).to.equal(paramsInput4.estateId);
            expect(event4.args!.proposalId).to.equal(expectedProposalId4);
            expect(event4.args!.buyer).to.equal(operator1.address);
            expect(event4.args!.value).to.equal(paramsInput4.value);
            expect(event4.args!.currency).to.equal(paramsInput4.currency);
            expect(structToObject(event4.args!.feeRate)).to.deep.equal({
                value: paramsInput4.feeRate,
                decimals: Constant.COMMON_RATE_DECIMALS,
            });

            expect(await estateLiquidator.requestNumber()).to.equal(expectedRequestId4);

            const request4 = await estateLiquidator.getRequest(expectedRequestId4);
            expect(request4.estateId).to.equal(paramsInput4.estateId);
            expect(request4.proposalId).to.equal(expectedProposalId4);
            expect(request4.value).to.equal(paramsInput4.value);
            expect(request4.currency).to.equal(paramsInput4.currency);
            expect(structToObject(request4.feeRate)).to.deep.equal({
                value: paramsInput4.feeRate,
                decimals: Constant.COMMON_RATE_DECIMALS,
            });
            expect(request4.buyer).to.equal(operator1.address);

            const proposal4 = await governanceHub.getProposal(expectedProposalId4);
            expect(proposal4.governor).to.equal(estateToken.address);
            expect(proposal4.tokenId).to.equal(paramsInput4.estateId);
            expect(proposal4.proposer).to.equal(estateLiquidator.address);
            expect(proposal4.uuid).to.equal(paramsInput4.uuid);
            expect(proposal4.rule).to.equal(ProposalRule.ApprovalBeyondQuorum);
            expect(proposal4.quorum).to.equal(Constant.ESTATE_LIQUIDATOR_MAJORITY_QUORUM_RATE);
            expect(proposal4.due).to.equal(Constant.ESTATE_LIQUIDATOR_VOTING_DURATION);
            expect(proposal4.timePivot).to.equal(paramsInput4.admissionExpiry);

            expect(await currency.balanceOf(manager.address)).to.equal(
                initManagerCurrencyBalance.sub(paramsInput4.value)
            );
            expect(await currency.balanceOf(estateLiquidator.address)).to.equal(
                initEstateLiquidatorCurrencyBalance.add(paramsInput4.value)
            );
            expect(await currency.balanceOf(governanceHub.address)).to.equal(initGovernanceHubCurrencyBalance);

            expect(await ethers.provider.getBalance(manager.address)).to.equal(
                initManagerNativeBalance.sub(governanceFee).sub(gasFee4)
            );
            expect(await ethers.provider.getBalance(estateLiquidator.address)).to.equal(
                initEstateLiquidatorNativeBalance
            );
            expect(await ethers.provider.getBalance(governanceHub.address)).to.equal(
                initGovernanceHubNativeBalance.add(governanceFee)
            );
        });

        it('2.3.3.2. Request extraction unsuccessfully when paused', async () => {
            const fixture = await beforeEstateLiquidatorTest({
                pause: true,
            });
            const { governanceHub, manager, estateLiquidator, estateToken, validator } = fixture;

            const { defaultParamsInput } = await beforeRequestExtractionTest(fixture);
            const fee = await governanceHub.fee();

            let timestamp = (await time.latest()) + 10;

            await time.setNextBlockTimestamp(timestamp);
            await expect(
                getEstateLiquidatorTxByInput_RequestExtraction(
                    estateLiquidator as any,
                    estateToken as any,
                    governanceHub as any,
                    validator,
                    defaultParamsInput,
                    manager,
                    timestamp,
                    { value: defaultParamsInput.value.add(fee) }
                )
            ).to.be.revertedWith('Pausable: paused');
        });

        it('2.3.3.3. Request extraction unsuccessfully when the contract is reentered', async () => {
            const fixture = await beforeEstateLiquidatorTest({
                useReentrancyERC20: true,
            });

            const { estateLiquidator, reentrancyERC20, estateToken, governanceHub, validator, manager } = fixture;

            const { defaultParamsInput } = await beforeRequestExtractionTest(fixture);
            const params = {
                ...defaultParamsInput,
                currency: reentrancyERC20.address,
            };

            const fee = await governanceHub.fee();

            await testReentrancy_estateLiquidator(fixture, manager, reentrancyERC20, async (timestamp: number) => {
                await time.setNextBlockTimestamp(timestamp);
                await expect(
                    getEstateLiquidatorTxByInput_RequestExtraction(
                        estateLiquidator as any,
                        estateToken as any,
                        governanceHub as any,
                        validator,
                        params,
                        manager,
                        timestamp,
                        { value: params.value.add(fee) }
                    )
                ).to.be.revertedWith('ReentrancyGuard: reentrant call');
            });
        });

        it('2.3.3.4. Request extraction unsuccessfully by non-executive', async () => {
            const fixture = await beforeEstateLiquidatorTest();

            const { estateLiquidator, user, estateToken, governanceHub, validator } = fixture;

            const { defaultParamsInput } = await beforeRequestExtractionTest(fixture);

            const fee = await governanceHub.fee();

            // By user
            let timestamp = (await time.latest()) + 10;

            await time.setNextBlockTimestamp(timestamp);
            await expect(
                getEstateLiquidatorTxByInput_RequestExtraction(
                    estateLiquidator as any,
                    estateToken as any,
                    governanceHub as any,
                    validator,
                    defaultParamsInput,
                    user,
                    timestamp,
                    { value: defaultParamsInput.value.add(fee) }
                )
            ).to.be.revertedWithCustomError(estateLiquidator, 'Unauthorized');
        });

        it('2.3.3.5. Request extraction unsuccessfully by inactive manager in zone', async () => {
            const fixture = await beforeEstateLiquidatorTest();

            const { deployer, admin, admins, zone1, estateLiquidator, manager, estateToken, governanceHub, validator } =
                fixture;

            const { defaultParamsInput } = await beforeRequestExtractionTest(fixture);

            await callTransaction(
                getAdminTxByInput_ActivateIn(
                    admin,
                    deployer,
                    {
                        zone: zone1,
                        accounts: [manager.address],
                        isActive: false,
                    },
                    admins
                )
            );

            const fee = await governanceHub.fee();

            let timestamp = (await time.latest()) + 10;

            await time.setNextBlockTimestamp(timestamp);
            await expect(
                getEstateLiquidatorTxByInput_RequestExtraction(
                    estateLiquidator as any,
                    estateToken as any,
                    governanceHub as any,
                    validator,
                    defaultParamsInput,
                    manager,
                    timestamp,
                    { value: defaultParamsInput.value.add(fee) }
                )
            ).to.be.revertedWithCustomError(estateLiquidator, 'Unauthorized');
        });

        it('2.3.3.6. Request extraction unsuccessfully with invalid validation', async () => {
            const fixture = await beforeEstateLiquidatorTest();

            const { estateLiquidator, manager, estateToken, governanceHub, validator } = fixture;

            const { defaultParamsInput } = await beforeRequestExtractionTest(fixture);

            const timestamp = (await time.latest()) + 10;
            await time.setNextBlockTimestamp(timestamp);

            const fee = await governanceHub.fee();

            const params: RequestExtractionParams = {
                ...defaultParamsInput,
                validation: await getRequestExtractionValidation(
                    estateLiquidator,
                    estateToken as any,
                    governanceHub as any,
                    defaultParamsInput,
                    validator,
                    timestamp,
                    false
                ),
            };

            await time.setNextBlockTimestamp(timestamp);
            await expect(
                getEstateLiquidatorTx_RequestExtraction(estateLiquidator, manager, params, {
                    value: defaultParamsInput.value.add(fee),
                })
            ).to.be.revertedWithCustomError(governanceHub, 'InvalidSignature');
        });

        it('2.3.3.7. Request extraction unsuccessfully with expired estate', async () => {
            const fixture = await beforeEstateLiquidatorTest();

            const { estateToken, governanceHub, estateLiquidator, manager, validator } = fixture;

            const { defaultParamsInput } = await beforeRequestExtractionTest(fixture);

            const fee = await governanceHub.fee();

            let expireAt = (await estateToken.getEstate(defaultParamsInput.estateId)).expireAt;

            await time.setNextBlockTimestamp(expireAt);
            expect(
                getEstateLiquidatorTxByInput_RequestExtraction(
                    estateLiquidator as any,
                    estateToken as any,
                    governanceHub as any,
                    validator,
                    defaultParamsInput,
                    manager,
                    expireAt,
                    { value: defaultParamsInput.value.add(fee) }
                )
            ).to.be.revertedWithCustomError(estateLiquidator, 'UnavailableEstate');

            expireAt += 10;

            await time.setNextBlockTimestamp(expireAt);
            expect(
                getEstateLiquidatorTxByInput_RequestExtraction(
                    estateLiquidator as any,
                    estateToken as any,
                    governanceHub as any,
                    validator,
                    defaultParamsInput,
                    manager,
                    expireAt,
                    { value: defaultParamsInput.value.add(fee) }
                )
            ).to.be.revertedWithCustomError(estateLiquidator, 'UnavailableEstate');
        });

        it('2.3.3.8. Request extraction unsuccessfully with deprecated estate', async () => {
            const fixture = await beforeEstateLiquidatorTest();

            const { estateToken, manager, governanceHub, estateLiquidator, validator } = fixture;

            const { defaultParamsInput } = await beforeRequestExtractionTest(fixture);

            const fee = await governanceHub.fee();

            await callTransaction(
                getEstateTokenTxByParams_SafeDeprecateEstate(estateToken as any, manager, {
                    estateId: defaultParamsInput.estateId,
                    note: 'deprecate',
                })
            );

            let timestamp = (await time.latest()) + 10;

            await time.setNextBlockTimestamp(timestamp);
            expect(
                getEstateLiquidatorTxByInput_RequestExtraction(
                    estateLiquidator as any,
                    estateToken as any,
                    governanceHub as any,
                    validator,
                    defaultParamsInput,
                    manager,
                    timestamp,
                    { value: defaultParamsInput.value.add(fee) }
                )
            ).to.be.revertedWithCustomError(estateLiquidator, 'UnavailableEstate');
        });

        it('2.3.3.9. Request extraction unsuccessfully with unavailable currency', async () => {
            const fixture = await beforeEstateLiquidatorTest();

            const { manager, validator, governanceHub, estateLiquidator, estateToken } = fixture;

            const { defaultParamsInput } = await beforeRequestExtractionTest(fixture);

            const fee = await governanceHub.fee();

            let timestamp = (await time.latest()) + 10;

            const invalidCurrency = randomWallet();

            await time.setNextBlockTimestamp(timestamp);
            expect(
                getEstateLiquidatorTxByInput_RequestExtraction(
                    estateLiquidator as any,
                    estateToken as any,
                    governanceHub as any,
                    validator,
                    {
                        ...defaultParamsInput,
                        currency: invalidCurrency.address,
                    },
                    manager,
                    timestamp,
                    { value: fee }
                )
            ).to.be.revertedWithCustomError(estateLiquidator, 'InvalidCurrency');
        });

        it('2.3.3.10. Request extraction unsuccessfully with insufficient native token', async () => {
            const fixture = await beforeEstateLiquidatorTest();

            const { manager, validator, estateToken, governanceHub, estateLiquidator } = fixture;

            const { defaultParamsInput } = await beforeRequestExtractionTest(fixture);

            let timestamp = (await time.latest()) + 10;

            await time.setNextBlockTimestamp(timestamp);
            expect(
                getEstateLiquidatorTxByInput_RequestExtraction(
                    estateLiquidator as any,
                    estateToken as any,
                    governanceHub as any,
                    validator,
                    defaultParamsInput,
                    manager,
                    timestamp
                )
            ).to.be.revertedWithCustomError(estateLiquidator, 'InsufficientValue');
        });

        it('2.3.3.11. Request extraction unsuccessfully with insufficient erc20 allowance', async () => {
            const fixture = await beforeEstateLiquidatorTest({
                skipPrepareERC20ForManager: true,
            });

            const { operator1, manager, validator, currencies, governanceHub, estateToken, estateLiquidator } = fixture;

            const { defaultParamsInput } = await beforeRequestExtractionTest(fixture);

            const fee = await governanceHub.fee();

            const currency = currencies[0];
            await currency.mint(operator1.address, ethers.utils.parseEther('1000000000'));

            let timestamp = (await time.latest()) + 10;

            await time.setNextBlockTimestamp(timestamp);
            expect(
                getEstateLiquidatorTxByInput_RequestExtraction(
                    estateLiquidator as any,
                    estateToken as any,
                    governanceHub as any,
                    validator,
                    { ...defaultParamsInput, currency: currencies[0].address },
                    manager,
                    timestamp,
                    { value: fee }
                )
            ).to.be.revertedWith('ERC20: insufficient allowance');
        });

        it('2.3.3.12. Request extraction unsuccessfully with insufficient erc20 balance', async () => {
            const fixture = await beforeEstateLiquidatorTest({
                skipPrepareERC20ForManager: true,
            });

            const { manager, validator, currencies, governanceHub, estateToken, estateLiquidator } = fixture;

            const { defaultParamsInput } = await beforeRequestExtractionTest(fixture);

            const fee = await governanceHub.fee();

            const currency = currencies[0];
            await currency.connect(manager).approve(estateLiquidator.address, ethers.constants.MaxUint256);

            let timestamp = (await time.latest()) + 10;

            await time.setNextBlockTimestamp(timestamp);
            expect(
                getEstateLiquidatorTxByInput_RequestExtraction(
                    estateLiquidator as any,
                    estateToken as any,
                    governanceHub as any,
                    validator,
                    { ...defaultParamsInput, currency: currencies[0].address },
                    manager,
                    timestamp,
                    { value: fee }
                )
            ).to.be.revertedWith('ERC20: transfer amount exceeds balance');
        });

        it('2.3.3.13. Request extraction unsuccessfully when the estate is not available', async () => {
            const fixture = await beforeEstateLiquidatorTest();

            const { manager, validator, governanceHub, estateLiquidator, estateToken } = fixture;

            const { defaultParamsInput } = await beforeRequestExtractionTest(fixture);

            const fee = await governanceHub.fee();

            await callTransaction(
                getEstateTokenTxByParams_SafeDeprecateEstate(estateToken as any, manager, {
                    estateId: defaultParamsInput.estateId,
                    note: 'deprecate',
                })
            );

            let timestamp = (await time.latest()) + 100;

            await time.setNextBlockTimestamp(timestamp);
            expect(
                getEstateLiquidatorTxByInput_RequestExtraction(
                    estateLiquidator as any,
                    estateToken as any,
                    governanceHub as any,
                    validator,
                    { ...defaultParamsInput, estateId: BigNumber.from(1) },
                    manager,
                    timestamp,
                    { value: defaultParamsInput.value.add(fee) }
                )
            ).to.be.revertedWithCustomError(estateLiquidator, 'UnavailableEstate');
        });

        it('2.3.3.14. Request extraction unsuccessfully when estate token is not authorized as governor', async () => {
            const fixture = await beforeEstateLiquidatorTest({
                skipAuthorizeGovernors: true,
            });

            const { manager, validator, governanceHub, estateToken, estateLiquidator } = fixture;

            const { defaultParamsInput } = await beforeRequestExtractionTest(fixture);

            const fee = await governanceHub.fee();

            let timestamp = (await time.latest()) + 10;

            await time.setNextBlockTimestamp(timestamp);
            await expect(
                getEstateLiquidatorTxByInput_RequestExtraction(
                    estateLiquidator as any,
                    estateToken as any,
                    governanceHub as any,
                    validator,
                    defaultParamsInput,
                    manager,
                    timestamp,
                    { value: defaultParamsInput.value.add(fee) }
                )
            ).to.be.revertedWithCustomError(estateLiquidator, 'Unauthorized');
        });
    });

    describe('2.3.4. conclude(uint256)', async () => {
        it('2.3.4.1. Conclude successfully with successfully executed proposal', async () => {
            const fixture = await beforeEstateLiquidatorTest({
                listSampleExtractionRequests: true,
            });

            const {
                admin,
                operator1,
                operator2,
                governanceHub,
                estateLiquidator,
                commissionToken,
                estateToken,
                feeReceiver,
                dividendHub,
                currencies,
                broker1,
                broker2,
            } = fixture;

            let timestamp = (await time.latest()) + 10;
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

            const feeAmount1 = await applyDiscount(admin, scaleRate(value1, feeRate1), null);
            const commissionAmount1 = (await commissionToken.commissionInfo(estateId1, feeAmount1))[1];

            const tx1 = await getEstateLiquidatorTx_Conclude(estateLiquidator, operator1, {
                requestId: BigNumber.from(requestId1),
            });
            const receipt1 = await tx1.wait();
            const gasFee1 = receipt1.gasUsed.mul(receipt1.effectiveGasPrice);

            await expect(tx1).to.emit(estateToken, 'EstateExtraction').withArgs(estateId1, requestId1);
            await expect(tx1)
                .to.emit(estateLiquidator, 'CommissionDispatch')
                .withArgs(broker1.address, commissionAmount1, ethers.constants.AddressZero);
            await expect(tx1).to.emit(estateLiquidator, 'RequestApproval').withArgs(requestId1, feeAmount1);
            await expect(tx1)
                .to.emit(dividendHub, 'NewDividend')
                .withArgs(
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

            const feeAmount2 = await applyDiscount(admin, scaleRate(value2, feeRate2), currency);
            const commissionAmount2 = (await commissionToken.commissionInfo(2, feeAmount2))[1];

            const tx2 = await getEstateLiquidatorTx_Conclude(estateLiquidator, operator2, {
                requestId: BigNumber.from(requestId2),
            });
            const receipt2 = await tx2.wait();
            const gasFee2 = receipt2.gasUsed.mul(receipt2.effectiveGasPrice);

            await expect(tx2).to.emit(estateToken, 'EstateExtraction').withArgs(estateId2, requestId2);
            await expect(tx2)
                .to.emit(estateLiquidator, 'CommissionDispatch')
                .withArgs(broker2.address, commissionAmount2, currency.address);
            await expect(tx2).to.emit(estateLiquidator, 'RequestApproval').withArgs(requestId2, feeAmount2);
            await expect(tx2)
                .to.emit(dividendHub, 'NewDividend')
                .withArgs(
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
            expect(await ethers.provider.getBalance(dividendHub.address)).to.equal(dividendHubInitNativeBalance);
            expect(await ethers.provider.getBalance(broker2.address)).to.equal(broker2InitNativeBalance);
            expect(await ethers.provider.getBalance(feeReceiver.address)).to.equal(feeReceiverInitNativeBalance);

            expect(await currency.balanceOf(operator2.address)).to.equal(operator2InitERC20Balance);
            expect(await currency.balanceOf(estateLiquidator.address)).to.equal(
                estateLiquidatorInitERC20Balance.sub(value2)
            );
            expect(await currency.balanceOf(dividendHub.address)).to.equal(
                dividendHubInitERC20Balance.add(value2.sub(feeAmount2))
            );
            expect(await currency.balanceOf(broker2.address)).to.equal(broker2InitERC20Balance.add(commissionAmount2));
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

        it('2.3.4.2. Conclude successfully with successfully executed proposal with ERC20 exclusive token', async () => {
            const fixture = await beforeEstateLiquidatorTest();

            const {
                admin,
                operator2,
                governanceHub,
                estateLiquidator,
                commissionToken,
                estateToken,
                broker2,
                feeReceiver,
                dividendHub,
                currencies,
                validator,
                manager,
            } = fixture;

            const currency = currencies[1];
            const fee = await governanceHub.fee();

            let timestamp = (await time.latest()) + 100;
            await time.setNextBlockTimestamp(timestamp);

            const paramsInput: RequestExtractionParamsInput = {
                estateId: BigNumber.from(2),
                buyer: operator2.address,
                feeRate: ethers.utils.parseEther('0.1'),
                value: ethers.utils.parseEther('200'),
                currency: currency.address,
                uuid: ethers.utils.formatBytes32String('uuid_2'),
                admissionExpiry: timestamp + 1e9,
            };

            await callTransaction(
                getEstateLiquidatorTxByInput_RequestExtraction(
                    estateLiquidator as any,
                    estateToken as any,
                    governanceHub as any,
                    validator,
                    paramsInput,
                    manager,
                    timestamp,
                    { value: fee }
                )
            );

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
                scale(value, paramsInput.feeRate, Constant.COMMON_RATE_DECIMALS),
                currency
            );
            const commissionAmount = (await commissionToken.commissionInfo(2, feeAmount))[1];

            const tx = await getEstateLiquidatorTx_Conclude(estateLiquidator, operator2, {
                requestId: BigNumber.from(requestId),
            });
            const receipt = await tx.wait();
            const gasFee = receipt.gasUsed.mul(receipt.effectiveGasPrice);

            await expect(tx).to.emit(estateToken, 'EstateExtraction').withArgs(estateId, requestId);
            await expect(tx).to.emit(estateLiquidator, 'RequestApproval').withArgs(requestId, feeAmount);
            await expect(tx)
                .to.emit(estateLiquidator, 'CommissionDispatch')
                .withArgs(broker2.address, commissionAmount, currency.address);
            await expect(tx)
                .to.emit(dividendHub, 'NewDividend')
                .withArgs(
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
            expect(await ethers.provider.getBalance(dividendHub.address)).to.equal(dividendHubInitNativeBalance);
            expect(await ethers.provider.getBalance(broker2.address)).to.equal(broker2InitNativeBalance);
            expect(await ethers.provider.getBalance(feeReceiver.address)).to.equal(feeReceiverInitNativeBalance);

            expect(await currency.balanceOf(operator2.address)).to.equal(operator2InitERC20Balance);
            expect(await currency.balanceOf(estateLiquidator.address)).to.equal(
                estateLiquidatorInitERC20Balance.sub(value)
            );
            expect(await currency.balanceOf(dividendHub.address)).to.equal(
                dividendHubInitERC20Balance.add(value.sub(feeAmount))
            );
            expect(await currency.balanceOf(broker2.address)).to.equal(broker2InitERC20Balance.add(commissionAmount));
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

        async function testDisapprovalRequest(fixture: EstateLiquidatorFixture, disapproveState: ProposalState) {
            const { estateLiquidator, governanceHub, operator1, operator2, currencies } = fixture;

            // Tx1: Native token
            governanceHub.getProposalState.whenCalledWith(1).returns(disapproveState);

            const requestId1 = 1;
            let operator1InitNativeBalance = await ethers.provider.getBalance(operator1.address);
            let estateLiquidatorInitNativeBalance = await ethers.provider.getBalance(estateLiquidator.address);

            const tx1 = await getEstateLiquidatorTx_Conclude(estateLiquidator, operator1, {
                requestId: BigNumber.from(requestId1),
            });
            const receipt1 = await tx1.wait();
            const gasFee1 = receipt1.gasUsed.mul(receipt1.effectiveGasPrice);

            await expect(tx1).to.emit(estateLiquidator, 'RequestDisapproval').withArgs(requestId1);

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

            const tx2 = await getEstateLiquidatorTx_Conclude(estateLiquidator, operator2, {
                requestId: BigNumber.from(requestId2),
            });
            const receipt2 = await tx2.wait();
            const gasFee2 = receipt2.gasUsed.mul(receipt2.effectiveGasPrice);

            await expect(tx2).to.emit(estateLiquidator, 'RequestDisapproval').withArgs(requestId2);

            const value2 = (await estateLiquidator.getRequest(requestId2)).value;

            expect(await ethers.provider.getBalance(operator2.address)).to.equal(
                operator2InitNativeBalance.sub(gasFee2)
            );
            expect(await ethers.provider.getBalance(estateLiquidator.address)).to.equal(
                estateLiquidatorInitNativeBalance2
            );

            expect(await currency.balanceOf(operator2.address)).to.equal(operator2InitERC20Balance.add(value2));
            expect(await currency.balanceOf(estateLiquidator.address)).to.equal(
                estateLiquidatorInitERC20Balance.sub(value2)
            );

            const request2 = await estateLiquidator.getRequest(requestId2);
            expect(request2.estateId).to.equal(BigNumber.from(0));

            governanceHub.getProposalState.reset();
        }

        it('2.3.4.3. Conclude successfully with disqualified proposal', async () => {
            const fixture = await beforeEstateLiquidatorTest({
                listSampleExtractionRequests: true,
            });

            await testDisapprovalRequest(fixture, ProposalState.Disqualified);
        });

        it('2.3.4.4. Conclude successfully with rejected proposal', async () => {
            const fixture = await beforeEstateLiquidatorTest({
                listSampleExtractionRequests: true,
            });

            await testDisapprovalRequest(fixture, ProposalState.Rejected);
        });

        it('2.3.4.5. Conclude successfully with unsuccessful executed proposal', async () => {
            const fixture = await beforeEstateLiquidatorTest({
                listSampleExtractionRequests: true,
            });

            await testDisapprovalRequest(fixture, ProposalState.UnsuccessfulExecuted);
        });

        it('2.3.4.6. Conclude unsuccessfully when paused', async () => {
            const fixture = await beforeEstateLiquidatorTest({
                listSampleExtractionRequests: true,
                pause: true,
            });

            const { estateLiquidator, operator1, governanceHub } = fixture;
            governanceHub.getProposalState.whenCalledWith(1).returns(ProposalState.SuccessfulExecuted);

            await expect(
                getEstateLiquidatorTx_Conclude(estateLiquidator, operator1, {
                    requestId: BigNumber.from(1),
                })
            ).to.be.revertedWith('Pausable: paused');

            governanceHub.getProposalState.reset();
        });

        it('2.3.4.7. Conclude unsuccessfully when the contract is reentered', async () => {
            const fixture = await beforeEstateLiquidatorTest({
                listSampleExtractionRequests: true,
                useReentrancyERC20: true,
            });

            const { estateLiquidator, operator1, governanceHub, reentrancyERC20 } = fixture;

            governanceHub.getProposalState.whenCalledWith(2).returns(ProposalState.SuccessfulExecuted);

            await testReentrancy_estateLiquidator(fixture, operator1, reentrancyERC20, async (timestamp: number) => {
                await expect(
                    getEstateLiquidatorTx_Conclude(estateLiquidator, operator1, {
                        requestId: BigNumber.from(2),
                    })
                ).to.be.revertedWith('ReentrancyGuard: reentrant call');
            });

            governanceHub.getProposalState.reset();
        });

        it('2.3.4.8. Conclude unsuccessfully with invalid request id', async () => {
            const fixture = await beforeEstateLiquidatorTest();

            const { estateLiquidator, operator1 } = fixture;

            await expect(
                getEstateLiquidatorTx_Conclude(estateLiquidator, operator1, {
                    requestId: BigNumber.from(0),
                })
            ).to.be.revertedWithCustomError(estateLiquidator, 'InvalidRequestId');

            await expect(
                getEstateLiquidatorTx_Conclude(estateLiquidator, operator1, {
                    requestId: BigNumber.from(100),
                })
            ).to.be.revertedWithCustomError(estateLiquidator, 'InvalidRequestId');
        });

        it('2.3.4.9. Conclude unsuccessfully with already disapproved request', async () => {
            const fixture = await beforeEstateLiquidatorTest({
                listSampleExtractionRequests: true,
            });

            const { estateLiquidator, operator1, governanceHub } = fixture;

            governanceHub.getProposalState.whenCalledWith(1).returns(ProposalState.UnsuccessfulExecuted);

            await callTransaction(
                getEstateLiquidatorTx_Conclude(estateLiquidator, operator1, {
                    requestId: BigNumber.from(1),
                })
            );

            await expect(
                getEstateLiquidatorTx_Conclude(estateLiquidator, operator1, {
                    requestId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(estateLiquidator, 'AlreadyCancelled');

            governanceHub.getProposalState.reset();
        });

        it('2.3.4.10. Conclude unsuccessfully with already approved request', async () => {
            const fixture = await beforeEstateLiquidatorTest({
                listSampleExtractionRequests: true,
            });

            const { estateLiquidator, operator1, governanceHub } = fixture;

            governanceHub.getProposalState.whenCalledWith(1).returns(ProposalState.SuccessfulExecuted);

            await callTransaction(
                getEstateLiquidatorTx_Conclude(estateLiquidator, operator1, {
                    requestId: BigNumber.from(1),
                })
            );

            await expect(
                getEstateLiquidatorTx_Conclude(estateLiquidator, operator1, {
                    requestId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(estateLiquidator, 'UnavailableEstate');

            governanceHub.getProposalState.reset();
        });

        it('2.3.4.11. Conclude unsuccessfully with deprecated estate', async () => {
            const fixture = await beforeEstateLiquidatorTest({
                listSampleExtractionRequests: true,
            });

            const { estateLiquidator, operator1, governanceHub, estateToken, manager } = fixture;

            governanceHub.getProposalState.whenCalledWith(1).returns(ProposalState.SuccessfulExecuted);

            await callTransaction(
                getEstateTokenTxByParams_SafeDeprecateEstate(estateToken as any, manager, {
                    estateId: BigNumber.from(1),
                    note: 'test deprecate 1',
                })
            );

            await expect(
                getEstateLiquidatorTx_Conclude(estateLiquidator, operator1, {
                    requestId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(estateLiquidator, 'UnavailableEstate');

            governanceHub.getProposalState.reset();
        });

        it('2.3.4.12. Conclude unsuccessfully with expired estate', async () => {
            const fixture = await beforeEstateLiquidatorTest({
                listSampleExtractionRequests: true,
            });

            const { estateLiquidator, operator1, estateToken, governanceHub } = fixture;

            governanceHub.getProposalState.whenCalledWith(1).returns(ProposalState.SuccessfulExecuted);

            const expireAt = (await estateToken.getEstate(1)).expireAt;
            await time.setNextBlockTimestamp(expireAt);

            await expect(
                getEstateLiquidatorTx_Conclude(estateLiquidator, operator1, {
                    requestId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(estateLiquidator, 'UnavailableEstate');

            governanceHub.getProposalState.reset();
        });

        it('2.3.4.13. Conclude unsuccessfully when liquidator is not authorized as extractor', async () => {
            const fixture = await beforeEstateLiquidatorTest({
                listSampleExtractionRequests: true,
            });

            const { deployer, admins, operator1, admin, governanceHub, estateToken, estateLiquidator } = fixture;

            await callTransaction(
                getEstateTokenTxByInput_AuthorizeExtractors(
                    estateToken as any,
                    deployer,
                    {
                        accounts: [estateLiquidator.address],
                        isExtractor: false,
                    },
                    admin,
                    admins
                )
            );

            governanceHub.getProposalState.whenCalledWith(1).returns(ProposalState.SuccessfulExecuted);

            await expect(
                getEstateLiquidatorTx_Conclude(estateLiquidator, operator1, {
                    requestId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(estateToken, 'Unauthorized');

            governanceHub.getProposalState.reset();
        });

        it('2.3.4.14. Conclude unsuccessfully when estate token is not authorized as governor', async () => {
            const fixture = await beforeEstateLiquidatorTest({
                listSampleExtractionRequests: true,
            });

            const { deployer, admin, admins, estateToken, estateLiquidator, governanceHub, operator1, dividendHub } =
                fixture;

            await callTransaction(
                getAdminTxByInput_AuthorizeGovernors(
                    admin,
                    deployer,
                    {
                        accounts: [estateToken.address],
                        isGovernor: false,
                    },
                    admins
                )
            );

            governanceHub.getProposalState.whenCalledWith(1).returns(ProposalState.SuccessfulExecuted);

            await expect(
                getEstateLiquidatorTx_Conclude(estateLiquidator, operator1, {
                    requestId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(dividendHub, 'Unauthorized');

            governanceHub.getProposalState.reset();
        });

        it('2.3.4.15. Conclude unsuccessfully with pending proposal', async () => {
            const fixture = await beforeEstateLiquidatorTest({
                listSampleExtractionRequests: true,
            });

            const { estateLiquidator, operator1 } = fixture;

            await expect(
                getEstateLiquidatorTx_Conclude(estateLiquidator, operator1, {
                    requestId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(estateLiquidator, 'InvalidConclusion');
        });

        it('2.3.4.16. Conclude unsuccessfully with voting proposal', async () => {
            const fixture = await beforeEstateLiquidatorTest({
                listSampleExtractionRequests: true,
            });

            const { estateLiquidator, operator1, governanceHub } = fixture;

            governanceHub.getProposalState.whenCalledWith(1).returns(ProposalState.Voting);

            await expect(
                getEstateLiquidatorTx_Conclude(estateLiquidator, operator1, {
                    requestId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(estateLiquidator, 'InvalidConclusion');

            governanceHub.getProposalState.reset();
        });

        it('2.3.4.17. Conclude unsuccessfully with executing proposal', async () => {
            const fixture = await beforeEstateLiquidatorTest({
                listSampleExtractionRequests: true,
            });

            const { estateLiquidator, operator1, governanceHub } = fixture;

            governanceHub.getProposalState.whenCalledWith(1).returns(ProposalState.Executing);

            await expect(
                getEstateLiquidatorTx_Conclude(estateLiquidator, operator1, {
                    requestId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(estateLiquidator, 'InvalidConclusion');

            governanceHub.getProposalState.reset();
        });
    });
});
