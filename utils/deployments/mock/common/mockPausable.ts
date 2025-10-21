import { ethers, upgrades } from 'hardhat';

export async function deployMockPausable(signer: any, admin: string) {
    const MockPausable = await ethers.getContractFactory('MockPausable', signer);

    const mockPausable = await upgrades.deployProxy(MockPausable, [admin]);
    await mockPausable.deployed();
    return mockPausable;
}
