import { ethers, upgrades } from 'hardhat';

export async function deployReentrancyERC1155Receiver(signer: any) {
    const ReentrancyERC1155Receiver = await ethers.getContractFactory('ReentrancyERC1155Receiver', signer);
    const reentrancy = await upgrades.deployProxy(ReentrancyERC1155Receiver, []);
    await reentrancy.deployed();
    return reentrancy;
}
