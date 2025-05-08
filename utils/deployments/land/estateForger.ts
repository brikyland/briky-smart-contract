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
        ]
    );
    await estateForger.deployed();
    return estateForger;
}
