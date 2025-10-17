import { ethers, upgrades } from 'hardhat';

export async function deployProjectMarketplace(signer: any, adminAddress: string, collectionAddress: string) {
    const ProjectMarketplace = await ethers.getContractFactory('ProjectMarketplace', signer);
    const projectMarketplace = await upgrades.deployProxy(ProjectMarketplace, [adminAddress, collectionAddress]);
    await projectMarketplace.deployed();
    return projectMarketplace;
}
