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
    MortgageMarketplace,
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
import { deployMortgageMarketplace } from '@utils/deployments/lend/mortgageMarketplace';

interface MortgageMarketplaceFixture {
    admin: Admin;
    feeReceiver: FeeReceiver;
    currency: Currency;
    commissionToken: CommissionToken;
    mortgageToken: MortgageToken;
    mortgageMarketplace: MortgageMarketplace;

    deployer: any;
    admins: any[];
}

describe('15. MortgageMarketplace', async () => {
    async function mortgageMarketplaceFixture(): Promise<MortgageMarketplaceFixture> {
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

        const mortgageMarketplace = await deployMortgageMarketplace(
            deployer.address,
            admin.address,
            mortgageToken.address,
            commissionToken.address,
        ) as MortgageMarketplace;

        return {
            admin,
            feeReceiver,
            currency,
            commissionToken,
            mortgageToken,
            mortgageMarketplace,
            deployer,
            admins,
        };
    };

    async function beforeMortgageMarketplaceTest({
        pause = false,
        listSampleLoan = false,
    } = {}): Promise<MortgageMarketplaceFixture> {
        const fixture = await loadFixture(mortgageMarketplaceFixture);

        return {
            ...fixture,
        }
    }

    describe('15.1. initialize(address, address, address, address)', async () => {
        it('15.1.1. Deploy successfully', async () => {
            const { mortgageMarketplace, admin, commissionToken, mortgageToken } = await beforeMortgageMarketplaceTest();

            expect(await mortgageMarketplace.offerNumber()).to.equal(0);

            expect(await mortgageMarketplace.admin()).to.equal(admin.address);
            expect(await mortgageMarketplace.commissionToken()).to.equal(commissionToken.address);
            expect(await mortgageMarketplace.mortgageToken()).to.equal(mortgageToken.address);
        });
    });

    // TODO: Andy
    describe('15.2. pause(bytes[])', async () => {

    });

    // TODO: Andy
    describe('15.3. unpause(bytes[])', async () => {

    });

    
});
