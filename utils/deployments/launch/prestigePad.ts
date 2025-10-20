import { BigNumber } from 'ethers';
import { ethers, upgrades } from 'hardhat';

export async function deployPrestigePad(
    signer: any,
    adminAddress: string,
    projectTokenAddress: string,
    priceWatcherAddress: string,
    feeReceiverAddress: string,
    reserveVaultAddress: string,
    validatorAddress: string,
    baseMinUnitPrice: BigNumber,
    baseMaxUnitPrice: BigNumber
) {
    const PrestigePad = await ethers.getContractFactory('PrestigePad', signer);
    const prestigePad = await upgrades.deployProxy(PrestigePad, [
        adminAddress,
        projectTokenAddress,
        priceWatcherAddress,
        feeReceiverAddress,
        reserveVaultAddress,
        validatorAddress,
        baseMinUnitPrice,
        baseMaxUnitPrice,
    ]);
    await prestigePad.deployed();
    return prestigePad;
}
