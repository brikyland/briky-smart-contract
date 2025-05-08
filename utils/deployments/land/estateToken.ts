import { ethers, upgrades } from "hardhat";

export async function deployEstateToken(
    signer: any,
    adminAddress: string,
    feeReceiverAddress: string,
    baseURI: string,
    royaltyRate: number,
) {
    const EstateToken = await ethers.getContractFactory('EstateToken', signer);

    const estateToken = await upgrades.deployProxy(
        EstateToken,
        [
            adminAddress,
            feeReceiverAddress,
            baseURI,
            royaltyRate,
        ]
    );
    await estateToken.deployed();
    return estateToken;
}