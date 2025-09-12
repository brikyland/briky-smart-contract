import { LedgerSigner } from '@anders-t/ethers-ledger';
import assert from 'assert';
import { ethers, network, upgrades } from 'hardhat';
import { deployERC721Marketplace } from '@utils/deployments/lux/erc721Marketplace';

async function deployOrUpgradeERC721Marketplace() {
    const config = network.config as any;
    const networkName = network.name == 'localhost' ? 'LOCAL' : network.name.toUpperCase();
    const signer = networkName == 'MAINNET'
        ? new LedgerSigner(ethers.provider)
        : (await ethers.getSigners())[0];
    const ERC721Marketplace = await ethers.getContractFactory('ERC721Marketplace', signer);
    const erc721MarketplaceAddress = config.erc721MarketplaceAddress ?
        await (async () => {
            await upgrades.upgradeProxy(
                config.erc721MarketplaceAddress,
                ERC721Marketplace,
            );
            console.log(`Contract ERC721Marketplace has been updated to address ${config.erc721MarketplaceAddress}`);
            return config.erc721MarketplaceAddress;
        })() :
        await (async () => {
            const adminAddress = config.adminAddress;
            assert.ok(
                adminAddress,
                `Missing ${networkName}_ADMIN_ADDRESS from environment variables!`
            );
            const feeReceiverAddress = config.feeReceiverAddress;
            assert.ok(
                feeReceiverAddress,
                `Missing ${networkName}_FEE_RECEIVER_ADDRESS from environment variables!`
            );

            const erc721Marketplace = await deployERC721Marketplace(
                signer,
                adminAddress,
                feeReceiverAddress
            );
            console.log(`Contract ERC721Marketplace has been deployed to address ${erc721Marketplace.address}`);

            return erc721Marketplace.address;
        })();
    console.log(`${networkName}_ERC721_MARKETPLACE_ADDRESS=${erc721MarketplaceAddress}`);
}

deployOrUpgradeERC721Marketplace()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });