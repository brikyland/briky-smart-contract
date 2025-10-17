import { ethers, upgrades } from 'hardhat';

export async function deployReentrancyExclusiveERC20(signer: any) {
    const ReentrancyExclusiveERC20 = await ethers.getContractFactory('ReentrancyExclusiveERC20', signer);
    const reentrancy = await upgrades.deployProxy(ReentrancyExclusiveERC20, []);
    await reentrancy.deployed();
    return reentrancy;
}
