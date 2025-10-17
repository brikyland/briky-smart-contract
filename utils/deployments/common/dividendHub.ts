import { ethers, upgrades } from 'hardhat';

export async function deployDividendHub(signer: any, adminAddress: string) {
    const DividendHub = await ethers.getContractFactory('DividendHub', signer);
    const dividendHub = await upgrades.deployProxy(DividendHub, [adminAddress]);
    await dividendHub.deployed();
    return dividendHub;
}
