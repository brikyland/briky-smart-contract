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
    callAdmin_AuthorizeManagers,
    callAdmin_AuthorizeModerators,
} from '@utils/callWithSignatures/admin';
import { BigNumber } from 'ethers';
import { randomInt } from 'crypto';
import { getInterfaceID, randomBigNumber } from '@utils/utils';
import { OrderedMap } from '@utils/utils';

interface CommissionTokenFixture {
    admin: Admin;
    feeReceiver: FeeReceiver;
    currency: Currency;
    estateToken: MockEstateToken;
    commissionToken: CommissionToken;

    deployer: any;
    admins: any[];
}

describe('6. CommissionToken', async () => {
    async function commissionTokenFixture(): Promise<CommissionTokenFixture> {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        const admins = [];
        for (let i = 1; i <= Constant.ADMIN_NUMBER; ++i) admins.push(accounts[i]);
        
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

        const estateToken = await deployMockEstateToken(
            deployer.address,
            admin.address,
            feeReceiver.address,
            Constant.ESTATE_TOKEN_INITIAL_BaseURI,
            Constant.ESTATE_TOKEN_INITIAL_RoyaltyRate,
        ) as MockEstateToken;        

        const commissionToken = await deployCommissionToken(
            deployer.address,
            admin.address,
            estateToken.address,
            feeReceiver.address,
            Constant.COMMISSION_TOKEN_INITIAL_Name,
            Constant.COMMISSION_TOKEN_INITIAL_Symbol,
            Constant.COMMISSION_TOKEN_INITIAL_BaseURI,
            Constant.COMMISSION_TOKEN_INITIAL_CommissionRate,
            Constant.COMMISSION_TOKEN_INITIAL_RoyaltyRate,
        ) as CommissionToken;

        return {
            admin,
            feeReceiver,
            currency,
            estateToken,
            commissionToken,
            deployer,
            admins,
        };
    };

    async function beforeCommissionTokenTest({

    } = {}): Promise<CommissionTokenFixture> {
        const fixture = await loadFixture(commissionTokenFixture);

        return {
            ...fixture,
        }
    }

    describe('6.1. initialize(address, address, address)', async () => {
        it('6.1.1. Deploy successfully', async () => {

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
});
