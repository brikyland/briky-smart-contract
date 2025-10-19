import { BigNumber } from 'ethers';
import { ethers, upgrades } from 'hardhat';

export async function deployEstateForger(
    signer: any,
    adminAddress: string,
    estateTokenAddress: string,
    commissionTokenAddress: string,
    priceWatcherAddress: string,
    feeReceiverAddress: string,
    reserveVaultAddress: string,
    validatorAddress: string,
    baseMinUnitPrice: BigNumber,
    baseMaxUnitPrice: BigNumber
) {
    const EstateForger = await ethers.getContractFactory('EstateForger', signer);
    const estateForger = await upgrades.deployProxy(EstateForger, [
        adminAddress,
        estateTokenAddress,
        commissionTokenAddress,
        priceWatcherAddress,
        feeReceiverAddress,
        reserveVaultAddress,
        validatorAddress,
        baseMinUnitPrice,
        baseMaxUnitPrice,
    ]);
    await estateForger.deployed();
    return estateForger;
}
