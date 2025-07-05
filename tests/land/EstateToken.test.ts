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
    IERC1155ReceiverUpgradeable__factory,
    IERC2981Upgradeable__factory,
    IRoyaltyRateProposer__factory,
    ICommon__factory,
    IERC1155Upgradeable__factory,
    IERC1155MetadataURIUpgradeable__factory,
    PriceWatcher,
} from '@typechain-types';
import { callTransaction, getSignatures, prepareNativeToken, randomWallet } from '@utils/blockchain';
import { Constant } from '@tests/test.constant';
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployFeeReceiver } from '@utils/deployments/common/feeReceiver';
import { deployCurrency } from '@utils/deployments/common/currency';
import { deployMockEstateToken } from '@utils/deployments/mocks/mockEstateToken';
import { deployCommissionToken } from '@utils/deployments/land/commissionToken';
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

import { smock } from '@defi-wonderland/smock';

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
} from '@utils/callWithSignatures/estateToken';
import { BigNumber } from 'ethers';
import { randomInt } from 'crypto';
import { getBytes4Hex, getInterfaceID, randomBigNumber } from '@utils/utils';
import { OrderedMap } from '@utils/utils';
import { Initialization as LandInitialization } from '@tests/land/test.initialization';
import { deployReserveVault } from '@utils/deployments/common/reserveVault';
import { deployPriceWatcher } from '@utils/deployments/common/priceWatcher';

interface EstateTokenFixture {
    admin: Admin;
    feeReceiver: FeeReceiver;
    priceWatcher: PriceWatcher;
    currency: Currency;
    reserveVault: ReserveVault;
    estateToken: MockEstateToken;
    commissionToken: CommissionToken;

    deployer: any;
    admins: any[];
    governorHub: any;
    estateForger: any;
    manager: any;
    moderator: any;
    user: any;
    requester1: any, requester2: any;
    commissionReceiver: any;
    depositor1: any, depositor2: any, depositor3: any;
    depositors: any[];
    zone: string;

    tokenizers: any[];
}

