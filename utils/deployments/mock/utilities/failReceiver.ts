import { ethers, upgrades } from 'hardhat';

export async function deployFailReceiver(signer: any, isActive: boolean, isActiveRejectERC1155: boolean) {
    const FailReceiver = await ethers.getContractFactory('FailReceiver', signer);
    const failReceiver = await upgrades.deployProxy(FailReceiver, [isActive, isActiveRejectERC1155]);
    await failReceiver.deployed();
    return failReceiver;
}
