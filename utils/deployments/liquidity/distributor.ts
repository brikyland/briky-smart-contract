import { ethers, upgrades } from 'hardhat';

export async function deployDistributor(
    signer: any,
    adminAddress: string,
    primaryTokenAddress: string,
    treasuryAddress: string
) {
    const Distributor = await ethers.getContractFactory('Distributor', signer);
    const distributor = await upgrades.deployProxy(Distributor, [adminAddress, primaryTokenAddress, treasuryAddress]);
    await distributor.deployed();
    return distributor;
}
