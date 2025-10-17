import { ethers, upgrades } from 'hardhat';

export async function deployReentrancyERC20(signer: any) {
    const ReentrancyERC20 = await ethers.getContractFactory('ReentrancyERC20', signer);
    const reentrancy = await upgrades.deployProxy(ReentrancyERC20, []);
    await reentrancy.deployed();
    return reentrancy;
}
