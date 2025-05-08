import { ethers, upgrades } from "hardhat";

export async function deployEstateMarketplace(
    signer: any,
    adminAddress: string,
    estateTokenAddress: string,
    commissionTokenAddress: string,
    exclusiveRate: number,
    commissionRate: number
) {
    const EstateMarketplace = await ethers.getContractFactory('EstateMarketplace', signer);
    const estateMarketplace = await upgrades.deployProxy(
        EstateMarketplace,
        [
            adminAddress,
            estateTokenAddress,
            commissionTokenAddress,
            exclusiveRate,
            commissionRate,
        ]
    );
    await estateMarketplace.deployed();
    return estateMarketplace;
}
