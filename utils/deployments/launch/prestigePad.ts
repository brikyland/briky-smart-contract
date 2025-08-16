import { BigNumber, BigNumberish } from "ethers";
import { ethers, upgrades } from "hardhat";

export async function deployPrestigePad(
    signer: any,
    adminAddress: string,
    projectTokenAddress: string,
    priceWatcherAddress: string,
    feeReceiverAddress: string,
    reserveVaultAddress: string,
    validatorAddress: string,
    baseMinUnitPrice: BigNumber,
    baseMaxUnitPrice: BigNumber,
    feeRate: BigNumber,
) {
    const PrestigePad = await ethers.getContractFactory('PrestigePad', signer);
    const prestigePad = await upgrades.deployProxy(
        PrestigePad,
        [
            adminAddress,
            projectTokenAddress,
            priceWatcherAddress,
            feeReceiverAddress,
            reserveVaultAddress,
            validatorAddress,
            baseMinUnitPrice,
            baseMaxUnitPrice,
            feeRate,
        ]
    );
    await prestigePad.deployed();
    return prestigePad;
}
