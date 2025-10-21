import { expect } from 'chai';
import { ethers } from 'hardhat';

// @nomicfoundation/hardhat-network-helpers
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

// @tests/common
import { Initialization as CommonInitialization } from '@tests/common/test.initialization';

// @tests/land
import { Initialization as LandInitialization } from '@tests/land/test.initialization';

// @tests/lend
import { Initialization as LendInitialization } from '@tests/lend/test.initialization';

// @tests/lucra
import { Initialization as LucraInitialization } from '@tests/lucra/test.initialization';

// @tests/liquidity
import { Initialization as LiquidityInitialization } from '@tests/liquidity/test.initialization';

// @tests/launch
import { Initialization as LaunchInitialization } from '@tests/launch/test.initialization';

// @typechain-types
import {
    Admin,
    FeeReceiver,
    CommissionToken,
    EstateToken,
    EstateForger,
    EstateMarketplace,
    EstateMortgageToken,
    PrimaryToken,
    StakeToken,
    Treasury,
    MockEstateToken,
    MockEstateForger,
    Currency,
    Distributor,
    Driptributor,
    Auction,
    MortgageMarketplace,
    PromotionToken,
    PassportToken,
    Airdrop,
    PriceWatcher,
    ReserveVault,
    ERC721Marketplace,
    DividendHub,
    GovernanceHub,
    EstateLiquidator,
    ProjectToken,
    PrestigePad,
    ProjectMarketplace,
    ProjectMortgageToken,
    ERC721MortgageToken,
} from '@typechain-types';

// @utils
import { callTransaction } from '@utils/blockchain';
import { MockValidator } from '@utils/mockValidator';

// @utils/deployments/common
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployFeeReceiver } from '@utils/deployments/common/feeReceiver';
import { deployCurrency } from '@utils/deployments/common/currency';
import { deployAirdrop } from '@utils/deployments/common/airdrop';
import { deployPriceWatcher } from '@utils/deployments/common/priceWatcher';
import { deployReserveVault } from '@utils/deployments/common/reserveVault';
import { deployDividendHub } from '@utils/deployments/common/dividendHub';
import { deployGovernanceHub } from '@utils/deployments/common/governanceHub';

// @utils/deployments/land
import { deployEstateToken } from '@utils/deployments/land/estateToken';
import { deployCommissionToken } from '@utils/deployments/land/commissionToken';
import { deployEstateForger } from '@utils/deployments/land/estateForger';
import { deployEstateLiquidator } from '@utils/deployments/land/estateLiquidator';

// @utils/deployments/launch
import { deployProjectToken } from '@utils/deployments/launch/projectToken';
import { deployPrestigePad } from '@utils/deployments/launch/prestigePad';

// @utils/deployments/lend
import { deployEstateMortgageToken } from '@utils/deployments/lend/estateMortgageToken';
import { deployProjectMortgageToken } from '@utils/deployments/lend/projectMortgageToken';
import { deployERC721MortgageToken } from '@utils/deployments/lend/erc721MortgageToken';

// @utils/deployments/liquidity
import { deployTreasury } from '@utils/deployments/liquidity/treasury';
import { deployPrimaryToken } from '@utils/deployments/liquidity/primaryToken';
import { deployStakeToken } from '@utils/deployments/liquidity/stakeToken';
import { deployDistributor } from '@utils/deployments/liquidity/distributor';
import { deployDriptributor } from '@utils/deployments/liquidity/driptributor';
import { deployAuction } from '@utils/deployments/liquidity/auction';

// @utils/deployments/lucra
import { deployPassportToken } from '@utils/deployments/lucra/passportToken';
import { deployPromotionToken } from '@utils/deployments/lucra/promotionToken';

// @utils/deployments/lux
import { deployERC721Marketplace } from '@utils/deployments/lux/erc721Marketplace';
import { deployEstateMarketplace } from '@utils/deployments/lux/estateMarketplace';
import { deployMortgageMarketplace } from '@utils/deployments/lux/mortgageMarketplace';
import { deployProjectMarketplace } from '@utils/deployments/lux/projectMarketplace';

