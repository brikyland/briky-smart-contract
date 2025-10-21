import { ethers, upgrades } from 'hardhat';

export async function deployReentrancyERC20(
    signer: any,
    isTriggeredOnTransfer: boolean,
    isTriggeredOnExclusiveDiscount: boolean
) {
    const ReentrancyERC20 = await ethers.getContractFactory('ReentrancyERC20', signer);
    const reentrancy = await upgrades.deployProxy(ReentrancyERC20, [
        isTriggeredOnTransfer,
        isTriggeredOnExclusiveDiscount,
    ]);
    await reentrancy.deployed();
    return reentrancy;
}
