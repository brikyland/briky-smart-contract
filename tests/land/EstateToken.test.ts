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
import { deployMockEstateToken } from '@utils/deployments/mocks/mockEstateToken';
import { deployCommissionToken } from '@utils/deployments/land/commissionToken';
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

import { MockContract, smock } from '@defi-wonderland/smock';

import {
    callAdmin_ActivateIn,
    callAdmin_AuthorizeManagers,
    callAdmin_AuthorizeModerators,
    callAdmin_DeclareZones,
} from '@utils/callWithSignatures/admin';
import {
    callEstateToken_UpdateCommissionToken,
    callEstateToken_Pause,
    callEstateToken_AuthorizeTokenizers,
    callEstateToken_AuthorizeExtractors,
} from '@utils/callWithSignatures/estateToken';
import { BigNumber } from 'ethers';
import { randomInt } from 'crypto';
import { getBytes4Hex, getInterfaceID, randomBigNumber } from '@utils/utils';
import { OrderedMap } from '@utils/utils';
import { Initialization as LandInitialization } from '@tests/land/test.initialization';
import { deployReserveVault } from '@utils/deployments/common/reserveVault';
import { deployPriceWatcher } from '@utils/deployments/common/priceWatcher';
import { deployGovernanceHub } from '@utils/deployments/common/governanceHub';
import { deployDividendHub } from '@utils/deployments/common/dividendHub';
import { MockValidator } from '@utils/mockValidator';
import { UpdateEstateURIParams } from '@utils/models/EstateToken';
import { getUpdateEstateURIValidation } from '@utils/validation/EstateToken';

interface EstateTokenFixture {
    admin: Admin;
    feeReceiver: FeeReceiver;
    priceWatcher: PriceWatcher;
    currency: Currency;
    reserveVault: ReserveVault;
    estateToken: MockEstateToken;
    commissionToken: CommissionToken;
    governanceHub: GovernanceHub;
    dividendHub: DividendHub;
    estateLiquidator: MockContract<MockEstateLiquidator>;
    estateForger: MockContract<MockEstateForger>;
    validator: MockValidator;

    deployer: any;
    admins: any[];
    manager: any;
    moderator: any;
    user: any;
    requester1: any, requester2: any;
    commissionReceiver: any;
    depositor1: any, depositor2: any, depositor3: any;
    depositors: any[];
    zone: string;

    tokenizers: any[];
    extractors: any[];
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
        const requester1 = accounts[Constant.ADMIN_NUMBER + 5];
        const requester2 = accounts[Constant.ADMIN_NUMBER + 6];
        const commissionReceiver = accounts[Constant.ADMIN_NUMBER + 7];
        const depositor1 = accounts[Constant.ADMIN_NUMBER + 8];
        const depositor2 = accounts[Constant.ADMIN_NUMBER + 9];
        const depositor3 = accounts[Constant.ADMIN_NUMBER + 10];        
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

        const priceWatcher = await deployPriceWatcher(
            deployer.address,
            admin.address,
        ) as PriceWatcher;

        const reserveVault = await deployReserveVault(
            deployer.address,
            admin.address,
        ) as ReserveVault;

        const currency = await deployCurrency(
            deployer.address,
            'MockCurrency',
            'MCK'
        ) as Currency;

        const validator = new MockValidator(deployer as any);

        const estateToken = await deployMockEstateToken(
            deployer.address,
            admin.address,
            feeReceiver.address,
            validator.getAddress(),
            LandInitialization.ESTATE_TOKEN_BaseURI,
            LandInitialization.ESTATE_TOKEN_RoyaltyRate,
        ) as MockEstateToken;        

        const commissionToken = await deployCommissionToken(
            deployer.address,
            admin.address,
            estateToken.address,
            feeReceiver.address,
            LandInitialization.COMMISSION_TOKEN_Name,
            LandInitialization.COMMISSION_TOKEN_Symbol,
            LandInitialization.COMMISSION_TOKEN_BaseURI,
            LandInitialization.COMMISSION_TOKEN_CommissionRate,
            LandInitialization.COMMISSION_TOKEN_RoyaltyRate,
        ) as CommissionToken;