interface CommonFixture {
    deployer: any;
    admins: any[];

    // Common
    admin: Admin;
    airdrop: Airdrop;
    dividendHub: DividendHub;
    feeReceiver: FeeReceiver;
    governanceHub: GovernanceHub;
    priceWatcher: PriceWatcher;
    reserveVault: ReserveVault;

    // Land
    commissionToken: CommissionToken;
    estateToken: EstateToken;
    estateForger: EstateForger;
    estateLiquidator: EstateLiquidator;

    // Lend
    estateMortgageToken: EstateMortgageToken;
    projectMortgageToken: ProjectMortgageToken;
    erc721MortgageToken: ERC721MortgageToken;

    // Liquidity
    treasury: Treasury;
    primaryToken: PrimaryToken;
    stakeToken: StakeToken;
    distributor: Distributor;
    dripDistributor: Driptributor;
    auction: Auction;

    // Lucra
    passportToken: PassportToken;
    promotionToken: PromotionToken;

    // Lux
    estateMarketplace: EstateMarketplace;
    erc721Marketplace: ERC721Marketplace;
    mortgageMarketplace: MortgageMarketplace;
    projectMarketplace: ProjectMarketplace;

    // Launch
    projectToken: ProjectToken;
    prestigePad: PrestigePad;
}

