import { ethers, upgrades } from "hardhat";

export async function deployMockProvider(signer: any) {
    const MockProvider = await ethers.getContractFactory('MockProvider', signer);
    const mockProvider = await upgrades.deployProxy(MockProvider);
    await mockProvider.deployed();
    return mockProvider;
}