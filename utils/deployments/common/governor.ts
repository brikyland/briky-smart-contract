import { ethers, upgrades } from 'hardhat';

export async function deployGovernor(signer: any, adminAddress: string) {
    const Governor = await ethers.getContractFactory('Governor', signer);
    const governor = await upgrades.deployProxy(Governor, [adminAddress]);
    await governor.deployed();
    return governor;
}