describe('1.1. Inspect', async () => {
    async function commonFixture(): Promise<CommonFixture> {
        const [deployer, admin1, admin2, admin3, admin4, admin5, validatorWallet] = await ethers.getSigners();
        const admins = [admin1, admin2, admin3, admin4, admin5];

        const adminAddresses: string[] = admins.map((signer) => signer.address);

        const validator = new MockValidator(validatorWallet as any);

        // Common
        const admin = (await deployAdmin(
            deployer.address,
            adminAddresses[0],
            adminAddresses[1],
            adminAddresses[2],
            adminAddresses[3],
            adminAddresses[4]
        )) as Admin;

        const feeReceiver = (await deployFeeReceiver(deployer.address, admin.address)) as FeeReceiver;

        const dividendHub = (await deployDividendHub(deployer, admin.address)) as DividendHub;

        const governanceHub = (await deployGovernanceHub(
            deployer,
            admin.address,
            validator.getAddress(),
            CommonInitialization.GOVERNANCE_HUB_Fee
        )) as GovernanceHub;

        const priceWatcher = (await deployPriceWatcher(deployer, admin.address)) as PriceWatcher;

        const reserveVault = (await deployReserveVault(deployer, admin.address)) as ReserveVault;

        const airdrop = (await deployAirdrop(deployer)) as Airdrop;

        // Land
        const estateToken = (await deployEstateToken(
            deployer.address,
            admin.address,
            feeReceiver.address,
            validator.getAddress(),
            LandInitialization.ESTATE_TOKEN_BaseURI
        )) as MockEstateToken;

        const commissionToken = (await deployCommissionToken(
            deployer,
            admin.address,
            estateToken.address,
            feeReceiver.address,
            LandInitialization.COMMISSION_TOKEN_Name,
            LandInitialization.COMMISSION_TOKEN_Symbol,
            LandInitialization.COMMISSION_TOKEN_BaseURI,
            LandInitialization.COMMISSION_TOKEN_RoyaltyRate
        )) as CommissionToken;

        const estateForger = (await deployEstateForger(
            deployer,
            admin.address,
            estateToken.address,
            commissionToken.address,
            priceWatcher.address,
            feeReceiver.address,
            reserveVault.address,
            validator.getAddress(),
            LandInitialization.ESTATE_FORGER_BaseMinUnitPrice,
            LandInitialization.ESTATE_FORGER_BaseMaxUnitPrice
        )) as MockEstateForger;

        const estateLiquidator = (await deployEstateLiquidator(
            deployer,
            admin.address,
            estateToken.address,
            commissionToken.address,
            governanceHub.address,
            dividendHub.address,
            feeReceiver.address,
            validator.getAddress()
        )) as EstateLiquidator;

        // Liquidity
        const currency = (await deployCurrency(deployer, 'MockCurrency', 'MCK')) as Currency;

        const primaryToken = (await deployPrimaryToken(
            deployer,
            admin.address,
            LiquidityInitialization.PRIMARY_TOKEN_Name,
            LiquidityInitialization.PRIMARY_TOKEN_Symbol,
            LiquidityInitialization.PRIMARY_TOKEN_LiquidationUnlockedAt
        )) as PrimaryToken;

        const treasury = (await deployTreasury(
            deployer,
            admin.address,
            currency.address,
            primaryToken.address
        )) as Treasury;

        const stakeToken = (await deployStakeToken(
            deployer,
            admin.address,
            primaryToken.address,
            LiquidityInitialization.STAKE_TOKEN_Name_1,
            LiquidityInitialization.STAKE_TOKEN_Symbol_1,
            LiquidityInitialization.STAKE_TOKEN_FeeRate
        )) as StakeToken;

        const distributor = (await deployDistributor(
            deployer,
            admin.address,
            primaryToken.address,
            treasury.address
        )) as Distributor;

        const dripDistributor = (await deployDriptributor(
            deployer,
            admin.address,
            primaryToken.address,
            ethers.utils.parseEther(String(1e6))
        )) as Driptributor;

        const auction = (await deployAuction(deployer, admin.address, primaryToken.address)) as Auction;

        // Launch
        const passportToken = (await deployPassportToken(
            deployer,
            admin.address,
            LucraInitialization.PASSPORT_TOKEN_Name,
            LucraInitialization.PASSPORT_TOKEN_Symbol,
            LucraInitialization.PASSPORT_TOKEN_BaseURI,
            LucraInitialization.PASSPORT_TOKEN_Fee,
            LucraInitialization.PASSPORT_TOKEN_RoyaltyRate
        )) as PassportToken;

        const promotionToken = (await deployPromotionToken(
            deployer,
            admin.address,
            LucraInitialization.PROMOTION_TOKEN_Name,
            LucraInitialization.PROMOTION_TOKEN_Symbol,
            LucraInitialization.PROMOTION_TOKEN_Fee,
            LucraInitialization.PROMOTION_TOKEN_RoyaltyRate
        )) as PromotionToken;

        // Launch
        const projectToken = (await deployProjectToken(
            deployer,
            admin.address,
            estateToken.address,
            feeReceiver.address,
            validator.getAddress(),
            LaunchInitialization.PROJECT_TOKEN_BaseURI
        )) as ProjectToken;

        const prestigePad = (await deployPrestigePad(
            deployer,
            admin.address,
            projectToken.address,
            priceWatcher.address,
            feeReceiver.address,
            reserveVault.address,
            validator.getAddress(),
            LaunchInitialization.PRESTIGE_PAD_BaseMinUnitPrice,
            LaunchInitialization.PRESTIGE_PAD_BaseMaxUnitPrice
        )) as PrestigePad;

        // Lend
        const estateMortgageToken = (await deployEstateMortgageToken(
            deployer,
            admin.address,
            estateToken.address,
            feeReceiver.address,
            LendInitialization.ESTATE_MORTGAGE_TOKEN_Name,
            LendInitialization.ESTATE_MORTGAGE_TOKEN_Symbol,
            LendInitialization.ESTATE_MORTGAGE_TOKEN_BaseURI,
            LendInitialization.ESTATE_MORTGAGE_TOKEN_FeeRate
        )) as EstateMortgageToken;

        const projectMortgageToken = (await deployProjectMortgageToken(
            deployer,
            admin.address,
            projectToken.address,
            feeReceiver.address,
            LendInitialization.PROJECT_MORTGAGE_TOKEN_Name,
            LendInitialization.PROJECT_MORTGAGE_TOKEN_Symbol,
            LendInitialization.PROJECT_MORTGAGE_TOKEN_BaseURI,
            LendInitialization.PROJECT_MORTGAGE_TOKEN_FeeRate
        )) as ProjectMortgageToken;

        const erc721MortgageToken = (await deployERC721MortgageToken(
            deployer,
            admin.address,
            feeReceiver.address,
            LendInitialization.ERC721_MORTGAGE_TOKEN_Name,
            LendInitialization.ERC721_MORTGAGE_TOKEN_Symbol,
            LendInitialization.ERC721_MORTGAGE_TOKEN_BaseURI,
            LendInitialization.ERC721_MORTGAGE_TOKEN_FeeRate
        )) as ERC721MortgageToken;

        // Lux
        const estateMarketplace = (await deployEstateMarketplace(
            deployer.address,
            admin.address,
            estateToken.address,
            commissionToken.address
        )) as EstateMarketplace;

        const erc721Marketplace = (await deployERC721Marketplace(
            deployer,
            admin.address,
            feeReceiver.address
        )) as ERC721Marketplace;

        const mortgageMarketplace = (await deployMortgageMarketplace(
            deployer,
            admin.address,
            feeReceiver.address
        )) as MortgageMarketplace;

        const projectMarketplace = (await deployProjectMarketplace(
            deployer,
            admin.address,
            projectToken.address
        )) as ProjectMarketplace;

        return {
            deployer,
            admins,
            admin,
            airdrop,
            dividendHub,
            feeReceiver,
            governanceHub,
            priceWatcher,
            reserveVault,
            estateToken,
            commissionToken,
            estateForger,
            estateLiquidator,
            estateMortgageToken,
            projectMortgageToken,
            erc721MortgageToken,
            treasury,
            primaryToken,
            stakeToken,
            distributor,
            dripDistributor,
            auction,
            passportToken,
            promotionToken,
            projectToken,
            prestigePad,
            estateMarketplace,
            erc721Marketplace,
            mortgageMarketplace,
            projectMarketplace,
        };
    }

    describe('1.1.1. version', async () => {
        it('1.1.1.1. Return correct version for each contract', async () => {
            const fixture = await loadFixture(commonFixture);
            const {
                admin,
                feeReceiver,
                dividendHub,
                governanceHub,
                priceWatcher,
                reserveVault,
                airdrop,
                commissionToken,
                estateForger,
                estateLiquidator,
                estateToken,
                estateMortgageToken,
                projectMortgageToken,
                erc721MortgageToken,
                treasury,
                primaryToken,
                stakeToken,
                distributor,
                dripDistributor,
                auction,
                passportToken,
                promotionToken,
                estateMarketplace,
                erc721Marketplace,
                mortgageMarketplace,
                projectMarketplace,
                prestigePad,
                projectToken,
            } = fixture;

            expect(await admin.version()).to.equal('v1.2.1');
            expect(await feeReceiver.version()).to.equal('v1.2.1');
            expect(await priceWatcher.version()).to.equal('v1.2.1');
            expect(await reserveVault.version()).to.equal('v1.2.1');
            expect(await airdrop.version()).to.equal('v1.2.1');
            expect(await dividendHub.version()).to.equal('v1.2.1');
            expect(await governanceHub.version()).to.equal('v1.2.1');

            expect(await estateMortgageToken.version()).to.equal('v1.2.1');
            expect(await projectMortgageToken.version()).to.equal('v1.2.1');
            expect(await erc721MortgageToken.version()).to.equal('v1.2.1');

            expect(await estateToken.version()).to.equal('v1.2.1');
            expect(await estateForger.version()).to.equal('v1.2.1');
            expect(await commissionToken.version()).to.equal('v1.2.1');
            expect(await estateLiquidator.version()).to.equal('v1.2.1');

            expect(await treasury.version()).to.equal('v1.2.1');
            expect(await primaryToken.version()).to.equal('v1.2.1');
            expect(await stakeToken.version()).to.equal('v1.2.1');
            expect(await distributor.version()).to.equal('v1.2.1');
            expect(await dripDistributor.version()).to.equal('v1.2.1');
            expect(await auction.version()).to.equal('v1.2.1');

            expect(await passportToken.version()).to.equal('v1.2.1');
            expect(await promotionToken.version()).to.equal('v1.2.1');

            expect(await estateMarketplace.version()).to.equal('v1.2.1');
            expect(await erc721Marketplace.version()).to.equal('v1.2.1');
            expect(await mortgageMarketplace.version()).to.equal('v1.2.1');
            expect(await projectMarketplace.version()).to.equal('v1.2.1');

            expect(await projectToken.version()).to.equal('v1.2.1');
            expect(await prestigePad.version()).to.equal('v1.2.1');
        });
    });

    describe('1.1.2. receive', async () => {
        it('1.1.2.1. Receive function of each contract should not execute any code', async () => {
            async function testReceiveNotExecuteAnyCode(contract: any, gasLimit: number) {
                const [owner] = await ethers.getSigners();

                // Get the initial balance of the contract
                const initialBalance = await ethers.provider.getBalance(contract.address);

                // Send Ether to the contract and wait for the transaction to be mined
                const receipt = await callTransaction(
                    owner.sendTransaction({
                        to: contract.address,
                        value: ethers.utils.parseEther('1.0'), // Sending 1 Ether
                    })
                );

                // Get the final balance of the contract
                const finalBalance = await ethers.provider.getBalance(contract.address);

                // Check that the balance increased by 1 Ether
                expect(finalBalance.sub(initialBalance)).to.equal(ethers.utils.parseEther('1.0'));

                // Since the `receive` function is empty, we expect no events or state changes
                // If there were any, they would be detected by other means, such as emitted events
                expect(receipt.logs).to.be.empty;
                expect(receipt.gasUsed).to.be.equal(gasLimit);
            }

            const fixture = await loadFixture(commonFixture);
            const {
                admin,
                feeReceiver,
                dividendHub,
                governanceHub,
                priceWatcher,
                reserveVault,
                airdrop,
                commissionToken,
                estateForger,
                estateLiquidator,
                estateToken,
                estateMortgageToken,
                projectMortgageToken,
                erc721MortgageToken,
                treasury,
                primaryToken,
                stakeToken,
                distributor,
                dripDistributor,
                auction,
                passportToken,
                promotionToken,
                estateMarketplace,
                erc721Marketplace,
                mortgageMarketplace,
                projectMarketplace,
                prestigePad,
                projectToken,
            } = fixture;

            await testReceiveNotExecuteAnyCode(admin, 28223);

            await testReceiveNotExecuteAnyCode(feeReceiver, 28228);
            await testReceiveNotExecuteAnyCode(priceWatcher, 28223);
            await testReceiveNotExecuteAnyCode(reserveVault, 28223);
            await testReceiveNotExecuteAnyCode(airdrop, 28241);
            await testReceiveNotExecuteAnyCode(dividendHub, 28241);
            await testReceiveNotExecuteAnyCode(governanceHub, 28223);

            await testReceiveNotExecuteAnyCode(commissionToken, 28228);
            await testReceiveNotExecuteAnyCode(estateToken, 28223);
            await testReceiveNotExecuteAnyCode(estateForger, 28228);
            await testReceiveNotExecuteAnyCode(estateLiquidator, 28223);

            await testReceiveNotExecuteAnyCode(estateMortgageToken, 28228);
            await testReceiveNotExecuteAnyCode(projectMortgageToken, 28228);
            await testReceiveNotExecuteAnyCode(erc721MortgageToken, 28223);

            await testReceiveNotExecuteAnyCode(treasury, 28236);
            await testReceiveNotExecuteAnyCode(primaryToken, 28228);
            await testReceiveNotExecuteAnyCode(stakeToken, 28228);
            await testReceiveNotExecuteAnyCode(distributor, 28228);
            await testReceiveNotExecuteAnyCode(dripDistributor, 28228);
            await testReceiveNotExecuteAnyCode(auction, 28241);

            await testReceiveNotExecuteAnyCode(passportToken, 28228);
            await testReceiveNotExecuteAnyCode(promotionToken, 28228);

            await testReceiveNotExecuteAnyCode(estateMarketplace, 28223);
            await testReceiveNotExecuteAnyCode(erc721Marketplace, 28223);
            await testReceiveNotExecuteAnyCode(mortgageMarketplace, 28223);
            await testReceiveNotExecuteAnyCode(projectMarketplace, 28223);

            await testReceiveNotExecuteAnyCode(projectToken, 28223);
            await testReceiveNotExecuteAnyCode(prestigePad, 28228);
        });
    });
});
