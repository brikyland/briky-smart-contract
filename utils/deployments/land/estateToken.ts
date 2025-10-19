import { ethers, upgrades } from 'hardhat';

export async function deployEstateToken(
    signer: any,
    adminAddress: string,
    feeReceiverAddress: string,
    validatorAddress: string,
    baseURI: string
) {
    const EstateToken = await ethers.getContractFactory('EstateToken', signer);

    const estateToken = await upgrades.deployProxy(EstateToken, [
        adminAddress,
        feeReceiverAddress,
        validatorAddress,
        baseURI,
    ]);
    await estateToken.deployed();
    return estateToken;
}
