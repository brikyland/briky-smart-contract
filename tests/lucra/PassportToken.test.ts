import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import {
    Admin,
    PassportToken,
    Currency,
    EstateToken,
    FeeReceiver,
    IERC165Upgradeable__factory,
    IERC2981Upgradeable__factory,
    MockEstateToken,
    MockEstateForger__factory,
    IERC721Upgradeable__factory,
    IERC4906Upgradeable__factory,
} from '@typechain-types';
import { callTransaction, getSignatures, prepareNativeToken, randomWallet } from '@utils/blockchain';
import { Constant } from '@tests/test.constant';
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployFeeReceiver } from '@utils/deployments/common/feeReceiver';
import { deployCurrency } from '@utils/deployments/common/currency';
import { deployMockEstateToken } from '@utils/deployments/mocks/mockEstateToken';
import { deployPassportToken } from '@utils/deployments/lucra/passportToken';
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

import { smock } from '@defi-wonderland/smock';

import {
    callAdmin_AuthorizeManagers,
    callAdmin_AuthorizeModerators,
} from '@utils/callWithSignatures/admin';
import { BigNumber } from 'ethers';
import { randomInt } from 'crypto';
import { getInterfaceID, randomBigNumber } from '@utils/utils';
import { OrderedMap } from '@utils/utils';
import { Initialization } from './test.initialization';
import { callPassportToken_Pause } from '@utils/callWithSignatures/passportToken';

interface PassportTokenFixture {
    admin: Admin;
    feeReceiver: FeeReceiver;
    passportToken: PassportToken;

    deployer: any;
    admins: any[];
    minter1: any;
    minter2: any;
    minter3: any;
}

