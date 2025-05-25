import { ethers, upgrades } from "hardhat";

export async function deployAuction(
    signer: any,
    adminAddress: string,
    primaryTokenAddress: string,
    stakeToken1Address: string,
    stakeToken2Address: string,
    stakeToken3Address: string,
) {
    const Auction = await ethers.getContractFactory('Auction', signer);
    const auction = await upgrades.deployProxy(
        Auction,
        [
            adminAddress,
            primaryTokenAddress,
            stakeToken1Address,
            stakeToken2Address,
            stakeToken3Address,
        ]
    );
    await auction.deployed();
    return auction;
}