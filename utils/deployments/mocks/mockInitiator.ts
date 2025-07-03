import { ethers, upgrades } from "hardhat";

export async function deployMockInitiator(signer: any) {
    const MockInitiator = await ethers.getContractFactory('MockInitiator', signer);
    const mockInitiator = await upgrades.deployProxy(MockInitiator);
    await mockInitiator.deployed();
    return mockInitiator;
}