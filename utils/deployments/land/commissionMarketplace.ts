import { ethers, upgrades } from "hardhat";

export async function deployCommissionMarketplace(
    signer: any,
    adminAddress: string,
    commissionTokenAddress: string
) {
    const CommissionMarketplace = await ethers.getContractFactory('CommissionMarketplace', signer);

    const commissionMarketplace = await upgrades.deployProxy(
        CommissionMarketplace,
        [
            adminAddress,
            commissionTokenAddress,
        ]
    );
    await commissionMarketplace.deployed();
    return commissionMarketplace;
}