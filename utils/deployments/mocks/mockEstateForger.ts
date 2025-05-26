import { ethers, upgrades } from "hardhat";
import { BigNumberish } from "ethers";

export async function deployMockEstateForger(
    signer: any,
    adminAddress: string,
    estateTokenAddress: string,
    commissionTokenAddress: string,
    feeReceiverAddress: string,
    feeRate: number,
    exclusiveRate: number,
    commissionRate: number,
    baseMinUnitPrice: BigNumberish,
    baseMaxUnitPrice: BigNumberish,
) {
    const MockEstateForger = await ethers.getContractFactory('MockEstateForger', signer);
    const mockEstateForger = await upgrades.deployProxy(
        MockEstateForger,
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
    await mockEstateForger.deployed();
    return mockEstateForger;
}
