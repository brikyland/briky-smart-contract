import { ethers, upgrades } from "hardhat";
import { BigNumberish } from "ethers";

export async function deployStakeToken(
    signer: any,
    adminAddress: string,
    primaryTokenAddress: string,
    name: string,
    symbol: string,
    feeRate: BigNumberish,
) {
    const StakeToken = await ethers.getContractFactory('StakeToken', signer);
    const stakeToken = await upgrades.deployProxy(
        StakeToken,
        [
            adminAddress,
            primaryTokenAddress,
            name,
            symbol,
            feeRate,
        ]
    );
    await stakeToken.deployed();
    return stakeToken
}