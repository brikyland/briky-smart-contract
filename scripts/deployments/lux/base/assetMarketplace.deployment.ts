import assert from 'assert';
import { ethers, network, upgrades } from 'hardhat';
import { deployAssetMarketplace } from '@utils/deployments/lux/assetMarketplace';

export async function deployOrUpgradeAssetMarketplace(
    signer: any,
    collectionName: string,
    collectionUppercaseName: string,
    marketplaceName: string,
) {
    const config = network.config as any;
    const networkName = network.name == 'localhost' ? 'LOCAL' : network.name.toUpperCase();
    const AssetMarketplace = await ethers.getContractFactory('AssetMarketplace', signer);
    return config[`${marketplaceName}MarketplaceAddress`] ?
        await (async () => {
            await upgrades.upgradeProxy(
                config[`${marketplaceName}MarketplaceAddress`],
                AssetMarketplace,
            );
            console.log(`Contract AssetMarketplace has been updated to address ${config[`${marketplaceName}MarketplaceAddress`]}`);
            return config[`${marketplaceName}MarketplaceAddress`];
        })() :
        await (async () => {
            const adminAddress = config.adminAddress;
            assert.ok(
                adminAddress,
                `Missing ${networkName}_ADMIN_ADDRESS from environment variables!`
            );
            const collectionAddress = config[`${collectionName}Address`];
            assert.ok(
                collectionAddress,
                `Missing ${networkName}_${collectionUppercaseName}_ADDRESS from environment variables!`
            );

            const assetMarketplace = await deployAssetMarketplace(
                signer,
                adminAddress,
                collectionAddress,
            );
            console.log(`Contract AssetMarketplace has been deployed to address ${assetMarketplace.address}`);

            return assetMarketplace.address;
        })();
}