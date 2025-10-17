import { ethers, upgrades } from 'hardhat';

export async function deployFeeReceiver(signer: any, adminAddress: string) {
    const FeeReceiver = await ethers.getContractFactory('FeeReceiver', signer);
    const feeReceiver = await upgrades.deployProxy(FeeReceiver, [adminAddress]);
    await feeReceiver.deployed();
    return feeReceiver;
}
