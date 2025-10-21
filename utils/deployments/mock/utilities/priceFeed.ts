import { ethers, upgrades } from 'hardhat';
import { BigNumberish } from 'ethers';

export async function deployPriceFeed(signer: any, answer: BigNumberish, decimals: number) {
    const PriceFeed = await ethers.getContractFactory('PriceFeed', signer);

    const priceFeed = await upgrades.deployProxy(PriceFeed, [answer, decimals]);
    await priceFeed.deployed();
    return priceFeed;
}
