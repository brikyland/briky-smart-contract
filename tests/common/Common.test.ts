import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Constant } from '@tests/test.constant';
import { callTransaction } from '@utils/blockchain';
import { 
    Admin,
    FeeReceiver,
    CommissionToken,
    EstateToken,
    EstateForger,
    EstateMarketplace,
    MortgageToken,
    CommissionMarketplace,
    PrimaryToken,
    StakeToken,
    Treasury,
    MockEstateToken,
    MockEstateForger,
    Currency,
    Distributor,
    Driptributor,
    Auction,
    MortgageMarketplace
} from '@typechain-types';
import { deployTreasury } from '@utils/deployments/land/treasury';
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployFeeReceiver } from '@utils/deployments/common/feeReceiver';
import { deployEstateToken } from '@utils/deployments/land/estateToken';
import { deployCommissionToken } from '@utils/deployments/land/commissionToken';
import { deployCommissionMarketplace } from '@utils/deployments/land/commissionMarketplace';
import { deployMortgageToken } from '@utils/deployments/lend/mortgageToken';
import { deployEstateForger } from '@utils/deployments/land/estateForger';
import { deployEstateMarketplace } from '@utils/deployments/land/estateMarketplace';
import { deployCurrency } from '@utils/deployments/common/currency';
import { deployPrimaryToken } from '@utils/deployments/land/primaryToken';
import { deployStakeToken } from '@utils/deployments/land/stakeToken';
import { deployDistributor } from '@utils/deployments/land/distributor';
import { deployDriptributor } from '@utils/deployments/land/driptributor';
import { deployAuction } from '@utils/deployments/land/auction';
import { deployMortgageMarketplace } from '@utils/deployments/lend/mortgageMarketplace';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { Initialization as LandInitialization } from '@tests/land/test.initialization';
import { Initialization as LendInitialization } from '@tests/lend/test.initialization';
import { Initialization as LucreInitialization } from '@tests/lucre/test.initialization';

interface CommonFixture {
    deployer: any;
    admins: any[];

    admin: Admin;
    feeReceiver: FeeReceiver;
    estateToken: EstateToken;
    estateForger: EstateForger;
    estateMarketplace: EstateMarketplace;
    commissionToken: CommissionToken;
    commissionMarketplace: CommissionMarketplace;
    treasury: Treasury;
    primaryToken: PrimaryToken;
    stakeToken: StakeToken;
    distributor: Distributor;
    dripDistributor: Driptributor;
    auction: Auction;
    mortgageToken: MortgageToken;
    mortgageMarketplace: MortgageMarketplace;
}


