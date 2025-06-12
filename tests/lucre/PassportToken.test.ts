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
} from '@typechain-types';
import { callTransaction, getSignatures, prepareNativeToken, randomWallet } from '@utils/blockchain';
import { Constant } from '@tests/test.constant';
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployFeeReceiver } from '@utils/deployments/common/feeReceiver';
import { deployCurrency } from '@utils/deployments/common/currency';
import { deployMockEstateToken } from '@utils/deployments/mocks/mockEstateToken';
import { deployPassportToken } from '@utils/deployments/lucre/passportToken';
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

interface CommissionTokenFixture {
    admin: Admin;
    feeReceiver: FeeReceiver;
    passportToken: PassportToken;

    deployer: any;
    admins: any[];
    participant1: any;
    participant2: any;
}

describe('6. CommissionToken', async () => {
    async function commissionTokenFixture(): Promise<CommissionTokenFixture> {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        const admins = [];
        for (let i = 1; i <= Constant.ADMIN_NUMBER; ++i) admins.push(accounts[i]);
        const participant1 = accounts[Constant.ADMIN_NUMBER + 1];
        const participant2 = accounts[Constant.ADMIN_NUMBER + 2];
        const participant3 = accounts[Constant.ADMIN_NUMBER + 3];
        
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
            participant1,
            participant2,
            participant3,
        };
    };

    async function beforeCommissionTokenTest({
        pause = false,
    } = {}): Promise<CommissionTokenFixture> {
        const fixture = await loadFixture(commissionTokenFixture);

        return {
            ...fixture,
        }
    }

    describe('6.1. initialize(address, address, address)', async () => {
        it('6.1.1. Deploy successfully', async () => {
            const { deployer, admin, estateToken, feeReceiver } = await beforeCommissionTokenTest();

            const CommissionToken = await ethers.getContractFactory('CommissionToken', deployer);

            const commissionToken = await upgrades.deployProxy(
                CommissionToken,
                [
                    admin.address,
                    estateToken.address,
                    feeReceiver.address,
                    Constant.COMMISSION_TOKEN_INITIAL_Name,
                    Constant.COMMISSION_TOKEN_INITIAL_Symbol,
                    Constant.COMMISSION_TOKEN_INITIAL_BaseURI,
                    Constant.COMMISSION_TOKEN_INITIAL_CommissionRate,
                    Constant.COMMISSION_TOKEN_INITIAL_RoyaltyRate,
                ]
            );
            await commissionToken.deployed();
            
            expect(await commissionToken.admin()).to.equal(admin.address);
            expect(await commissionToken.estateToken()).to.equal(estateToken.address);
            expect(await commissionToken.feeReceiver()).to.equal(feeReceiver.address);

            const commissionRate = await commissionToken.getCommissionRate();
            expect(commissionRate.value).to.equal(Constant.COMMISSION_TOKEN_INITIAL_CommissionRate);
            expect(commissionRate.decimals).to.equal(Constant.COMMON_RATE_DECIMALS);

            const royaltyRate = await commissionToken.getRoyaltyRate();
            expect(royaltyRate.value).to.equal(Constant.COMMISSION_TOKEN_INITIAL_RoyaltyRate);
            expect(royaltyRate.decimals).to.equal(Constant.COMMON_RATE_DECIMALS);

            const tx = commissionToken.deployTransaction;
            await expect(tx).to
                .emit(commissionToken, 'BaseURIUpdate').withArgs(Constant.COMMISSION_TOKEN_INITIAL_BaseURI)
                .emit(commissionToken, 'CommissionRateUpdate').withArgs(Constant.COMMISSION_TOKEN_INITIAL_CommissionRate)
                .emit(commissionToken, 'RoyaltyRateUpdate').withArgs(Constant.COMMISSION_TOKEN_INITIAL_RoyaltyRate);
        });

        it('6.1.2. Deploy unsuccessfully with invalid commission rate', async () => {
            const { deployer, admin, estateToken, feeReceiver } = await beforeCommissionTokenTest();

            const CommissionToken = await ethers.getContractFactory('CommissionToken', deployer);

            await expect(upgrades.deployProxy(CommissionToken, [
                admin.address,
                estateToken.address,
                feeReceiver.address,
                Constant.COMMISSION_TOKEN_INITIAL_Name,
                Constant.COMMISSION_TOKEN_INITIAL_Symbol,
                Constant.COMMISSION_TOKEN_INITIAL_BaseURI,
                Constant.COMMON_RATE_MAX_FRACTION.add(1),
                Constant.COMMISSION_TOKEN_INITIAL_RoyaltyRate,
            ])).to.be.reverted;
        });

        it('6.1.3. Deploy unsuccessfully with invalid royalty rate', async () => {
            const { deployer, admin, estateToken, feeReceiver } = await beforeCommissionTokenTest();

            const CommissionToken = await ethers.getContractFactory('CommissionToken', deployer);

            await expect(upgrades.deployProxy(CommissionToken, [
                admin.address,
                estateToken.address,
                feeReceiver.address,
                Constant.COMMISSION_TOKEN_INITIAL_Name,
                Constant.COMMISSION_TOKEN_INITIAL_Symbol,
                Constant.COMMISSION_TOKEN_INITIAL_BaseURI,
                Constant.COMMISSION_TOKEN_INITIAL_CommissionRate,
                Constant.COMMON_RATE_MAX_FRACTION.add(1),
            ])).to.be.reverted;
        });
    });

    // TODO: Andy
    describe('6.2. pause(bytes[])', async () => {

    });

    // TODO: Andy
    describe('6.3. unpause(bytes[])', async () => {

    });

    // TODO: Andy
    describe('6.4. updateRoyaltyRate(uint256, bytes[])', async () => {

    });

    // TODO: Andy
    describe('6.5. updateBaseURI(string, bytes[])', async () => {

    });

    describe('6.6. mint(address, uint256)', async () => {
        it('6.6.1. mint successfully by estateToken contract', async () => {
            const { estateToken, commissionToken, receiver1, receiver2 } = await beforeCommissionTokenTest();

            let tx = await estateToken.call(commissionToken.address, commissionToken.interface.encodeFunctionData('mint', [
                receiver1.address,
                1,
            ]));
            await tx.wait();
            await expect(tx).to
                .emit(commissionToken, 'NewToken')
                .withArgs(1, receiver1.address);

            expect(await commissionToken.ownerOf(1)).to.equal(receiver1.address);
            expect(await commissionToken.tokenURI(1)).to.equal(Constant.COMMISSION_TOKEN_INITIAL_BaseURI + '1');

            tx = await estateToken.call(commissionToken.address, commissionToken.interface.encodeFunctionData('mint', [
                receiver2.address,
                2,
            ]));
            await tx.wait();
            await expect(tx).to
                .emit(commissionToken, 'NewToken')
                .withArgs(2, receiver2.address);

            expect(await commissionToken.ownerOf(2)).to.equal(receiver2.address);
            expect(await commissionToken.tokenURI(2)).to.equal(Constant.COMMISSION_TOKEN_INITIAL_BaseURI + '2');
        });

        it('6.6.2. mint unsuccessfully by unauthorized sender', async () => {
            const { commissionToken, receiver1, receiver2 } = await beforeCommissionTokenTest();

            await expect(commissionToken.mint(receiver1.address, 1))
                .to.be.revertedWithCustomError(commissionToken, 'Unauthorized');
            await expect(commissionToken.mint(receiver2.address, 2))
                .to.be.revertedWithCustomError(commissionToken, 'Unauthorized');
        });

        it('6.6.3. mint unsuccessfully when already minted', async () => {
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
});
