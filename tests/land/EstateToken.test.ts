import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import {
    Admin,
    CommissionToken,
    Currency,
    EstateToken,
    FeeReceiver,
    IERC165Upgradeable__factory,
    MockEstateToken,
    MockEstateForger__factory,
    ReserveVault,
    IERC2981Upgradeable__factory,
    IRoyaltyRateProposer__factory,
    ICommon__factory,
    IERC1155Upgradeable__factory,
    IERC1155MetadataURIUpgradeable__factory,
    PriceWatcher,
    IGovernor__factory,
    GovernanceHub,
    DividendHub,
    MockEstateLiquidator,
    MockEstateForger,
    MockEstateLiquidator__factory,
} from '@typechain-types';
import { callTransaction, callTransactionAtTimestamp, getSignatures, randomWallet } from '@utils/blockchain';
import { Constant } from '@tests/test.constant';
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployFeeReceiver } from '@utils/deployments/common/feeReceiver';
import { deployCurrency } from '@utils/deployments/common/currency';
import { deployMockEstateToken } from '@utils/deployments/mock/mockEstateToken';
import { deployCommissionToken } from '@utils/deployments/land/commissionToken';
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

import { MockContract, smock } from '@defi-wonderland/smock';

import { BigNumber } from 'ethers';
import { randomInt } from 'crypto';
import { getBytes4Hex, getInterfaceID, randomBigNumber, structToObject } from '@utils/utils';
import { OrderedMap } from '@utils/utils';
import { Initialization as LandInitialization } from '@tests/land/test.initialization';
import { deployReserveVault } from '@utils/deployments/common/reserveVault';
import { deployPriceWatcher } from '@utils/deployments/common/priceWatcher';
import { deployGovernanceHub } from '@utils/deployments/common/governanceHub';
import { deployDividendHub } from '@utils/deployments/common/dividendHub';
import { MockValidator } from '@utils/mockValidator';
import { RegisterCustodianParams, TokenizeEstateParams, SafeUpdateEstateURIParams, SafeUpdateEstateCustodianParams, UpdateEstateURIParams, DeprecateEstateParams, SafeDeprecateEstateParams, ExtendEstateExpirationParams, SafeExtendEstateExpirationParams, UpdateEstateCustodianParams, UpdateCommissionTokenParamsInput, UpdateCommissionTokenParams, UpdateBaseURIParamsInput, UpdateBaseURIParams, AuthorizeTokenizersParamsInput, AuthorizeTokenizersParams, AuthorizeExtractorsParamsInput, AuthorizeExtractorsParams, UpdateZoneRoyaltyRateParamsInput, UpdateZoneRoyaltyRateParams, RegisterCustodianParamsInput, UpdateEstateURIParamsInput } from '@utils/models/land/estateToken';
import { getRegisterCustodianValidation, getUpdateEstateURIValidation } from '@utils/validation/land/estateToken';
import { getEstateTokenTx_AuthorizeExtractors, getEstateTokenTxByInput_AuthorizeExtractors, getEstateTokenTx_AuthorizeTokenizers, getEstateTokenTxByInput_AuthorizeTokenizers, getCallEstateTokenTx_ExtractEstate, getCallEstateTokenTx_TokenizeEstate, getEstateTokenTx_RegisterCustodian, getEstateTokenTxByInput_RegisterCustodian, getEstateTokenTx_SafeDeprecateEstate, getEstateTokenTxByParams_SafeDeprecateEstate, getEstateTokenTx_SafeExtendEstateExpiration, getEstateTokenTxByParams_SafeExtendEstateExpiration, getEstateTokenTx_SafeUpdateEstateCustodian, getEstateTokenTxByParams_SafeUpdateEstateCustodian, getEstateTokenTx_SafeUpdateEstateURI, getEstateTokenTxByInput_SafeUpdateEstateURI, getEstateTokenTxByInput_UpdateBaseURI, getEstateTokenTx_UpdateCommissionToken, getEstateTokenTxByInput_UpdateCommissionToken, getEstateTokenTx_UpdateZoneRoyaltyRate, getEstateTokenTxByInput_UpdateZoneRoyaltyRate } from '@utils/transaction/land/estateToken';
import { ContractTransaction } from 'ethers';
import { getCommissionTokenTx_RegisterBroker, getCommissionTokenTx_UpdateBaseURI } from '@utils/transaction/land/commissionToken';
import { Initialization as CommonInitialization } from '@tests/common/test.initialization';
import { getAdminTxByInput_ActivateIn, getAdminTxByInput_AuthorizeManagers, getAdminTxByInput_AuthorizeModerators, getAdminTxByInput_DeclareZone } from '@utils/transaction/common/admin';
import { getPausableTxByInput_Pause } from '@utils/transaction/common/pausable';
import { getAuthorizeExtractorsSignatures, getAuthorizeTokenizersSignatures, getUpdateBaseURISignatures, getUpdateCommissionTokenSignatures, getUpdateZoneRoyaltyRateSignatures } from '@utils/signatures/land/estateToken';
import { getSafeUpdateEstateURIAnchor } from '@utils/anchor/land/estateToken';

interface EstateTokenFixture {
    deployer: any;
    admins: any[];
    manager: any;
    moderator: any;
    user: any;
    broker1: any, broker2: any;
    depositor1: any, depositor2: any, depositor3: any;
    depositors: any[];
    custodian1: any, custodian2: any, custodian3: any;
    custodians: any[];
    
    validator: MockValidator;
    
    admin: Admin;
    currency: Currency;
    feeReceiver: FeeReceiver;
    priceWatcher: PriceWatcher;
    reserveVault: ReserveVault;
    estateToken: MockEstateToken;
    commissionToken: CommissionToken;
    governanceHub: GovernanceHub;
    dividendHub: DividendHub;
    estateLiquidator: MockContract<MockEstateLiquidator>;
    estateForger: MockContract<MockEstateForger>;
    
    tokenizers: any[];
    extractors: any[];
    zone1: string, zone2: string;
}

