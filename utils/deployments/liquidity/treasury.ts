import { ethers, upgrades } from 'hardhat';

export async function deployTreasury(
    signer: any,
    adminAddress: string,
    currencyAddress: string,
    primaryTokenAddress: string
) {
    const Treasury = await ethers.getContractFactory('Treasury', signer);
    const treasury = await upgrades.deployProxy(Treasury, [adminAddress, currencyAddress, primaryTokenAddress]);
    await treasury.deployed();
    return treasury;
}
