import { ethers, upgrades } from "hardhat";

export async function deployMockStakeToken(
    signer: any,
    adminAddress: string,
    primaryTokenAddress: string,
    name: string,
    symbol: string,
) {
    const StakeToken = await ethers.getContractFactory('MockStakeToken', signer);
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
