import { ethers, upgrades } from 'hardhat';

export async function deployMockValidatable(signer: any, admin: string, validator: string) {
    const MockValidatable = await ethers.getContractFactory('MockValidatable', signer);

    const mockValidatable = await upgrades.deployProxy(MockValidatable, [admin, validator]);
    await mockValidatable.deployed();
    return mockValidatable;
}
