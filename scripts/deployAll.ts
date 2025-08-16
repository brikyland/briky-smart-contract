import { LedgerSigner } from '@anders-t/ethers-ledger';
import assert from 'assert';
import { ethers, network } from 'hardhat';
import { deployAdmin } from '../utils/deployments/common/admin';
import { deployFeeReceiver } from '../utils/deployments/common/feeReceiver';
import { deployCurrency } from '../utils/deployments/mock/currency';
import { deployEstateToken } from '../utils/deployments/land/estateToken';
import { Initialization as LandInitialization } from './deployments/land/initialization';
import { Initialization as LendInitialization } from './deployments/lend/initialization';
import { deployEstateForger } from '../utils/deployments/land/estateForger';
import { deployEstateMarketplace } from '../utils/deployments/lux/estateMarketplace';
import { deployCommissionToken } from '../utils/deployments/land/commissionToken';
import { deployMortgageToken } from '../utils/deployments/lend/mortgageToken';
import { deployMortgageMarketplace } from '../utils/deployments/lux/mortgageMarketplace';
import { deployMockPriceFeed } from '../utils/deployments/mock/mockPriceFeed';
import { callAdmin_UpdateCurrencyRegistries } from '../utils/callWithSignatures/admin';
import { Admin, CommissionToken, Currency, EstateForger, EstateMarketplace, EstateToken, FeeReceiver, MockPriceFeed, MortgageMarketplace, MortgageToken } from '../typechain-types';
import { callEstateForger_UpdatePriceFeeds } from '../utils/callWithSignatures/estateForger';
import { callEstateToken_AuthorizeTokenizers, callEstateToken_UpdateCommissionToken } from '../utils/callWithSignatures/estateToken';

async function deployAll() {
    const config = network.config as any;
    const networkName = network.name.toUpperCase();
    const signer = networkName == 'MAINNET'
        ? new LedgerSigner(ethers.provider)
        : (await ethers.getSigners())[0];

    const admins = [signer, signer, signer, signer, signer];

    // Deploy Admin
    const admin1Address = config.admin1Address;
    assert.ok(
        admin1Address,
        `Missing ${networkName}_ADMIN_1_ADDRESS from environment variables!`
    );
    const admin2Address = config.admin2Address;
    assert.ok(
        admin2Address,
        `Missing ${networkName}_ADMIN_2_ADDRESS from environment variables!`
    );
    const admin3Address = config.admin3Address;
    assert.ok(
        admin3Address,
        `Missing ${networkName}_ADMIN_3_ADDRESS from environment variables!`
    );
    const admin4Address = config.admin4Address;
    assert.ok(
        admin4Address,
        `Missing ${networkName}_ADMIN_4_ADDRESS from environment variables!`
    );
    const admin5Address = config.admin5Address;
    assert.ok(
        admin5Address,
        `Missing ${networkName}_ADMIN_5_ADDRESS from environment variables!`
    );

    const admin = await deployAdmin(
        signer,
        admin1Address,
        admin2Address,
        admin3Address,
        admin4Address,
        admin5Address
    ) as Admin;
    console.log(`${networkName}_ADMIN_ADDRESS=${admin.address}`);

    // Deploy fee receiver
    const feeReceiver = await deployFeeReceiver(signer, admin.address) as FeeReceiver;
    console.log(`${networkName}_FEE_RECEIVER_ADDRESS=${feeReceiver.address}`);

    // Deploy currency
    const currency = await deployCurrency(signer, 'Local', 'LOC') as Currency;
    console.log(`${networkName}_CURRENCY_ADDRESS=${currency.address}`);
    
    // Deploy estate token
    const estateToken = await deployEstateToken(
        signer,
        admin.address,
        feeReceiver.address,
        LandInitialization.ESTATE_TOKEN_BaseURI,
        LandInitialization.ESTATE_TOKEN_RoyaltyRate,
    ) as EstateToken;
    console.log(`${networkName}_ESTATE_TOKEN_ADDRESS=${estateToken.address}`);

    // Deploy commission token
    const commissionToken = await deployCommissionToken(
        signer,
        admin.address,
        estateToken.address,
        feeReceiver.address,
        LandInitialization.COMMISSION_TOKEN_Name,
        LandInitialization.COMMISSION_TOKEN_Symbol,
        LandInitialization.COMMISSION_TOKEN_BaseURI,
        LandInitialization.COMMISSION_TOKEN_CommissionRate,
        LandInitialization.COMMISSION_TOKEN_RoyaltyRate,
    ) as CommissionToken;
    console.log(`${networkName}_COMMISSION_TOKEN_ADDRESS=${commissionToken.address}`);

    // Add commission token to estate token
    await callEstateToken_UpdateCommissionToken(
        estateToken,
        admins,
        commissionToken.address,
        await admin.nonce(),
    );

    // Deploy estate forger
    const estateForger = await deployEstateForger(
        signer,
        admin.address,
        estateToken.address,
        commissionToken.address,
        feeReceiver.address,
        LandInitialization.ESTATE_FORGER_FeeRate,
        LandInitialization.ESTATE_FORGER_BaseMinUnitPrice,
        LandInitialization.ESTATE_FORGER_BaseMaxUnitPrice
    ) as EstateForger;
    console.log(`${networkName}_ESTATE_FORGER_ADDRESS=${estateForger.address}`);

    // Authorize estateForger in estateToken
    await callEstateToken_AuthorizeTokenizers(
        estateToken,
        admins,
        [estateForger.address],
        true,
        await admin.nonce(),
    );

    // Deploy estate marketplace
    const estateMarketplace = await deployEstateMarketplace(
        signer,
        admin.address,
        estateToken.address,
        commissionToken.address,
    ) as EstateMarketplace;
    console.log(`${networkName}_ESTATE_MARKETPLACE_ADDRESS=${estateMarketplace.address}`);

    // Deploy mortgage token
    const mortgageToken = await deployMortgageToken(
        signer,
        admin.address,
        estateToken.address,
        commissionToken.address,
        feeReceiver.address,
        LendInitialization.MORTGAGE_TOKEN_Name,
        LendInitialization.MORTGAGE_TOKEN_Symbol,
        LendInitialization.MORTGAGE_TOKEN_BaseURI,
        LendInitialization.MORTGAGE_TOKEN_FeeRate,
        LendInitialization.MORTGAGE_TOKEN_RoyaltyRate,
    ) as MortgageToken;
    console.log(`${networkName}_MORTGAGE_TOKEN_ADDRESS=${mortgageToken.address}`);

    // Deploy mortgage marketplace
    const mortgageMarketplace = await deployMortgageMarketplace(
        signer,
        admin.address,
        mortgageToken.address,
        commissionToken.address
    ) as MortgageMarketplace;
    console.log(`${networkName}_MORTGAGE_MARKETPLACE_ADDRESS=${mortgageMarketplace.address}`);

    // Add currency to admin
    await callAdmin_UpdateCurrencyRegistries(
        admin,
        admins,
        [currency.address],
        [true],
        [false],
        await admin.nonce(),
    );
    console.log('Added currency to admin');

    // Deploy and add price feed to estateForger
    const priceFeed = await deployMockPriceFeed(signer, 1 * (10 ** 8), 8) as MockPriceFeed;
    await callEstateForger_UpdatePriceFeeds(
        estateForger,
        admins,
        [currency.address],
        [priceFeed.address],
        [1],
        await admin.nonce(),
    );
    console.log('Added price feed to estateForger');
}

deployAll()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
