import { ethers, upgrades } from "hardhat";

export async function deployStateToken(
    signer: any,
    adminAddress: string,
    primaryTokenAddress: string,
    name: string,
    symbol: string,
) {
    const StakeToken = await ethers.getContractFactory('StakeToken', signer);
    const stakeToken = await upgrades.deployProxy(
        StakeToken,
        [
            adminAddress,
            primaryTokenAddress,
            name,
            symbol,
        ]
    );
    await stakeToken.deployed();
    return stakeToken
}