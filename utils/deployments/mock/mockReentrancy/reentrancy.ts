import { ethers } from "hardhat";

export async function deployReentrancy(
    signer: any,
) {
    const Reentrancy = await ethers.getContractFactory('Reentrancy', signer);
    const reentrancyAttack = await Reentrancy.deploy();
    await reentrancyAttack.deployed();
    return reentrancyAttack;
}