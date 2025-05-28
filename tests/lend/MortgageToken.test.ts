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
    MortgageToken,
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
import { deployMortgageToken } from '@utils/deployments/lend/mortgageToken';

interface MortgageTokenFixture {
    admin: Admin;
    feeReceiver: FeeReceiver;
    currency: Currency;
    estateToken: MockEstateToken;
    commissionToken: CommissionToken;
    mortgageToken: MortgageToken;

    deployer: any;
    admins: any[];
}

describe('14. MortgageToken', async () => {
    async function mortgageTokenFixture(): Promise<MortgageTokenFixture> {
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

        const mortgageToken = await deployMortgageToken(
            deployer.address,
            admin.address,
            estateToken.address,
            commissionToken.address,
            feeReceiver.address,
            Constant.MORTGAGE_TOKEN_INITIAL_Name,
            Constant.MORTGAGE_TOKEN_INITIAL_Symbol,
            Constant.MORTGAGE_TOKEN_INITIAL_BaseURI,
            Constant.MORTGAGE_TOKEN_INITIAL_FeeRate,
            Constant.MORTGAGE_TOKEN_INITIAL_RoyaltyRate,
        ) as MortgageToken;

        return {
            admin,
            feeReceiver,
            currency,
            estateToken,
            commissionToken,
            mortgageToken,
            deployer,
            admins,
        };
    };

    async function beforeMortgageTokenTest({

    } = {}): Promise<MortgageTokenFixture> {
        const fixture = await loadFixture(mortgageTokenFixture);

        return {
            ...fixture,
        }
    }

    describe('14.1. initialize(address, address, address, address, string, string, string, uint256, uint256)', async () => {
        it('14.1.1. Deploy successfully', async () => {

        });
    });

    // TODO: Andy
    describe('14.2. pause(bytes[])', async () => {

    });

    // TODO: Andy
    describe('14.3. unpause(bytes[])', async () => {

    });

    // TODO: Andy
    describe('14.4. updateBaseURI(string, bytes[])', async () => {

    });

    // TODO: Andy
    describe('14.5. updateRoyaltyRate(string, bytes[])', async () => {

    });

    // TODO: Andy
    describe('14.6. updateFeeRate(uint256, bytes[])', async () => {

    });
});
