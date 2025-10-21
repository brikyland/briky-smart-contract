import { ethers, upgrades } from 'hardhat';

export async function deployFundProvider(signer: any) {
    const FundProvider = await ethers.getContractFactory('FundProvider', signer);
    const fundProvider = await upgrades.deployProxy(FundProvider);
    await fundProvider.deployed();
    return fundProvider;
}
