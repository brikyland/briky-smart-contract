import { ethers, upgrades } from 'hardhat';

export async function deployAirdrop(signer: any) {
    const Airdrop = await ethers.getContractFactory('Airdrop', signer);
    const airdrop = await upgrades.deployProxy(Airdrop);
    await airdrop.deployed();
    return airdrop;
}