describe('16. PassportToken', async () => {
    async function passportTokenFixture(): Promise<PassportTokenFixture> {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        const admins = [];
        for (let i = 1; i <= Constant.ADMIN_NUMBER; ++i) admins.push(accounts[i]);
        const minter1 = accounts[Constant.ADMIN_NUMBER + 1];
        const minter2 = accounts[Constant.ADMIN_NUMBER + 2];
        const minter3 = accounts[Constant.ADMIN_NUMBER + 3];
        
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

        const passportToken = await deployPassportToken(
            deployer.address,
            admin.address,
            feeReceiver.address,
            Initialization.PASSPORT_TOKEN_Name,
            Initialization.PASSPORT_TOKEN_Symbol,
            Initialization.PASSPORT_TOKEN_BaseURI,
            Initialization.PASSPORT_TOKEN_Fee,
            Initialization.PASSPORT_TOKEN_RoyaltyRate,
        ) as PassportToken;

        return {
            admin,
            feeReceiver,
            passportToken,
            deployer,
            admins,
            minter1,
            minter2,
            minter3,
        };
    };

    async function beforePassportTokenTest({
        pause = false,
    } = {}): Promise<PassportTokenFixture> {
        const fixture = await loadFixture(passportTokenFixture);

        if (pause) {
            await callPassportToken_Pause(fixture.passportToken, fixture.admins, 0);
        }

        return {
            ...fixture,
        }
    }

    describe('16.1. initialize(address, address, string, string, string, uint256, uint256)', async () => {
        it('16.1.1. Deploy successfully', async () => {
            const { deployer, admin, feeReceiver } = await beforePassportTokenTest();

            const PassportToken = await ethers.getContractFactory('PassportToken', deployer);

            const passportToken = await upgrades.deployProxy(
                PassportToken,
                [
                    admin.address,
                    feeReceiver.address,
                    Initialization.PASSPORT_TOKEN_Name,
                    Initialization.PASSPORT_TOKEN_Symbol,
                    Initialization.PASSPORT_TOKEN_BaseURI,
                    Initialization.PASSPORT_TOKEN_Fee,
                    Initialization.PASSPORT_TOKEN_RoyaltyRate,
                ]
            ) as PassportToken;
            await passportToken.deployed();
            
            expect(await passportToken.admin()).to.equal(admin.address);
            expect(await passportToken.feeReceiver()).to.equal(feeReceiver.address);

            expect(await passportToken.name()).to.equal(Initialization.PASSPORT_TOKEN_Name);
            expect(await passportToken.symbol()).to.equal(Initialization.PASSPORT_TOKEN_Symbol);
            
            expect(await passportToken.tokenNumber()).to.equal(0);            

            const fee = await passportToken.fee();
            expect(fee).to.equal(Initialization.PASSPORT_TOKEN_Fee);

            const royaltyRate = await passportToken.getRoyaltyRate();
            expect(royaltyRate.value).to.equal(Initialization.PASSPORT_TOKEN_RoyaltyRate);
            expect(royaltyRate.decimals).to.equal(Constant.COMMON_RATE_DECIMALS);

            const tx = passportToken.deployTransaction;
            await expect(tx).to
                .emit(passportToken, 'BaseURIUpdate').withArgs(Initialization.PASSPORT_TOKEN_BaseURI)
                .emit(passportToken, 'FeeUpdate').withArgs(Initialization.PASSPORT_TOKEN_Fee)
                .emit(passportToken, 'RoyaltyRateUpdate').withArgs(Initialization.PASSPORT_TOKEN_RoyaltyRate);
        });

        it('16.1.2. Deploy unsuccessfully with invalid royalty rate', async () => {
            const { deployer, admin, feeReceiver } = await beforePassportTokenTest();

            const PassportToken = await ethers.getContractFactory('PassportToken', deployer);

            await expect(upgrades.deployProxy(PassportToken, [
                admin.address,
                feeReceiver.address,
                Initialization.PASSPORT_TOKEN_Name,
                Initialization.PASSPORT_TOKEN_Symbol,
                Initialization.PASSPORT_TOKEN_BaseURI,
                Initialization.PASSPORT_TOKEN_Fee,
                Constant.COMMON_RATE_MAX_FRACTION.add(1),
            ])).to.be.reverted;
        });
    });

    // TODO: Andy
    describe('16.2. pause(bytes[])', async () => {

    });

    // TODO: Andy
    describe('16.3. unpause(bytes[])', async () => {

    });

    // TODO: Andy
    describe('16.4. updateBaseURI(string, bytes[])', async () => {

    });

    // TODO: Andy
    describe('16.5. updateFee(uint256, bytes[])', async () => {

    });

    describe('16.6. mint()', async () => {
        it('16.6.1. mint successfully', async () => {
            const { passportToken, minter1, minter2 } = await beforePassportTokenTest();

            const fee = await passportToken.fee();

            const initMinter1Balance = await ethers.provider.getBalance(minter1.address);
            const initMinter2Balance = await ethers.provider.getBalance(minter2.address);
            const initPassportTokenBalance = await ethers.provider.getBalance(passportToken.address);

            // Mint with just enough value
            const tx1 = await passportToken.connect(minter1).mint({ value: fee });
            const receipt1 = await tx1.wait();
            await expect(tx1).to
                .emit(passportToken, 'NewToken')
                .withArgs(1, minter1.address);

            expect(await passportToken.tokenNumber()).to.equal(1);
            expect(await passportToken.ownerOf(1)).to.equal(minter1.address);
            expect(await passportToken.tokenURI(1)).to.equal(Initialization.PASSPORT_TOKEN_BaseURI + '1');

            const tx1GasFee = receipt1.gasUsed.mul(receipt1.effectiveGasPrice);
            expect(await ethers.provider.getBalance(minter1.address)).to.equal(initMinter1Balance.sub(tx1GasFee).sub(fee));
            expect(await ethers.provider.getBalance(passportToken.address)).to.equal(initPassportTokenBalance.add(fee));
            
            // Refund when minting with more value than needed
            const tx2 = await passportToken.connect(minter2).mint({ value: fee.add(ethers.utils.parseEther('1')) });
            const receipt2 = await tx2.wait();
            await expect(tx2).to
                .emit(passportToken, 'NewToken')
                .withArgs(2, minter2.address);

            expect(await passportToken.tokenNumber()).to.equal(2);
            expect(await passportToken.ownerOf(2)).to.equal(minter2.address);
            expect(await passportToken.tokenURI(2)).to.equal(Initialization.PASSPORT_TOKEN_BaseURI + '2');

            const tx2GasFee = receipt2.gasUsed.mul(receipt2.effectiveGasPrice);
            expect(await ethers.provider.getBalance(minter2.address)).to.equal(initMinter2Balance.sub(tx2GasFee).sub(fee));
            expect(await ethers.provider.getBalance(passportToken.address)).to.equal(initPassportTokenBalance.add(fee).add(fee));
        });

        it('16.6.2. mint successfully when paused', async () => {
            const { passportToken, minter1, minter2 } = await beforePassportTokenTest({
                pause: true,
            });

            const fee = await passportToken.fee();
            await expect(passportToken.connect(minter1).mint({ value: fee }))
                .to.be.revertedWith('Pausable: paused');
        });

        it('16.6.3. mint unsuccessfully when already minted', async () => {
            const { passportToken, minter1, minter2 } = await beforePassportTokenTest();

            const fee = await passportToken.fee();

            await callTransaction(passportToken.connect(minter1).mint({ value: fee }));
            await expect(passportToken.connect(minter1).mint({ value: fee }))
                .to.be.revertedWithCustomError(passportToken, 'AlreadyMinted');

            await callTransaction(passportToken.connect(minter2).mint({ value: fee }));
            await expect(passportToken.connect(minter2).mint({ value: fee }))
                .to.be.revertedWithCustomError(passportToken, 'AlreadyMinted');
        });

        it('16.6.4. mint unsuccessfully with insufficient value', async () => {
            const { passportToken, minter1 } = await beforePassportTokenTest();

            await expect(passportToken.connect(minter1).mint())
                .to.be.revertedWithCustomError(passportToken, 'InsufficientValue');
        });
    });

    describe('16.7. supportsInterface(bytes4)', async () => {
        it('16.7.1. return true for IERC4906Upgradeable interface', async () => {
            const { passportToken } = await beforePassportTokenTest();

            const IERC4906Upgradeable = IERC4906Upgradeable__factory.createInterface();
            const IERC165Upgradeable = IERC165Upgradeable__factory.createInterface();
            const IERC721Upgradeable = IERC721Upgradeable__factory.createInterface();

            const IERC4906UpgradeableInterfaceId = getInterfaceID(IERC4906Upgradeable)
                .xor(getInterfaceID(IERC165Upgradeable))
                .xor(getInterfaceID(IERC721Upgradeable))

            expect(await passportToken.supportsInterface(IERC4906UpgradeableInterfaceId._hex)).to.equal(true);
        });
    });
});
