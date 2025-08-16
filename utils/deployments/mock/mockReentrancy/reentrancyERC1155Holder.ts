import { ethers, upgrades } from 'hardhat';

export async function deployReentrancyERC1155Holder(
    signer: any,
) {
    const ReentrancyERC1155Holder = await ethers.getContractFactory('ReentrancyERC1155Holder', signer);
    const reentrancy = await upgrades.deployProxy(ReentrancyERC1155Holder, []);
    await reentrancy.deployed();
    return reentrancy;
}