describe('3. EstateToken', async () => {
    async function estateTokenFixture(): Promise<EstateTokenFixture> {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        const admins = [];
        for (let i = 1; i <= Constant.ADMIN_NUMBER; ++i) admins.push(accounts[i]);
        const governorHub = accounts[Constant.ADMIN_NUMBER + 1];
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

        const estateToken = await deployMockEstateToken(
            deployer.address,
            admin.address,
            feeReceiver.address,
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
                LandInitialization.ESTATE_FORGER_FeeRate,
                LandInitialization.ESTATE_FORGER_BaseMinUnitPrice,
                LandInitialization.ESTATE_FORGER_BaseMaxUnitPrice,
            ));
            tokenizers.push(mockEstateForger);
        }

        const estateForger = tokenizers[0];
        tokenizers = tokenizers.slice(1);

        const zone = ethers.utils.formatBytes32String("TestZone");

        return {
            admin,
            feeReceiver,
            priceWatcher,
            currency,
            reserveVault,
            estateToken,
            commissionToken,
            deployer,
            admins,
            governorHub,
            estateForger,
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
            tokenizers,
            zone,
        };
    };

    async function beforeEstateTokenTest({
        updateCommissionToken = false,
        authorizeEstateForger = false,
        pause = false,
        addSampleEstates = false,
    } = {}): Promise<EstateTokenFixture> {
        const fixture = await loadFixture(estateTokenFixture);
        const { admin, admins, manager, moderator, estateToken, estateForger, commissionToken, zone } = fixture;

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

        if (pause) {
            await callEstateToken_Pause(
                estateToken,
                admins,
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
                commissionToken.address,
            ]));

            await estateForger.call(estateToken.address, estateToken.interface.encodeFunctionData('tokenizeEstate', [
                10_000,
                zone,
                10,
                "Token2_URI",
                baseTimestamp + 2e8,
                commissionToken.address,
            ]));
        }

        return fixture;
    }

    describe('3.1. initialize(address, address, string, uint256)', async () => {
        it('3.1.1. Deploy successfully', async () => {
            const { estateToken, admin, feeReceiver } = await beforeEstateTokenTest();

            const paused = await estateToken.paused();
            expect(paused).to.equal(false);

            const adminAddress = await estateToken.admin();
            expect(adminAddress).to.equal(admin.address);

            const feeReceiverAddress = await estateToken.feeReceiver();
            expect(feeReceiverAddress).to.equal(feeReceiver.address);

            const royaltyRate = await estateToken.getRoyaltyRate();
            expect(royaltyRate.value).to.equal(LandInitialization.ESTATE_TOKEN_RoyaltyRate);
            expect(royaltyRate.decimals).to.equal(Constant.COMMON_RATE_DECIMALS);

            const estateNumber = await estateToken.estateNumber();
            expect(estateNumber).to.equal(0);

            const commissionTokenAddress = await estateToken.commissionToken();
            expect(commissionTokenAddress).to.equal(ethers.constants.AddressZero);

            expect(await estateToken.decimals()).to.equal(Constant.ESTATE_TOKEN_DECIMALS);
        });

        it('3.1.2. revert with invalid rate', async () => {
            const { admin, feeReceiver } = await beforeEstateTokenTest();
            const EstateToken = await ethers.getContractFactory("EstateToken");

            await expect(upgrades.deployProxy(EstateToken, [
                admin.address,
                feeReceiver.address,
                LandInitialization.ESTATE_TOKEN_BaseURI,
                Constant.COMMON_RATE_MAX_FRACTION.add(1),
            ])).to.be.reverted;
        });
    });

    describe('3.2. pause(bytes[])', async () => {
        it('3.2.1. pause successfully with valid signatures', async () => {
            const { deployer, estateToken, admin, admins } = await beforeEstateTokenTest();

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string"],
                [estateToken.address, "pause"]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await estateToken.pause(signatures);
            await tx.wait();

            expect(await estateToken.paused()).to.equal(true);

            await expect(tx).to
                .emit(estateToken, 'Paused')
                .withArgs(deployer.address);
        });

        it('3.2.2. pause unsuccessfully with invalid signatures', async () => {
            const { estateToken, admin, admins } = await beforeEstateTokenTest();

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string"],
                [estateToken.address, "pause"]
            );
            let invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(estateToken.pause(invalidSignatures)).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('3.2.3. pause unsuccessfully when already paused', async () => {
            const { estateToken, admin, admins } = await beforeEstateTokenTest();

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string"],
                [estateToken.address, "pause"]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            await callTransaction(estateToken.pause(signatures));

            signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(estateToken.pause(signatures)).to.be.revertedWith('Pausable: paused');
        });
    });

    describe('3.3. unpause(bytes[])', async () => {
        it('3.3.1. unpause successfully with valid signatures', async () => {
            const { deployer, estateToken, admin, admins } = await beforeEstateTokenTest({ pause: true });

            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string"],
                [estateToken.address, "unpause"]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await estateToken.unpause(signatures);
            await tx.wait();

            await expect(tx).to
                .emit(estateToken, 'Unpaused')
                .withArgs(deployer.address);
        });

        it('3.3.2. unpause unsuccessfully with invalid signatures', async () => {
            const { estateToken, admin, admins } = await beforeEstateTokenTest({ pause: true });

            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string"],
                [estateToken.address, "unpause"]
            );
            const invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(estateToken.unpause(invalidSignatures)).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('3.3.3. unpause unsuccessfully when not paused', async () => {
            const { estateToken, admin, admins } = await beforeEstateTokenTest({ pause: true });

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string"],
                [estateToken.address, "unpause"]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            await callTransaction(estateToken.unpause(signatures));

            signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(estateToken.unpause(signatures)).to.be.revertedWith('Pausable: not paused');
        });
    });

    describe('3.4. updateCommissionToken(address, bytes[])', async () => {
        it('3.4.1. updateCommissionToken successfully with valid signatures', async () => {
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

        it('3.4.2. updateCommissionToken unsuccessfully with invalid signatures', async () => {
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

        it('3.4.3. updateCommissionToken unsuccessfully when already set', async () => {
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

    describe('3.5. updateBaseURI(string, bytes[])', async () => {
        it('3.5.1. updateBaseURI successfully with valid signatures', async () => {
            const { estateToken, admin, admins } = await beforeEstateTokenTest({
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

        it('3.5.2. updateBaseURI unsuccessfully with invalid signatures', async () => {
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

    describe('3.6. updateRoyaltyRate(uint256, bytes[])', async () => {
        it('3.6.1. updateRoyaltyRate successfully with valid signatures', async () => {
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

        it('3.6.2. updateRoyaltyRate unsuccessfully with invalid signatures', async () => {
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

        it('3.6.3. updateRoyaltyRate unsuccessfully with invalid rate', async () => {
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

    describe('3.7. authorizeTokenizers(address[], bool, bytes[])', async () => {
        it('3.7.1. Authorize tokenizers successfully with valid signatures', async () => {
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

        it('3.7.2. Authorize tokenizer unsuccessfully with invalid signatures', async () => {
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

        it('3.7.3. Authorize tokenizer reverted without reason with EOA address', async () => {
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
            )).to.be.revertedWithoutReason();
        })

        it('3.7.4. Authorize tokenizer reverted with contract not supporting EstateTokenizer interface', async () => {
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

        it('3.7.5. Authorize tokenizer unsuccessfully when authorizing same account twice on same tx', async () => {
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
                .withArgs(duplicateTokenizers[0].address);
        });

        it('3.7.6. Authorize tokenizer unsuccessfully when authorizing same account twice on different tx', async () => {
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
                .withArgs(tokenizers[2].address);
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

        it('3.7.7. Deauthorize tokenizer successfully', async () => {
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

        it('3.7.8. Deauthorize tokenizer unsuccessfully with unauthorized account', async () => {
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
                .withArgs(account.address);
        });

        it('3.7.9. Deauthorize tokenizer unsuccessfully when unauthorizing same accounts twice on same tx', async () => {
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
                .withArgs(tokenizers[0].address);
        });

        it('3.7.10. Deauthorize tokenizer unsuccessfully when unauthorizing same accounts twice on different tx', async () => {
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
                .withArgs(tokenizers[0].address);
        });
    });

    describe('3.8. tokenizeEstate(uint256, bytes32, uint256, string, uint40, uint8, address)', async () => {
        interface DefaultParam {
            totalSupply: number;
            zone: string;
            tokenizationId: number;
            uri: string;
            expireAt: number;
            commissionReceiverAddress: string;
        };

        async function beforeTokenizeEstateTest(): Promise<{
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

        it('3.8.1. tokenize estate successfully with commission receiver', async () => {
            const { estateToken, estateForger, commissionToken, admin, admins } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
            });
            const { baseTimestamp, defaultParams } = await beforeTokenizeEstateTest();
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
                    baseTimestamp,
                    defaultParams.expireAt,
                );

            const estate = await estateToken.getEstate(1);
            expect(estate.zone).to.equal(defaultParams.zone);
            expect(estate.tokenizationId).to.equal(defaultParams.tokenizationId);
            expect(estate.tokenizer).to.equal(estateForger.address);
            expect(estate.tokenizeAt).to.equal(baseTimestamp);
            expect(estate.expireAt).to.equal(defaultParams.expireAt);
            expect(estate.isDeprecated).to.equal(false);

            expect(await estateToken.uri(1)).to.equal(LandInitialization.ESTATE_TOKEN_BaseURI + defaultParams.uri);

            expect(await estateToken.balanceOf(estateForger.address, 1)).to.equal(10_000);

            expect(await commissionToken.exists(1)).to.equal(true);
            expect(await commissionToken.ownerOf(1)).to.equal(defaultParams.commissionReceiverAddress);
        });

        it('3.8.2. tokenize estate unsuccessfully with no commission receiver', async () => {
            const { estateToken, estateForger, admin, admins } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
            });
            const { baseTimestamp, defaultParams } = await beforeTokenizeEstateTest();

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

        it('3.8.3. tokenize estate unsuccessfully when tokenizer is not authorized', async () => {
            const { estateToken, estateForger, admin, admins } = await beforeEstateTokenTest({
                updateCommissionToken: true,
            });
            const { baseTimestamp, defaultParams } = await beforeTokenizeEstateTest();

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

        it('3.8.4. tokenize estate unsuccessfully when zone is not declared', async () => {
            const { estateToken, estateForger } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
            });
            const { baseTimestamp, defaultParams } = await beforeTokenizeEstateTest();

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

        it('3.8.5. tokenize estate unsuccessfully with expired estate', async () => {
            const { estateToken, estateForger, commissionToken, admin, admins } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
            });
            const { baseTimestamp, defaultParams } = await beforeTokenizeEstateTest();

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
            ]))).to.be.revertedWithCustomError(estateToken, `InvalidInput`);

            await expect(estateForger.call(estateToken.address, estateToken.interface.encodeFunctionData('tokenizeEstate', [
                defaultParams.totalSupply,
                defaultParams.zone,
                defaultParams.tokenizationId,
                defaultParams.uri,
                baseTimestamp - 100,
                defaultParams.commissionReceiverAddress,
            ]))).to.be.revertedWithCustomError(estateToken, `InvalidInput`);
        });

        it('3.8.6. tokenize estate unsuccessfully when commission token is not set', async () => {
            const { estateToken, estateForger, commissionToken, admin, admins } = await beforeEstateTokenTest({
                updateCommissionToken: false,
                authorizeEstateForger: true,
            });
            const { baseTimestamp, defaultParams } = await beforeTokenizeEstateTest();
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

    describe('3.9. getEstate(uint256)', () => {
        it('3.9.1. succeed with existing estate id', async () => {
            const { estateToken } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,                
            });

            await estateToken.getEstate(1);
            await estateToken.getEstate(2);
        });

        it('3.9.2. revert with non-existing estate id', async () => {
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

    describe('3.10. isAvailable(uint256)', () => {
        it('3.10.1. return true for existing, not deprecated, and not expired estate', async () => {
            const { estateToken } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,
            });

            expect(await estateToken.isAvailable(1)).to.equal(true);
            expect(await estateToken.isAvailable(2)).to.equal(true);
        });

        it('3.10.2. return false for non-existing estate', async () => {
            const { estateToken } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,
            });

            expect(await estateToken.isAvailable(0)).to.equal(false);
            expect(await estateToken.isAvailable(3)).to.equal(false);
            expect(await estateToken.isAvailable(100)).to.equal(false);
        });

        it('3.10.3. return false for deprecated estate', async () => {
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

        it('3.10.4. return false for expired estate', async () => {
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

    describe('3.11. deprecateEstate(uint256)', () => {
        it('3.11.1. deprecate estate successfully', async () => {
            const { estateToken, manager } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,
            });

            let tx = await estateToken.connect(manager).deprecateEstate(1);
            await tx.wait();

            await expect(tx)
                .to.emit(estateToken, "EstateDeprecation")
                .withArgs(1);
            expect((await estateToken.getEstate(1)).isDeprecated).to.equal(true);

            tx = await estateToken.connect(manager).deprecateEstate(2);
            await tx.wait();

            await expect(tx)
                .to.emit(estateToken, "EstateDeprecation")
                .withArgs(2);
            expect((await estateToken.getEstate(2)).isDeprecated).to.equal(true);
        });

        it('3.11.2. deprecate estate unsuccessfully with non-existing estate id', async () => {
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

        it('3.11.3. deprecate estate unsuccessfully with deprecated estate', async () => {
            const { estateToken, manager } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,
            });

            await callTransaction(estateToken.connect(manager).deprecateEstate(1));
            await expect(estateToken.connect(manager).deprecateEstate(1))
                .to.be.revertedWithCustomError(estateToken, "Deprecated");

            await callTransaction(estateToken.connect(manager).deprecateEstate(2));
            await expect(estateToken.connect(manager).deprecateEstate(2))
                .to.be.revertedWithCustomError(estateToken, "Deprecated");
        });

        it('3.11.4. deprecate estate unsuccessfully by unauthorized sender', async () => {
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

        it('3.11.5. deprecate estate unsuccessfully when zone is not declared', async () => {
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

        it('3.11.6. deprecate estate unsuccessfully when sender is not active in zone', async () => {
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
    });

    describe('3.12. extendEstateExpiration(uint256, uint40)', () => {
        it('3.12.1. extend estate expiration successfully by manager with valid estate', async () => {
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

        it('3.12.2. extend estate expiration unsuccessfully with non-existing estate', async () => {
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

        it('3.12.3. extend estate expiration unsuccessfully with deprecated estate', async () => {
            const { estateToken, manager } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,
            });
            const baseTimestamp = await time.latest() + 1000;

            await callTransaction(estateToken.connect(manager).deprecateEstate(1));
            await expect(estateToken.connect(manager).extendEstateExpiration(1, baseTimestamp + 1e9))
                .to.be.revertedWithCustomError(estateToken, "Deprecated");
        });

        it('3.12.4. extend estate expiration unsuccessfully by non-manager sender', async () => {
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

        it('3.12.5. extend estate expiration unsuccessfully when zone is not declared', async () => {
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

        it('3.12.6. extend estate expiration unsuccessfully when sender is not active in zone', async () => {
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
    });

    describe('3.13. updateEstateURI(uint256, string)', () => {
        it('3.13.1. update estate URI successfully by manager with available estate', async () => {
            const { estateToken, manager } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,
            });
            
            let tx = await estateToken.connect(manager).updateEstateURI(1, 'new_URI_1');
            await tx.wait();

            await expect(tx)
                .to.emit(estateToken, "URI")
                .withArgs(LandInitialization.ESTATE_TOKEN_BaseURI + 'new_URI_1', 1);

            expect(await estateToken.uri(1)).to.equal(LandInitialization.ESTATE_TOKEN_BaseURI + 'new_URI_1');

            tx = await estateToken.connect(manager).updateEstateURI(2, 'new_URI_2');
            await tx.wait();

            await expect(tx)
                .to.emit(estateToken, "URI")
                .withArgs(LandInitialization.ESTATE_TOKEN_BaseURI + 'new_URI_2', 2);

            expect(await estateToken.uri(2)).to.equal(LandInitialization.ESTATE_TOKEN_BaseURI + 'new_URI_2');
        });

        it('3.13.2. update estate URI unsuccessfully with unavailable estate', async () => {
            const { estateToken, manager } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,
            });

            await expect(estateToken.connect(manager).updateEstateURI(0, 'new_URI_1'))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");

            await expect(estateToken.connect(manager).updateEstateURI(3, 'new_URI_1'))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");

            await callTransaction(estateToken.connect(manager).deprecateEstate(1));
            await expect(estateToken.connect(manager).updateEstateURI(1, 'new_URI_1'))
                .to.be.revertedWithCustomError(estateToken, "InvalidEstateId");
        });

        it('3.13.3. update estate URI unsuccessfully by non-manager sender', async () => {
            const { estateToken, user, moderator } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,
            });

            await expect(estateToken.connect(user).updateEstateURI(1, 'new_URI_1'))
                .to.be.revertedWithCustomError(estateToken, "Unauthorized");

            await expect(estateToken.connect(moderator).updateEstateURI(1, 'new_URI_1'))
                .to.be.revertedWithCustomError(estateToken, "Unauthorized");
        });

        it('3.13.4. update estate URI unsuccessfully when zone is not declared', async () => {
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

            await expect(estateToken.connect(manager).updateEstateURI(1, 'new_URI_1'))
                .to.be.revertedWithCustomError(estateToken, "Unauthorized");
        });

        it('3.13.5. update estate URI unsuccessfully when sender is not active in zone', async () => {
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

            await expect(estateToken.connect(manager).updateEstateURI(1, 'new_URI_1'))
                .to.be.revertedWithCustomError(estateToken, "Unauthorized");
        });
    });

    describe('3.14. balanceOf(address, uint256)', () => {
        it('3.14.1. return correct estate token balance for available estate', async () => {
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

        it('3.14.2. return correct estate token balance for invalid estate id', async () => {
            const { estateToken, depositor1 } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,
            });

            expect(await estateToken.balanceOf(depositor1.address, 0)).to.equal(0);
            expect(await estateToken.balanceOf(depositor1.address, 3)).to.equal(0);
            expect(await estateToken.balanceOf(depositor1.address, 100)).to.equal(0);
        });

        it('3.14.3. return correct estate token balance for deprecated estate', async () => {
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

        it('3.14.4. return correct estate token balance for expired estate', async () => {
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

    describe('3.15. balanceOfAt(address, uint256, uint40)', () => {
        it('3.15.1. return correct estate token balance for available estate', async () => {
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

        it('3.15.2. return correct expected estate token balance when user has not withdrawn from tokenizer', async () => {
            const { estateToken, depositor1, estateForger } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,
            });
            const baseTimestamp = await time.latest() + 1000;

            await estateForger.allocationOfAt.returns(123);

            expect(await estateToken.balanceOfAt(estateToken.address, 1, baseTimestamp + 10)).to.equal(123);

            await time.setNextBlockTimestamp(baseTimestamp + 20);
            await callTransaction(estateToken.mint(depositor1.address, 1, 30_000));

            expect(await estateToken.balanceOfAt(estateToken.address, 1, baseTimestamp + 10)).to.equal(123);
        });

        it('3.15.3. return correct estate token balance in random tests', async () => {
            const { estateToken, depositors, estateForger } = await beforeEstateTokenTest({
                updateCommissionToken: true,
                authorizeEstateForger: true,
                addSampleEstates: true,
            });
            const baseTimestamp = await time.latest() + 1000;

            estateForger.allocationOfAt.returns(0);

            const estateId = 1;

            let currentTimestamp = baseTimestamp + 10;

            const snapshots = [];
            for (let i = 0; i < 3; ++i) {
                snapshots.push(new OrderedMap<number, BigNumber>(ethers.BigNumber.from(0)));
            }

            await time.setNextBlockTimestamp(currentTimestamp);
            for (let i = 0; i < 3; ++i) {
                const amount = ethers.BigNumber.from(randomInt(10_000, 30_000));
                await callTransaction(estateToken.mint(depositors[i].address, estateId, amount));
                const timestamp = (await ethers.provider.getBlock('latest')).timestamp;
                snapshots[i].set(timestamp, amount);
            }

            await ethers.provider.send("evm_setAutomine", [false]);
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
                for (let t = currentTimestamp - 1; t <= lastTimestamp; ++t) {
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
        });
    });

    describe('3.16. safeTransferFrom(address, address, uint256, uint256, bytes)', () => {
        it('3.16.1. transfer unsuccessfully when the token is deprecated', async () => {
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
            )).to.be.revertedWith("estateToken: Token is unavailable");
        });

        it('3.16.2. transfer unsuccessfully when the token is expired', async () => {
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
            )).to.be.revertedWith("estateToken: Token is unavailable");
        });
    });

    describe('3.17. supportsInterface(bytes4)', () => {
        it('3.17.1. return true for appropriate interface', async () => {
            const fixture = await beforeEstateTokenTest();
            const { estateToken } = fixture;

            const ICommon = ICommon__factory.createInterface();

            const IERC165Upgradeable = IERC165Upgradeable__factory.createInterface();
            const IERC2981Upgradeable = IERC2981Upgradeable__factory.createInterface();
            const IRoyaltyRateProposer = IRoyaltyRateProposer__factory.createInterface();
            const IERC1155Upgradeable = IERC1155Upgradeable__factory.createInterface();
            const IERC1155MetadataURIUpgradeable = IERC1155MetadataURIUpgradeable__factory.createInterface();

            const IERC2981UpgradeableInterfaceId = getInterfaceID(IERC2981Upgradeable, [IERC165Upgradeable]);

            const IRoyaltyRateProposerInterfaceId = getInterfaceID(IRoyaltyRateProposer, [ICommon, IERC165Upgradeable, IERC2981Upgradeable]);

            const IERC165UpgradeableInterfaceId = getInterfaceID(IERC165Upgradeable, []);

            const IERC1155UpgradeableInterfaceId = getInterfaceID(IERC1155Upgradeable, [IERC165Upgradeable]);

            const IERC1155MetadataURIUpgradeableInterfaceId = getInterfaceID(IERC1155MetadataURIUpgradeable, [IERC1155Upgradeable]);

            expect(await estateToken.supportsInterface(getBytes4Hex(IERC2981UpgradeableInterfaceId))).to.equal(true);
            expect(await estateToken.supportsInterface(getBytes4Hex(IRoyaltyRateProposerInterfaceId))).to.equal(true);
            expect(await estateToken.supportsInterface(getBytes4Hex(IERC165UpgradeableInterfaceId))).to.equal(true);
            expect(await estateToken.supportsInterface(getBytes4Hex(IERC1155UpgradeableInterfaceId))).to.equal(true);
            expect(await estateToken.supportsInterface(getBytes4Hex(IERC1155MetadataURIUpgradeableInterfaceId))).to.equal(true);
        });
    });
});
