import { ethers, upgrades } from "hardhat";

export async function deployMortgageMarketplace(
    signer: any,
    adminAddress: string,
    commissionTokenAddress: string
) {
    const MortgageMarketplace = await ethers.getContractFactory('MortgageMarketplace', signer);

    const mortgageMarketplace = await upgrades.deployProxy(
        MortgageMarketplace,
        [
            adminAddress,
            commissionTokenAddress
        ]
    );
    await mortgageMarketplace.deployed();
    return mortgageMarketplace;
}