describe('0. Common', async () => {
    async function commonFixture(): Promise<CommonFixture> {
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
            admin.address,
        ) as FeeReceiver;

        const estateToken = await deployEstateToken(
            deployer.address,
            admin.address,
            feeReceiver.address,
            LandInitialization.ESTATE_TOKEN_BaseURI,
            LandInitialization.ESTATE_TOKEN_RoyaltyRate,
        ) as MockEstateToken;        
      
        const commissionToken = await deployCommissionToken(
            deployer,
            admin.address,
            estateToken.address,
            feeReceiver.address,
            LandInitialization.COMMISSION_TOKEN_Name,
            LandInitialization.COMMISSION_TOKEN_Symbol,
            LandInitialization.COMMISSION_TOKEN_BaseURI,
            LandInitialization.COMMISSION_TOKEN_CommissionRate,
            LandInitialization.COMMISSION_TOKEN_RoyaltyRate,
        ) as CommissionToken;

        const estateForger = await deployEstateForger(
            deployer,
            admin.address,
            estateToken.address,
            commissionToken.address,
            feeReceiver.address,
            LandInitialization.ESTATE_FORGER_FeeRate,
            LandInitialization.ESTATE_FORGER_BaseMinUnitPrice,
            LandInitialization.ESTATE_FORGER_BaseMaxUnitPrice
        ) as MockEstateForger;
  
        const estateMarketplace = await deployEstateMarketplace(
            deployer.address,
            admin.address,
            estateToken.address,
            commissionToken.address,
        ) as EstateMarketplace;

        const commissionMarketplace = await deployCommissionMarketplace(
            deployer,
            admin.address,
            commissionToken.address,
        ) as CommissionMarketplace;

        const currency = await deployCurrency(
            deployer,
            'MockCurrency',
            'MCK'
        ) as Currency;

        const primaryToken = await deployPrimaryToken(
            deployer,
            admin.address,
            LandInitialization.PRIMARY_TOKEN_Name,
            LandInitialization.PRIMARY_TOKEN_Symbol,
            LandInitialization.PRIMARY_TOKEN_LiquidationUnlockedAt
        ) as PrimaryToken;

        const treasury = await deployTreasury(
            deployer,
            admin.address,
            currency.address,
            primaryToken.address,
        ) as Treasury;

        const stakeToken = await deployStakeToken(
            deployer,
            admin.address,
            primaryToken.address,
            LandInitialization.STAKE_TOKEN_Name_1,
            LandInitialization.STAKE_TOKEN_Symbol_1,
        ) as StakeToken;

        const distributor = await deployDistributor(
            deployer,
            admin.address,
            primaryToken.address,
            treasury.address,
        ) as Distributor;

        const dripDistributor = await deployDriptributor(
            deployer,
            admin.address,
            primaryToken.address,
            ethers.utils.parseEther(String(1e6)),
        ) as Driptributor;

        const auction = await deployAuction(
            deployer,
            admin.address,
            primaryToken.address,
        ) as Auction;

        const mortgageToken = await deployMortgageToken(
            deployer,
            admin.address,
            estateToken.address,
            commissionToken.address,
            feeReceiver.address,
            LendInitialization.MORTGAGE_TOKEN_Name,
            LendInitialization.MORTGAGE_TOKEN_Symbol,
            LendInitialization.MORTGAGE_TOKEN_BaseURI,
            LendInitialization.MORTGAGE_TOKEN_RoyaltyRate,
            LendInitialization.MORTGAGE_TOKEN_FeeRate,
        ) as MortgageToken;

        const mortgageMarketplace = await deployMortgageMarketplace(
            deployer,
            admin.address,
            feeReceiver.address,
            mortgageToken.address,
        ) as MortgageMarketplace;

        return {
            deployer,
            admins,
            admin,
            feeReceiver,
            estateToken,
            estateForger,
            estateMarketplace,
            commissionToken,
            commissionMarketplace,
            treasury,
            primaryToken,
            stakeToken,
            distributor,
            dripDistributor,
            auction,
            mortgageToken,
            mortgageMarketplace,
        }
    }

    describe('0.1. version', async () => {
        it('0.1.1. Return correct version for each contract', async () => {
            const fixture = await loadFixture(commonFixture);
            const { admin, feeReceiver, estateForger, estateToken, estateMarketplace, commissionToken, commissionMarketplace, treasury, primaryToken, stakeToken, distributor, dripDistributor, auction, mortgageToken, mortgageMarketplace } = fixture;

            expect(await admin.version()).to.equal('v1.1.1');
            expect(await feeReceiver.version()).to.equal('v1.1.1');
            expect(await estateToken.version()).to.equal('v1.1.1');
            expect(await estateForger.version()).to.equal('v1.1.1');
            expect(await estateMarketplace.version()).to.equal('v1.1.1');
            expect(await commissionToken.version()).to.equal('v1.1.1');
            expect(await commissionMarketplace.version()).to.equal('v1.1.1');
            expect(await treasury.version()).to.equal('v1.1.1');
            expect(await primaryToken.version()).to.equal('v1.1.1');
            expect(await stakeToken.version()).to.equal('v1.1.1');
            expect(await distributor.version()).to.equal('v1.1.1');
            expect(await dripDistributor.version()).to.equal('v1.1.1');
            expect(await auction.version()).to.equal('v1.1.1');
            expect(await mortgageToken.version()).to.equal('v1.1.1');
            expect(await mortgageMarketplace.version()).to.equal('v1.1.1');
        });
    });

    describe('0.2. receive', async () => {
        it('0.2.1. receive function of each contract should not execute any code', async () => {
            async function testReceiveNotExecuteAnyCode(contract: any, gasLimit: number) {
                const [owner] = await ethers.getSigners();

                // Get the initial balance of the contract
                const initialBalance = await ethers.provider.getBalance(contract.address);

                // Send Ether to the contract and wait for the transaction to be mined
                const receipt = await callTransaction(owner.sendTransaction({
                    to: contract.address,
                    value: ethers.utils.parseEther('1.0'), // Sending 1 Ether
                }));

                // Get the final balance of the contract
                const finalBalance = await ethers.provider.getBalance(contract.address);

                // Check that the balance increased by 1 Ether
                expect(finalBalance.sub(initialBalance)).to.equal(ethers.utils.parseEther('1.0'));

                // Since the receive function is empty, we expect no events or state changes
                // If there were any, they would be detected by other means, such as emitted events
                expect(receipt.logs).to.be.empty;
                expect(receipt.gasUsed).to.be.equal(gasLimit);
            }

            const fixture = await loadFixture(commonFixture);
            const { admin, feeReceiver, estateToken, estateForger, estateMarketplace, commissionToken, commissionMarketplace, treasury, primaryToken, stakeToken, distributor, dripDistributor, auction, mortgageToken, mortgageMarketplace } = fixture;

            await testReceiveNotExecuteAnyCode(admin, 28223);
            await testReceiveNotExecuteAnyCode(feeReceiver, 28228);
            await testReceiveNotExecuteAnyCode(estateToken, 28228);
            await testReceiveNotExecuteAnyCode(estateForger, 28228);
            await testReceiveNotExecuteAnyCode(estateMarketplace, 28223);
            await testReceiveNotExecuteAnyCode(commissionToken, 28228);
            await testReceiveNotExecuteAnyCode(commissionMarketplace, 28223);
            await testReceiveNotExecuteAnyCode(treasury, 28236);
            await testReceiveNotExecuteAnyCode(primaryToken, 28228);
            await testReceiveNotExecuteAnyCode(stakeToken, 28228);
            await testReceiveNotExecuteAnyCode(distributor, 28228);
            await testReceiveNotExecuteAnyCode(dripDistributor, 28228);
            await testReceiveNotExecuteAnyCode(auction, 28241);
            await testReceiveNotExecuteAnyCode(mortgageToken, 28228);
            await testReceiveNotExecuteAnyCode(mortgageMarketplace, 28223);
        });
    });
});
