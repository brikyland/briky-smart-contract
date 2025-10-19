import { ethers, upgrades } from 'hardhat';
import { BigNumberish } from 'ethers';

export async function deployMockPriceFeed(signer: any, answer: BigNumberish, decimals: number) {
    const MockPriceFeed = await ethers.getContractFactory('MockPriceFeed', signer);

    const mockPriceFeed = await upgrades.deployProxy(MockPriceFeed, [answer, decimals]);
    await mockPriceFeed.deployed();
    return mockPriceFeed;
}
