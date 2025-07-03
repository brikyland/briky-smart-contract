import { ethers, upgrades } from "hardhat";
import { BigNumberish } from "ethers";

export async function deployMockEstateForger(
    signer: any,
    adminAddress: string,
    estateTokenAddress: string,
    commissionTokenAddress: string,
    priceWatcherAddress: string,
    feeReceiverAddress: string,
    reserveVaultAddress: string,
    feeRate: BigNumberish,
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
            priceWatcherAddress,
            feeReceiverAddress,
            reserveVaultAddress,
            feeRate,
            baseMinUnitPrice,
            baseMaxUnitPrice,
        ]
    );
    await mockEstateForger.deployed();
    return mockEstateForger;
}
