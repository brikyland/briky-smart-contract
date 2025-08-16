import { ethers, upgrades } from "hardhat";

export async function deployMortgageMarketplace(
    signer: any,
    adminAddress: string,
    mortgageTokenAddress: string,
    commissionTokenAddress: string
) {
    const MortgageMarketplace = await ethers.getContractFactory('MortgageMarketplace', signer);

    const mortgageMarketplace = await upgrades.deployProxy(
        MortgageMarketplace,
        [
            adminAddress,
            mortgageTokenAddress,
            commissionTokenAddress
        ]
    );
    await mortgageMarketplace.deployed();
    return mortgageMarketplace;
}