import { LedgerSigner } from '@anders-t/ethers-ledger';
import { ethers, network } from 'hardhat';
import { deployOrUpgradeAssetMarketplace } from './base/assetMarketplace.deployment';

async function deployOrUpgradeProjectMarketplace() {
    const networkName = network.name == 'localhost' ? 'LOCAL' : network.name.toUpperCase();
    const signer = networkName == 'MAINNET'
        ? new LedgerSigner(ethers.provider)
        : (await ethers.getSigners())[0];
    const projectMarketplaceAddress = await deployOrUpgradeAssetMarketplace(
        signer,
        'projectToken',
        'PROJECT_TOKEN',
        'Project',
    );
    console.log(`${networkName}_PROJECT_MARKETPLACE_ADDRESS=${projectMarketplaceAddress}`);
}

deployOrUpgradeProjectMarketplace()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
