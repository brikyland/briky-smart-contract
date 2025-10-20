import { ethers, upgrades } from 'hardhat';
import { BigNumber } from 'ethers';

export async function deployDriptributor(
    signer: any,
    adminAddress: string,
    primaryTokenAddress: string,
    totalAmount: BigNumber
) {
    const Driptributor = await ethers.getContractFactory('Driptributor', signer);

    const driptributor = await upgrades.deployProxy(Driptributor, [adminAddress, primaryTokenAddress, totalAmount]);
    await driptributor.deployed();
    return driptributor;
}
