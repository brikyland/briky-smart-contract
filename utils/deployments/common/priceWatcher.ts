import { ethers, upgrades } from 'hardhat';

export async function deployPriceWatcher(signer: any, adminAddress: string) {
    const PriceWatcher = await ethers.getContractFactory('PriceWatcher', signer);
    const priceWatcher = await upgrades.deployProxy(PriceWatcher, [adminAddress]);
    await priceWatcher.deployed();
    return priceWatcher;
}
