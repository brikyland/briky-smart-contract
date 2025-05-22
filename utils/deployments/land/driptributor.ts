import { ethers, upgrades } from "hardhat";
import { BigNumber } from "ethers";

export async function deployDriptributor(
    signer: any,
    adminAddress: string,
    primaryTokenAddress: string,
    stakeToken1Address: string,
    stakeToken2Address: string,
    stakeToken3Address: string,
    totalAmount: BigNumber
) {
    const Driptributor = await ethers.getContractFactory('Driptributor', signer);

    const driptributor = await upgrades.deployProxy(
        Driptributor,
        [
            adminAddress,
            primaryTokenAddress,
            stakeToken1Address,
            stakeToken2Address,
            stakeToken3Address,
            totalAmount,
        ]
    );
    await driptributor.deployed();
    return driptributor;
}