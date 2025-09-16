import { ethers, upgrades } from "hardhat";

export async function deployAssetMarketplace(
    signer: any,
    adminAddress: string,
    collectionAddress: string,
) {
    const AssetMarketplace = await ethers.getContractFactory('AssetMarketplace', signer);
    const assetMarketplace = await upgrades.deployProxy(
        AssetMarketplace,
        [
            adminAddress,
            collectionAddress,
        ]
    );
    await assetMarketplace.deployed();
    return assetMarketplace;
}
