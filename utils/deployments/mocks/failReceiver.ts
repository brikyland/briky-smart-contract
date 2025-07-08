import { ethers, upgrades } from 'hardhat';

export async function deployFailReceiver(
    signer: any,
    isActive: boolean,
) {
    const FailReceiver = await ethers.getContractFactory('FailReceiver', signer);
    const failReceiver = await upgrades.deployProxy(FailReceiver, [isActive]);
    await failReceiver.deployed();
    return failReceiver;
}