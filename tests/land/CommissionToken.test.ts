import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import {
    Admin,
    CommissionToken,
    Currency,
    FeeReceiver,
    IERC165Upgradeable__factory,
    IERC2981Upgradeable__factory,
    MockEstateToken,
    IERC4906Upgradeable__factory,
    IERC721Upgradeable__factory,
    IRoyaltyRateProposer__factory,
    ICommon__factory,
    IERC721MetadataUpgradeable__factory,
} from '@typechain-types';
import { callTransaction, getSignatures } from '@utils/blockchain';
import { Constant } from '@tests/test.constant';
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployFeeReceiver } from '@utils/deployments/common/feeReceiver';
import { deployCurrency } from '@utils/deployments/common/currency';
import { deployMockEstateToken } from '@utils/deployments/mocks/mockEstateToken';
import { deployCommissionToken } from '@utils/deployments/land/commissionToken';
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import {
    getBytes4Hex,
    getInterfaceID,
} from '@utils/utils';
import { Initialization as LandInitialization } from '@tests/land/test.initialization';
import { callCommissionToken_Pause } from '@utils/callWithSignatures/commissionToken';
import { MockValidator } from '@utils/mockValidator';

interface CommissionTokenFixture {
    admin: Admin;
    feeReceiver: FeeReceiver;
    currency: Currency;
    estateToken: MockEstateToken;
    commissionToken: CommissionToken;
    validator: MockValidator;

    deployer: any;
    admins: any[];
    receiver1: any;
    receiver2: any;
}

