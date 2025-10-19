import { ethers, upgrades } from 'hardhat';

export async function deployReentrancyReceiver(
    signer: any,
    isTriggeredOnReceive: boolean,
    isTriggeredOnERC1155Receive: boolean
) {
    const ReentrancyReceiver = await ethers.getContractFactory('ReentrancyReceiver', signer);
    const reentrancyReceiver = await upgrades.deployProxy(ReentrancyReceiver, [
        isTriggeredOnReceive,
        isTriggeredOnERC1155Receive,
    ]);
    await reentrancyReceiver.deployed();
    return reentrancyReceiver;
}
