import { BigNumber } from "ethers";
import { ethers, upgrades } from "hardhat";

export async function deployEstateForger(
    signer: any,
    adminAddress: string,
    estateTokenAddress: string,
    commissionTokenAddress: string,
    feeReceiverAddress: string,
    feeRate: number,
    exclusiveRate: number,
    commissionRate: number,
    baseMinUnitPrice: BigNumber,
    baseMaxUnitPrice: BigNumber,
) {
    const EstateForger = await ethers.getContractFactory('EstateForger', signer);
    const estateForger = await upgrades.deployProxy(
        EstateForger,
        [
            adminAddress,
            estateTokenAddress,
            commissionTokenAddress,
            feeReceiverAddress,
            feeRate,
            exclusiveRate,
            commissionRate,
            baseMinUnitPrice,
            baseMaxUnitPrice,
        ]
    );
    await estateForger.deployed();
    return estateForger;
}