describe('2.4. EstateToken', async () => {
    afterEach(async () => {
        await ethers.provider.send("evm_setAutomine", [true]);
    });

    async function estateTokenFixture(): Promise<EstateTokenFixture> {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        const admins = [];
        for (let i = 1; i <= Constant.ADMIN_NUMBER; ++i) admins.push(accounts[i]);
        const user = accounts[Constant.ADMIN_NUMBER + 2];
        const manager = accounts[Constant.ADMIN_NUMBER + 3];
        const moderator = accounts[Constant.ADMIN_NUMBER + 4];
        const broker1 = accounts[Constant.ADMIN_NUMBER + 5];
        const broker2 = accounts[Constant.ADMIN_NUMBER + 6];
        const depositor1 = accounts[Constant.ADMIN_NUMBER + 7];
        const depositor2 = accounts[Constant.ADMIN_NUMBER + 8];
        const depositor3 = accounts[Constant.ADMIN_NUMBER + 9];
        const depositors = [depositor1, depositor2, depositor3];
        const custodian1 = accounts[Constant.ADMIN_NUMBER + 10];
        const custodian2 = accounts[Constant.ADMIN_NUMBER + 11];
        const custodian3 = accounts[Constant.ADMIN_NUMBER + 12];
        const custodians = [custodian1, custodian2, custodian3];

        const validator = new MockValidator(deployer as any);

        const adminAddresses: string[] = admins.map(signer => signer.address);
        const admin = await deployAdmin(
            deployer.address,
            adminAddresses[0],
            adminAddresses[1],
            adminAddresses[2],
            adminAddresses[3],
            adminAddresses[4],
        ) as Admin;

        const currency = await deployCurrency(
            deployer.address,
            'MockCurrency',
            'MCK'
        ) as Currency;

        const feeReceiver = await deployFeeReceiver(
            deployer.address,
            admin.address
        ) as FeeReceiver;

        const priceWatcher = await deployPriceWatcher(
            deployer.address,
            admin.address,
        ) as PriceWatcher;

        const reserveVault = await deployReserveVault(
            deployer.address,
            admin.address,
        ) as ReserveVault;

        const estateToken = await deployMockEstateToken(
            deployer.address,
            admin.address,
            feeReceiver.address,
            validator.getAddress(),
            LandInitialization.ESTATE_TOKEN_BaseURI,
        ) as MockEstateToken;        

        const commissionToken = await deployCommissionToken(
            deployer.address,
            admin.address,
            estateToken.address,
            feeReceiver.address,
            LandInitialization.COMMISSION_TOKEN_Name,
            LandInitialization.COMMISSION_TOKEN_Symbol,
            LandInitialization.COMMISSION_TOKEN_BaseURI,
            LandInitialization.COMMISSION_TOKEN_RoyaltyRate,
        ) as CommissionToken;

        const governanceHub = await deployGovernanceHub(
            deployer.address,
            admin.address,
            validator.getAddress(),
            CommonInitialization.GOVERNANCE_HUB_Fee,
        ) as GovernanceHub;

        const dividendHub = await deployDividendHub(
            deployer.address,
            admin.address,
        ) as DividendHub;

        const MockEstateForgerFactory = await smock.mock<MockEstateForger__factory>('MockEstateForger');
        let tokenizers: any[] = [];
        for (let i = 0; i < 6; ++i) {
            const mockEstateForger = await MockEstateForgerFactory.deploy();
            await callTransaction(mockEstateForger.initialize(
                admin.address,
                estateToken.address,
                commissionToken.address,
                priceWatcher.address,
                feeReceiver.address,
                reserveVault.address,
                validator.getAddress(),
                LandInitialization.ESTATE_FORGER_BaseMinUnitPrice,
                LandInitialization.ESTATE_FORGER_BaseMaxUnitPrice,
            ));
            tokenizers.push(mockEstateForger);
        }

        const estateForger = tokenizers[0];
        tokenizers = tokenizers.slice(1);

        const MockEstateLiquidatorFactory = await smock.mock<MockEstateLiquidator__factory>('MockEstateLiquidator');
        let extractors: any[] = [];
        for (let i = 0; i < 6; ++i) {
            const mockEstateLiquidator = await MockEstateLiquidatorFactory.deploy();
            await callTransaction(mockEstateLiquidator.initialize(
                admin.address,
                estateToken.address,
                commissionToken.address,
                governanceHub.address,
                dividendHub.address,
                feeReceiver.address,
                validator.getAddress(),
            ));
            extractors.push(mockEstateLiquidator);
        }
        const estateLiquidator = extractors[0];
        extractors = extractors.slice(1);

        const zone1 = ethers.utils.formatBytes32String("TestZone1");
        const zone2 = ethers.utils.formatBytes32String("TestZone2");

        return {
            deployer,
            admins,
            manager,
            moderator,
            user,
            broker1,
            broker2,
            depositor1,
            depositor2,
            depositor3,
            depositors,
            custodian1,
            custodian2,
            custodian3,
            custodians,
            validator,
            admin,
            feeReceiver,
            priceWatcher,
            currency,
            reserveVault,
            estateToken,
            commissionToken,
            governanceHub,
            dividendHub,
            estateForger,
            estateLiquidator,
            tokenizers,
            extractors,
            zone1,
            zone2,
        };
    };

    async function beforeEstateTokenTest({
        skipRegisterCustodians = false,
        skipAuthorizeEstateForger = false,
        skipUpdateCommissionToken = false,
        skipAuthorizeEstateLiquidator = false,
        skipRegisterBrokers = false,
        skipDeclareZone = false,
        addSampleEstates = false,
        pause = false,
    } = {}): Promise<EstateTokenFixture> {
        const fixture = await loadFixture(estateTokenFixture);
        const {
            deployer,
            admin,
            admins,
            manager,
            moderator,
            estateToken,
            estateForger,
            commissionToken,
            zone1,
            zone2,
            broker1,
            broker2,
            estateLiquidator,
            validator,
            custodian1,
            custodian2,
            custodians
        } = fixture;

        await callTransaction(getAdminTxByInput_AuthorizeManagers(
            admin,
            deployer,
            {
                accounts: [manager.address],
                isManager: true
            },
            admins
        ));

        await callTransaction(getAdminTxByInput_AuthorizeModerators(
            admin,
            deployer,
            {
                accounts: [moderator.address],
                isModerator: true
            },
            admins
        ));

        if (!skipDeclareZone) {
            for (const zone of [zone1, zone2]) {
                await callTransaction(getAdminTxByInput_DeclareZone(
                    admin,
                    deployer,
                    { zone },
                    admins
                ));
            }

            for (const zone of [zone1, zone2]) {
                await callTransaction(getAdminTxByInput_ActivateIn(
                    admin,
                    deployer,
                    {
                        zone,
                        accounts: [manager.address, moderator.address],
                        isActive: true
                    },
                    admins
                ));
            }
        }

        if (!skipUpdateCommissionToken) {
            await callTransaction(getEstateTokenTxByInput_UpdateCommissionToken(estateToken, deployer, {commissionToken: commissionToken.address}, admin, admins));
        }

        if (!skipRegisterBrokers) {
            await callTransaction(getCommissionTokenTx_RegisterBroker(
                commissionToken,
                manager,
                {
                    zone: zone1,
                    broker: broker1.address,
                    commissionRate: ethers.utils.parseEther('0.1'),
                },
            ));
            await callTransaction(getCommissionTokenTx_RegisterBroker(
                commissionToken,
                manager,
                {
                    zone: zone2,
                    broker: broker2.address,
                    commissionRate: ethers.utils.parseEther('0.2'),
                },
            ));
        }
        
        if (!skipAuthorizeEstateForger) {
            await callTransaction(getEstateTokenTxByInput_AuthorizeTokenizers(estateToken, deployer, {
                accounts: [estateForger.address],
                isTokenizer: true
            }, admin, admins));
        }

        if (!skipAuthorizeEstateLiquidator) {
            await callTransaction(getEstateTokenTxByInput_AuthorizeExtractors(estateToken, deployer, {
                accounts: [estateLiquidator.address],
                isExtractor: true
            }, admin, admins));
        }

        if (!skipRegisterCustodians) {
            for (const [zoneIndex, zone] of [zone1, zone2].entries()) {
                for (const [custodianIndex, custodian] of custodians.entries()) {
                    await callTransaction(getEstateTokenTxByInput_RegisterCustodian(
                        estateToken,
                        deployer,
                        {
                            zone,
                            custodian: custodian.address,
                            uri: `custodian${custodianIndex+1}_zone${zoneIndex+1}_uri`,
                        },
                        validator,
                    ));
                }
            }
        }

        const baseTimestamp = await time.latest() + 1000;

        if (addSampleEstates) {
            await time.setNextBlockTimestamp(baseTimestamp);

            await estateForger.call(
                estateToken.address,
                estateToken.interface.encodeFunctionData('tokenizeEstate', [
                    10_000,
                    zone1,
                    10,
                    "Token1_URI",
                    baseTimestamp + 1e8,
                    custodian1.address,
                    broker1.address,
                ]
            ));

            await estateForger.call(
                estateToken.address,
                estateToken.interface.encodeFunctionData('tokenizeEstate', [
                    10_000,
                    zone2,
                    20,
                    "Token2_URI",
                    baseTimestamp + 2e8,
                    custodian2.address,
                    broker2.address,
                ]
            ));
        }

        if (pause) {
            await callTransaction(getPausableTxByInput_Pause(estateToken, deployer, admin, admins));
        }

        return fixture;
    }

    describe('2.4.1. initialize(address, address, string, uint256)', async () => {
        it('2.4.1.1. Deploy successfully', async () => {
            const { estateToken, admin, feeReceiver, validator } = await beforeEstateTokenTest({
                skipUpdateCommissionToken: true,
                skipRegisterCustodians: true,
                skipAuthorizeEstateForger: true,
                skipAuthorizeEstateLiquidator: true,
                skipRegisterBrokers: true,
            });

            expect(await estateToken.paused()).to.equal(false);

            expect(await estateToken.admin()).to.equal(admin.address);
            expect(await estateToken.commissionToken()).to.equal(ethers.constants.AddressZero);
            expect(await estateToken.feeReceiver()).to.equal(feeReceiver.address);
            
            expect(await estateToken.estateNumber()).to.equal(0);
            
            expect(await estateToken.validator()).to.equal(validator.getAddress());

            expect(await estateToken.decimals()).to.equal(Constant.ESTATE_TOKEN_TOKEN_DECIMALS)
        });
    });

    describe('2.4.2. updateCommissionToken(address, bytes[])', async () => {
        it('2.4.2.1. Update commission token successfully with valid signatures', async () => {
            const { deployer, estateToken, admin, admins, commissionToken } = await beforeEstateTokenTest({
                skipUpdateCommissionToken: true,
            });

            const paramsInput: UpdateCommissionTokenParamsInput = {
                commissionToken: commissionToken.address,
            };
            const tx = await getEstateTokenTxByInput_UpdateCommissionToken(estateToken, deployer, paramsInput, admin, admins);
            await tx.wait();

            expect(await estateToken.commissionToken()).to.equal(commissionToken.address);
        });

        it('2.4.2.2. Update commission token unsuccessfully with invalid signatures', async () => {
            const { deployer, estateToken, admin, admins, commissionToken } = await beforeEstateTokenTest({
                skipUpdateCommissionToken: true,
            });

            const paramsInput: UpdateCommissionTokenParamsInput = {
                commissionToken: commissionToken.address,
            };
            const params: UpdateCommissionTokenParams = {
                ...paramsInput,
                signatures: await getUpdateCommissionTokenSignatures(estateToken, paramsInput, admin, admins, false),
            };
            await expect(getEstateTokenTx_UpdateCommissionToken(estateToken, deployer, params))
                .to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('2.4.2.3. Update commission token unsuccessfully when already set', async () => {
            const { deployer, admins, admin, estateToken, commissionToken } = await beforeEstateTokenTest();

            const paramsInput: UpdateCommissionTokenParamsInput = {
                commissionToken: commissionToken.address,
            };
            await expect(getEstateTokenTxByInput_UpdateCommissionToken(estateToken, deployer, paramsInput, admin, admins))
                .to.be.revertedWithCustomError(estateToken, 'InvalidUpdating');
        });
    });

    describe('2.4.3. updateBaseURI(string, bytes[])', async () => {
        it('2.4.3.1. Update base URI successfully with valid signatures', async () => {
            const { deployer, admins, admin, estateToken } = await beforeEstateTokenTest({
                addSampleEstates: true,        
            });

            const paramsInput: UpdateBaseURIParamsInput = {
                uri: "NewBaseURI:",
            };
            const tx = await getEstateTokenTxByInput_UpdateBaseURI(estateToken, deployer, paramsInput, admin, admins);
            await tx.wait();

            await expect(tx).to
                .emit(estateToken, 'BaseURIUpdate')
                .withArgs("NewBaseURI:");

            expect(await estateToken.uri(1)).to.equal("NewBaseURI:Token1_URI");
            expect(await estateToken.uri(2)).to.equal("NewBaseURI:Token2_URI");
        });

        it('2.4.3.2. Update base URI unsuccessfully with invalid signatures', async () => {
            const { deployer, admins, admin, estateToken } = await beforeEstateTokenTest();

            const paramsInput: UpdateBaseURIParamsInput = {
                uri: "NewBaseURI:",
            };
            const params: UpdateBaseURIParams = {
                ...paramsInput,
                signatures: await getUpdateBaseURISignatures(estateToken, paramsInput, admin, admins, false),
            };
            await expect(getEstateTokenTxByInput_UpdateBaseURI(estateToken, deployer, paramsInput, admin, admins))
                .to.be.revertedWithCustomError(admin, 'FailedVerification');
        });
    });

    describe('2.4.4. authorizeTokenizers(address[], bool, bytes[])', async () => {
        it('2.4.4.1. Authorize tokenizers successfully with valid signatures', async () => {
            const { deployer, admins, admin, estateToken, tokenizers } = await beforeEstateTokenTest({
                skipAuthorizeEstateForger: true,
            });

            const toBeTokenizers = tokenizers.slice(0, 3);

            const paramsInput: AuthorizeTokenizersParamsInput = {
                accounts: toBeTokenizers.map(x => x.address),
                isTokenizer: true,
            };
            const tx = await getEstateTokenTxByInput_AuthorizeTokenizers(estateToken, deployer, paramsInput, admin, admins);
            await tx.wait();

            for (const tokenizer of toBeTokenizers) {
                await expect(tx).to
                    .emit(estateToken, 'TokenizerAuthorization')
                    .withArgs(tokenizer.address);
            }

            for (const tokenizer of tokenizers) {
                const isTokenizer = await estateToken.isTokenizer(tokenizer.address);
                if (toBeTokenizers.includes(tokenizer)) {
                    expect(isTokenizer).to.be.true;
                } else {
                    expect(isTokenizer).to.be.false;
                }
            }
        });

        it('2.4.4.2. Authorize tokenizer unsuccessfully with invalid signatures', async () => {
            const { deployer, admins, admin, estateToken, tokenizers } = await beforeEstateTokenTest({
                skipAuthorizeEstateForger: true,
            });

            const toBeTokenizers = tokenizers.slice(0, 3);

            const paramsInput: AuthorizeTokenizersParamsInput = {
                accounts: toBeTokenizers.map(x => x.address),
                isTokenizer: true,
            };
            const params: AuthorizeTokenizersParams = {
                ...paramsInput,
                signatures: await getAuthorizeTokenizersSignatures(estateToken, paramsInput, admin, admins, false),
            };
            await expect(getEstateTokenTx_AuthorizeTokenizers(estateToken, deployer, params))
                .to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('2.4.4.3. Authorize tokenizer reverted without reason with EOA', async () => {
            const { deployer, admins, admin, estateToken } = await beforeEstateTokenTest({
                skipAuthorizeEstateForger: true,
            });

            const invalidTokenizer = randomWallet();

            const paramsInput: AuthorizeTokenizersParamsInput = {
                accounts: [invalidTokenizer.address],
                isTokenizer: true,
            };
            await expect(getEstateTokenTxByInput_AuthorizeTokenizers(estateToken, deployer, paramsInput, admin, admins))
                .to.be.revertedWithCustomError(estateToken, 'InvalidTokenizer');
        });

        it('2.4.4.4. Authorize tokenizer reverted when contract does not support EstateTokenizer interface', async () => {
            const { deployer, estateToken, admin, admins } = await beforeEstateTokenTest({
                skipAuthorizeEstateForger: true,
            });

            const invalidTokenizer = estateToken;

            const paramsInput: AuthorizeTokenizersParamsInput = {
                accounts: [invalidTokenizer.address],
                isTokenizer: true,
            };
            await expect(getEstateTokenTxByInput_AuthorizeTokenizers(estateToken, deployer, paramsInput, admin, admins))
                .to.be.revertedWithCustomError(estateToken, 'InvalidTokenizer');
        });

        it('2.4.4.5. Authorize tokenizer unsuccessfully when authorizing the same account twice on the same tx', async () => {
            const { deployer, estateToken, admin, admins, tokenizers } = await beforeEstateTokenTest({
                skipAuthorizeEstateForger: true,
            });

            const duplicateTokenizers = [tokenizers[0], tokenizers[1], tokenizers[2], tokenizers[0]];

            const paramsInput: AuthorizeTokenizersParamsInput = {
                accounts: duplicateTokenizers.map(x => x.address),
                isTokenizer: true,
            };
            const params: AuthorizeTokenizersParams = {
                ...paramsInput,
                signatures: await getAuthorizeTokenizersSignatures(estateToken, paramsInput, admin, admins, true),
            };
            await expect(getEstateTokenTx_AuthorizeTokenizers(estateToken, deployer, params))
                .to.be.revertedWithCustomError(estateToken, `AuthorizedAccount`);
        });

        it('2.4.4.6. Authorize tokenizer unsuccessfully when authorizing the same account twice on different txs', async () => {
            const { deployer, admins, admin, estateToken, tokenizers } = await beforeEstateTokenTest({
                skipAuthorizeEstateForger: true,
            });

            const tx1Tokenizers = tokenizers.slice(0, 3);

            await callTransaction(getEstateTokenTxByInput_AuthorizeTokenizers(estateToken, deployer, {
                accounts: tx1Tokenizers.map(x => x.address),
                isTokenizer: true,
            }, admin, admins));

            const tx2Tokenizers = [tokenizers[3], tokenizers[2], tokenizers[4]];

            const paramsInput: AuthorizeTokenizersParamsInput = {
                accounts: tx2Tokenizers.map(x => x.address),
                isTokenizer: true,
            };
            await expect(getEstateTokenTxByInput_AuthorizeTokenizers(estateToken, deployer, paramsInput, admin, admins))
                .to.be.revertedWithCustomError(estateToken, `AuthorizedAccount`);
        });

        async function setupTokenizers(fixture: EstateTokenFixture) {
            const { deployer, admins, admin, estateToken, tokenizers } = fixture;
            await callTransaction(getEstateTokenTxByInput_AuthorizeTokenizers(estateToken, deployer, {
                accounts: tokenizers.map(x => x.address),
                isTokenizer: true,
            }, admin, admins));
        }

        it('2.4.4.7. Deauthorize tokenizer successfully', async () => {
            const fixture = await beforeEstateTokenTest({
                skipAuthorizeEstateForger: true,
            });
            const { deployer, admins, admin, estateToken, tokenizers } = fixture;
            await setupTokenizers(fixture);

            const toDeauth = tokenizers.slice(0, 2);
            const tx = await getEstateTokenTxByInput_AuthorizeTokenizers(estateToken, deployer, {
                accounts: toDeauth.map(x => x.address),
                isTokenizer: false,
            }, admin, admins);
            await tx.wait();
            
            for (const tokenizer of toDeauth) {
                await expect(tx).to
                    .emit(estateToken, 'TokenizerDeauthorization')
                    .withArgs(tokenizer.address);
            }

            for (const tokenizer of tokenizers) {
                const isTokenizer = await estateToken.isTokenizer(tokenizer.address);
                if (toDeauth.includes(tokenizer)) {
                    expect(isTokenizer).to.be.false;
                } else {
                    expect(isTokenizer).to.be.true;
                }
            }            
        });

        it('2.4.4.8. Deauthorize tokenizer unsuccessfully with unauthorized account', async () => {
            const fixture = await beforeEstateTokenTest({
                skipAuthorizeEstateForger: true,
            });
            const { deployer, admins, admin, estateToken, tokenizers } = fixture;
            await setupTokenizers(fixture);

            const account = randomWallet();
            const toDeauth = [tokenizers[0], account];

            const paramsInput: AuthorizeTokenizersParamsInput = {
                accounts: toDeauth.map(x => x.address),
                isTokenizer: false,
            };
            await expect(getEstateTokenTxByInput_AuthorizeTokenizers(estateToken, deployer, paramsInput, admin, admins))
                .to.be.revertedWithCustomError(estateToken, `NotAuthorizedAccount`);
        });

        it('2.4.4.9. Deauthorize tokenizer unsuccessfully when unauthorizing the same account twice on the same tx', async () => {
            const fixture = await beforeEstateTokenTest({
                skipAuthorizeEstateForger: true,
            });
            const { deployer, admins, admin, estateToken, tokenizers } = fixture;
            await setupTokenizers(fixture);

            const toDeauth = tokenizers.slice(0, 2).concat([tokenizers[0]]);
            const tx = await getEstateTokenTxByInput_AuthorizeTokenizers(estateToken, deployer, {
                accounts: toDeauth.map(x => x.address),
                isTokenizer: false,
            }, admin, admins);
            await tx.wait();
        });

        it('2.4.4.10. Deauthorize tokenizer unsuccessfully when unauthorizing the same account twice on different txs', async () => {
            const fixture = await beforeEstateTokenTest({
                skipAuthorizeEstateForger: true,
            });
            const { deployer, admins, admin, estateToken, tokenizers } = fixture;
            await setupTokenizers(fixture);

            const tx1Accounts = tokenizers.slice(0, 2);
            await callTransaction(getEstateTokenTxByInput_AuthorizeTokenizers(estateToken, deployer, {
                accounts: tx1Accounts.map(x => x.address),
                isTokenizer: false,
            }, admin, admins));

            const tx2Accounts = [tokenizers[0]];
            const paramsInput: AuthorizeTokenizersParamsInput = {
                accounts: tx2Accounts.map(x => x.address),
                isTokenizer: false,
            };
            await expect(getEstateTokenTxByInput_AuthorizeTokenizers(estateToken, deployer, paramsInput, admin, admins))
                .to.be.revertedWithCustomError(estateToken, `NotAuthorizedAccount`);
        });
    });

    describe('2.4.5. authorizeExtractors(address[], bool, bytes[])', async () => {
        it('2.4.5.1. Authorize extractors successfully with valid signatures', async () => {
            const fixture = await beforeEstateTokenTest({
                skipAuthorizeEstateForger: true,
            });
            const { deployer, admins, admin, estateToken, extractors } = fixture;

            const toBeExtractors = extractors.slice(0, 3);

            const paramsInput: AuthorizeExtractorsParamsInput = {
                accounts: toBeExtractors.map(x => x.address),
                isExtractor: true,
            };
            const tx = await getEstateTokenTxByInput_AuthorizeExtractors(estateToken, deployer, paramsInput, admin, admins);
            await tx.wait();

            for (const extractor of toBeExtractors) {
                await expect(tx).to
                    .emit(estateToken, 'ExtractorAuthorization')
                    .withArgs(extractor.address);
            }

            for (const extractor of extractors) {
                const isExtractor = await estateToken.isExtractor(extractor.address);
                if (toBeExtractors.includes(extractor)) {
                    expect(isExtractor).to.be.true;
                } else {
                    expect(isExtractor).to.be.false;
                }
            }
        });

        it('2.4.5.2. Authorize extractor unsuccessfully with invalid signatures', async () => {
            const fixture = await beforeEstateTokenTest({
                skipAuthorizeEstateForger: true,
            });
            const { deployer, admins, admin, estateToken, extractors } = fixture;

            const toBeExtractors = extractors.slice(0, 3);

            const paramsInput: AuthorizeExtractorsParamsInput = {
                accounts: toBeExtractors.map(x => x.address),
                isExtractor: true,
            };
            const params: AuthorizeExtractorsParams = {
                ...paramsInput,
                signatures: await getAuthorizeExtractorsSignatures(estateToken, paramsInput, admin, admins, false),
            };
            await expect(getEstateTokenTx_AuthorizeExtractors(estateToken, deployer, params))
                .to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('2.4.5.3. Authorize extractor unsuccessfully when authorizing the same account twice on the same tx', async () => {
            const fixture = await beforeEstateTokenTest({
                skipAuthorizeEstateForger: true,
            });
            const { deployer, admins, admin, estateToken, extractors } = fixture;

            const duplicateExtractors = [extractors[0], extractors[1], extractors[2], extractors[0]];

            const paramsInput: AuthorizeExtractorsParamsInput = {
                accounts: duplicateExtractors.map(x => x.address),
                isExtractor: true,
            };
            await expect(getEstateTokenTxByInput_AuthorizeExtractors(estateToken, deployer, paramsInput, admin, admins))
                .to.be.revertedWithCustomError(estateToken, `AuthorizedAccount`);
        });

        it('2.4.5.4. Authorize extractor unsuccessfully when authorizing the same account twice on different txs', async () => {
            const fixture = await beforeEstateTokenTest({
                skipAuthorizeEstateForger: true,
            });
            const { deployer, admins, admin, estateToken, extractors } = fixture;

            const tx1Extractors = extractors.slice(0, 3);
            await callTransaction(getEstateTokenTxByInput_AuthorizeExtractors(estateToken, deployer, {
                accounts: tx1Extractors.map(x => x.address),
                isExtractor: true,
            }, admin, admins));

            const tx2Extractors = [extractors[3], extractors[2], extractors[4]];

            const paramsInput: AuthorizeExtractorsParamsInput = {
                accounts: tx2Extractors.map(x => x.address),
                isExtractor: true,
            };
            await expect(getEstateTokenTxByInput_AuthorizeExtractors(estateToken, deployer, paramsInput, admin, admins))
                .to.be.revertedWithCustomError(estateToken, `AuthorizedAccount`);
        })

        async function setupExtractors(fixture: EstateTokenFixture) {
            const { deployer, admins, admin, estateToken, extractors } = fixture;
            await callTransaction(getEstateTokenTxByInput_AuthorizeExtractors(estateToken, deployer, {
                accounts: extractors.map(x => x.address),
                isExtractor: true,
            }, admin, admins));
        }

        it('2.4.5.5. Deauthorize extractor successfully', async () => {
            const fixture = await beforeEstateTokenTest({
                skipAuthorizeEstateForger: true,
            });
            const { deployer, admins, admin, estateToken, extractors } = fixture;
            await setupExtractors(fixture);

            const toDeauth = extractors.slice(0, 2);
            const tx = await getEstateTokenTxByInput_AuthorizeExtractors(estateToken, deployer, {
                accounts: toDeauth.map(x => x.address),
                isExtractor: false,
            }, admin, admins);
            await tx.wait();

            for (const extractor of toDeauth) {
                await expect(tx).to
                    .emit(estateToken, 'ExtractorDeauthorization')
                    .withArgs(extractor.address);
            }

            for (const extractor of extractors) {
                const isExtractor = await estateToken.isExtractor(extractor.address);
                if (toDeauth.includes(extractor)) {
                    expect(isExtractor).to.be.false;
                } else {
                    expect(isExtractor).to.be.true;
                }
            }            
        });

        it('2.4.5.6. Deauthorize extractor unsuccessfully with unauthorized account', async () => {
            const fixture = await beforeEstateTokenTest({
                skipAuthorizeEstateForger: true,
            });
            const { deployer, admins, admin, estateToken, extractors } = fixture;
            await setupExtractors(fixture);

            const account = randomWallet();
            const toDeauth = [extractors[0], account];

            const paramsInput: AuthorizeExtractorsParamsInput = {
                accounts: toDeauth.map(x => x.address),
                isExtractor: false,
            };
            await expect(getEstateTokenTxByInput_AuthorizeExtractors(estateToken, deployer, paramsInput, admin, admins))
                .to.be.revertedWithCustomError(estateToken, `NotAuthorizedAccount`);
        });

        it('2.4.5.7. Deauthorize extractor unsuccessfully when unauthorizing the same account twice on the same tx', async () => {
            const fixture = await beforeEstateTokenTest({
                skipAuthorizeEstateForger: true,
            });
            const { deployer, admins, admin, estateToken, extractors } = fixture;
            await setupExtractors(fixture);

            const toDeauth = extractors.slice(0, 2).concat([extractors[0]]);
            const paramsInput: AuthorizeExtractorsParamsInput = {
                accounts: toDeauth.map(x => x.address),
                isExtractor: false,
            };
            await expect(getEstateTokenTxByInput_AuthorizeExtractors(estateToken, deployer, paramsInput, admin, admins))
                .to.be.revertedWithCustomError(estateToken, `NotAuthorizedAccount`);
        });

        it('2.4.5.8. Deauthorize extractor unsuccessfully when unauthorizing the same account twice on different txs', async () => {
            const fixture = await beforeEstateTokenTest({
                skipAuthorizeEstateForger: true,
            });
            const { deployer, estateToken, admin, admins, extractors } = fixture;
            await setupExtractors(fixture);

            const tx1Accounts = extractors.slice(0, 2);
            await callTransaction(getEstateTokenTxByInput_AuthorizeExtractors(estateToken, deployer, {
                accounts: tx1Accounts.map(x => x.address),
                isExtractor: true,
            }, admin, admins));

            const tx2Accounts = [extractors[0]];
            const paramsInput: AuthorizeExtractorsParamsInput = {
                accounts: tx2Accounts.map(x => x.address),
                isExtractor: false,
            };
            await expect(getEstateTokenTxByInput_AuthorizeExtractors(estateToken, deployer, paramsInput, admin, admins))
                .to.be.revertedWithCustomError(estateToken, `NotAuthorizedAccount`);
        });
    });
    
    describe('2.4.6. updateZoneRoyaltyRate(uint256, bytes[])', async () => {
        it('2.4.6.1. Update zone royalty rate successfully with valid signatures', async () => {
            const fixture = await beforeEstateTokenTest();
            const { deployer, admins, admin, estateToken, zone1, zone2 } = fixture;

            const rate1 = ethers.utils.parseEther('0.2');
            const paramsInput1: UpdateZoneRoyaltyRateParamsInput = {
                zone: zone1,
                royaltyRate: rate1,
            };
            const tx1 = await getEstateTokenTxByInput_UpdateZoneRoyaltyRate(estateToken, deployer, paramsInput1, admin, admins);
            await tx1.wait();

            await expect(tx1).to.emit(estateToken, 'ZoneRoyaltyRateUpdate').withArgs(
                zone1, 
                (rate: any) => {
                    expect(structToObject(rate)).to.deep.equal({
                        value: rate1,
                        decimals: Constant.COMMON_RATE_DECIMALS,
                    });
                    return true;
                }
            );

            expect(structToObject(await estateToken.getZoneRoyaltyRate(zone1))).to.deep.equal({
                value: rate1,
                decimals: Constant.COMMON_RATE_DECIMALS,
            });

            const rate2 = ethers.utils.parseEther('0.3');
            const paramsInput2: UpdateZoneRoyaltyRateParamsInput = {
                zone: zone2,
                royaltyRate: rate2,
            };
            const tx2 = await getEstateTokenTxByInput_UpdateZoneRoyaltyRate(estateToken, deployer, paramsInput2, admin, admins);
            await tx2.wait();

            await expect(tx2).to.emit(estateToken, 'ZoneRoyaltyRateUpdate').withArgs(
                zone2, 
                (rate: any) => {
                    expect(structToObject(rate)).to.deep.equal({
                        value: rate2,
                        decimals: Constant.COMMON_RATE_DECIMALS,
                    });
                    return true;
                }
            );

            expect(structToObject(await estateToken.getZoneRoyaltyRate(zone2))).to.deep.equal({
                value: rate2,
                decimals: Constant.COMMON_RATE_DECIMALS,
            });
        });

        it('2.4.6.2. Update zone royalty rate unsuccessfully with invalid signatures', async () => {
            const fixture = await beforeEstateTokenTest();
            const { deployer, estateToken, admin, admins, zone1 } = fixture;

            const paramsInput: UpdateZoneRoyaltyRateParamsInput = {
                zone: zone1,
                royaltyRate: ethers.utils.parseEther('0.2'),
            };
            const params: UpdateZoneRoyaltyRateParams = {
                ...paramsInput,
                signatures: await getUpdateZoneRoyaltyRateSignatures(estateToken, paramsInput, admin, admins, false),
            };
            await expect(getEstateTokenTx_UpdateZoneRoyaltyRate(estateToken, deployer, params))
                .to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('2.4.6.3. Update zone royalty rate unsuccessfully with invalid rate', async () => {
            const fixture = await beforeEstateTokenTest();
            const { deployer, estateToken, admin, admins, zone1 } = fixture;

            const paramsInput: UpdateZoneRoyaltyRateParamsInput = {
                zone: zone1,
                royaltyRate: Constant.COMMON_RATE_MAX_FRACTION.add(1),
            };
            await expect(getEstateTokenTxByInput_UpdateZoneRoyaltyRate(estateToken, deployer, paramsInput, admin, admins))
                .to.be.revertedWithCustomError(estateToken, 'InvalidRate');
        });

        it('2.4.6.4. Update zone royalty rate unsuccessfully with invalid zone', async () => {
            const fixture = await beforeEstateTokenTest();
            const { deployer, estateToken, admin, admins } = fixture;

            const paramsInput: UpdateZoneRoyaltyRateParamsInput = {
                zone: ethers.utils.formatBytes32String('invalid zone'),
                royaltyRate: ethers.utils.parseEther('0.2'),
            };
            await expect(getEstateTokenTxByInput_UpdateZoneRoyaltyRate(estateToken, deployer, paramsInput, admin, admins))
                .to.be.revertedWithCustomError(estateToken, 'InvalidZone');
        });
    });

    describe('2.4.7. getEstate(uint256)', () => {
        it('2.4.7.1. Succeed with existing estate id', async () => {
            const { estateToken } = await beforeEstateTokenTest({
                addSampleEstates: true,                
            });

            await estateToken.getEstate(1);
            await estateToken.getEstate(2);
        });

        it('2.4.7.2. Revert with non-existing estate id', async () => {
            const { estateToken } = await beforeEstateTokenTest({
                addSampleEstates: true,
            });

            await expect(estateToken.getEstate(0))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");

            await expect(estateToken.getEstate(3))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");

            await expect(estateToken.getEstate(100))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");
        });
    });

    describe('2.4.8. isAvailable(uint256)', () => {
        it('2.4.8.1. Return true for existing, not deprecated, and not expired estate', async () => {
            const { estateToken } = await beforeEstateTokenTest({
                addSampleEstates: true,
            });

            expect(await estateToken.isAvailable(1)).to.equal(true);
            expect(await estateToken.isAvailable(2)).to.equal(true);
        });

        it('2.4.8.2. Return false for non-existing estate', async () => {
            const { estateToken } = await beforeEstateTokenTest({
                addSampleEstates: true,
            });

            expect(await estateToken.isAvailable(0)).to.equal(false);
            expect(await estateToken.isAvailable(3)).to.equal(false);
            expect(await estateToken.isAvailable(100)).to.equal(false);
        });

        it('2.4.8.3. Return false for deprecated estate', async () => {
            const { estateToken, manager } = await beforeEstateTokenTest({
                addSampleEstates: true,
            });

            const params1: DeprecateEstateParams = {
                estateId: BigNumber.from(1),
                note: 'test deprecate 1',
            };
            await callTransaction(getEstateTokenTxByParams_SafeDeprecateEstate(estateToken, manager, params1));
            
            expect(await estateToken.isAvailable(1)).to.equal(false);
            expect(await estateToken.isAvailable(2)).to.equal(true);

            const params2: DeprecateEstateParams = {
                estateId: BigNumber.from(2),
                note: 'test deprecate 2',
            };
            await callTransaction(getEstateTokenTxByParams_SafeDeprecateEstate(estateToken, manager, params2));

            expect(await estateToken.isAvailable(1)).to.equal(false);
            expect(await estateToken.isAvailable(2)).to.equal(false);
        });

        it('2.4.8.4. Return false for expired estate', async () => {
            const { estateToken } = await beforeEstateTokenTest({
                addSampleEstates: true,
            });

            const expireAt1 = await estateToken.getEstate(1).then(e => e.expireAt);
            const expireAt2 = await estateToken.getEstate(2).then(e => e.expireAt);

            expect(await estateToken.isAvailable(1)).to.equal(true);
            expect(await estateToken.isAvailable(2)).to.equal(true);

            await time.increaseTo(expireAt1);
            expect(await estateToken.isAvailable(1)).to.equal(false);
            expect(await estateToken.isAvailable(2)).to.equal(true);

            await time.increaseTo(expireAt2);
            expect(await estateToken.isAvailable(1)).to.equal(false);
            expect(await estateToken.isAvailable(2)).to.equal(false);
        });
    });

    describe('2.4.16. zoneOf(uint256)', () => {
        it('2.4.16.1. Return correct zone with available estate', async () => {
            const fixture = await beforeEstateTokenTest({
                addSampleEstates: true,
            });
            const { estateToken, zone1, zone2 } = fixture;

            expect(await estateToken.zoneOf(1)).to.equal(zone1);
            expect(await estateToken.zoneOf(2)).to.equal(zone2);
        });

        it('2.4.16.2. Revert with invalid estate id', async () => {
            const fixture = await beforeEstateTokenTest();

            const { estateToken } = fixture;

            await expect(estateToken.zoneOf(0))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");
            await expect(estateToken.zoneOf(100))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");
        });
    });

    describe('2.4.17. balanceOf(address, uint256)', () => {
        it('2.4.17.1. Return correct estate token balance for available estate', async () => {
            const { estateToken, depositor1, depositor2 } = await beforeEstateTokenTest({
                addSampleEstates: true,
            });

            await callTransaction(estateToken.mint(depositor1.address, 1, 10_000));
            await callTransaction(estateToken.mint(depositor2.address, 2, 500));

            expect(await estateToken.balanceOf(depositor1.address, 1)).to.equal(10_000);
            expect(await estateToken.balanceOf(depositor2.address, 2)).to.equal(500);
        });

        it('2.4.17.2. Return 0 for invalid estate id', async () => {
            const { estateToken, depositor1 } = await beforeEstateTokenTest({
                addSampleEstates: true,
            });

            expect(await estateToken.balanceOf(depositor1.address, 0)).to.equal(0);
            expect(await estateToken.balanceOf(depositor1.address, 3)).to.equal(0);
            expect(await estateToken.balanceOf(depositor1.address, 100)).to.equal(0);
        });
    });

    describe('2.4.18. balanceOfAt(address, uint256, uint40)', () => {
        it('2.4.18.1. Return correct estate token balance for available estate', async () => {
            const { estateToken, depositor1, depositor2, depositor3 } = await beforeEstateTokenTest({
                addSampleEstates: true,
            });

            const baseTimestamp = await time.latest() + 1000;

            await time.setNextBlockTimestamp(baseTimestamp + 40);
            await callTransaction(estateToken.mint(depositor1.address, 1, 10_000));
            await time.setNextBlockTimestamp(baseTimestamp + 50);
            await callTransaction(estateToken.mint(depositor2.address, 1, 20_000));
            await time.setNextBlockTimestamp(baseTimestamp + 60);
            await callTransaction(estateToken.mint(depositor3.address, 1, 30_000));

            await time.setNextBlockTimestamp(baseTimestamp + 70);
            await callTransaction(estateToken.mint(depositor1.address, 2, 100));
            await time.setNextBlockTimestamp(baseTimestamp + 80);
            await callTransaction(estateToken.mint(depositor2.address, 2, 200));
            await time.setNextBlockTimestamp(baseTimestamp + 90);
            await callTransaction(estateToken.mint(depositor3.address, 2, 300));

            expect(await estateToken.balanceOfAt(depositor1.address, 1, baseTimestamp + 40)).to.equal(10_000);
            expect(await estateToken.balanceOfAt(depositor2.address, 1, baseTimestamp + 50)).to.equal(20_000);
            expect(await estateToken.balanceOfAt(depositor3.address, 1, baseTimestamp + 60)).to.equal(30_000);
            expect(await estateToken.balanceOfAt(depositor1.address, 2, baseTimestamp + 70)).to.equal(100);
            expect(await estateToken.balanceOfAt(depositor2.address, 2, baseTimestamp + 80)).to.equal(200);
            expect(await estateToken.balanceOfAt(depositor3.address, 2, baseTimestamp + 90)).to.equal(300);

            await time.setNextBlockTimestamp(baseTimestamp + 100);
            await callTransaction(estateToken.connect(depositor1).safeTransferFrom(
                depositor1.address, depositor2.address, 1, 3_000, ethers.utils.formatBytes32String("")
            ));

            await time.setNextBlockTimestamp(baseTimestamp + 110);
            await callTransaction(estateToken.connect(depositor2).safeTransferFrom(
                depositor2.address, depositor3.address, 1, 8_000, ethers.utils.formatBytes32String("")
            ));

            await time.setNextBlockTimestamp(baseTimestamp + 120);
            await callTransaction(estateToken.connect(depositor3).safeTransferFrom(
                depositor3.address, depositor1.address, 1, 30_000, ethers.utils.formatBytes32String("")
            ));

            expect(await estateToken.balanceOfAt(depositor1.address, 1, baseTimestamp + 99)).to.equal(10_000);
            expect(await estateToken.balanceOfAt(depositor1.address, 1, baseTimestamp + 100)).to.equal(7_000);
            expect(await estateToken.balanceOfAt(depositor1.address, 1, baseTimestamp + 119)).to.equal(7_000);
            expect(await estateToken.balanceOfAt(depositor1.address, 1, baseTimestamp + 120)).to.equal(37_000);

            expect(await estateToken.balanceOfAt(depositor2.address, 1, baseTimestamp + 99)).to.equal(20_000);
            expect(await estateToken.balanceOfAt(depositor2.address, 1, baseTimestamp + 100)).to.equal(23_000);
            expect(await estateToken.balanceOfAt(depositor2.address, 1, baseTimestamp + 109)).to.equal(23_000);
            expect(await estateToken.balanceOfAt(depositor2.address, 1, baseTimestamp + 110)).to.equal(15_000);

            expect(await estateToken.balanceOfAt(depositor3.address, 1, baseTimestamp + 109)).to.equal(30_000);
            expect(await estateToken.balanceOfAt(depositor3.address, 1, baseTimestamp + 110)).to.equal(38_000);
            expect(await estateToken.balanceOfAt(depositor3.address, 1, baseTimestamp + 119)).to.equal(38_000);
            expect(await estateToken.balanceOfAt(depositor3.address, 1, baseTimestamp + 120)).to.equal(8_000);
        });

        it('2.4.18.2. Return 0 when user has not withdrawn from tokenizer', async () => {
            const { estateToken, depositor1, estateForger } = await beforeEstateTokenTest({
                addSampleEstates: true,
            });
            const baseTimestamp = await time.latest() + 1000;
            await time.increaseTo(baseTimestamp);

            estateForger.allocationOfAt.returns(123);

            expect(await estateToken.balanceOfAt(estateToken.address, 1, baseTimestamp)).to.equal(0);

            await time.setNextBlockTimestamp(baseTimestamp + 20);
            await callTransaction(estateToken.mint(depositor1.address, 1, 30_000));

            expect(await estateToken.balanceOfAt(estateToken.address, 1, baseTimestamp + 20)).to.equal(0);
        });

        it('2.4.18.3. Return correct estate token balance in random tests', async () => {
            const { estateToken, depositors, estateForger } = await beforeEstateTokenTest({
                addSampleEstates: true,
            });

            const baseTimestamp = await time.latest() + 1000;
            let currentTimestamp = baseTimestamp + 10;
            
            estateForger.allocationOfAt.returns(1234);
            
            await ethers.provider.send("evm_setAutomine", [false]);

            const estateId = 1;

            const snapshots = [];
            for (let i = 0; i < 3; ++i) {
                snapshots.push(new OrderedMap<number, BigNumber>(ethers.BigNumber.from(0)));
            }

            await time.setNextBlockTimestamp(currentTimestamp);

            const txs = [];
            const amounts = [];
            for (let i = 0; i < 3; ++i) {
                const amount = ethers.BigNumber.from(randomInt(10_000, 30_000));
                const tx = await estateToken.mint(depositors[i].address, estateId, amount);
                txs.push(tx);
                amounts.push(amount);
            }
            await ethers.provider.send("evm_mine", []);

            const receipts = await Promise.all(txs.map(tx => tx.wait()));
            for (const [i, receipt] of receipts.entries()) {
                const timestamp = (await ethers.provider.getBlock(receipt.blockNumber!)).timestamp;
                snapshots[i].set(timestamp, snapshots[i].get(timestamp).add(amounts[i]));
            }

            for (let iter = 0; iter < 20; ++iter) {
                const initBalances: BigNumber[] = [];
                for (let i = 0; i < 3; ++i) {
                    initBalances.push(await estateToken.balanceOf(depositors[i].address, estateId));
                }

                let balances = [...initBalances];
                const txCount = 10;
                const txs = [];
                const records = [];

                for (let i_tx = 0; i_tx < txCount; ++i_tx) {
                    let from = randomInt(0, 3);
                    let to = randomInt(0, 3);
                    if (from == to) { --i_tx; continue }

                    if (balances[from].eq(0)) { --i_tx; continue }

                    const amount = randomBigNumber(ethers.BigNumber.from(1), balances[from]);

                    const tx = await estateToken.connect(depositors[from]).safeTransferFrom(
                        depositors[from].address,
                        depositors[to].address,
                        estateId,
                        amount,
                        ethers.utils.formatBytes32String(""),
                        { gasLimit: 1e6 },
                    );
                    txs.push(tx);

                    balances[from] = balances[from].sub(amount);
                    balances[to] = balances[to].add(amount);
                    records.push({ from, to, amount });
                }

                await ethers.provider.send("evm_mine", []);

                const receipts = await Promise.all(txs.map(tx => tx.wait()));
                balances = [...initBalances];
                for (const [i, receipt] of receipts.entries()) {
                    const { from, to, amount } = records[i];
                    const timestamp = (await ethers.provider.getBlock(receipt.blockNumber!)).timestamp;

                    balances[from] = balances[from].sub(amount);
                    balances[to] = balances[to].add(amount);

                    snapshots[from].set(timestamp, balances[from]);
                    snapshots[to].set(timestamp, balances[to]);
                }

                const lastTimestamp = (await ethers.provider.getBlock('latest')).timestamp;
                for (let deltaT = -1; deltaT <= lastTimestamp - currentTimestamp; ++deltaT) {
                    const t = currentTimestamp + deltaT;
                    for (let i = 0; i < 3; ++i) {
                        const expectedBalance = snapshots[i].get(t);
                        const actualBalance = await estateToken.balanceOfAt(depositors[i].address, estateId, t);
                        expect(actualBalance).to.equal(expectedBalance);
                    }
                }
            }

            const lastTimestamp = (await ethers.provider.getBlock('latest')).timestamp;
            currentTimestamp = lastTimestamp;

            await ethers.provider.send("evm_setAutomine", [true]);
            estateForger.allocationOfAt.reset();
        });

        it('2.4.18.4. Revert with inexistent estate id', async () => {
            const { estateToken, depositor1 } = await beforeEstateTokenTest({
                addSampleEstates: true,
            });

            const baseTimestamp = await time.latest() + 1000;
            await time.setNextBlockTimestamp(baseTimestamp + 40);

            await callTransaction(estateToken.mint(depositor1.address, 1, 10_000));

            await expect(estateToken.balanceOfAt(depositor1.address, 0, baseTimestamp + 40))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");
        });

        it('2.4.18.5. Revert with timestamp after current block timestamp', async () => {
            const { estateToken, depositor1 } = await beforeEstateTokenTest({
                addSampleEstates: true,
            });

            await callTransaction(estateToken.mint(depositor1.address, 1, 10_000));

            const baseTimestamp = await time.latest() + 1000;
            await time.increaseTo(baseTimestamp + 40);

            expect(await estateToken.balanceOfAt(depositor1.address, 1, baseTimestamp + 39))
                .to.equal(10_000);
            expect(await estateToken.balanceOfAt(depositor1.address, 1, baseTimestamp + 40))
                .to.equal(10_000);
            await expect(estateToken.balanceOfAt(depositor1.address, 1, baseTimestamp + 41))
                .to.be.revertedWithCustomError(estateToken, "InvalidTimestamp");
        });

        it('2.4.18.6. Revert with timestamp after deprecation', async () => {
            const { estateToken, depositor1, manager } = await beforeEstateTokenTest({
                addSampleEstates: true,
            });

            await callTransaction(estateToken.mint(depositor1.address, 1, 10_000));
            
            const baseTimestamp = await time.latest() + 1000;
            
            await time.setNextBlockTimestamp(baseTimestamp);

            const params1: DeprecateEstateParams = {
                estateId: BigNumber.from(1),
                note: 'test deprecate 1',
            };
            await callTransaction(getEstateTokenTxByParams_SafeDeprecateEstate(estateToken, manager, params1));

            await time.increaseTo(baseTimestamp + 40);

            expect(await estateToken.balanceOfAt(depositor1.address, 1, baseTimestamp - 1))
                .to.equal(10_000);
            expect(await estateToken.balanceOfAt(depositor1.address, 1, baseTimestamp))
                .to.equal(10_000);
            await expect(estateToken.balanceOfAt(depositor1.address, 1, baseTimestamp + 1))
                .to.be.revertedWithCustomError(estateToken, "InvalidTimestamp");
        });

        it('2.4.18.7. Revert with timestamp after expiration', async () => {
            const { estateToken, depositor1, manager } = await beforeEstateTokenTest({
                addSampleEstates: true,
            });

            await callTransaction(estateToken.mint(depositor1.address, 1, 10_000));

            const expireAt = (await estateToken.getEstate(1)).expireAt;
            await time.increaseTo(expireAt + 100);

            expect(await estateToken.balanceOfAt(depositor1.address, 1, expireAt - 1))
                .to.equal(10_000);
            await expect(estateToken.balanceOfAt(depositor1.address, 1, expireAt))
                .to.be.revertedWithCustomError(estateToken, "InvalidTimestamp");
            await expect(estateToken.balanceOfAt(depositor1.address, 1, expireAt + 1))
                .to.be.revertedWithCustomError(estateToken, "InvalidTimestamp");
        });

        it('2.4.18.8. Return correct balance when account is estate tokenizer', async () => {
            const { estateToken, estateForger } = await beforeEstateTokenTest({
                addSampleEstates: true,
            });

            const baseTimestamp = await time.latest() + 1000;
            await time.increaseTo(baseTimestamp + 40);

            expect(await estateToken.balanceOfAt(estateForger.address, 1, baseTimestamp)).to.equal(10_000);
        });
    });

    describe('2.4.19. totalEquityAt(uint256, uint40)', () => {
        it('2.4.19.1. Return correct total vote for available estate', async () => {
            const { estateToken } = await beforeEstateTokenTest({
                addSampleEstates: true,
            });

            const baseTimestamp = await time.latest();

            expect(await estateToken.totalEquityAt(1, baseTimestamp)).to.equal(10_000);
            expect(await estateToken.totalEquityAt(2, baseTimestamp)).to.equal(10_000);            
        });

        it('2.4.19.2. Revert with inexistent estate id', async () => {
            const { estateToken, depositor1, estateForger } = await beforeEstateTokenTest({
                addSampleEstates: true,
            });
            
            const baseTimestamp = await time.latest();

            await expect(estateToken.totalEquityAt(0, baseTimestamp))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");
            await expect(estateToken.totalEquityAt(3, baseTimestamp))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");
        });

        it('2.4.19.3. Revert with timestamp after current block timestamp', async () => {
            const { estateToken, manager } = await beforeEstateTokenTest({
                addSampleEstates: true,
            });

            const baseTimestamp = await time.latest();
            await expect(estateToken.totalEquityAt(1, baseTimestamp - 1))
                .to.not.be.reverted;
            await expect(estateToken.totalEquityAt(1, baseTimestamp))
                .to.not.be.reverted;
            await expect(estateToken.totalEquityAt(1, baseTimestamp + 1))
                .to.be.revertedWithCustomError(estateToken, "InvalidTimestamp");
        });

        it('2.4.19.4. Revert with timestamp before tokenization', async () => {
            const { estateToken } = await beforeEstateTokenTest({
                addSampleEstates: true,
            });

            let timestamp = await time.latest() + 10;
            await time.increaseTo(timestamp)

            const tokenizeAt1 = (await estateToken.getEstate(1)).tokenizeAt;
            await expect(estateToken.totalEquityAt(1, tokenizeAt1 - 1))
                .to.be.revertedWithCustomError(estateToken, "InvalidTimestamp");
            await expect(estateToken.totalEquityAt(1, tokenizeAt1))
                .to.not.be.reverted;
            await expect(estateToken.totalEquityAt(1, tokenizeAt1 + 1))
                .to.not.be.reverted;

            const tokenizeAt2 = (await estateToken.getEstate(2)).tokenizeAt;
            await expect(estateToken.totalEquityAt(2, tokenizeAt2 - 1))
                .to.be.revertedWithCustomError(estateToken, "InvalidTimestamp");
            await expect(estateToken.totalEquityAt(2, tokenizeAt2))
                .to.not.be.reverted;
            await expect(estateToken.totalEquityAt(2, tokenizeAt2 + 1))
                .to.not.be.reverted;
        });

        it('2.4.19.5. Revert with timestamp after deprecation', async () => {
            const { estateToken, manager } = await beforeEstateTokenTest({
                addSampleEstates: true,
            });

            const params1: DeprecateEstateParams = {
                estateId: BigNumber.from(1),
                note: 'test deprecate 1',
            };
            let timestamp = await time.latest() + 10;
            await callTransactionAtTimestamp(
                getEstateTokenTxByParams_SafeDeprecateEstate(estateToken, manager, params1),
                timestamp,
            );

            await time.increaseTo(timestamp + 5);

            await expect(estateToken.totalEquityAt(1, timestamp - 1))
                .to.not.be.reverted;
            await expect(estateToken.totalEquityAt(1, timestamp))
                .to.not.be.reverted;
            await expect(estateToken.totalEquityAt(1, timestamp + 1))
                .to.be.revertedWithCustomError(estateToken, "InvalidTimestamp");
        
            const params2: DeprecateEstateParams = {
                estateId: BigNumber.from(2),
                note: 'test deprecate 2',
            };
            timestamp += 10;
            await callTransactionAtTimestamp(
                getEstateTokenTxByParams_SafeDeprecateEstate(estateToken, manager, params2),
                timestamp,
            );

            await time.increaseTo(timestamp + 5);

            await expect(estateToken.totalEquityAt(2, timestamp - 1))
                .to.not.be.reverted;
            await expect(estateToken.totalEquityAt(2, timestamp))
                .to.not.be.reverted;
            await expect(estateToken.totalEquityAt(2, timestamp + 1))
                .to.be.revertedWithCustomError(estateToken, "InvalidTimestamp");
        });

        it('2.4.19.6. Revert with timestamp after expiration', async () => {
            const { estateToken } = await beforeEstateTokenTest({
                addSampleEstates: true,
            });

            const expireAt1 = (await estateToken.getEstate(1)).expireAt;
            await time.increaseTo(expireAt1 + 10);
            
            await expect(estateToken.totalEquityAt(1, expireAt1 - 1))
                .to.not.be.reverted;
            await expect(estateToken.totalEquityAt(1, expireAt1))
                .to.be.revertedWithCustomError(estateToken, "InvalidTimestamp");
            await expect(estateToken.totalEquityAt(1, expireAt1 + 1))
                .to.be.revertedWithCustomError(estateToken, "InvalidTimestamp");

            const expireAt2 = (await estateToken.getEstate(2)).expireAt;
            await time.increaseTo(expireAt2 + 10);

            await expect(estateToken.totalEquityAt(2, expireAt2 - 1))
                .to.not.be.reverted;
            await expect(estateToken.totalEquityAt(2, expireAt2))
                .to.be.revertedWithCustomError(estateToken, "InvalidTimestamp");
            await expect(estateToken.totalEquityAt(2, expireAt2 + 1))
                .to.be.revertedWithCustomError(estateToken, "InvalidTimestamp");
        });

        it('2.4.19.7. Return total vote of each equityOfAt', async () => {
            // Note: this variant is only true when total supply of estate does not change
            const { estateToken, manager, depositor1, depositor2, estateForger, zone1, custodian1, broker1 } = await beforeEstateTokenTest({
                addSampleEstates: true,
            });

            estateForger.allocationOfAt.returns(0);

            // Right after estate tokenized
            const tokenizeAt1 = (await estateToken.getEstate(1)).tokenizeAt;

            expect(await estateToken.totalEquityAt(1, tokenizeAt1)).to.equal(await estateToken.balanceOfAt(estateForger.address, 1, tokenizeAt1));
            expect(await estateToken.totalEquityAt(1, tokenizeAt1 + 1)).to.equal(await estateToken.balanceOfAt(estateForger.address, 1, tokenizeAt1 + 1));

            // After minting estate 1 for depositor1
            const depositor1MintAt = tokenizeAt1 + 3;
            await callTransactionAtTimestamp(
                estateForger.call(
                    estateToken.address,
                    estateToken.interface.encodeFunctionData('safeTransferFrom', [
                        estateForger.address,
                        depositor1.address,
                        1,
                        1_000,
                        ethers.utils.formatBytes32String("")
                    ]),
                ),
                depositor1MintAt,
            );
            await time.increaseTo(depositor1MintAt + 1);

            for(let at = tokenizeAt1; at <= depositor1MintAt + 1; ++at) {
                const expectedTotalVote = await estateToken.equityOfAt(depositor1.address, 1, at);
                expect(await estateToken.totalEquityAt(1, at)).to.equal(expectedTotalVote.add(await estateToken.balanceOfAt(estateForger.address, 1, at)));
            }

            // After transferring estate 1 to depositor2
            const depositor2MintAt = depositor1MintAt + 3;
            await callTransactionAtTimestamp(
                estateForger.call(
                    estateToken.address,
                    estateToken.interface.encodeFunctionData('safeTransferFrom', [
                        estateForger.address,
                        depositor2.address,
                        1,
                        2_000,
                        ethers.utils.formatBytes32String("")
                    ]),
                ),
                depositor2MintAt,
            );
            await time.increaseTo(depositor2MintAt + 1);

            for(let at = tokenizeAt1; at <= depositor2MintAt + 1; ++at) {
                const expectedTotalVote = [
                    await estateToken.equityOfAt(depositor1.address, 1, at),
                    await estateToken.equityOfAt(depositor2.address, 1, at),
                ].reduce((a, b) => a.add(b), ethers.BigNumber.from(0));
                expect(await estateToken.totalEquityAt(1, at)).to.equal(expectedTotalVote.add(await estateToken.balanceOfAt(estateForger.address, 1, at)));
            }

            // After estate deprecated
            const deprecateAt1 = depositor2MintAt + 3;
            const params1: DeprecateEstateParams = {
                estateId: BigNumber.from(1),
                note: 'test deprecate 1',
            };
            await callTransactionAtTimestamp(
                getEstateTokenTxByParams_SafeDeprecateEstate(estateToken, manager, params1),
                deprecateAt1,
            );
            await time.increaseTo(deprecateAt1 + 1);

            for(let at = tokenizeAt1; at <= deprecateAt1; ++at) { 
                const expectedTotalVote = [
                    await estateToken.equityOfAt(depositor1.address, 1, at),
                    await estateToken.equityOfAt(depositor2.address, 1, at),
                ].reduce((a, b) => a.add(b), ethers.BigNumber.from(0));
                expect(await estateToken.totalEquityAt(1, at)).to.equal(expectedTotalVote.add(await estateToken.balanceOfAt(estateForger.address, 1, at)));
            }

            // After minting estate 3 for depositor1
            const tokenizeAt3 = deprecateAt1 + 3;
            const depositor1MintAt3 = tokenizeAt3 + 3;
            const depositor2MintAt3 = depositor1MintAt3 + 3;
            const expireAt3 = depositor2MintAt3 + 3;

            await callTransactionAtTimestamp(
                estateForger.call(estateToken.address, estateToken.interface.encodeFunctionData('tokenizeEstate', [
                    10_000,
                    zone1,
                    10,
                    "Token2_URI",
                    expireAt3,
                    custodian1.address,
                    broker1.address,
                ])),
                tokenizeAt3,
            );

            await callTransactionAtTimestamp(
                estateForger.call(
                    estateToken.address,
                    estateToken.interface.encodeFunctionData('safeTransferFrom', [
                        estateForger.address,
                        depositor1.address,
                        3,
                        1_000,
                        ethers.utils.formatBytes32String("")
                    ]),
                ),
                depositor1MintAt3,
            );
            await time.increaseTo(depositor1MintAt3 + 1);
            
            await callTransactionAtTimestamp(
                estateForger.call(
                    estateToken.address,
                    estateToken.interface.encodeFunctionData('safeTransferFrom', [
                        estateForger.address,
                        depositor2.address,
                        3,
                        2_000,
                        ethers.utils.formatBytes32String("")
                    ]),
                ),
                depositor2MintAt3,
            );
            await time.increaseTo(depositor2MintAt3 + 1);

            await time.increaseTo(expireAt3 + 1);

            for(let at = tokenizeAt3; at <= expireAt3 - 1; ++at) {
                const expectedTotalVote = [
                    await estateToken.equityOfAt(depositor1.address, 3, at),
                    await estateToken.equityOfAt(depositor2.address, 3, at),
                ].reduce((a, b) => a.add(b), ethers.BigNumber.from(0));
                expect(await estateToken.totalEquityAt(3, at)).to.equal(expectedTotalVote.add(await estateToken.balanceOfAt(estateForger.address, 3, at)));
            }

            estateForger.allocationOfAt.reset();
        });
    });

    describe('2.4.20. equityOfAt(address, uint256, uint40)', () => {
        it('2.4.20.1. Return correct vote for available estate', async () => {
            const { estateForger, estateToken, depositor1, depositor2 } = await beforeEstateTokenTest({
                addSampleEstates: true,
            });

            const baseTimestamp = await time.latest() + 1000;

            const estateId1 = 1;
            const tokenId1 = (await estateToken.getEstate(estateId1)).tokenizationId;

            const estateId2 = 2;
            const tokenId2 = (await estateToken.getEstate(estateId2)).tokenizationId;

            // Depositor 1, estate 1
            await callTransactionAtTimestamp(
                estateToken.mint(depositor1.address, estateId1, 10_000),
                baseTimestamp,
            );
            await time.increaseTo(baseTimestamp + 10);

            estateForger.allocationOfAt.whenCalledWith(depositor1.address, tokenId1, baseTimestamp).returns(20_000);
            estateForger.allocationOfAt.whenCalledWith(depositor1.address, tokenId1, baseTimestamp + 10).returns(20_000);

            expect(await estateToken.equityOfAt(depositor1.address, estateId1, baseTimestamp)).to.equal(30_000);
            expect(await estateToken.equityOfAt(depositor1.address, estateId1, baseTimestamp + 10)).to.equal(30_000);

            // Depositor 1, estate 2
            await callTransactionAtTimestamp(
                estateToken.mint(depositor1.address, estateId2, 40_000),
                baseTimestamp + 20,
            );
            await time.increaseTo(baseTimestamp + 30);

            estateForger.allocationOfAt.whenCalledWith(depositor1.address, tokenId2, baseTimestamp + 20).returns(80_000);
            estateForger.allocationOfAt.whenCalledWith(depositor1.address, tokenId2, baseTimestamp + 30).returns(80_000);

            expect(await estateToken.equityOfAt(depositor1.address, estateId2, baseTimestamp + 20)).to.equal(120_000);
            expect(await estateToken.equityOfAt(depositor1.address, estateId2, baseTimestamp + 30)).to.equal(120_000);

            // Depositor 2, estate 1
            await callTransactionAtTimestamp(
                estateToken.mint(depositor2.address, estateId1, 160_000),
                baseTimestamp + 40,
            );
            await time.increaseTo(baseTimestamp + 50);

            estateForger.allocationOfAt.whenCalledWith(depositor2.address, tokenId1, baseTimestamp + 40).returns(320_000);
            estateForger.allocationOfAt.whenCalledWith(depositor2.address, tokenId1, baseTimestamp + 50).returns(320_000);

            expect(await estateToken.equityOfAt(depositor2.address, estateId1, baseTimestamp + 40)).to.equal(480_000);
            expect(await estateToken.equityOfAt(depositor2.address, estateId1, baseTimestamp + 50)).to.equal(480_000);

            estateForger.allocationOfAt.reset();
        });

        it('2.4.20.2. Revert with invalid estate id', async () => {
            const fixture = await beforeEstateTokenTest();
            const { estateToken, depositor1 } = fixture;

            const baseTimestamp = await time.latest() + 1000;

            await expect(estateToken.equityOfAt(depositor1.address, 0, baseTimestamp))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");
            await expect(estateToken.equityOfAt(depositor1.address, 3, baseTimestamp))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");
        });

        it('2.4.20.3. Revert with timestamp after current block timestamp', async () => {
            const fixture = await beforeEstateTokenTest({
                addSampleEstates: true,
            });
            const { estateForger, estateToken, depositor1 } = fixture;

            const baseTimestamp = await time.latest() + 1000;

            const estateId1 = 1;
            const tokenId1 = (await estateToken.getEstate(estateId1)).tokenizationId;

            await callTransactionAtTimestamp(
                estateToken.mint(depositor1.address, estateId1, 10_000),
                baseTimestamp,
            );
            await time.increaseTo(baseTimestamp + 10);

            for (let at = baseTimestamp + 9; at <= baseTimestamp + 11; ++at) {
                estateForger.allocationOfAt.whenCalledWith(depositor1.address, tokenId1, at).returns(20_000);
            }

            expect(await estateToken.equityOfAt(depositor1.address, estateId1, baseTimestamp + 9)).to.equal(30_000);
            expect(await estateToken.equityOfAt(depositor1.address, estateId1, baseTimestamp + 10)).to.equal(30_000);
            await expect(estateToken.equityOfAt(depositor1.address, estateId1, baseTimestamp + 11))
                .to.be.revertedWithCustomError(estateToken, "InvalidTimestamp");
                
            estateForger.allocationOfAt.reset();
        });

        it('2.4.20.4. Revert with timestamp after deprecation', async () => {
            const fixture = await beforeEstateTokenTest({
                addSampleEstates: true,
            });
            const { estateToken, estateForger, manager, depositor1 } = fixture;

            const baseTimestamp = await time.latest() + 1000;

            const estateId1 = 1;
            const tokenId1 = (await estateToken.getEstate(estateId1)).tokenizationId;

            await callTransaction(estateToken.mint(depositor1.address, estateId1, 10_000));
            const params1: DeprecateEstateParams = {
                estateId: BigNumber.from(estateId1),
                note: 'test deprecate 1',
            };
            await callTransactionAtTimestamp(
                getEstateTokenTxByParams_SafeDeprecateEstate(estateToken, manager, params1),
                baseTimestamp + 10,
            );

            await time.increaseTo(baseTimestamp + 20);

            for (let at = baseTimestamp + 9; at <= baseTimestamp + 11; ++at) {
                estateForger.allocationOfAt.whenCalledWith(depositor1.address, tokenId1, at).returns(20_000);
            }

            expect(await estateToken.equityOfAt(depositor1.address, estateId1, baseTimestamp + 9)).to.equal(30_000);
            expect(await estateToken.equityOfAt(depositor1.address, estateId1, baseTimestamp + 10)).to.equal(30_000);
            await expect(estateToken.equityOfAt(depositor1.address, estateId1, baseTimestamp + 11))
                .to.be.revertedWithCustomError(estateToken, "InvalidTimestamp");

            estateForger.allocationOfAt.reset();
        });

        it('2.4.20.5. Revert with timestamp after expiration', async () => {
            const fixture = await beforeEstateTokenTest({
                addSampleEstates: true,
            });
            const { estateToken, estateForger, manager, depositor1 } = fixture;

            await callTransaction(estateToken.mint(depositor1.address, 1, 10_000));

            const estateId1 = 1;
            const tokenId1 = (await estateToken.getEstate(estateId1)).tokenizationId;
            
            const expireAt = (await estateToken.getEstate(estateId1)).expireAt;
            await time.increaseTo(expireAt + 10);

            for (let at = expireAt - 1; at <= expireAt + 1; ++at) {
                estateForger.allocationOfAt.whenCalledWith(depositor1.address, tokenId1, at).returns(20_000);
            }

            expect(await estateToken.equityOfAt(depositor1.address, estateId1, expireAt - 1)).to.equal(30_000);
            await expect(estateToken.equityOfAt(depositor1.address, estateId1, expireAt))
                .to.be.revertedWithCustomError(estateToken, "InvalidTimestamp");
            await expect(estateToken.equityOfAt(depositor1.address, estateId1, expireAt + 1))
                .to.be.revertedWithCustomError(estateToken, "InvalidTimestamp");

            estateForger.allocationOfAt.reset();
        });

        it('2.4.20.6. Return 0 with estate tokenizer account', async () => {
            const { estateForger, estateToken } = await beforeEstateTokenTest({
                addSampleEstates: true,
            });

            const baseTimestamp = await time.latest() + 1000;

            const estateId1 = 1;
            const tokenId1 = (await estateToken.getEstate(estateId1)).tokenizationId;

            await callTransactionAtTimestamp(
                estateToken.mint(estateForger.address, estateId1, 10_000),
                baseTimestamp,
            );
            await time.increaseTo(baseTimestamp + 10);

            estateForger.allocationOfAt.whenCalledWith(estateForger.address, tokenId1, baseTimestamp).returns(20_000);
            estateForger.allocationOfAt.whenCalledWith(estateForger.address, tokenId1, baseTimestamp + 10).returns(20_000);

            expect(await estateToken.equityOfAt(estateForger.address, estateId1, baseTimestamp)).to.equal(0);
            expect(await estateToken.equityOfAt(estateForger.address, estateId1, baseTimestamp + 10)).to.equal(0);

            estateForger.allocationOfAt.reset();
        });
    });

    describe('2.4.21. safeTransferFrom(address, address, uint256, uint256, bytes)', () => {
        it('2.4.21.1. Transfer unsuccessfully when the token is deprecated', async () => {
            const { estateToken, manager, depositor1, depositor2 } = await beforeEstateTokenTest({
                addSampleEstates: true,
            });

            await callTransaction(estateToken.mint(depositor1.address, 1, 10_000));
            await callTransaction(estateToken.mint(depositor1.address, 2, 500));

            const params1: DeprecateEstateParams = {
                estateId: BigNumber.from(1),
                note: 'test deprecate 1',
            };
            await callTransaction(getEstateTokenTxByParams_SafeDeprecateEstate(estateToken, manager, params1));

            await expect(estateToken.connect(depositor1).safeBatchTransferFrom(
                depositor1.address,
                depositor2.address,
                [1, 2],
                [10_000, 500],
                ethers.utils.formatBytes32String(""),
            )).to.be.revertedWith("EstateToken: Token is unavailable");
        });

        it('2.4.21.2. Transfer unsuccessfully when the token is expired', async () => {
            const { estateToken, manager, depositor1, depositor2 } = await beforeEstateTokenTest({
                addSampleEstates: true,
            });

            await callTransaction(estateToken.mint(depositor1.address, 1, 10_000));
            await callTransaction(estateToken.mint(depositor1.address, 2, 500));

            const expireAt = (await estateToken.getEstate(1)).expireAt;

            await time.increaseTo(expireAt);

            await expect(estateToken.connect(depositor1).safeBatchTransferFrom(
                depositor1.address,
                depositor2.address,
                [1, 2],
                [10_000, 500],
                ethers.utils.formatBytes32String(""),
            )).to.be.revertedWith("EstateToken: Token is unavailable");
        });
    });

    describe('2.4.22. getRoyaltyRate()', () => {
        it('2.4.22.1. Return correct royalty rate for available estate', async () => {
            const { deployer, estateToken, zone1, zone2, admins, admin } = await beforeEstateTokenTest({
                addSampleEstates: true,
            });

            await callTransaction(getEstateTokenTxByInput_UpdateZoneRoyaltyRate(estateToken, deployer, {
                zone: zone1,
                royaltyRate: ethers.utils.parseEther('0.1'),
            }, admin, admins));
            await callTransaction(getEstateTokenTxByInput_UpdateZoneRoyaltyRate(estateToken, deployer, {
                zone: zone2,
                royaltyRate: ethers.utils.parseEther('0.2'),
            }, admin, admins));

            expect(structToObject(await estateToken.getRoyaltyRate(1))).to.deep.equal({
                value: ethers.utils.parseEther('0.1'),
                decimals: Constant.COMMON_RATE_DECIMALS,
            });

            expect(structToObject(await estateToken.getRoyaltyRate(2))).to.deep.equal({
                value: ethers.utils.parseEther('0.2'),
                decimals: Constant.COMMON_RATE_DECIMALS,
            });
        });

        it('2.4.22.2. Revert with invalid estate id', async () => {
            const { estateToken } = await beforeEstateTokenTest();

            await expect(estateToken.getRoyaltyRate(0))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");

            await expect(estateToken.getRoyaltyRate(100))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");
        });

        it('2.4.22.3. Revert with unavailable estate', async () => {
            const { estateToken, manager } = await beforeEstateTokenTest({
                addSampleEstates: true,
            });

            const params1: DeprecateEstateParams = {
                estateId: BigNumber.from(1),
                note: 'test deprecate 1',
            };
            await callTransaction(getEstateTokenTxByParams_SafeDeprecateEstate(estateToken, manager, params1));

            await expect(estateToken.getRoyaltyRate(1))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");
        });
    });

    describe('2.4.23. supportsInterface(bytes4)', () => {
        it('2.4.23.1. Return true for appropriate interface', async () => {
            const fixture = await beforeEstateTokenTest();
            const { estateToken } = fixture;

            const ICommon = ICommon__factory.createInterface();

            const IERC165Upgradeable = IERC165Upgradeable__factory.createInterface();
            const IERC2981Upgradeable = IERC2981Upgradeable__factory.createInterface();
            const IRoyaltyRateProposer = IRoyaltyRateProposer__factory.createInterface();
            const IERC1155Upgradeable = IERC1155Upgradeable__factory.createInterface();
            const IERC1155MetadataURIUpgradeable = IERC1155MetadataURIUpgradeable__factory.createInterface();
            const IGovernor = IGovernor__factory.createInterface();

            const IERC2981UpgradeableInterfaceId = getInterfaceID(IERC2981Upgradeable, [IERC165Upgradeable]);

            const IRoyaltyRateProposerInterfaceId = getInterfaceID(IRoyaltyRateProposer, [ICommon, IERC165Upgradeable, IERC2981Upgradeable]);

            const IERC165UpgradeableInterfaceId = getInterfaceID(IERC165Upgradeable, []);

            const IERC1155UpgradeableInterfaceId = getInterfaceID(IERC1155Upgradeable, [IERC165Upgradeable]);

            const IERC1155MetadataURIUpgradeableInterfaceId = getInterfaceID(IERC1155MetadataURIUpgradeable, [IERC1155Upgradeable]);

            const IGovernorInterfaceId = getInterfaceID(IGovernor, [IERC1155Upgradeable]);

            expect(await estateToken.supportsInterface(getBytes4Hex(IERC2981UpgradeableInterfaceId))).to.equal(true);
            expect(await estateToken.supportsInterface(getBytes4Hex(IRoyaltyRateProposerInterfaceId))).to.equal(true);
            expect(await estateToken.supportsInterface(getBytes4Hex(IERC165UpgradeableInterfaceId))).to.equal(true);
            expect(await estateToken.supportsInterface(getBytes4Hex(IERC1155UpgradeableInterfaceId))).to.equal(true);
            expect(await estateToken.supportsInterface(getBytes4Hex(IERC1155MetadataURIUpgradeableInterfaceId))).to.equal(true);
            expect(await estateToken.supportsInterface(getBytes4Hex(IGovernorInterfaceId))).to.equal(true);
        });
    });

    describe('2.4.9. registerCustodian(bytes32, address, string, (uint256, uint256, bytes))', async () => {
        async function beforeRegisterCustodianTest(fixture: EstateTokenFixture): Promise<{
            defaultParamsInput: RegisterCustodianParamsInput;
        }> {
            const { zone1, custodian1 } = fixture;

            const defaultParamsInput: RegisterCustodianParamsInput = {
                zone: zone1,
                custodian: custodian1.address,
                uri: "custodian_uri",
            };
            return { defaultParamsInput };
        }

        it('2.4.9.1. Register custodian successfully with valid signatures', async () => {
            const { manager, custodian1, custodian2, validator, estateToken, zone1, zone2 } = await beforeEstateTokenTest({
                skipRegisterCustodians: true,
            });

            // Tx1: Register custodian1 in zone1
            const paramsInput1: RegisterCustodianParamsInput = {
                zone: zone1,
                custodian: custodian1.address,
                uri: "custodian1_zone1_uri",
            };
            const tx1 = await getEstateTokenTxByInput_RegisterCustodian(estateToken, manager, paramsInput1, validator);
            await tx1.wait();

            await expect(tx1).to.emit(estateToken, 'CustodianRegistration').withArgs(
                paramsInput1.zone,
                paramsInput1.custodian,
                paramsInput1.uri
            );

            expect(await estateToken.custodianURIs(zone1, custodian1.address)).to.equal(paramsInput1.uri);

            expect(await estateToken.isCustodianIn(zone1, custodian1.address)).to.be.true;
            expect(await estateToken.isCustodianIn(zone2, custodian1.address)).to.be.false;
            expect(await estateToken.isCustodianIn(zone2, custodian2.address)).to.be.false;

            // Tx2: Register custodian1 in zone2
            const paramsInput2: RegisterCustodianParamsInput = {
                zone: zone2,
                custodian: custodian1.address,
                uri: "custodian1_zone2_uri",
            };
            const tx2 = await getEstateTokenTxByInput_RegisterCustodian(estateToken, manager, paramsInput2, validator);
            await tx2.wait();

            await expect(tx2).to.emit(estateToken, 'CustodianRegistration').withArgs(
                paramsInput2.zone,
                paramsInput2.custodian,
                paramsInput2.uri
            );

            expect(await estateToken.custodianURIs(zone2, custodian1.address)).to.equal(paramsInput2.uri);

            expect(await estateToken.isCustodianIn(zone1, custodian1.address)).to.be.true;
            expect(await estateToken.isCustodianIn(zone1, custodian2.address)).to.be.false;
            expect(await estateToken.isCustodianIn(zone2, custodian1.address)).to.be.true;

            // Tx3: Register custodian2 in zone1
            const paramsInput3: RegisterCustodianParamsInput = {
                zone: zone1,
                custodian: custodian2.address,
                uri: "custodian2_zone1_uri",
            };
            const tx3 = await getEstateTokenTxByInput_RegisterCustodian(estateToken, manager, paramsInput3, validator);
            await tx3.wait();

            await expect(tx3).to.emit(estateToken, 'CustodianRegistration').withArgs(
                paramsInput3.zone,
                paramsInput3.custodian,
                paramsInput3.uri
            );

            expect(await estateToken.custodianURIs(zone1, custodian2.address)).to.equal(paramsInput3.uri);

            expect(await estateToken.isCustodianIn(zone1, custodian1.address)).to.be.true;
            expect(await estateToken.isCustodianIn(zone1, custodian2.address)).to.be.true;
            expect(await estateToken.isCustodianIn(zone2, custodian1.address)).to.be.true;
        });

        it('2.4.9.2. Register custodian unsuccessfully by non-manager', async () => {
            const fixture = await beforeEstateTokenTest({
                skipRegisterCustodians: true,
            });
            const { user, moderator, validator, estateToken } = fixture;

            const { defaultParamsInput: paramsInput } = await beforeRegisterCustodianTest(fixture);

            // User
            await expect(getEstateTokenTxByInput_RegisterCustodian(estateToken, user, paramsInput, validator))
                .to.be.revertedWithCustomError(estateToken, `Unauthorized`)
            
            // Moderator
            await expect(getEstateTokenTxByInput_RegisterCustodian(estateToken, moderator, paramsInput, validator))
                .to.be.revertedWithCustomError(estateToken, `Unauthorized`)
        });

        it('2.4.9.3. Register custodian unsuccessfully with inactive zone', async () => {
            const fixture = await beforeEstateTokenTest({
                skipRegisterCustodians: true,
            });
            const { manager, validator, estateToken } = fixture;

            const { defaultParamsInput } = await beforeRegisterCustodianTest(fixture);

            const paramsInput: RegisterCustodianParamsInput = {
                ...defaultParamsInput,
                zone: ethers.utils.formatBytes32String('invalid zone'),
            }
            await expect(getEstateTokenTxByInput_RegisterCustodian(estateToken, manager, paramsInput, validator))
                .to.be.revertedWithCustomError(estateToken, `Unauthorized`)                
        });

        it('2.4.9.4. Register custodian unsuccessfully by inactive manager in zone', async () => {
            const fixture = await beforeEstateTokenTest({
                skipRegisterCustodians: true,
            });
            const { deployer, admin, admins, manager, validator, estateToken } = fixture;

            const { defaultParamsInput } = await beforeRegisterCustodianTest(fixture);

            await callTransaction(getAdminTxByInput_ActivateIn(
                admin,
                deployer,
                {
                    zone: defaultParamsInput.zone,
                    accounts: [manager.address],
                    isActive: false,
                },
                admins
            ));
            await expect(getEstateTokenTxByInput_RegisterCustodian(estateToken, manager, defaultParamsInput, validator))
                .to.be.revertedWithCustomError(estateToken, `Unauthorized`)           
        });

        it('2.4.9.5. Register custodian successfully when registering the same account twice', async () => {
            const fixture = await beforeEstateTokenTest({
                skipRegisterCustodians: true,
            });
            const { estateToken, manager, validator } = fixture;

            const { defaultParamsInput } = await beforeRegisterCustodianTest(fixture);

            await callTransaction(getEstateTokenTxByInput_RegisterCustodian(estateToken, manager, defaultParamsInput, validator));

            const paramsInput2: RegisterCustodianParamsInput = {
                ...defaultParamsInput,
                uri: "new_custodian_uri",
            };
            await callTransaction(getEstateTokenTxByInput_RegisterCustodian(estateToken, manager, paramsInput2, validator));

            expect(await estateToken.custodianURIs(defaultParamsInput.zone, defaultParamsInput.custodian)).to.equal(paramsInput2.uri);
        });

        it('2.4.9.6. Register custodian unsuccessfully with invalid validation', async () => {
            const fixture = await beforeEstateTokenTest({
                skipRegisterCustodians: true,
            });
            const { estateToken, manager, validator } = fixture;

            const { defaultParamsInput } = await beforeRegisterCustodianTest(fixture);

            const params: RegisterCustodianParams = {
                ...defaultParamsInput,
                validation: await getRegisterCustodianValidation(estateToken, defaultParamsInput, validator, false),
            }
            await expect(getEstateTokenTx_RegisterCustodian(estateToken, manager, params))
                .to.be.revertedWithCustomError(estateToken, `InvalidSignature`);
        });

        it('2.4.9.7. Register custodian unsuccessfully with invalid uri', async () => {
            const fixture = await beforeEstateTokenTest({
                skipRegisterCustodians: true,
            });
            const { estateToken, manager, validator } = fixture;

            const { defaultParamsInput } = await beforeRegisterCustodianTest(fixture);

            const paramsInput: RegisterCustodianParamsInput = {
                ...defaultParamsInput,
                uri: "",
            };
            await expect(getEstateTokenTxByInput_RegisterCustodian(estateToken, manager, paramsInput, validator))
                .to.be.revertedWithCustomError(estateToken, `InvalidURI`)
        });
    });

    describe('2.4.10. tokenizeEstate(uint256, bytes32, uint256, string, uint40, uint8, address)', async () => {
        async function beforeTokenizeEstateTest(fixture: EstateTokenFixture): Promise<{
            baseTimestamp: number;
            defaultParams: TokenizeEstateParams;
        }> {
            const { zone1, custodian1, broker1 } = fixture;
            const baseTimestamp = await time.latest() + 1000;

            const defaultParams: TokenizeEstateParams = {
                totalSupply: BigNumber.from(10_000),
                zone: zone1,
                tokenizationId: BigNumber.from(10),
                uri: "Token1_URI",
                expireAt: baseTimestamp + 100,
                custodian: custodian1.address,
                broker: broker1.address,
            }
            return { baseTimestamp, defaultParams };
        };

        it('2.4.10.1. Tokenize estate successfully with commission receiver', async () => {
            const fixture = await beforeEstateTokenTest();
            const { estateToken, estateForger, broker1, commissionToken } = fixture;
            const { baseTimestamp, defaultParams } = await beforeTokenizeEstateTest(fixture);
            const params = {
                ...defaultParams,
                broker: broker1.address,
            }

            await time.setNextBlockTimestamp(baseTimestamp);

            let tx = await getCallEstateTokenTx_TokenizeEstate(estateToken, estateForger, params);
            await tx.wait();

            await expect(tx).to.emit(estateToken, 'NewToken').withArgs(
                1,
                params.zone,
                params.tokenizationId,
                estateForger.address,
                params.custodian,
                params.expireAt,
            );

            const estate = await estateToken.getEstate(1);
            expect(estate.zone).to.equal(params.zone);
            expect(estate.tokenizationId).to.equal(params.tokenizationId);
            expect(estate.tokenizer).to.equal(estateForger.address);
            expect(estate.tokenizeAt).to.equal(baseTimestamp);
            expect(estate.expireAt).to.equal(params.expireAt);
            expect(estate.deprecateAt).to.equal(Constant.COMMON_INFINITE_TIMESTAMP);

            expect(await estateToken.uri(1)).to.equal(LandInitialization.ESTATE_TOKEN_BaseURI + defaultParams.uri);

            expect(await estateToken.balanceOf(estateForger.address, 1)).to.equal(10_000);

            expect(await commissionToken.ownerOf(1)).to.equal(params.broker);
        });

        it('2.4.10.2. Tokenize estate unsuccessfully with unregistered broker', async () => {
            const fixture = await beforeEstateTokenTest();
            const { estateToken, estateForger, commissionToken } = fixture;

            const { baseTimestamp, defaultParams } = await beforeTokenizeEstateTest(fixture);

            const broker = randomWallet();
            const params = {
                ...defaultParams,
                broker: broker.address,
            }

            await time.setNextBlockTimestamp(baseTimestamp);

            await expect(getCallEstateTokenTx_TokenizeEstate(estateToken, estateForger, params))
                .to.be.revertedWithCustomError(commissionToken, `InvalidBroker`);
        });

        it('2.4.10.3. Tokenize estate unsuccessfully when tokenizer is not authorized', async () => {
            const fixture = await beforeEstateTokenTest({
                skipAuthorizeEstateForger: true,
            });
            const { admin, admins, estateToken, estateForger } = fixture;
            const { baseTimestamp, defaultParams } = await beforeTokenizeEstateTest(fixture);

            await time.setNextBlockTimestamp(baseTimestamp);

            await expect(getCallEstateTokenTx_TokenizeEstate(estateToken, estateForger, defaultParams))
                .to.be.revertedWithCustomError(estateToken, `Unauthorized`);
        });

        it('2.4.10.4. Tokenize estate unsuccessfully when zone is not declared', async () => {
            const fixture = await beforeEstateTokenTest();
            const { estateToken, estateForger } = fixture;
            const { baseTimestamp, defaultParams } = await beforeTokenizeEstateTest(fixture);

            const zone = ethers.utils.formatBytes32String('invalid zone');
            const params = {
                ...defaultParams,
                zone: zone,
            }

            await time.setNextBlockTimestamp(baseTimestamp);

            await expect(getCallEstateTokenTx_TokenizeEstate(estateToken, estateForger, params))
                .to.be.revertedWithCustomError(estateToken, `InvalidInput`);
        });

        it('2.4.10.5. Tokenize estate unsuccessfully with expired estate', async () => {
            const fixture = await beforeEstateTokenTest();
            const { estateToken, estateForger } = fixture;
            const { baseTimestamp, defaultParams } = await beforeTokenizeEstateTest(fixture);

            await time.setNextBlockTimestamp(baseTimestamp);

            const params1 = {
                ...defaultParams,
                expireAt: baseTimestamp,
            }
            await expect(getCallEstateTokenTx_TokenizeEstate(estateToken, estateForger, params1))
                .to.be.revertedWithCustomError(estateToken, `InvalidTimestamp`);

            const params2 = {
                ...defaultParams,
                expireAt: baseTimestamp - 100,
            }    
            await expect(getCallEstateTokenTx_TokenizeEstate(estateToken, estateForger, params2))
                .to.be.revertedWithCustomError(estateToken, `InvalidTimestamp`);
        });

        it('2.4.10.6. Tokenize estate unsuccessfully when custodian is not registered', async () => {
            const fixture = await beforeEstateTokenTest({
                skipRegisterCustodians: true,
            });
          
            const { estateToken, estateForger } = fixture;
            
            const { defaultParams } = await beforeTokenizeEstateTest(fixture);
            
            await expect(getCallEstateTokenTx_TokenizeEstate(estateToken, estateForger, defaultParams))
                .to.be.revertedWithCustomError(estateToken, `InvalidCustodian`);
        })

        it('2.4.10.7. Tokenize estate unsuccessfully when commission token is not set', async () => {
            const fixture = await beforeEstateTokenTest({
                skipUpdateCommissionToken: true,
            });
            const { estateToken, estateForger } = fixture;
            const { baseTimestamp, defaultParams } = await beforeTokenizeEstateTest(fixture);

            await time.setNextBlockTimestamp(baseTimestamp);

            await expect(getCallEstateTokenTx_TokenizeEstate(estateToken, estateForger, defaultParams))
                .to.be.revertedWith("CallUtils: target revert()");
        });
    });

    describe('2.4.15. extractEstate(uint256, uint256)', () => {
        it('2.4.15.1. Extract estate successfully by extractor', async () => {
            const fixture = await beforeEstateTokenTest({
                addSampleEstates: true,
            });
            const { estateToken, estateLiquidator } = fixture;

            const estateId1 = 1;
            const extractionId1 = 2;

            let timestamp = await time.latest() + 100;
            await time.setNextBlockTimestamp(timestamp);

            const tx1 = await getCallEstateTokenTx_ExtractEstate(
                estateToken,
                estateLiquidator as any,
                {
                    estateId: BigNumber.from(estateId1),
                    extractionId: BigNumber.from(extractionId1),
                }
            );
            await tx1.wait();

            await expect(tx1).to.emit(estateToken, "EstateExtraction").withArgs(
                estateId1,
                extractionId1
            );

            const estate1 = await estateToken.getEstate(estateId1);
            expect(estate1.deprecateAt).to.equal(timestamp);

            timestamp += 10;
            await time.setNextBlockTimestamp(timestamp);

            const estateId2 = 2;
            const extractionId2 = 3;

            const tx2 = await getCallEstateTokenTx_ExtractEstate(
                estateToken,
                estateLiquidator as any,
                {
                    estateId: BigNumber.from(estateId2),
                    extractionId: BigNumber.from(extractionId2),
                }
            );
            await tx2.wait();

            await expect(tx2).to.emit(estateToken, "EstateExtraction").withArgs(
                estateId2,
                extractionId2
            );

            const estate2 = await estateToken.getEstate(estateId2);
            expect(estate2.deprecateAt).to.equal(timestamp);
        });

        it('2.4.15.2. Extract estate unsuccessfully with invalid estate id', async () => {
            const fixture = await beforeEstateTokenTest();

            const { estateToken, estateLiquidator } = fixture;

            await expect(getCallEstateTokenTx_ExtractEstate(estateToken, estateLiquidator as any, {
                estateId: BigNumber.from(0),
                extractionId: BigNumber.from(1),
            })).to.be.revertedWithCustomError(estateToken, "InvalidEstateId");

            await expect(getCallEstateTokenTx_ExtractEstate(estateToken, estateLiquidator as any, {
                estateId: BigNumber.from(100),
                extractionId: BigNumber.from(1),
            })).to.be.revertedWithCustomError(estateToken, "InvalidEstateId");
        });

        it('2.4.15.3. Extract estate unsuccessfully when paused', async () => {
            const fixture = await beforeEstateTokenTest({
                addSampleEstates: true,
                pause: true,
            });

            const { estateToken, estateLiquidator } = fixture;

            await expect(getCallEstateTokenTx_ExtractEstate(estateToken, estateLiquidator as any, {
                estateId: BigNumber.from(1),
                extractionId: BigNumber.from(1),
            })).to.be.revertedWith("Pausable: paused");
        });

        it('2.4.15.4. Extract estate unsuccessfully when estate liquidator is not authorized', async () => {
            const fixture = await beforeEstateTokenTest({
                skipAuthorizeEstateLiquidator: true,
                addSampleEstates: true,
            });

            const { estateToken, estateLiquidator } = fixture;

            await expect(getCallEstateTokenTx_ExtractEstate(estateToken, estateLiquidator as any, {
                estateId: BigNumber.from(1),
                extractionId: BigNumber.from(1),
            })).to.be.revertedWithCustomError(estateToken, "Unauthorized");
        });
    });

    describe('2.4.11. safeDeprecateEstate(uint256, string, bytes32)', () => {
        it('2.4.11.1. Deprecate estate successfully', async () => {
            const { estateToken, manager } = await beforeEstateTokenTest({
                addSampleEstates: true,
            });

            const baseTimestamp = await time.latest() + 100;
            await time.setNextBlockTimestamp(baseTimestamp);

            const params1: DeprecateEstateParams = {
                estateId: BigNumber.from(1),
                note: 'test deprecate 1',
            };

            const tx1 = await getEstateTokenTxByParams_SafeDeprecateEstate(estateToken, manager, params1);
            await tx1.wait();

            await expect(tx1).to.emit(estateToken, "EstateDeprecation").withArgs(
                1,
                params1.note
            );
            expect((await estateToken.getEstate(1)).deprecateAt).to.equal(baseTimestamp);

            await time.setNextBlockTimestamp(baseTimestamp + 100);

            const params2: DeprecateEstateParams = {
                estateId: BigNumber.from(2),
                note: 'test deprecate 2',
            };

            const tx2 = await getEstateTokenTxByParams_SafeDeprecateEstate(estateToken, manager, params2);
            await tx2.wait();

            await expect(tx2).to.emit(estateToken, "EstateDeprecation").withArgs(
                2,
                params2.note
            );
            expect((await estateToken.getEstate(2)).deprecateAt).to.equal(baseTimestamp + 100);
        });

        it('2.4.11.2. Deprecate estate unsuccessfully with invalid anchor', async () => {
            const { estateToken, manager } = await beforeEstateTokenTest({
                addSampleEstates: true,
            });
                
            const params: SafeDeprecateEstateParams = {
                estateId: BigNumber.from(1),
                note: 'test deprecate 1',
                anchor: ethers.utils.keccak256(ethers.utils.toUtf8Bytes('invalid anchor')),
            };
            await expect(getEstateTokenTx_SafeDeprecateEstate(estateToken, manager, params))
                .to.be.revertedWithCustomError(estateToken, "BadAnchor");
        });

        it('2.4.11.2. Deprecate estate unsuccessfully with non-existing estate id', async () => {
            const { estateToken, manager } = await beforeEstateTokenTest({
                addSampleEstates: true,
            });

            const params1: DeprecateEstateParams = {
                estateId: BigNumber.from(0),
                note: 'test deprecate 1',
            };
            await expect(getEstateTokenTxByParams_SafeDeprecateEstate(estateToken, manager, params1))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");

            const params2: DeprecateEstateParams = {
                estateId: BigNumber.from(3),
                note: 'test deprecate 2',
            };
            await expect(getEstateTokenTxByParams_SafeDeprecateEstate(estateToken, manager, params2))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");

            const params3: DeprecateEstateParams = {
                estateId: BigNumber.from(100),
                note: 'test deprecate 3',
            };
            await expect(getEstateTokenTxByParams_SafeDeprecateEstate(estateToken, manager, params3))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");
        });

        it('2.4.11.3. Deprecate estate unsuccessfully with deprecated estate', async () => {
            const { estateToken, manager } = await beforeEstateTokenTest({
                addSampleEstates: true,
            });

            const params1: DeprecateEstateParams = {
                estateId: BigNumber.from(1),
                note: 'test deprecate 1',
            };
            await callTransaction(getEstateTokenTxByParams_SafeDeprecateEstate(estateToken, manager, params1));
            await expect(getEstateTokenTxByParams_SafeDeprecateEstate(estateToken, manager, params1))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");

            const params2: DeprecateEstateParams = {
                estateId: BigNumber.from(2),
                note: 'test deprecate 2',
            };
            await callTransaction(getEstateTokenTxByParams_SafeDeprecateEstate(estateToken, manager, params2));
            await expect(getEstateTokenTxByParams_SafeDeprecateEstate(estateToken, manager, params2))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");
        });

        it('2.4.11.4. Deprecate estate unsuccessfully by unauthorized sender', async () => {
            const { estateToken, user, moderator } = await beforeEstateTokenTest({
                addSampleEstates: true,
            });

            const params: DeprecateEstateParams = {
                estateId: BigNumber.from(1),
                note: 'test deprecate 1',
            };
            await expect(getEstateTokenTxByParams_SafeDeprecateEstate(estateToken, user, params))
                .to.be.revertedWithCustomError(estateToken, "Unauthorized");

            await expect(getEstateTokenTxByParams_SafeDeprecateEstate(estateToken, moderator, params))
                .to.be.revertedWithCustomError(estateToken, "Unauthorized");
        });

        it('2.4.11.6. Deprecate estate unsuccessfully when sender is not active in zone', async () => {
            const { manager, admins, admin, estateToken, zone1 } = await beforeEstateTokenTest({
                addSampleEstates: true,
            });

            await callTransaction(getAdminTxByInput_ActivateIn(
                admin,
                manager,
                {
                    zone: zone1,
                    accounts: [manager.address],
                    isActive: false,
                },
                admins
            ));

            const params: DeprecateEstateParams = {
                estateId: BigNumber.from(1),
                note: 'test deprecate 1',
            };
            await expect(getEstateTokenTxByParams_SafeDeprecateEstate(estateToken, manager, params))
                .to.be.revertedWithCustomError(estateToken, "Unauthorized");
        });

        it('2.4.11.7. Deprecate estate unsuccessfully when paused', async () => {
            const { manager, estateToken } = await beforeEstateTokenTest({
                addSampleEstates: true,
                pause: true,
            });

            const params: DeprecateEstateParams = {
                estateId: BigNumber.from(1),
                note: 'test deprecate 1',
            };
            await expect(getEstateTokenTxByParams_SafeDeprecateEstate(estateToken, manager, params))
                .to.be.revertedWith("Pausable: paused");
        });
    });

    describe('2.4.12. safeExtendEstateExpiration(uint256, uint40, bytes32)', () => {
        it('2.4.12.1. Extend estate expiration successfully by manager with valid estate', async () => {
            const { manager, estateToken } = await beforeEstateTokenTest({
                addSampleEstates: true,
            });

            const baseTimestamp = await time.latest() + 1000;

            const params1: ExtendEstateExpirationParams = {
                estateId: BigNumber.from(1),
                expireAt: baseTimestamp + 1e9,
            };
            const tx1 = await getEstateTokenTxByParams_SafeExtendEstateExpiration(estateToken, manager, params1);
            await tx1.wait();

            await expect(tx1).to.emit(estateToken, "EstateExpirationExtension").withArgs(
                1,
                params1.expireAt
            );

            expect((await estateToken.getEstate(1)).expireAt).to.equal(params1.expireAt);

            const params2: ExtendEstateExpirationParams = {
                estateId: BigNumber.from(1),
                expireAt: baseTimestamp + 1e9 + 10,
            };
            const tx2 = await getEstateTokenTxByParams_SafeExtendEstateExpiration(estateToken, manager, params2);
            await tx2.wait();

            await expect(tx2).to.emit(estateToken, "EstateExpirationExtension").withArgs(
                1,
                params2.expireAt
            );

            expect((await estateToken.getEstate(1)).expireAt).to.equal(params2.expireAt);
        });

        it('2.4.12.2. Extend estate expiration successfully by manager with invalid anchor', async () => {
            const { manager, estateToken } = await beforeEstateTokenTest({
                addSampleEstates: true,
            });

            const baseTimestamp = await time.latest() + 1000;
            
            const params: SafeExtendEstateExpirationParams = {
                estateId: BigNumber.from(1),
                expireAt: baseTimestamp + 1e9,
                anchor: ethers.utils.keccak256(ethers.utils.toUtf8Bytes('invalid anchor')),
            };
            await expect(getEstateTokenTx_SafeExtendEstateExpiration(estateToken, manager, params))
                .to.be.revertedWithCustomError(estateToken, "BadAnchor");
        });

        it('2.4.12.2. Extend estate expiration unsuccessfully with non-existing estate', async () => {
            const { manager, estateToken } = await beforeEstateTokenTest({
                addSampleEstates: true,
            });

            const baseTimestamp = await time.latest() + 1000;

            const params1: ExtendEstateExpirationParams = {
                estateId: BigNumber.from(0),
                expireAt: baseTimestamp + 1e9,
            };
            await expect(getEstateTokenTxByParams_SafeExtendEstateExpiration(estateToken, manager, params1))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");

            const params2: ExtendEstateExpirationParams = {
                estateId: BigNumber.from(3),
                expireAt: baseTimestamp + 1e9,
            };
            await expect(getEstateTokenTxByParams_SafeExtendEstateExpiration(estateToken, manager, params2))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");

            const params3: ExtendEstateExpirationParams = {
                estateId: BigNumber.from(100),
                expireAt: baseTimestamp + 1e9,
            };
            await expect(getEstateTokenTxByParams_SafeExtendEstateExpiration(estateToken, manager, params3))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");
        });

        it('2.4.12.3. Extend estate expiration unsuccessfully with deprecated estate', async () => {
            const { manager, estateToken } = await beforeEstateTokenTest({
                addSampleEstates: true,
            });
            const baseTimestamp = await time.latest() + 1000;

            const deprecateParams: DeprecateEstateParams = {
                estateId: BigNumber.from(1),
                note: 'test deprecate 1',
            };
            await callTransaction(getEstateTokenTxByParams_SafeDeprecateEstate(estateToken, manager, deprecateParams));

            const extendParams: ExtendEstateExpirationParams = {
                estateId: BigNumber.from(1),
                expireAt: baseTimestamp + 1e9,
            };
            await expect(getEstateTokenTxByParams_SafeExtendEstateExpiration(estateToken, manager, extendParams))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");
        });

        it('2.4.12.4. Extend estate expiration unsuccessfully by non-manager sender', async () => {
            const { user, moderator, estateToken } = await beforeEstateTokenTest({
                addSampleEstates: true,
            });
            const baseTimestamp = await time.latest() + 1000;

            const extendParams: ExtendEstateExpirationParams = {
                estateId: BigNumber.from(1),
                expireAt: baseTimestamp + 1e9,
            };
            await expect(getEstateTokenTxByParams_SafeExtendEstateExpiration(estateToken, user, extendParams))
                .to.be.revertedWithCustomError(estateToken, "Unauthorized");

            await expect(getEstateTokenTxByParams_SafeExtendEstateExpiration(estateToken, moderator, extendParams))
                .to.be.revertedWithCustomError(estateToken, "Unauthorized");
        });

        it('2.4.12.6. Extend estate expiration unsuccessfully when sender is not active in zone', async () => {
            const { manager, admins, admin, estateToken, zone1 } = await beforeEstateTokenTest({
                addSampleEstates: true,
            });
            const baseTimestamp = await time.latest() + 1000;
            
            await callTransaction(getAdminTxByInput_ActivateIn(
                admin,
                manager,
                {
                    zone: zone1,
                    accounts: [manager.address],
                    isActive: false,
                },
                admins
            ));

            const params: ExtendEstateExpirationParams = {
                estateId: BigNumber.from(1),
                expireAt: baseTimestamp + 1e9,
            };
            await expect(getEstateTokenTxByParams_SafeExtendEstateExpiration(estateToken, manager, params))
                .to.be.revertedWithCustomError(estateToken, "Unauthorized");
        });

        it('2.4.12.7. Extend estate expiration unsuccessfully with invalid new expire timestamp', async () => {
            const { manager, estateToken } = await beforeEstateTokenTest({
                addSampleEstates: true,
            });
            const baseTimestamp = await time.latest();

            const params: ExtendEstateExpirationParams = {
                estateId: BigNumber.from(1),
                expireAt: baseTimestamp - 1,
            };
            await expect(getEstateTokenTxByParams_SafeExtendEstateExpiration(estateToken, manager, params))
                .to.be.revertedWithCustomError(estateToken, "InvalidTimestamp");
        });

        it('2.4.12.8. Extend estate expiration unsuccessfully when paused', async () => {
            const { manager, estateToken } = await beforeEstateTokenTest({
                addSampleEstates: true,
                pause: true,
            });

            const expireAt = (await estateToken.getEstate(1)).expireAt;

            const params: ExtendEstateExpirationParams = {
                estateId: BigNumber.from(1),
                expireAt: expireAt + 1e9,
            };
            await expect(getEstateTokenTxByParams_SafeExtendEstateExpiration(estateToken, manager, params))
                .to.be.revertedWith("Pausable: paused");
        });
    });

    describe('2.4.13. safeUpdateEstateURI(uint256, string, (uint256, uint256, bytes), bytes32)', () => {
        it('2.4.13.1. Update estate URI successfully by manager with available estate', async () => {
            const fixture = await beforeEstateTokenTest({
                addSampleEstates: true,
            });
            const { manager, validator, estateToken } = fixture;

            const paramsInput1: UpdateEstateURIParamsInput = {
                estateId: BigNumber.from(1),
                uri: 'new_URI_1',
            };
            const tx1 = await getEstateTokenTxByInput_SafeUpdateEstateURI(estateToken, manager, paramsInput1, validator);
            await tx1.wait();

            await expect(tx1).to.emit(estateToken, "URI").withArgs(
                LandInitialization.ESTATE_TOKEN_BaseURI + 'new_URI_1',
                paramsInput1.estateId
            );

            expect(await estateToken.uri(paramsInput1.estateId)).to.equal(LandInitialization.ESTATE_TOKEN_BaseURI + 'new_URI_1');
            
            const paramsInput2: UpdateEstateURIParamsInput = {
                estateId: BigNumber.from(2),
                uri: 'new_URI_2',
            };
            const tx2 = await getEstateTokenTxByInput_SafeUpdateEstateURI(estateToken, manager, paramsInput2, validator);
            await tx2.wait();

            await expect(tx2).to.emit(estateToken, "URI").withArgs(
                LandInitialization.ESTATE_TOKEN_BaseURI + 'new_URI_2',
                paramsInput2.estateId
            );

            expect(await estateToken.uri(paramsInput2.estateId)).to.equal(LandInitialization.ESTATE_TOKEN_BaseURI + 'new_URI_2');
        });

        it('2.4.13.2. Update estate URI successfully by manager with invalid anchor', async () => {
            const fixture = await beforeEstateTokenTest({
                addSampleEstates: true,
            });
            const { estateToken, manager, validator } = fixture;

            const paramsInput: UpdateEstateURIParamsInput = {
                estateId: BigNumber.from(1),
                uri: 'new_URI_1',                
            };
            const params: SafeUpdateEstateURIParams = {
                ...paramsInput,
                anchor: ethers.utils.keccak256(ethers.utils.toUtf8Bytes('invalid anchor')),
                validation: await getUpdateEstateURIValidation(estateToken, paramsInput, validator),
            };
            await expect(getEstateTokenTx_SafeUpdateEstateURI(estateToken, manager, params))
                .to.be.revertedWithCustomError(estateToken, "BadAnchor");            
        });

        it('2.4.13.3. Update estate URI successfully by manager with invalid validation', async () => {
            const fixture = await beforeEstateTokenTest({
                addSampleEstates: true,
            });
            const { estateToken, manager, validator } = fixture;

            const paramsInput: UpdateEstateURIParamsInput = {
                estateId: BigNumber.from(1),
                uri: 'new_URI_1',
            };
            const params: SafeUpdateEstateURIParams = {
                ...paramsInput,
                anchor: await getSafeUpdateEstateURIAnchor(estateToken, paramsInput),
                validation: await getUpdateEstateURIValidation(estateToken, paramsInput, validator, false),
            };
            await expect(getEstateTokenTx_SafeUpdateEstateURI(estateToken, manager, params))
                .to.be.revertedWithCustomError(estateToken, "InvalidSignature");
        });

        it('2.4.13.2. Update estate URI unsuccessfully with unavailable estate', async () => {
            const fixture = await beforeEstateTokenTest({
                addSampleEstates: true,
            });

            const { estateToken, manager, validator } = fixture;

            const paramsInput1: UpdateEstateURIParamsInput = {
                estateId: BigNumber.from(0),
                uri: 'new_URI_1',
            };
            await expect(getEstateTokenTxByInput_SafeUpdateEstateURI(estateToken, manager, paramsInput1, validator))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");

            const paramsInput2: UpdateEstateURIParamsInput = {
                estateId: BigNumber.from(100),
                uri: 'new_URI_2',
            };    
            await expect(getEstateTokenTxByInput_SafeUpdateEstateURI(estateToken, manager, paramsInput2, validator))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");

            const deprecateParams: DeprecateEstateParams = {
                estateId: BigNumber.from(1),
                note: 'test deprecate 1',
            };
            await callTransaction(getEstateTokenTxByParams_SafeDeprecateEstate(estateToken, manager, deprecateParams));

            const paramsInput3: UpdateEstateURIParamsInput = {
                estateId: BigNumber.from(1),
                uri: 'new_URI_3',
            };
            await expect(getEstateTokenTxByInput_SafeUpdateEstateURI(estateToken, manager, paramsInput3, validator))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");
        });

        it('2.4.13.3. Update estate URI unsuccessfully by non-manager sender', async () => {
            const fixture = await beforeEstateTokenTest({
                addSampleEstates: true,
            });
            const { user, moderator, estateToken, validator } = fixture;
            
            const paramsInput: UpdateEstateURIParamsInput = {
                estateId: BigNumber.from(1),
                uri: 'new_URI_1',
            };

            await expect(getEstateTokenTxByInput_SafeUpdateEstateURI(estateToken, user, paramsInput, validator))
                .to.be.revertedWithCustomError(estateToken, "Unauthorized");

            await expect(getEstateTokenTxByInput_SafeUpdateEstateURI(estateToken, moderator, paramsInput, validator))
                .to.be.revertedWithCustomError(estateToken, "Unauthorized");
        });

        it('2.4.13.5. Update estate URI unsuccessfully when sender is not active in zone', async () => {
            const fixture = await beforeEstateTokenTest({
                addSampleEstates: true,
            });
            const { manager, admin, admins, zone1, estateToken, validator } = fixture;

            await callTransaction(getAdminTxByInput_ActivateIn(
                admin,
                manager,
                {
                    zone: zone1,
                    accounts: [manager.address],
                    isActive: false,
                },
                admins
            ));

            const paramsInput: UpdateEstateURIParamsInput = {
                estateId: BigNumber.from(1),
                uri: 'new_URI_1',
            };
            await expect(getEstateTokenTxByInput_SafeUpdateEstateURI(estateToken, manager, paramsInput, validator))
                .to.be.revertedWithCustomError(estateToken, "Unauthorized");
        });

        it('2.4.13.6. Update estate URI unsuccessfully when paused', async () => {
            const fixture = await beforeEstateTokenTest({
                addSampleEstates: true,
                pause: true,
            });
            const { manager, estateToken, validator } = fixture;

            const paramsInput: UpdateEstateURIParamsInput = {
                estateId: BigNumber.from(1),
                uri: 'new_URI_1',
            };
            await expect(getEstateTokenTxByInput_SafeUpdateEstateURI(estateToken, manager, paramsInput, validator))
                .to.be.revertedWith("Pausable: paused");
        });
    });

    describe('2.4.14. safeUpdateEstateCustodian(uint256, address, bytes32)', () => {
        it('2.4.14.1. Update estate custodian successfully', async () => {
            const fixture = await beforeEstateTokenTest({
                addSampleEstates: true,
            });
            const { estateToken, manager, custodian3 } = fixture;

            const params: UpdateEstateCustodianParams = {
                estateId: ethers.BigNumber.from(1),
                custodian: custodian3.address,
            };

            const tx = await getEstateTokenTxByParams_SafeUpdateEstateCustodian(estateToken, manager, params);
            await tx.wait();

            await expect(tx).to.emit(estateToken, "EstateCustodianUpdate").withArgs(
                1,
                custodian3.address
            );

            const estate = await estateToken.getEstate(1);
            expect(estate.custodian).to.equal(custodian3.address);
        });

        it('2.4.14.2. Update estate custodian successfully with invalid anchor', async () => {
            const fixture = await beforeEstateTokenTest({
                addSampleEstates: true,
            });
            const { estateToken, manager, custodian3 } = fixture;
            
            const params: SafeUpdateEstateCustodianParams = {
                estateId: BigNumber.from(1),
                custodian: custodian3.address,
                anchor: ethers.utils.keccak256(ethers.utils.toUtf8Bytes('invalid anchor')),
            };
            await expect(getEstateTokenTx_SafeUpdateEstateCustodian(estateToken, manager, params))
                .to.be.revertedWithCustomError(estateToken, "BadAnchor");            
        });

        it('2.4.14.2. Update estate custodian unsuccessfully with unavailable estate', async () => {
            const fixture = await beforeEstateTokenTest({
                addSampleEstates: true,
            });
            const { estateToken, manager, custodian3 } = fixture;

            const params1: UpdateEstateCustodianParams = {
                estateId: BigNumber.from(0),
                custodian: custodian3.address,
            };
            await expect(getEstateTokenTxByParams_SafeUpdateEstateCustodian(estateToken, manager, params1))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");

            const params2: UpdateEstateCustodianParams = {
                estateId: BigNumber.from(100),
                custodian: custodian3.address,
            };    
            await expect(getEstateTokenTxByParams_SafeUpdateEstateCustodian(estateToken, manager, params2))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");

            const deprecateParams: DeprecateEstateParams = {
                estateId: BigNumber.from(1),
                note: 'test deprecate 1',
            };
            await callTransaction(getEstateTokenTxByParams_SafeDeprecateEstate(estateToken, manager, deprecateParams));

            const params3: UpdateEstateCustodianParams = {
                estateId: BigNumber.from(1),
                custodian: custodian3.address,
            };
            await expect(getEstateTokenTxByParams_SafeUpdateEstateCustodian(estateToken, manager, params3))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");
        });

        it('2.4.14.3. Update estate custodian unsuccessfully by non-manager sender', async () => {
            const fixture = await beforeEstateTokenTest({
                addSampleEstates: true,
            });
            const { user, moderator, estateToken, custodian3 } = fixture;

            const params: UpdateEstateCustodianParams = {
                estateId: BigNumber.from(1),
                custodian: custodian3.address,
            };
            await expect(getEstateTokenTxByParams_SafeUpdateEstateCustodian(estateToken, user, params))
                .to.be.revertedWithCustomError(estateToken, "Unauthorized");            
            await expect(getEstateTokenTxByParams_SafeUpdateEstateCustodian(estateToken, moderator, params))
                .to.be.revertedWithCustomError(estateToken, "Unauthorized");
        });

        it('2.4.14.5. Update estate custodian unsuccessfully when sender is not active in zone', async () => {
            const fixture = await beforeEstateTokenTest({
                addSampleEstates: true,
            });
            const { manager, admin, admins, zone1, estateToken, custodian3 } = fixture;

            await callTransaction(getAdminTxByInput_ActivateIn(
                admin,
                manager,
                {
                    zone: zone1,
                    accounts: [manager.address],
                    isActive: false,
                },
                admins
            ));

            const params: UpdateEstateCustodianParams = {
                estateId: BigNumber.from(1),
                custodian: custodian3.address,
            };
            await expect(getEstateTokenTxByParams_SafeUpdateEstateCustodian(estateToken, manager, params))
                .to.be.revertedWithCustomError(estateToken, "Unauthorized");
        });

        it('2.4.14.6. Update estate custodian unsuccessfully when paused', async () => {
            const fixture = await beforeEstateTokenTest({
                addSampleEstates: true,
                pause: true,
            });
            const { manager, estateToken, custodian3 } = fixture;

            const params: UpdateEstateCustodianParams = {
                estateId: BigNumber.from(1),
                custodian: custodian3.address,
            };
            await expect(getEstateTokenTxByParams_SafeUpdateEstateCustodian(estateToken, manager, params))
                .to.be.revertedWith("Pausable: paused");
        });

        it('2.4.14.7. Update estate custodian unsuccessfully when custodian is not registered in zone', async () => {
            const fixture = await beforeEstateTokenTest({
                addSampleEstates: true,
            });
            const { manager, estateToken, user } = fixture;

            const params: UpdateEstateCustodianParams = {
                estateId: BigNumber.from(1),
                custodian: user.address,
            };
            await expect(getEstateTokenTxByParams_SafeUpdateEstateCustodian(estateToken, manager, params))
                .to.be.revertedWithCustomError(estateToken, "InvalidCustodian");
        });
    });
});
