import { LedgerSigner } from '@anders-t/ethers-ledger';
import { ethers, network } from 'hardhat';
import {deployOrUpgradeAuction} from '../base/auction.deployment';

async function deployOrUpgradePublicSaleAuction() {
    const networkName = network.name == 'localhost' ? 'LOCAL' : network.name.toUpperCase();
    const signer = networkName == 'MAINNET'
        ? new LedgerSigner(ethers.provider)
        : (await ethers.getSigners())[0];

    const publicSaleAuctionAddress = await deployOrUpgradeAuction(
        signer,
        'publicSale',
    )
    console.log(`${networkName}_PUBLIC_SALE_AUCTION_ADDRESS=${publicSaleAuctionAddress}`);
}

deployOrUpgradePublicSaleAuction()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });