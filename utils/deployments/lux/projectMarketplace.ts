import { ethers, upgrades } from "hardhat";

export async function deployProjectMarketplace(
    signer: any,
    adminAddress: string,
    projectTokenAddress: string,
) {
    const ProjectMarketplace = await ethers.getContractFactory('ProjectMarketplace', signer);
    const projectMarketplace = await upgrades.deployProxy(
        ProjectMarketplace,
        [
            adminAddress,
            projectTokenAddress,
        ]
    );
    await projectMarketplace.deployed();
    return projectMarketplace;
}
