import { ethers, upgrades } from "hardhat";
import { BigNumber } from "ethers";

export async function deployDriptributor(
    signer: any,
    adminAddress: string,
    primaryTokenAddress: string,
    stakeTokenAddress: string,
    totalAmount: BigNumber
) {
    const Driptributor = await ethers.getContractFactory('Driptributor', signer);

    const driptributor = await upgrades.deployProxy(
        Driptributor,
        [
            adminAddress,
            primaryTokenAddress,
            stakeTokenAddress,
            totalAmount,
        ]
    );
    await driptributor.deployed();
    return driptributor;
}