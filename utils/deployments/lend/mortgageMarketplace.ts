import { ethers, upgrades } from "hardhat";

export async function deployMortgageMarketplace(
    signer: any,
    adminAddress: string,
    mortgageTokenAddress: string,
    commissionTokenAddress: string,
    exclusiveRate: number,
    commissionRate: number,
) {
    const MortgageMarketplace = await ethers.getContractFactory('MortgageMarketplace', signer);

    const mortgageMarketplace = await upgrades.deployProxy(
        MortgageMarketplace,
        [
            adminAddress,
            mortgageTokenAddress,
            commissionTokenAddress,
            exclusiveRate,
            commissionRate,
        ]
    );
    await mortgageMarketplace.deployed();
    return mortgageMarketplace;
}