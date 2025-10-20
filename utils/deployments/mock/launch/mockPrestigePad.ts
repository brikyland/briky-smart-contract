import { BigNumber } from 'ethers';
import { ethers, upgrades } from 'hardhat';

export async function deployMockPrestigePad(
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
    const MockPrestigePad = await ethers.getContractFactory('MockPrestigePad', signer);
    const mockPrestigePad = await upgrades.deployProxy(MockPrestigePad, [
        adminAddress,
        projectTokenAddress,
        priceWatcherAddress,
        feeReceiverAddress,
        reserveVaultAddress,
        validatorAddress,
        baseMinUnitPrice,
        baseMaxUnitPrice,
    ]);
    await mockPrestigePad.deployed();
    return mockPrestigePad;
}
