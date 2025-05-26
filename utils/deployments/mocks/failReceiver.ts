import { ethers } from 'hardhat';

export async function deployFailReceiver(
    signer: any,
) {
    const FailReceiver = await ethers.getContractFactory('FailReceiver', signer);
    const failReceiver = await FailReceiver.deploy();
    await failReceiver.deployed();
    return failReceiver;
}