        const governanceHub = await deployGovernanceHub(
            deployer.address,
            admin.address,
            validator.getAddress(),
            Constant.GOVERNANCE_HUB_FEE,
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
                LandInitialization.ESTATE_FORGER_FeeRate,
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
                LandInitialization.ESTATE_LIQUIDATOR_FeeRate,
            ));
            extractors.push(mockEstateLiquidator);
        }
        const estateLiquidator = extractors[0];
        extractors = extractors.slice(1);

        const zone = ethers.utils.formatBytes32String("TestZone");

        return {
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
            deployer,
            admins,
            manager,
            moderator,
            user,
            requester1,
            requester2,
            commissionReceiver,
            depositor1,
            depositor2,
            depositor3,
            depositors,
            zone,
            validator,
            tokenizers,
            extractors,
        };
    };

    async function beforeEstateTokenTest({
        updateCommissionToken = false,
        authorizeEstateForger = false,
        pause = false,
        addSampleEstates = false,
        authorizeEstateLiquidator = false,
    } = {}): Promise<EstateTokenFixture> {
        const fixture = await loadFixture(estateTokenFixture);
        const { admin, admins, manager, moderator, estateToken, estateForger, commissionToken, zone, commissionReceiver, estateLiquidator } = fixture;

        await callAdmin_AuthorizeManagers(
            admin,
            admins,
            [manager.address],
            true,
            await fixture.admin.nonce()
        );

        await callAdmin_AuthorizeModerators(
            admin,
            admins,
            [moderator.address],
            true,
            await fixture.admin.nonce()
        );

        if (updateCommissionToken) {
            await callEstateToken_UpdateCommissionToken(
                estateToken,
                admins,
                commissionToken.address,
                await fixture.admin.nonce()
            );
        }
        
        if (authorizeEstateForger) {
            await callEstateToken_AuthorizeTokenizers(
                estateToken,
                admins,
                [estateForger.address],
                true,
                await fixture.admin.nonce()
            );
        }

        if (authorizeEstateLiquidator) {
            await callEstateToken_AuthorizeExtractors(
                estateToken,
                admins,
                [estateLiquidator.address],
                true,
                await fixture.admin.nonce()
            );
        }

        const baseTimestamp = await time.latest() + 1000;

        if (addSampleEstates) {
            await callAdmin_DeclareZones(
                admin,
                admins,
                [zone],
                true,
                await fixture.admin.nonce()
            );

            await callAdmin_ActivateIn(
                admin,
                admins,
                zone,
                [manager.address],
                true,
                await fixture.admin.nonce()
            );

            await time.setNextBlockTimestamp(baseTimestamp);

            await estateForger.call(estateToken.address, estateToken.interface.encodeFunctionData('tokenizeEstate', [
                10_000,
                zone,
                10,
                "Token1_URI",
                baseTimestamp + 1e8,
                commissionReceiver.address,
            ]));

            await estateForger.call(estateToken.address, estateToken.interface.encodeFunctionData('tokenizeEstate', [
                10_000,
                zone,
                20,
                "Token2_URI",
                baseTimestamp + 2e8,
                commissionReceiver.address,
            ]));
        }

        if (pause) {
            await callEstateToken_Pause(
                estateToken,
                admins,
                await fixture.admin.nonce()
            );
        }

        return fixture;
    }

    describe('2.4.1. initialize(address, address, string, uint256)', async () => {
        it('2.4.1.1. Deploy successfully', async () => {
            const { estateToken, admin, feeReceiver, validator } = await beforeEstateTokenTest();

            expect(await estateToken.paused()).to.equal(false);

            expect(await estateToken.admin()).to.equal(admin.address);
            expect(await estateToken.commissionToken()).to.equal(ethers.constants.AddressZero);
            expect(await estateToken.feeReceiver()).to.equal(feeReceiver.address);
            
            const royaltyRate = await estateToken.getRoyaltyRate();
            expect(royaltyRate.value).to.equal(LandInitialization.ESTATE_TOKEN_RoyaltyRate);
            expect(royaltyRate.decimals).to.equal(Constant.COMMON_RATE_DECIMALS);
            
            expect(await estateToken.estateNumber()).to.equal(0);
            
            expect(await estateToken.validator()).to.equal(validator.getAddress());

            expect(await estateToken.decimals()).to.equal(Constant.ESTATE_TOKEN_MAX_DECIMALS);
        });

        it('2.4.1.2. revert with invalid rate', async () => {
            const { admin, feeReceiver, validator } = await beforeEstateTokenTest();
            const EstateToken = await ethers.getContractFactory("EstateToken");

            await expect(upgrades.deployProxy(EstateToken, [
                admin.address,
                feeReceiver.address,
                validator.getAddress(),
                LandInitialization.ESTATE_TOKEN_BaseURI,
                Constant.COMMON_RATE_MAX_FRACTION.add(1),
            ])).to.be.reverted;
        });
    });

    describe('2.4.2. updateCommissionToken(address, bytes[])', async () => {
        it('2.4.2.1. updateCommissionToken successfully with valid signatures', async () => {
            const { estateToken, admin, admins, commissionToken } = await beforeEstateTokenTest();

            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "address"],
                [estateToken.address, "updateCommissionToken", commissionToken.address]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await estateToken.updateCommissionToken(commissionToken.address, signatures);
            await tx.wait();

            await expect(tx).to
                .emit(estateToken, 'CommissionTokenUpdate')
                .withArgs(commissionToken.address);

            expect(await estateToken.commissionToken()).to.equal(commissionToken.address);
        });

        it('2.4.2.2. updateCommissionToken unsuccessfully with invalid signatures', async () => {
            const { estateToken, admin, admins, commissionToken } = await beforeEstateTokenTest();

            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "address"],
                [estateToken.address, "updateCommissionToken", commissionToken.address]
            );
            const invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(estateToken.updateCommissionToken(
                commissionToken.address,
                invalidSignatures
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('2.4.2.3. updateCommissionToken unsuccessfully when already set', async () => {
            const { estateToken, admin, admins, commissionToken } = await beforeEstateTokenTest({ updateCommissionToken: true });

            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "address"],
                [estateToken.address, "updateCommissionToken", commissionToken.address]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(estateToken.updateCommissionToken(
                commissionToken.address,
                signatures
            )).to.be.revertedWithCustomError(estateToken, 'InvalidUpdating');
        });
    });

    describe('2.4.3. updateBaseURI(string, bytes[])', async () => {
        it('2.4.3.1. updateBaseURI successfully with valid signatures', async () => {
            const { estateToken, admin, admins } = 
            await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,        
            });

            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "string"],
                [estateToken.address, "updateBaseURI", "NewBaseURI:"]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await estateToken.updateBaseURI("NewBaseURI:", signatures);
            await tx.wait();

            await expect(tx).to
                .emit(estateToken, 'BaseURIUpdate')
                .withArgs("NewBaseURI:");

            expect(await estateToken.uri(1)).to.equal("NewBaseURI:Token1_URI");
            expect(await estateToken.uri(2)).to.equal("NewBaseURI:Token2_URI");
        });

        it('2.4.3.2. updateBaseURI unsuccessfully with invalid signatures', async () => {
            const { estateToken, admin, admins } = await beforeEstateTokenTest();

            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "string"],
                [estateToken.address, "updateBaseURI", "NewBaseURI:"]
            );
            const invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(estateToken.updateBaseURI(
                "NewBaseURI:",
                invalidSignatures
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });
    });

    describe('2.4.4. updateRoyaltyRate(uint256, bytes[])', async () => {
        it('2.4.4.1. updateRoyaltyRate successfully with valid signatures', async () => {
            const { estateToken, admin, admins } = await beforeEstateTokenTest();

            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256"],
                [estateToken.address, "updateRoyaltyRate", ethers.utils.parseEther('0.2')]
            );

            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await estateToken.updateRoyaltyRate(ethers.utils.parseEther('0.2'), signatures);
            await tx.wait();

            await expect(tx).to
                .emit(estateToken, 'RoyaltyRateUpdate')
                .withArgs(ethers.utils.parseEther('0.2'));

            const royaltyRate = await estateToken.getRoyaltyRate();
            expect(royaltyRate.value).to.equal(ethers.utils.parseEther('0.2'));
            expect(royaltyRate.decimals).to.equal(Constant.COMMON_RATE_DECIMALS);
        });

        it('2.4.4.2. updateRoyaltyRate unsuccessfully with invalid signatures', async () => {
            const { estateToken, admin, admins } = await beforeEstateTokenTest();

            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256"],
                [estateToken.address, "updateRoyaltyRate", ethers.utils.parseEther('0.2')]
            );
            const invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(estateToken.updateRoyaltyRate(
                ethers.utils.parseEther('0.2'),
                invalidSignatures
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('2.4.4.3. updateRoyaltyRate unsuccessfully with invalid rate', async () => {
            const { estateToken, admin, admins } = await beforeEstateTokenTest();

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256"],
                [estateToken.address, "updateRoyaltyRate", Constant.COMMON_RATE_MAX_FRACTION.add(1)]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(estateToken.updateRoyaltyRate(
                Constant.COMMON_RATE_MAX_FRACTION.add(1),
                signatures
            )).to.be.revertedWithCustomError(estateToken, 'InvalidRate');
        });
    });

    describe('2.4.5. authorizeTokenizers(address[], bool, bytes[])', async () => {
        it('2.4.5.1. Authorize tokenizers successfully with valid signatures', async () => {
            const { estateToken, admin, admins, tokenizers } = await beforeEstateTokenTest();

            const toBeTokenizers = tokenizers.slice(0, 3);

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [estateToken.address, 'authorizeTokenizers', toBeTokenizers.map(x => x.address), true]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await estateToken.authorizeTokenizers(
                toBeTokenizers.map(x => x.address),
                true,
                signatures
            );
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

        it('2.4.5.2. Authorize tokenizer unsuccessfully with invalid signatures', async () => {
            const { estateToken, admin, admins, tokenizers } = await beforeEstateTokenTest();

            const toBeTokenizers = tokenizers.slice(0, 3);

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [estateToken.address, 'authorizeTokenizers', toBeTokenizers.map(x => x.address), true]
            );
            const invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(estateToken.authorizeTokenizers(
                toBeTokenizers.map(x => x.address),
                true,
                invalidSignatures
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('2.4.5.3. Authorize tokenizer reverted without reason with EOA address', async () => {
            const { estateToken, admin, admins } = await beforeEstateTokenTest();

            const invalidTokenizer = randomWallet();

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [estateToken.address, 'authorizeTokenizers', [invalidTokenizer.address], true]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(estateToken.authorizeTokenizers(
                [invalidTokenizer.address],
                true,
                signatures
            )).to.be.revertedWithCustomError(estateToken, 'InvalidTokenizer');
        })

        it('2.4.5.4. Authorize tokenizer reverted with contract not supporting EstateTokenizer interface', async () => {
            const { estateToken, admin, admins } = await beforeEstateTokenTest();

            const invalidTokenizer = estateToken;

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [estateToken.address, 'authorizeTokenizers', [invalidTokenizer.address], true]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(estateToken.authorizeTokenizers(
                [invalidTokenizer.address],
                true,
                signatures
            )).to.be.revertedWithCustomError(estateToken, 'InvalidTokenizer');
        })

        it('2.4.5.5. Authorize tokenizer unsuccessfully when authorizing same account twice on same tx', async () => {
            const { estateToken, admin, admins, tokenizers } = await beforeEstateTokenTest();

            const duplicateTokenizers = [tokenizers[0], tokenizers[1], tokenizers[2], tokenizers[0]];

            let message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [estateToken.address, 'authorizeTokenizers', duplicateTokenizers.map(x => x.address), true]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(estateToken.authorizeTokenizers(
                duplicateTokenizers.map(x => x.address),
                true,
                signatures
            )).to.be.revertedWithCustomError(estateToken, `AuthorizedAccount`)
        });

        it('2.4.5.6. Authorize tokenizer unsuccessfully when authorizing same account twice on different tx', async () => {
            const { estateToken, admin, admins, tokenizers } = await beforeEstateTokenTest();

            const tx1Tokenizers = tokenizers.slice(0, 3);

            let message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [estateToken.address, 'authorizeTokenizers', tx1Tokenizers.map(x => x.address), true]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            await callTransaction(estateToken.authorizeTokenizers(
                tx1Tokenizers.map(x => x.address),
                true,
                signatures
            ));

            const tx2Tokenizers = [tokenizers[3], tokenizers[2], tokenizers[4]];

            message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [estateToken.address, 'authorizeTokenizers', tx2Tokenizers.map(x => x.address), true]
            );
            signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(estateToken.authorizeTokenizers(
                tx2Tokenizers.map(x => x.address),
                true,
                signatures
            )).to.be.revertedWithCustomError(estateToken, `AuthorizedAccount`)
        })

        async function setupTokenizers(estateToken: EstateToken, admin: Admin, admins: any[], tokenizers: any[]) {
            await callEstateToken_AuthorizeTokenizers(
                estateToken,
                admins,
                tokenizers.map(x => x.address),
                true,
                await admin.nonce(),
            );
        }

        it('2.4.5.7. Deauthorize tokenizer successfully', async () => {
            const { estateToken, admin, admins, tokenizers } = await beforeEstateTokenTest();

            await setupTokenizers(estateToken, admin, admins, tokenizers);

            const toDeauth = tokenizers.slice(0, 2);

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [estateToken.address, 'authorizeTokenizers', toDeauth.map(x => x.address), false]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await estateToken.authorizeTokenizers(
                toDeauth.map(x => x.address),
                false,
                signatures
            );
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

        it('2.4.5.8. Deauthorize tokenizer unsuccessfully with unauthorized account', async () => {
            const { estateToken, admin, admins, tokenizers } = await beforeEstateTokenTest();

            await setupTokenizers(estateToken, admin, admins, tokenizers);

            const account = randomWallet();
            const toDeauth = [tokenizers[0], account];

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [estateToken.address, 'authorizeTokenizers', toDeauth.map(x => x.address), false]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(estateToken.authorizeTokenizers(
                toDeauth.map(x => x.address),
                false,
                signatures
            )).to.be.revertedWithCustomError(estateToken, `NotAuthorizedAccount`)
        });

        it('2.4.5.9. Deauthorize tokenizer unsuccessfully when unauthorizing same accounts twice on same tx', async () => {
            const { estateToken, admin, admins, tokenizers } = await beforeEstateTokenTest();

            await setupTokenizers(estateToken, admin, admins, tokenizers);

            const toDeauth = tokenizers.slice(0, 2).concat([tokenizers[0]]);

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [estateToken.address, 'authorizeTokenizers', toDeauth.map(x => x.address), false]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(estateToken.authorizeTokenizers(
                toDeauth.map(x => x.address),
                false,
                signatures
            )).to.be.revertedWithCustomError(estateToken, `NotAuthorizedAccount`)
        });

        it('2.4.5.10. Deauthorize tokenizer unsuccessfully when unauthorizing same accounts twice on different tx', async () => {
            const { estateToken, admin, admins, tokenizers } = await beforeEstateTokenTest();

            await setupTokenizers(estateToken, admin, admins, tokenizers);

            const tx1Accounts = tokenizers.slice(0, 2);
            await callEstateToken_AuthorizeTokenizers(
                estateToken,
                admins,
                tx1Accounts.map(x => x.address),
                false,
                await admin.nonce()
            );

            const tx2Accounts = [tokenizers[0]];
            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [estateToken.address, 'authorizeTokenizers', tx2Accounts.map(x => x.address), false]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(estateToken.authorizeTokenizers(
                tx2Accounts.map(x => x.address),
                false,
                signatures
            )).to.be.revertedWithCustomError(estateToken, `NotAuthorizedAccount`)
        });
    });

    describe('2.4.6. authorizeExtractors(address[], bool, bytes[])', async () => {
        it('2.4.6.1. Authorize extractors successfully with valid signatures', async () => {
            const { estateToken, admin, admins, extractors } = await beforeEstateTokenTest();

            const toBeExtractors = extractors.slice(0, 3);

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [estateToken.address, 'authorizeExtractors', toBeExtractors.map(x => x.address), true]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await estateToken.authorizeExtractors(
                toBeExtractors.map(x => x.address),
                true,
                signatures
            );
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

        it('2.4.6.2. Authorize extractor unsuccessfully with invalid signatures', async () => {
            const { estateToken, admin, admins, extractors } = await beforeEstateTokenTest();

            const toBeExtractors = extractors.slice(0, 3);

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [estateToken.address, 'authorizeExtractors', toBeExtractors.map(x => x.address), true]
            );
            const invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(estateToken.authorizeExtractors(
                toBeExtractors.map(x => x.address),
                true,
                invalidSignatures
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('2.4.6.3. Authorize extractor unsuccessfully when authorizing same account twice on same tx', async () => {
            const { estateToken, admin, admins, extractors } = await beforeEstateTokenTest();

            const duplicateExtractors = [extractors[0], extractors[1], extractors[2], extractors[0]];

            let message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [estateToken.address, 'authorizeExtractors', duplicateExtractors.map(x => x.address), true]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(estateToken.authorizeExtractors(
                duplicateExtractors.map(x => x.address),
                true,
                signatures
            )).to.be.revertedWithCustomError(estateToken, `AuthorizedAccount`)
        });

        it('2.4.6.4. Authorize extractor unsuccessfully when authorizing same account twice on different tx', async () => {
            const { estateToken, admin, admins, extractors } = await beforeEstateTokenTest();

            const tx1Extractors = extractors.slice(0, 3);

            let message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [estateToken.address, 'authorizeExtractors', tx1Extractors.map(x => x.address), true]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            await callTransaction(estateToken.authorizeExtractors(
                tx1Extractors.map(x => x.address),
                true,
                signatures
            ));

            const tx2Extractors = [extractors[3], extractors[2], extractors[4]];

            message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [estateToken.address, 'authorizeExtractors', tx2Extractors.map(x => x.address), true]
            );
            signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(estateToken.authorizeExtractors(
                tx2Extractors.map(x => x.address),
                true,
                signatures
            )).to.be.revertedWithCustomError(estateToken, `AuthorizedAccount`)
        })

        async function setupExtractors(estateToken: EstateToken, admin: Admin, admins: any[], extractors: any[]) {
            await callEstateToken_AuthorizeExtractors(
                estateToken,
                admins,
                extractors.map(x => x.address),
                true,
                await admin.nonce(),
            );
        }

        it('2.4.6.5. Deauthorize extractor successfully', async () => {
            const { estateToken, admin, admins, extractors } = await beforeEstateTokenTest();

            await setupExtractors(estateToken, admin, admins, extractors);

            const toDeauth = extractors.slice(0, 2);

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [estateToken.address, 'authorizeExtractors', toDeauth.map(x => x.address), false]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await estateToken.authorizeExtractors(
                toDeauth.map(x => x.address),
                false,
                signatures
            );
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

        it('2.4.6.6. Deauthorize extractor unsuccessfully with unauthorized account', async () => {
            const { estateToken, admin, admins, extractors } = await beforeEstateTokenTest();

            await setupExtractors(estateToken, admin, admins, extractors);

            const account = randomWallet();
            const toDeauth = [extractors[0], account];

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [estateToken.address, 'authorizeExtractors', toDeauth.map(x => x.address), false]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(estateToken.authorizeExtractors(
                toDeauth.map(x => x.address),
                false,
                signatures
            )).to.be.revertedWithCustomError(estateToken, `NotAuthorizedAccount`)
        });

        it('2.4.6.7. Deauthorize extractor unsuccessfully when unauthorizing same accounts twice on same tx', async () => {
            const { estateToken, admin, admins, extractors } = await beforeEstateTokenTest();

            await setupExtractors(estateToken, admin, admins, extractors);

            const toDeauth = extractors.slice(0, 2).concat([extractors[0]]);

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [estateToken.address, 'authorizeExtractors', toDeauth.map(x => x.address), false]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(estateToken.authorizeExtractors(
                toDeauth.map(x => x.address),
                false,
                signatures
            )).to.be.revertedWithCustomError(estateToken, `NotAuthorizedAccount`)
        });

        it('2.4.6.8. Deauthorize extractor unsuccessfully when unauthorizing same accounts twice on different tx', async () => {
            const { estateToken, admin, admins, extractors } = await beforeEstateTokenTest();

            await setupExtractors(estateToken, admin, admins, extractors);

            const tx1Accounts = extractors.slice(0, 2);
            await callEstateToken_AuthorizeExtractors(
                estateToken,
                admins,
                tx1Accounts.map(x => x.address),
                false,
                await admin.nonce()
            );

            const tx2Accounts = [extractors[0]];
            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [estateToken.address, 'authorizeExtractors', tx2Accounts.map(x => x.address), false]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(estateToken.authorizeExtractors(
                tx2Accounts.map(x => x.address),
                false,
                signatures
            )).to.be.revertedWithCustomError(estateToken, `NotAuthorizedAccount`)
        });
    });

    describe('2.4.6. tokenizeEstate(uint256, bytes32, uint256, string, uint40, uint8, address)', async () => {
        interface DefaultParam {
            totalSupply: number;
            zone: string;
            tokenizationId: number;
            uri: string;
            expireAt: number;
            commissionReceiverAddress: string;
        };

        async function beforeTokenizeEstateTest(fixture: EstateTokenFixture): Promise<{
            baseTimestamp: number;
            defaultParams: DefaultParam;
        }> {
            const baseTimestamp = await time.latest() + 1000;
            const defaultParams = {
                totalSupply: 10_000,
                zone: ethers.utils.formatBytes32String("TestZone"),
                tokenizationId: 10,
                uri: "Token1_URI",
                expireAt: baseTimestamp + 100,
                commissionReceiverAddress: ethers.constants.AddressZero,
            }
            return { baseTimestamp, defaultParams };
        };

        it('2.4.6.1. tokenize estate successfully with commission receiver', async () => {
            const fixture = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
            });
            const { admin, admins, estateToken, estateForger, commissionToken } = fixture;
            const { baseTimestamp, defaultParams } = await beforeTokenizeEstateTest(fixture);
            defaultParams.commissionReceiverAddress = commissionToken.address;

            await callAdmin_DeclareZones(
                admin,
                admins,
                [defaultParams.zone],
                true,
                await admin.nonce()
            );

            await time.setNextBlockTimestamp(baseTimestamp);

            let tx = await estateForger.call(estateToken.address, estateToken.interface.encodeFunctionData('tokenizeEstate', [
                defaultParams.totalSupply,
                defaultParams.zone,
                defaultParams.tokenizationId,
                defaultParams.uri,
                defaultParams.expireAt,
                defaultParams.commissionReceiverAddress,
            ]));

            await tx.wait();

            await expect(tx).to
                .emit(estateToken, 'NewToken')
                .withArgs(
                    1,
                    defaultParams.zone,
                    defaultParams.tokenizationId,
                    estateForger.address,
                    defaultParams.expireAt,
                );

            const estate = await estateToken.getEstate(1);
            expect(estate.zone).to.equal(defaultParams.zone);
            expect(estate.tokenizationId).to.equal(defaultParams.tokenizationId);
            expect(estate.tokenizer).to.equal(estateForger.address);
            expect(estate.tokenizeAt).to.equal(baseTimestamp);
            expect(estate.expireAt).to.equal(defaultParams.expireAt);
            expect(estate.deprecateAt).to.equal(Constant.COMMON_INFINITE_TIMESTAMP);

            expect(await estateToken.uri(1)).to.equal(LandInitialization.ESTATE_TOKEN_BaseURI + defaultParams.uri);

            expect(await estateToken.balanceOf(estateForger.address, 1)).to.equal(10_000);

            expect(await commissionToken.ownerOf(1)).to.equal(defaultParams.commissionReceiverAddress);
        });

        it('2.4.6.2. tokenize estate unsuccessfully with no commission receiver', async () => {
            const fixture = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
            });
            const { admin, admins, estateToken, estateForger } = fixture;
            const { baseTimestamp, defaultParams } = await beforeTokenizeEstateTest(fixture);

            await callAdmin_DeclareZones(
                admin,
                admins,
                [defaultParams.zone],
                true,
                await admin.nonce()
            );

            await time.setNextBlockTimestamp(baseTimestamp);

            await expect(estateForger.call(estateToken.address, estateToken.interface.encodeFunctionData('tokenizeEstate', [
                defaultParams.totalSupply,
                defaultParams.zone,
                defaultParams.tokenizationId,
                defaultParams.uri,
                defaultParams.expireAt,
                defaultParams.commissionReceiverAddress,
            ]))).to.be.revertedWith("ERC721: mint to the zero address");

        });

        it('2.4.6.3. tokenize estate unsuccessfully when tokenizer is not authorized', async () => {
            const fixture = await beforeEstateTokenTest({
                updateCommissionToken: true,
            });
            const { admin, admins, estateToken, estateForger } = fixture;
            const { baseTimestamp, defaultParams } = await beforeTokenizeEstateTest(fixture);

            await callAdmin_DeclareZones(
                admin,
                admins,
                [defaultParams.zone],
                true,
                await admin.nonce()
            );

            await time.setNextBlockTimestamp(baseTimestamp);

            await expect(estateForger.call(estateToken.address, estateToken.interface.encodeFunctionData('tokenizeEstate', [
                defaultParams.totalSupply,
                defaultParams.zone,
                defaultParams.tokenizationId,
                defaultParams.uri,
                defaultParams.expireAt,
                defaultParams.commissionReceiverAddress,
            ]))).to.be.revertedWithCustomError(estateToken, `Unauthorized`);
        });

        it('2.4.6.4. tokenize estate unsuccessfully when zone is not declared', async () => {
            const fixture = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
            });
            const { admin, admins, estateToken, estateForger } = fixture;
            const { baseTimestamp, defaultParams } = await beforeTokenizeEstateTest(fixture);

            await time.setNextBlockTimestamp(baseTimestamp);

            await expect(estateForger.call(estateToken.address, estateToken.interface.encodeFunctionData('tokenizeEstate', [
                defaultParams.totalSupply,
                defaultParams.zone,
                defaultParams.tokenizationId,
                defaultParams.uri,
                defaultParams.expireAt,
                defaultParams.commissionReceiverAddress,
            ]))).to.be.revertedWithCustomError(estateToken, `InvalidInput`);
        });

        it('2.4.6.5. tokenize estate unsuccessfully with expired estate', async () => {
            const fixture = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
            });
            const { admin, admins, estateToken, estateForger } = fixture;
            const { baseTimestamp, defaultParams } = await beforeTokenizeEstateTest(fixture);

            await callAdmin_DeclareZones(
                admin,
                admins,
                [defaultParams.zone],
                true,
                await admin.nonce()
            );

            await time.setNextBlockTimestamp(baseTimestamp);

            await expect(estateForger.call(estateToken.address, estateToken.interface.encodeFunctionData('tokenizeEstate', [
                defaultParams.totalSupply,
                defaultParams.zone,
                defaultParams.tokenizationId,
                defaultParams.uri,
                baseTimestamp,
                defaultParams.commissionReceiverAddress,
            ]))).to.be.revertedWithCustomError(estateToken, `InvalidTimestamp`);

            await expect(estateForger.call(estateToken.address, estateToken.interface.encodeFunctionData('tokenizeEstate', [
                defaultParams.totalSupply,
                defaultParams.zone,
                defaultParams.tokenizationId,
                defaultParams.uri,
                baseTimestamp - 100,
                defaultParams.commissionReceiverAddress,
            ]))).to.be.revertedWithCustomError(estateToken, `InvalidTimestamp`);
        });

        it('2.4.6.6. tokenize estate unsuccessfully when commission token is not set', async () => {
            const fixture = await beforeEstateTokenTest({
                updateCommissionToken: false,
                authorizeEstateForger: true,
            });
            const { admin, admins, estateToken, estateForger, commissionToken } = fixture;
            const { baseTimestamp, defaultParams } = await beforeTokenizeEstateTest(fixture);
            defaultParams.commissionReceiverAddress = commissionToken.address;

            await callAdmin_DeclareZones(
                admin,
                admins,
                [defaultParams.zone],
                true,
                await admin.nonce()
            );

            await time.setNextBlockTimestamp(baseTimestamp);

            await expect(estateForger.call(estateToken.address, estateToken.interface.encodeFunctionData('tokenizeEstate', [
                defaultParams.totalSupply,
                defaultParams.zone,
                defaultParams.tokenizationId,
                defaultParams.uri,
                defaultParams.expireAt,
                defaultParams.commissionReceiverAddress,
            ]))).to.be.revertedWith("CallUtils: target revert()");
        });
    });

    describe('2.4.7. getEstate(uint256)', () => {
        it('2.4.7.1. succeed with existing estate id', async () => {
            const { estateToken } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,                
            });

            await estateToken.getEstate(1);
            await estateToken.getEstate(2);
        });

        it('2.4.7.2. revert with non-existing estate id', async () => {
            const { estateToken } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
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
        it('2.4.8.1. return true for existing, not deprecated, and not expired estate', async () => {
            const { estateToken } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,
            });

            expect(await estateToken.isAvailable(1)).to.equal(true);
            expect(await estateToken.isAvailable(2)).to.equal(true);
        });

        it('2.4.8.2. return false for non-existing estate', async () => {
            const { estateToken } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,
            });

            expect(await estateToken.isAvailable(0)).to.equal(false);
            expect(await estateToken.isAvailable(3)).to.equal(false);
            expect(await estateToken.isAvailable(100)).to.equal(false);
        });

        it('2.4.8.3. return false for deprecated estate', async () => {
            const { estateToken, manager } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,
            });

            await callTransaction(estateToken.connect(manager).deprecateEstate(1));
            expect(await estateToken.isAvailable(1)).to.equal(false);
            expect(await estateToken.isAvailable(2)).to.equal(true);

            await callTransaction(estateToken.connect(manager).deprecateEstate(2));
            expect(await estateToken.isAvailable(1)).to.equal(false);
            expect(await estateToken.isAvailable(2)).to.equal(false);
        });

        it('2.4.8.4. return false for expired estate', async () => {
            const { estateToken } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
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

    describe('2.4.9. deprecateEstate(uint256)', () => {
        it('2.4.9.1. deprecate estate successfully', async () => {
            const { estateToken, manager } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,
            });

            const baseTimestamp = await time.latest() + 100;
            await time.setNextBlockTimestamp(baseTimestamp);

            let tx = await estateToken.connect(manager).deprecateEstate(1);
            await tx.wait();

            await expect(tx)
                .to.emit(estateToken, "EstateDeprecation")
                .withArgs(1);
            expect((await estateToken.getEstate(1)).deprecateAt).to.equal(baseTimestamp);

            await time.setNextBlockTimestamp(baseTimestamp + 100);

            tx = await estateToken.connect(manager).deprecateEstate(2);
            await tx.wait();

            await expect(tx)
                .to.emit(estateToken, "EstateDeprecation")
                .withArgs(2);
            expect((await estateToken.getEstate(2)).deprecateAt).to.equal(baseTimestamp + 100);
        });

        it('2.4.9.2. deprecate estate unsuccessfully with non-existing estate id', async () => {
            const { estateToken, manager } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,
            });

            await expect(estateToken.connect(manager).deprecateEstate(0))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");

            await expect(estateToken.connect(manager).deprecateEstate(3))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");

            await expect(estateToken.connect(manager).deprecateEstate(100))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");
        });

        it('2.4.9.3. deprecate estate unsuccessfully with deprecated estate', async () => {
            const { estateToken, manager } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,
            });

            await callTransaction(estateToken.connect(manager).deprecateEstate(1));
            await expect(estateToken.connect(manager).deprecateEstate(1))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");

            await callTransaction(estateToken.connect(manager).deprecateEstate(2));
            await expect(estateToken.connect(manager).deprecateEstate(2))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");
        });

        it('2.4.9.4. deprecate estate unsuccessfully by unauthorized sender', async () => {
            const { estateToken, user, moderator } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,
            });

            await expect(estateToken.connect(user).deprecateEstate(1))
                .to.be.revertedWithCustomError(estateToken, "Unauthorized");

            await expect(estateToken.connect(moderator).deprecateEstate(1))
                .to.be.revertedWithCustomError(estateToken, "Unauthorized");
        });

        it('2.4.9.5. deprecate estate unsuccessfully when zone is not declared', async () => {
            const { estateToken, manager, admin, admins, zone } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,
            });

            await callAdmin_DeclareZones(
                admin,
                admins,
                [zone],
                false,
                await admin.nonce()
            );

            await expect(estateToken.connect(manager).deprecateEstate(1))
                .to.be.revertedWithCustomError(estateToken, "Unauthorized");
        });

        it('2.4.9.6. deprecate estate unsuccessfully when sender is not active in zone', async () => {
            const { estateToken, manager, admin, admins, zone } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,
            });

            await callAdmin_ActivateIn(
                admin,
                admins,
                zone,
                [manager.address],
                false,
                await admin.nonce()
            );

            await expect(estateToken.connect(manager).deprecateEstate(1))
                .to.be.revertedWithCustomError(estateToken, "Unauthorized");
        });

        it('2.4.9.7. deprecate estate unsuccessfully when paused', async () => {
            const { estateToken, manager } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,
                pause: true,
            });

            await expect(estateToken.connect(manager).deprecateEstate(1))
                .to.be.revertedWith("Pausable: paused");
        });
    });

    describe('2.4.10. extendEstateExpiration(uint256, uint40)', () => {
        it('2.4.10.1. extend estate expiration successfully by manager with valid estate', async () => {
            const { estateToken, manager } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,
            });

            const baseTimestamp = await time.latest() + 1000;

            let tx = await estateToken.connect(manager).extendEstateExpiration(1, baseTimestamp + 1e9);
            await tx.wait();

            await expect(tx)
                .to.emit(estateToken, "EstateExpirationExtension")
                .withArgs(1, baseTimestamp + 1e9);

            expect((await estateToken.getEstate(1)).expireAt).to.equal(baseTimestamp + 1e9);

            tx = await estateToken.connect(manager).extendEstateExpiration(1, baseTimestamp + 1e9 + 10);
            await tx.wait();

            await expect(tx)
                .to.emit(estateToken, "EstateExpirationExtension")
                .withArgs(1, baseTimestamp + 1e9 + 10);

            expect((await estateToken.getEstate(1)).expireAt).to.equal(baseTimestamp + 1e9 + 10);
        });

        it('2.4.10.2. extend estate expiration unsuccessfully with non-existing estate', async () => {
            const { estateToken, manager } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,
            });

            const baseTimestamp = await time.latest() + 1000;

            await expect(estateToken.connect(manager).extendEstateExpiration(0, baseTimestamp + 1e9))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");

            await expect(estateToken.connect(manager).extendEstateExpiration(3, baseTimestamp + 1e9))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");

            await expect(estateToken.connect(manager).extendEstateExpiration(100, baseTimestamp + 1e9))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");
        });

        it('2.4.10.3. extend estate expiration unsuccessfully with deprecated estate', async () => {
            const { estateToken, manager } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,
            });
            const baseTimestamp = await time.latest() + 1000;

            await callTransaction(estateToken.connect(manager).deprecateEstate(1));
            await expect(estateToken.connect(manager).extendEstateExpiration(1, baseTimestamp + 1e9))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");
        });

        it('2.4.10.4. extend estate expiration unsuccessfully by non-manager sender', async () => {
            const { estateToken, user, moderator } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,
            });
            const baseTimestamp = await time.latest() + 1000;

            await expect(estateToken.connect(user).extendEstateExpiration(1, baseTimestamp + 1e9))
                .to.be.revertedWithCustomError(estateToken, "Unauthorized");

            await expect(estateToken.connect(moderator).extendEstateExpiration(1, baseTimestamp + 1e9))
                .to.be.revertedWithCustomError(estateToken, "Unauthorized");
        });

        it('2.4.10.5. extend estate expiration unsuccessfully when zone is not declared', async () => {
            const { estateToken, manager, admin, admins, zone } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,
            });
            const baseTimestamp = await time.latest() + 1000;

            await callAdmin_DeclareZones(
                admin,
                admins,
                [zone],
                false,
                await admin.nonce()
            );

            await expect(estateToken.connect(manager).extendEstateExpiration(1, baseTimestamp + 1e9))
                .to.be.revertedWithCustomError(estateToken, "Unauthorized");
        });

        it('2.4.10.6. extend estate expiration unsuccessfully when sender is not active in zone', async () => {
            const { estateToken, manager, admin, admins, zone } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,
            });
            const baseTimestamp = await time.latest() + 1000;
            
            await callAdmin_ActivateIn(
                admin,
                admins,
                zone,
                [manager.address],
                false,
                await admin.nonce()
            );

            await expect(estateToken.connect(manager).extendEstateExpiration(1, baseTimestamp + 1e9))
                .to.be.revertedWithCustomError(estateToken, "Unauthorized");
        });

        it('2.4.10.7. extend estate expiration unsuccessfully with invalid new expire timestamp', async () => {
            const { estateToken, manager } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,
            });
            const baseTimestamp = await time.latest();

            await expect(estateToken.connect(manager).extendEstateExpiration(1, baseTimestamp - 1))
                .to.be.revertedWithCustomError(estateToken, "InvalidTimestamp");
        });

        it('2.4.10.8. extend estate expiration unsuccessfully when paused', async () => {
            const { estateToken, manager } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,
                pause: true,
            });

            const expireAt = (await estateToken.getEstate(1)).expireAt;

            await expect(estateToken.connect(manager).extendEstateExpiration(1, expireAt + 1e9))
                .to.be.revertedWith("Pausable: paused");
        });
    });

    describe('2.4.11. updateEstateURI(uint256, string)', () => {
        async function beforeUpdateEstateURITest(fixture: EstateTokenFixture): Promise<{
            defaultParams: UpdateEstateURIParams;
        }> {
            const defaultParams = {
                estateId: ethers.BigNumber.from(1),
                uri: 'new_URI_1',
            };
            return { defaultParams };
        }

        async function expectRevertWithCustomError(
            fixture: EstateTokenFixture,
            manager: any,
            params: UpdateEstateURIParams,
            error: string
        ) {
            const { estateToken, validator } = fixture;
            const validation = await getUpdateEstateURIValidation(estateToken, validator, params);
            await expect(estateToken.connect(manager).updateEstateURI(
                params.estateId,
                params.uri,
                validation
            )).to.be.revertedWithCustomError(estateToken, error);
        }

        async function expectRevert(
            fixture: EstateTokenFixture,
            manager: any,
            params: UpdateEstateURIParams,
            error: string
        ) {
            const { estateToken, validator } = fixture;
            const validation = await getUpdateEstateURIValidation(estateToken, validator, params);
            await expect(estateToken.connect(manager).updateEstateURI(
                params.estateId,
                params.uri,
                validation
            )).to.be.revertedWith(error);
        }

        it('2.4.11.1. update estate URI successfully by manager with available estate', async () => {
            const fixture = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,
            });
            const { estateToken, manager, validator } = fixture;

            const params1 = {
                estateId: BigNumber.from(1),
                uri: 'new_URI_1',
            };
            const validation1 = await getUpdateEstateURIValidation(estateToken, validator, params1);
            
            const tx1 = await estateToken.connect(manager).updateEstateURI(
                params1.estateId,
                params1.uri,
                validation1
            );
            await tx1.wait();

            await expect(tx1).to.emit(estateToken, "URI").withArgs(
                LandInitialization.ESTATE_TOKEN_BaseURI + 'new_URI_1',
                params1.estateId
            );

            expect(await estateToken.uri(params1.estateId)).to.equal(LandInitialization.ESTATE_TOKEN_BaseURI + 'new_URI_1');
            
            const params2 = {
                estateId: BigNumber.from(2),
                uri: 'new_URI_2',
            };
            const validation2 = await getUpdateEstateURIValidation(estateToken, validator, params2);

            const tx2 = await estateToken.connect(manager).updateEstateURI(
                params2.estateId,
                params2.uri,
                validation2
            );
            await tx2.wait();

            await expect(tx2).to.emit(estateToken, "URI").withArgs(
                LandInitialization.ESTATE_TOKEN_BaseURI + 'new_URI_2',
                params2.estateId
            );

            expect(await estateToken.uri(params2.estateId)).to.equal(LandInitialization.ESTATE_TOKEN_BaseURI + 'new_URI_2');
        });

        it('2.4.11.2. update estate URI unsuccessfully with unavailable estate', async () => {
            const fixture = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,
            });

            const { estateToken, manager } = fixture;
            const { defaultParams } = await beforeUpdateEstateURITest(fixture);

            await expectRevertWithCustomError(
                fixture,
                manager,
                { ...defaultParams, estateId: BigNumber.from(0) },
                "InvalidEstateId"
            );
            await expectRevertWithCustomError(
                fixture,
                manager,
                { ...defaultParams, estateId: BigNumber.from(100) },
                "InvalidEstateId"
            );

            await callTransaction(estateToken.connect(manager).deprecateEstate(1));
            await expectRevertWithCustomError(
                fixture,
                manager,
                { ...defaultParams, estateId: BigNumber.from(1) },
                "InvalidEstateId"
            );
        });

        it('2.4.11.3. update estate URI unsuccessfully by non-manager sender', async () => {
            const fixture = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,
            });
            const { user, moderator } = fixture;
            const { defaultParams } = await beforeUpdateEstateURITest(fixture);

            await expectRevertWithCustomError(
                fixture,
                user,
                defaultParams,
                "Unauthorized"
            );
            await expectRevertWithCustomError(
                fixture,
                moderator,
                defaultParams,
                "Unauthorized"
            );
        });

        it('2.4.11.4. update estate URI unsuccessfully when zone is not declared', async () => {
            const fixture = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,
            });
            const { admin, admins, zone, manager } = fixture;
            const { defaultParams } = await beforeUpdateEstateURITest(fixture);

            await callAdmin_DeclareZones(
                admin,
                admins,
                [zone],
                false,
                await admin.nonce()
            );

            await expectRevertWithCustomError(
                fixture,
                manager,
                defaultParams,
                "Unauthorized"
            );
        });

        it('2.4.11.5. update estate URI unsuccessfully when sender is not active in zone', async () => {
            const fixture = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,
            });
            const { manager, admin, admins, zone } = fixture;

            await callAdmin_ActivateIn(
                admin,
                admins,
                zone,
                [manager.address],
                false,
                await admin.nonce()
            );
            const { defaultParams } = await beforeUpdateEstateURITest(fixture);

            await expectRevertWithCustomError(
                fixture,
                manager,
                defaultParams,
                "Unauthorized"
            );
        });

        it('2.4.11.6. update estate URI unsuccessfully when paused', async () => {
            const fixture = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,
                pause: true,
            });
            const { manager } = fixture;
            const { defaultParams } = await beforeUpdateEstateURITest(fixture);

            await expectRevert(
                fixture,
                manager,
                defaultParams,
                "Pausable: paused"
            );
        });
    });

    describe('2.4.12. extractEstate(uint256, uint256)', () => {
        it('2.4.12.1. extract estate successfully by extractor', async () => {
            const fixture = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                authorizeEstateLiquidator: true,
                addSampleEstates: true,
            });
            const { estateToken, estateLiquidator } = fixture;

            const estateId1 = 1;
            const extractionId1 = 2;

            let timestamp = await time.latest() + 100;
            await time.setNextBlockTimestamp(timestamp);

            const tx1 = await estateLiquidator.call(
                estateToken.address,
                estateToken.interface.encodeFunctionData("extractEstate", [estateId1, extractionId1])
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

            const tx2 = await estateLiquidator.call(
                estateToken.address,
                estateToken.interface.encodeFunctionData("extractEstate", [estateId2, extractionId2])
            );
            await tx2.wait();

            await expect(tx2).to.emit(estateToken, "EstateExtraction").withArgs(
                estateId2,
                extractionId2
            );

            const estate2 = await estateToken.getEstate(estateId2);
            expect(estate2.deprecateAt).to.equal(timestamp);
        });

        it('2.4.12.2. extract estate unsuccessfully with invalid estate id', async () => {
            const fixture = await beforeEstateTokenTest();

            const { estateToken, estateLiquidator } = fixture;

            await expect(estateLiquidator.call(
                estateToken.address,
                estateToken.interface.encodeFunctionData("extractEstate", [0, 1])
            )).to.be.revertedWithCustomError(estateToken, "InvalidEstateId");

            await expect(estateLiquidator.call(
                estateToken.address,
                estateToken.interface.encodeFunctionData("extractEstate", [100, 1])
            )).to.be.revertedWithCustomError(estateToken, "InvalidEstateId");
        });

        it('2.4.12.3. extract estate unsuccessfully when paused', async () => {
            const fixture = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                authorizeEstateLiquidator: true,
                addSampleEstates: true,
                pause: true,
            });

            const { estateToken, estateLiquidator } = fixture;

            await expect(estateLiquidator.call(
                estateToken.address,
                estateToken.interface.encodeFunctionData("extractEstate", [1, 1])
            )).to.be.revertedWith("Pausable: paused");
        });

        it('2.4.12.4. extract estate unsuccessfully when estate liquidator is not authorized', async () => {
            const fixture = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,
            });

            const { estateToken, estateLiquidator } = fixture;

            await expect(estateLiquidator.call(
                estateToken.address,
                estateToken.interface.encodeFunctionData("extractEstate", [1, 1])
            )).to.be.revertedWithCustomError(estateToken, "Unauthorized");
        });
    });

    describe('2.4.13. zoneOf(uint256)', () => {
        it('2.4.13.1. return correct zone with available estate', async () => {
            const fixture = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,
            });
            const { estateToken, zone } = fixture;

            expect(await estateToken.zoneOf(1)).to.equal(zone);
            expect(await estateToken.zoneOf(2)).to.equal(zone);
        });

        it('2.4.13.2. revert with invalid estate id', async () => {
            const fixture = await beforeEstateTokenTest();

            const { estateToken } = fixture;

            await expect(estateToken.zoneOf(0))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");
            await expect(estateToken.zoneOf(100))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");
        });
    });

    describe('2.4.12. balanceOf(address, uint256)', () => {
        it('2.4.12.1. return correct estate token balance for available estate', async () => {
            const { estateToken, depositor1, depositor2 } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,
            });

            await callTransaction(estateToken.mint(depositor1.address, 1, 10_000));
            await callTransaction(estateToken.mint(depositor2.address, 2, 500));

            expect(await estateToken.balanceOf(depositor1.address, 1)).to.equal(10_000);
            expect(await estateToken.balanceOf(depositor2.address, 2)).to.equal(500);
        });

        it('2.4.12.2. return 0 for invalid estate id', async () => {
            const { estateToken, depositor1 } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,
            });

            expect(await estateToken.balanceOf(depositor1.address, 0)).to.equal(0);
            expect(await estateToken.balanceOf(depositor1.address, 3)).to.equal(0);
            expect(await estateToken.balanceOf(depositor1.address, 100)).to.equal(0);
        });

        it('2.4.12.3. return 0 for deprecated estate', async () => {
            const { estateToken, manager, depositor1, depositor2 } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,
            });

            await callTransaction(estateToken.mint(depositor1.address, 1, 10_000));
            await callTransaction(estateToken.mint(depositor2.address, 2, 500));

            await callTransaction(estateToken.connect(manager).deprecateEstate(1));
            await callTransaction(estateToken.connect(manager).deprecateEstate(2));

            expect(await estateToken.balanceOf(depositor1.address, 1)).to.equal(0);
            expect(await estateToken.balanceOf(depositor2.address, 2)).to.equal(0);
        });

        it('2.4.12.4. return 0 for expired estate', async () => {
            const { estateToken, depositor1, depositor2 } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,
            });

            await callTransaction(estateToken.mint(depositor1.address, 1, 10_000));
            await callTransaction(estateToken.mint(depositor2.address, 2, 500));

            const maxExpireAt = Math.max(
                (await estateToken.getEstate(1)).expireAt,
                (await estateToken.getEstate(2)).expireAt
            );
            await time.increaseTo(maxExpireAt);
            expect(await estateToken.balanceOf(depositor1.address, 1)).to.equal(0);
            expect(await estateToken.balanceOf(depositor2.address, 2)).to.equal(0);

            await time.increaseTo(maxExpireAt + 10);
            expect(await estateToken.balanceOf(depositor1.address, 1)).to.equal(0);
            expect(await estateToken.balanceOf(depositor2.address, 2)).to.equal(0);
        });
    });

    describe('2.4.13. balanceOfAt(address, uint256, uint40)', () => {
        it('2.4.13.1. return correct estate token balance for available estate', async () => {
            const { estateToken, depositor1, depositor2, depositor3 } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
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

        it('2.4.13.2. return 0 when user has not withdrawn from tokenizer', async () => {
            const { estateToken, depositor1, estateForger } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
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

        it('2.4.13.3. return correct estate token balance in random tests', async () => {
            const { estateToken, depositors, estateForger } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
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

        it('2.4.13.4. revert with inexistent estate id', async () => {
            const { estateToken, depositor1 } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,
            });

            const baseTimestamp = await time.latest() + 1000;
            await time.setNextBlockTimestamp(baseTimestamp + 40);

            await callTransaction(estateToken.mint(depositor1.address, 1, 10_000));

            await expect(estateToken.balanceOfAt(depositor1.address, 0, baseTimestamp + 40))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");
        });

        it('2.4.13.5. revert with timestamp after current block timestamp', async () => {
            const { estateToken, depositor1 } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
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

        it('2.4.13.6. revert with timestamp after deprecation', async () => {
            const { estateToken, depositor1, manager } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,
            });

            await callTransaction(estateToken.mint(depositor1.address, 1, 10_000));
            
            const baseTimestamp = await time.latest() + 1000;
            
            await time.setNextBlockTimestamp(baseTimestamp);
            await callTransaction(estateToken.connect(manager).deprecateEstate(1));

            await time.increaseTo(baseTimestamp + 40);

            expect(await estateToken.balanceOfAt(depositor1.address, 1, baseTimestamp - 1))
                .to.equal(10_000);
            expect(await estateToken.balanceOfAt(depositor1.address, 1, baseTimestamp))
                .to.equal(10_000);
            await expect(estateToken.balanceOfAt(depositor1.address, 1, baseTimestamp + 1))
                .to.be.revertedWithCustomError(estateToken, "InvalidTimestamp");
        });

        it('2.4.13.7. revert with timestamp after expiration', async () => {
            const { estateToken, depositor1, manager } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
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

        it('2.4.13.8. return correct balance when account is estate tokenizer', async () => {
            const { estateToken, estateForger } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,
            });

            const baseTimestamp = await time.latest() + 1000;
            await time.increaseTo(baseTimestamp + 40);

            expect(await estateToken.balanceOfAt(estateForger.address, 1, baseTimestamp)).to.equal(10_000);
        });
    });

    describe('2.4.14. totalVoteAt(uint256, uint40)', () => {
        it('2.4.14.1. return correct total vote for available estate', async () => {
            const { estateToken } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,
            });

            const baseTimestamp = await time.latest();

            expect(await estateToken.totalVoteAt(1, baseTimestamp)).to.equal(10_000);
            expect(await estateToken.totalVoteAt(2, baseTimestamp)).to.equal(10_000);            
        });

        it('2.4.14.2. revert with inexistent estate id', async () => {
            const { estateToken, depositor1, estateForger } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,
            });
            
            const baseTimestamp = await time.latest();

            await expect(estateToken.totalVoteAt(0, baseTimestamp))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");
            await expect(estateToken.totalVoteAt(3, baseTimestamp))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");
        });

        it('2.4.14.3. return 0 with timestamp after current block timestamp', async () => {
            const { estateToken, manager } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,
            });

            const baseTimestamp = await time.latest();
            expect(await estateToken.totalVoteAt(1, baseTimestamp + 1)).to.equal(0);
            expect(await estateToken.totalVoteAt(2, baseTimestamp + 10)).to.equal(0);
        });

        it('2.4.14.4. return 0 with timestamp before tokenization', async () => {
            const { estateToken } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,
            });

            const tokenizeAt1 = (await estateToken.getEstate(1)).tokenizeAt;
            expect(await estateToken.totalVoteAt(1, tokenizeAt1 - 1)).to.equal(0);
            expect(await estateToken.totalVoteAt(1, tokenizeAt1)).to.equal(10_000);

            const tokenizeAt2 = (await estateToken.getEstate(2)).tokenizeAt;
            expect(await estateToken.totalVoteAt(2, tokenizeAt2 - 1)).to.equal(0);
            expect(await estateToken.totalVoteAt(2, tokenizeAt2)).to.equal(10_000);
        });

        it('2.4.14.5. return 0 with timestamp after deprecation', async () => {
            const { estateToken, manager } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,
            });

            const baseTimestamp = await time.latest();
            await time.setNextBlockTimestamp(baseTimestamp + 10);

            await callTransaction(estateToken.connect(manager).deprecateEstate(1));
            expect(await estateToken.totalVoteAt(1, baseTimestamp + 9)).to.equal(10_000);
            expect(await estateToken.totalVoteAt(1, baseTimestamp + 10)).to.equal(10_000);
            expect(await estateToken.totalVoteAt(1, baseTimestamp + 11)).to.equal(0);

            await time.setNextBlockTimestamp(baseTimestamp + 20);

            await callTransaction(estateToken.connect(manager).deprecateEstate(2));
            expect(await estateToken.totalVoteAt(2, baseTimestamp + 19)).to.equal(10_000);
            expect(await estateToken.totalVoteAt(2, baseTimestamp + 20)).to.equal(10_000);
            expect(await estateToken.totalVoteAt(2, baseTimestamp + 21)).to.equal(0);
        });

        it('2.4.14.6. return 0 with timestamp after expiration', async () => {
            const { estateToken, manager } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,
            });

            const expireAt1 = (await estateToken.getEstate(1)).expireAt;
            await time.increaseTo(expireAt1 + 10);
            
            expect(await estateToken.totalVoteAt(1, expireAt1 - 1)).to.equal(10_000);
            expect(await estateToken.totalVoteAt(1, expireAt1)).to.equal(0);
            expect(await estateToken.totalVoteAt(1, expireAt1 + 1)).to.equal(0);

            const expireAt2 = (await estateToken.getEstate(2)).expireAt;
            await time.increaseTo(expireAt2 + 10);

            expect(await estateToken.totalVoteAt(2, expireAt2 - 1)).to.equal(10_000);
            expect(await estateToken.totalVoteAt(2, expireAt2)).to.equal(0);
            expect(await estateToken.totalVoteAt(2, expireAt2 + 1)).to.equal(0);
        });

        it('2.4.14.7. return total vote of each voteOfAt', async () => {
            // Note: this variant is only true when total supply of estate does not change
            const { estateToken, manager, depositor1, depositor2, estateForger, zone, commissionReceiver } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,
            });

            estateForger.allocationOfAt.returns(0);

            // Right after estate tokenized
            const tokenizeAt1 = (await estateToken.getEstate(1)).tokenizeAt;

            expect(await estateToken.totalVoteAt(1, tokenizeAt1 - 1)).to.equal(0);
            expect(await estateToken.totalVoteAt(1, tokenizeAt1)).to.equal(await estateToken.balanceOfAt(estateForger.address, 1, tokenizeAt1));
            expect(await estateToken.totalVoteAt(1, tokenizeAt1 + 1)).to.equal(await estateToken.balanceOfAt(estateForger.address, 1, tokenizeAt1 + 1));

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
                const expectedTotalVote = await estateToken.voteOfAt(depositor1.address, 1, at);
                expect(await estateToken.totalVoteAt(1, at)).to.equal(expectedTotalVote.add(await estateToken.balanceOfAt(estateForger.address, 1, at)));
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
                    await estateToken.voteOfAt(depositor1.address, 1, at),
                    await estateToken.voteOfAt(depositor2.address, 1, at),
                ].reduce((a, b) => a.add(b), ethers.BigNumber.from(0));
                expect(await estateToken.totalVoteAt(1, at)).to.equal(expectedTotalVote.add(await estateToken.balanceOfAt(estateForger.address, 1, at)));
            }

            // After estate deprecated
            const deprecateAt1 = depositor2MintAt + 3;
            await callTransactionAtTimestamp(
                estateToken.connect(manager).deprecateEstate(1),
                deprecateAt1,
            );
            await time.increaseTo(deprecateAt1 + 1);

            for(let at = tokenizeAt1; at <= deprecateAt1; ++at) { 
                const expectedTotalVote = [
                    await estateToken.voteOfAt(depositor1.address, 1, at),
                    await estateToken.voteOfAt(depositor2.address, 1, at),
                ].reduce((a, b) => a.add(b), ethers.BigNumber.from(0));
                expect(await estateToken.totalVoteAt(1, at)).to.equal(expectedTotalVote.add(await estateToken.balanceOfAt(estateForger.address, 1, at)));
            }

            // After minting estate 3 for depositor1
            const tokenizeAt3 = deprecateAt1 + 3;
            const depositor1MintAt3 = tokenizeAt3 + 3;
            const depositor2MintAt3 = depositor1MintAt3 + 3;
            const expireAt3 = depositor2MintAt3 + 3;

            await callTransactionAtTimestamp(
                estateForger.call(estateToken.address, estateToken.interface.encodeFunctionData('tokenizeEstate', [
                    10_000,
                    zone,
                    10,
                    "Token2_URI",
                    expireAt3,
                    commissionReceiver.address,
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
                    await estateToken.voteOfAt(depositor1.address, 3, at),
                    await estateToken.voteOfAt(depositor2.address, 3, at),
                ].reduce((a, b) => a.add(b), ethers.BigNumber.from(0));
                expect(await estateToken.totalVoteAt(3, at)).to.equal(expectedTotalVote.add(await estateToken.balanceOfAt(estateForger.address, 3, at)));
            }

            estateForger.allocationOfAt.reset();
        });
    });

    describe('2.4.15. voteOfAt(address, uint256, uint40)', () => {
        it('2.4.15.1. return correct vote for available estate', async () => {
            const { estateForger, estateToken, depositor1, depositor2 } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
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

            estateForger.allocationOfAt.whenCalledWith(tokenId1, depositor1.address, baseTimestamp).returns(20_000);
            estateForger.allocationOfAt.whenCalledWith(tokenId1, depositor1.address, baseTimestamp + 10).returns(20_000);

            expect(await estateToken.voteOfAt(depositor1.address, estateId1, baseTimestamp)).to.equal(30_000);
            expect(await estateToken.voteOfAt(depositor1.address, estateId1, baseTimestamp + 10)).to.equal(30_000);

            // Depositor 1, estate 2
            await callTransactionAtTimestamp(
                estateToken.mint(depositor1.address, estateId2, 40_000),
                baseTimestamp + 20,
            );
            await time.increaseTo(baseTimestamp + 30);

            estateForger.allocationOfAt.whenCalledWith(tokenId2, depositor1.address, baseTimestamp + 20).returns(80_000);
            estateForger.allocationOfAt.whenCalledWith(tokenId2, depositor1.address, baseTimestamp + 30).returns(80_000);

            expect(await estateToken.voteOfAt(depositor1.address, estateId2, baseTimestamp + 20)).to.equal(120_000);
            expect(await estateToken.voteOfAt(depositor1.address, estateId2, baseTimestamp + 30)).to.equal(120_000);

            // Depositor 2, estate 1
            await callTransactionAtTimestamp(
                estateToken.mint(depositor2.address, estateId1, 160_000),
                baseTimestamp + 40,
            );
            await time.increaseTo(baseTimestamp + 50);

            estateForger.allocationOfAt.whenCalledWith(tokenId1, depositor2.address, baseTimestamp + 40).returns(320_000);
            estateForger.allocationOfAt.whenCalledWith(tokenId1, depositor2.address, baseTimestamp + 50).returns(320_000);

            expect(await estateToken.voteOfAt(depositor2.address, estateId1, baseTimestamp + 40)).to.equal(480_000);
            expect(await estateToken.voteOfAt(depositor2.address, estateId1, baseTimestamp + 50)).to.equal(480_000);

            estateForger.allocationOfAt.reset();
        });

        it('2.4.15.2. revert with invalid estate id', async () => {
            const fixture = await beforeEstateTokenTest();
            const { estateToken, depositor1 } = fixture;

            const baseTimestamp = await time.latest() + 1000;

            await expect(estateToken.voteOfAt(depositor1.address, 0, baseTimestamp))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");
            await expect(estateToken.voteOfAt(depositor1.address, 3, baseTimestamp))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");
        });

        it('2.4.15.3. revert with timestamp after current block timestamp', async () => {
            const fixture = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
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
                estateForger.allocationOfAt.whenCalledWith(tokenId1, depositor1.address, at).returns(20_000);
            }

            expect(await estateToken.voteOfAt(depositor1.address, estateId1, baseTimestamp + 9)).to.equal(30_000);
            expect(await estateToken.voteOfAt(depositor1.address, estateId1, baseTimestamp + 10)).to.equal(30_000);
            await expect(estateToken.voteOfAt(depositor1.address, estateId1, baseTimestamp + 11))
                .to.be.revertedWithCustomError(estateToken, "InvalidTimestamp");
                
            estateForger.allocationOfAt.reset();
        });

        it('2.4.15.4. revert with timestamp after deprecation', async () => {
            const fixture = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,
            });
            const { estateToken, estateForger, manager, depositor1 } = fixture;

            const baseTimestamp = await time.latest() + 1000;

            const estateId1 = 1;
            const tokenId1 = (await estateToken.getEstate(estateId1)).tokenizationId;

            await callTransaction(estateToken.mint(depositor1.address, estateId1, 10_000));
            await callTransactionAtTimestamp(
                estateToken.connect(manager).deprecateEstate(estateId1),
                baseTimestamp + 10,
            );

            await time.increaseTo(baseTimestamp + 20);

            for (let at = baseTimestamp + 9; at <= baseTimestamp + 11; ++at) {
                estateForger.allocationOfAt.whenCalledWith(tokenId1, depositor1.address, at).returns(20_000);
            }

            expect(await estateToken.voteOfAt(depositor1.address, estateId1, baseTimestamp + 9)).to.equal(30_000);
            expect(await estateToken.voteOfAt(depositor1.address, estateId1, baseTimestamp + 10)).to.equal(30_000);
            await expect(estateToken.voteOfAt(depositor1.address, estateId1, baseTimestamp + 11))
                .to.be.revertedWithCustomError(estateToken, "InvalidTimestamp");

            estateForger.allocationOfAt.reset();
        });

        it('2.4.15.5. revert with timestamp after expiration', async () => {
            const fixture = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,
            });
            const { estateToken, estateForger, manager, depositor1 } = fixture;

            await callTransaction(estateToken.mint(depositor1.address, 1, 10_000));

            const estateId1 = 1;
            const tokenId1 = (await estateToken.getEstate(estateId1)).tokenizationId;
            
            const expireAt = (await estateToken.getEstate(estateId1)).expireAt;
            await time.increaseTo(expireAt + 10);

            for (let at = expireAt - 1; at <= expireAt + 1; ++at) {
                estateForger.allocationOfAt.whenCalledWith(tokenId1, depositor1.address, at).returns(20_000);
            }

            expect(await estateToken.voteOfAt(depositor1.address, estateId1, expireAt - 1)).to.equal(30_000);
            await expect(estateToken.voteOfAt(depositor1.address, estateId1, expireAt))
                .to.be.revertedWithCustomError(estateToken, "InvalidTimestamp");
            await expect(estateToken.voteOfAt(depositor1.address, estateId1, expireAt + 1))
                .to.be.revertedWithCustomError(estateToken, "InvalidTimestamp");

            estateForger.allocationOfAt.reset();
        });

        it('2.4.15.6. return 0 with estate tokenizer account', async () => {
            const { estateForger, estateToken } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
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

            estateForger.allocationOfAt.whenCalledWith(tokenId1, estateForger.address, baseTimestamp).returns(20_000);
            estateForger.allocationOfAt.whenCalledWith(tokenId1, estateForger.address, baseTimestamp + 10).returns(20_000);

            expect(await estateToken.voteOfAt(estateForger.address, estateId1, baseTimestamp)).to.equal(0);
            expect(await estateToken.voteOfAt(estateForger.address, estateId1, baseTimestamp + 10)).to.equal(0);

            estateForger.allocationOfAt.reset();
        });
    });

    describe('2.4.15. safeTransferFrom(address, address, uint256, uint256, bytes)', () => {
        it('2.4.15.1. transfer unsuccessfully when the token is deprecated', async () => {
            const { estateToken, manager, depositor1, depositor2 } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,
            });

            await callTransaction(estateToken.mint(depositor1.address, 1, 10_000));
            await callTransaction(estateToken.mint(depositor1.address, 2, 500));

            await callTransaction(estateToken.connect(manager).deprecateEstate(1));

            await expect(estateToken.connect(depositor1).safeBatchTransferFrom(
                depositor1.address,
                depositor2.address,
                [1, 2],
                [10_000, 500],
                ethers.utils.formatBytes32String(""),
            )).to.be.revertedWith("EstateToken: Token is unavailable");
        });

        it('2.4.15.2. transfer unsuccessfully when the token is expired', async () => {
            const { estateToken, manager, depositor1, depositor2 } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
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

    describe('2.4.16. supportsInterface(bytes4)', () => {
        it('2.4.16.1. return true for appropriate interface', async () => {
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

            const IGovernorInterfaceId = getInterfaceID(IGovernor, [IERC165Upgradeable]);

            expect(await estateToken.supportsInterface(getBytes4Hex(IERC2981UpgradeableInterfaceId))).to.equal(true);
            expect(await estateToken.supportsInterface(getBytes4Hex(IRoyaltyRateProposerInterfaceId))).to.equal(true);
            expect(await estateToken.supportsInterface(getBytes4Hex(IERC165UpgradeableInterfaceId))).to.equal(true);
            expect(await estateToken.supportsInterface(getBytes4Hex(IERC1155UpgradeableInterfaceId))).to.equal(true);
            expect(await estateToken.supportsInterface(getBytes4Hex(IERC1155MetadataURIUpgradeableInterfaceId))).to.equal(true);
            expect(await estateToken.supportsInterface(getBytes4Hex(IGovernorInterfaceId))).to.equal(true);
        });
    });
});