describe('2.1. CommissionToken', async () => {
    async function commissionTokenFixture(): Promise<CommissionTokenFixture> {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        const admins = [];
        for (let i = 1; i <= Constant.ADMIN_NUMBER; ++i) admins.push(accounts[i]);
        const receiver1 = accounts[Constant.ADMIN_NUMBER + 1];
        const receiver2 = accounts[Constant.ADMIN_NUMBER + 2];
        
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

        return {
            admin,
            feeReceiver,
            currency,
            estateToken,
            commissionToken,
            validator,
            deployer,
            admins,
            receiver1,
            receiver2,
        };
    };

    async function beforeCommissionTokenTest({
        mintSampleTokens = false,
        pause = false,
    } = {}): Promise<CommissionTokenFixture> {
        const fixture = await loadFixture(commissionTokenFixture);
        const { admin, admins, commissionToken, estateToken, receiver1, receiver2 } = fixture;

        if (mintSampleTokens) {
            await callTransaction(estateToken.call(
                commissionToken.address, 
                commissionToken.interface.encodeFunctionData('mint', [receiver1.address, 1])
            ));

            await callTransaction(estateToken.call(
                commissionToken.address, 
                commissionToken.interface.encodeFunctionData('mint', [receiver2.address, 2])
            ));
        }

        if (pause) {
            await callCommissionToken_Pause(
                commissionToken,
                admins,
                await admin.nonce(),
            )
        }

        return {
            ...fixture,
        }
    }

    describe('2.1.1. initialize(address, address, address)', async () => {
        it('2.1.1.1. Deploy successfully', async () => {
            const { deployer, admin, estateToken, feeReceiver } = await beforeCommissionTokenTest();

            const CommissionToken = await ethers.getContractFactory('CommissionToken', deployer);

            const commissionToken = await upgrades.deployProxy(
                CommissionToken,
                [
                    admin.address,
                    estateToken.address,
                    feeReceiver.address,
                    LandInitialization.COMMISSION_TOKEN_Name,
                    LandInitialization.COMMISSION_TOKEN_Symbol,
                    LandInitialization.COMMISSION_TOKEN_BaseURI,
                    LandInitialization.COMMISSION_TOKEN_CommissionRate,
                    LandInitialization.COMMISSION_TOKEN_RoyaltyRate,
                ]
            );
            await commissionToken.deployed();
            
            expect(await commissionToken.admin()).to.equal(admin.address);
            expect(await commissionToken.estateToken()).to.equal(estateToken.address);
            expect(await commissionToken.feeReceiver()).to.equal(feeReceiver.address);

            const commissionRate = await commissionToken.getCommissionRate();
            expect(commissionRate.value).to.equal(LandInitialization.COMMISSION_TOKEN_CommissionRate);
            expect(commissionRate.decimals).to.equal(Constant.COMMON_RATE_DECIMALS);

            const royaltyRate = await commissionToken.getRoyaltyRate();
            expect(royaltyRate.value).to.equal(LandInitialization.COMMISSION_TOKEN_RoyaltyRate);
            expect(royaltyRate.decimals).to.equal(Constant.COMMON_RATE_DECIMALS);

            expect(await commissionToken.totalSupply()).to.equal(0);

            const tx = commissionToken.deployTransaction;
            await expect(tx).to
                .emit(commissionToken, 'BaseURIUpdate').withArgs(LandInitialization.COMMISSION_TOKEN_BaseURI)
                .emit(commissionToken, 'CommissionRateUpdate').withArgs(LandInitialization.COMMISSION_TOKEN_CommissionRate)
                .emit(commissionToken, 'RoyaltyRateUpdate').withArgs(LandInitialization.COMMISSION_TOKEN_RoyaltyRate);
        });

        it('2.1.1.2. Deploy unsuccessfully with invalid commission rate', async () => {
            const { deployer, admin, estateToken, feeReceiver } = await beforeCommissionTokenTest();

            const CommissionToken = await ethers.getContractFactory('CommissionToken', deployer);

            await expect(upgrades.deployProxy(CommissionToken, [
                admin.address,
                estateToken.address,
                feeReceiver.address,
                LandInitialization.COMMISSION_TOKEN_Name,
                LandInitialization.COMMISSION_TOKEN_Symbol,
                LandInitialization.COMMISSION_TOKEN_BaseURI,
                Constant.COMMON_RATE_MAX_FRACTION.add(1),
                LandInitialization.COMMISSION_TOKEN_RoyaltyRate,
            ])).to.be.reverted;
        });

        it('2.1.1.3. Deploy unsuccessfully with invalid royalty rate', async () => {
            const { deployer, admin, estateToken, feeReceiver } = await beforeCommissionTokenTest();

            const CommissionToken = await ethers.getContractFactory('CommissionToken', deployer);

            await expect(upgrades.deployProxy(CommissionToken, [
                admin.address,
                estateToken.address,
                feeReceiver.address,
                LandInitialization.COMMISSION_TOKEN_Name,
                LandInitialization.COMMISSION_TOKEN_Symbol,
                LandInitialization.COMMISSION_TOKEN_BaseURI,
                LandInitialization.COMMISSION_TOKEN_CommissionRate,
                Constant.COMMON_RATE_MAX_FRACTION.add(1),
            ])).to.be.reverted;
        });
    });

    describe('2.1.2. updateBaseURI(string, bytes[])', async () => {
        it('2.1.2.1. updateBaseURI successfully with valid signatures', async () => {
            const { commissionToken, admin, admins } = await beforeCommissionTokenTest({});

            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "string"],
                [commissionToken.address, "updateBaseURI", "NewBaseURI:"]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await commissionToken.updateBaseURI("NewBaseURI:", signatures);
            await tx.wait();

            await expect(tx).to
                .emit(commissionToken, 'BaseURIUpdate')
                .withArgs("NewBaseURI:");

            expect(await commissionToken.tokenURI(1)).to.equal("NewBaseURI:");
            expect(await commissionToken.tokenURI(2)).to.equal("NewBaseURI:");
        });

        it('2.1.2.2. updateBaseURI unsuccessfully with invalid signatures', async () => {
            const { commissionToken, admin, admins } = await beforeCommissionTokenTest({});

            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "string"],
                [commissionToken.address, "updateBaseURI", "NewBaseURI:"]
            );
            const invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(commissionToken.updateBaseURI(
                "NewBaseURI:",
                invalidSignatures
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });
    });

    describe('2.1.3. updateRoyaltyRate(uint256, bytes[])', async () => {
        it('2.1.3.1. updateRoyaltyRate successfully with valid signatures', async () => {
            const { commissionToken, admin, admins } = await beforeCommissionTokenTest({});

            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256"],
                [commissionToken.address, "updateRoyaltyRate", ethers.utils.parseEther('0.2')]
            );

            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await commissionToken.updateRoyaltyRate(ethers.utils.parseEther('0.2'), signatures);
            await tx.wait();

            await expect(tx).to
                .emit(commissionToken, 'RoyaltyRateUpdate')
                .withArgs(ethers.utils.parseEther('0.2'));

            const royaltyRate = await commissionToken.getRoyaltyRate();
            expect(royaltyRate.value).to.equal(ethers.utils.parseEther('0.2'));
            expect(royaltyRate.decimals).to.equal(Constant.COMMON_RATE_DECIMALS);
        });

        it('2.1.3.2. updateRoyaltyRate unsuccessfully with invalid signatures', async () => {
            const { commissionToken, admin, admins } = await beforeCommissionTokenTest({});

            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256"],
                [commissionToken.address, "updateRoyaltyRate", ethers.utils.parseEther('0.2')]
            );
            const invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(commissionToken.updateRoyaltyRate(
                ethers.utils.parseEther('0.2'),
                invalidSignatures
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('2.1.3.3. updateRoyaltyRate unsuccessfully with invalid rate', async () => {
            const { commissionToken, admin, admins } = await beforeCommissionTokenTest({});

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256"],
                [commissionToken.address, "updateRoyaltyRate", Constant.COMMON_RATE_MAX_FRACTION.add(1)]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(commissionToken.updateRoyaltyRate(
                Constant.COMMON_RATE_MAX_FRACTION.add(1),
                signatures
            )).to.be.revertedWithCustomError(commissionToken, 'InvalidRate');
        });
    });

    describe('2.1.4. commissionInfo(uint256, uint256)', async() => {
        it('2.1.4.1. return correct commission info for minted token', async () => {
            const { commissionToken, receiver1, receiver2 } = await beforeCommissionTokenTest({
                mintSampleTokens: true,
            });

            const value1 = ethers.utils.parseEther('100');
            const commissionInfo1 = await commissionToken.commissionInfo(1, value1);
            expect(commissionInfo1[0]).to.equal(receiver1.address);
            expect(commissionInfo1[1]).to.equal(value1.mul(LandInitialization.COMMISSION_TOKEN_CommissionRate).div(Constant.COMMON_RATE_MAX_FRACTION));

            const value2 = ethers.utils.parseEther('20');
            const commissionInfo2 = await commissionToken.commissionInfo(2, value2);
            expect(commissionInfo2[0]).to.equal(receiver2.address);
            expect(commissionInfo2[1]).to.equal(value2.mul(LandInitialization.COMMISSION_TOKEN_CommissionRate).div(Constant.COMMON_RATE_MAX_FRACTION));
        });

        it('2.1.4.2. return default value info for unminted token', async () => {
            const { commissionToken, receiver1, receiver2 } = await beforeCommissionTokenTest({
                mintSampleTokens: true,
            });

            const value1 = ethers.utils.parseEther('100');
            const commissionInfo1 = await commissionToken.commissionInfo(0, value1);
            expect(commissionInfo1[0]).to.equal(ethers.constants.AddressZero);
            expect(commissionInfo1[1]).to.equal(ethers.constants.Zero);

            const value2 = ethers.utils.parseEther('20');
            const commissionInfo2 = await commissionToken.commissionInfo(100, value2);
            expect(commissionInfo2[0]).to.equal(ethers.constants.AddressZero);
            expect(commissionInfo2[1]).to.equal(ethers.constants.Zero);
        });
    });

    describe('2.1.5. mint(address, uint256)', async () => {
        it('2.1.5.1. mint successfully by estateToken contract', async () => {
            const { estateToken, commissionToken, receiver1, receiver2 } = await beforeCommissionTokenTest();

            let tx = await estateToken.call(commissionToken.address, commissionToken.interface.encodeFunctionData('mint', [
                receiver1.address,
                1,
            ]));
            await tx.wait();
            await expect(tx).to
                .emit(commissionToken, 'NewToken')
                .withArgs(1, receiver1.address);

            expect(await commissionToken.totalSupply()).to.equal(1);

            expect(await commissionToken.ownerOf(1)).to.equal(receiver1.address);
            expect(await commissionToken.tokenURI(1)).to.equal(LandInitialization.COMMISSION_TOKEN_BaseURI);

            tx = await estateToken.call(commissionToken.address, commissionToken.interface.encodeFunctionData('mint', [
                receiver2.address,
                2,
            ]));
            await tx.wait();
            await expect(tx).to
                .emit(commissionToken, 'NewToken')
                .withArgs(2, receiver2.address);

            expect(await commissionToken.totalSupply()).to.equal(2);

            expect(await commissionToken.ownerOf(2)).to.equal(receiver2.address);
            expect(await commissionToken.tokenURI(2)).to.equal(LandInitialization.COMMISSION_TOKEN_BaseURI);
        });

        it('2.1.5.2. mint unsuccessfully by unauthorized sender', async () => {
            const { commissionToken, receiver1, receiver2 } = await beforeCommissionTokenTest();

            await expect(commissionToken.mint(receiver1.address, 1))
                .to.be.revertedWithCustomError(commissionToken, 'Unauthorized');
            await expect(commissionToken.mint(receiver2.address, 2))
                .to.be.revertedWithCustomError(commissionToken, 'Unauthorized');
        });

        it('2.1.5.3. mint unsuccessfully when already minted', async () => {
            const { estateToken, commissionToken, receiver1, receiver2 } = await beforeCommissionTokenTest();

            await callTransaction(estateToken.call(commissionToken.address, commissionToken.interface.encodeFunctionData('mint', [
                receiver1.address,
                1,
            ])));

            await expect(estateToken.call(commissionToken.address, commissionToken.interface.encodeFunctionData('mint', [
                receiver2.address,
                1,
            ]))).to.be.revertedWithCustomError(commissionToken, 'AlreadyMinted');
        });
    });

    describe('2.1.6. supportsInterface(bytes4)', async () => {
        it('2.1.6.1. return true for appropriate interface', async () => {
            const { commissionToken } = await beforeCommissionTokenTest();

            const IERC4906Upgradeable = IERC4906Upgradeable__factory.createInterface();
            const IERC165Upgradeable = IERC165Upgradeable__factory.createInterface();
            const IERC721Upgradeable = IERC721Upgradeable__factory.createInterface();
            const IERC2981Upgradeable = IERC2981Upgradeable__factory.createInterface();
            const IERC721MetadataUpgradeable = IERC721MetadataUpgradeable__factory.createInterface();

            const ICommon = ICommon__factory.createInterface();
            const IRoyaltyRateProposer = IRoyaltyRateProposer__factory.createInterface();

            const IERC2981UpgradeableInterfaceId = getInterfaceID(IERC2981Upgradeable, [IERC165Upgradeable]);
            const IERC4906UpgradeableInterfaceId = getInterfaceID(IERC4906Upgradeable, [IERC165Upgradeable, IERC721Upgradeable])
            const IRoyaltyRateProposerInterfaceId = getInterfaceID(IRoyaltyRateProposer, [ICommon, IERC165Upgradeable, IERC2981Upgradeable]);
            const IERC721UpgradeableInterfaceId = getInterfaceID(IERC721Upgradeable, [IERC165Upgradeable]);
            const IERC721MetadataUpgradeableInterfaceId = getInterfaceID(IERC721MetadataUpgradeable, [IERC721Upgradeable]);

            expect(await commissionToken.supportsInterface(getBytes4Hex(IERC2981UpgradeableInterfaceId))).to.equal(true);
            expect(await commissionToken.supportsInterface(getBytes4Hex(IERC4906UpgradeableInterfaceId))).to.equal(true);
            expect(await commissionToken.supportsInterface(getBytes4Hex(IERC721UpgradeableInterfaceId))).to.equal(true);
            expect(await commissionToken.supportsInterface(getBytes4Hex(IERC721MetadataUpgradeableInterfaceId))).to.equal(true);
            expect(await commissionToken.supportsInterface(getBytes4Hex(IRoyaltyRateProposerInterfaceId))).to.equal(true);
        });
    });
});
