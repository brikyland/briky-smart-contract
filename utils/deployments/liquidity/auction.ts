import { ethers, upgrades } from 'hardhat';

export async function deployAuction(signer: any, adminAddress: string, primaryTokenAddress: string) {
    const Auction = await ethers.getContractFactory('Auction', signer);
    const auction = await upgrades.deployProxy(Auction, [adminAddress, primaryTokenAddress]);
    await auction.deployed();
    return auction;
}
