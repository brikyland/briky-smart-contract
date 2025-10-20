import { ethers, upgrades } from 'hardhat';

export async function deployReserveVault(signer: any, adminAddress: string) {
    const ReserveVault = await ethers.getContractFactory('ReserveVault', signer);
    const reserveVault = await upgrades.deployProxy(ReserveVault, [adminAddress]);
    await reserveVault.deployed();
    return reserveVault;
}
