import { ethers, upgrades } from "hardhat";

export async function deployMockEstateToken(
    signer: any,
    adminAddress: string,
    feeReceiverAddress: string,
    baseURI: string,
    royaltyRate: number,
) {
    const MockEstateToken = await ethers.getContractFactory('MockEstateToken', signer);

    const mockEstateToken = await upgrades.deployProxy(
        MockEstateToken,
        [
            adminAddress,
            feeReceiverAddress,
            baseURI,
            royaltyRate,
        ]
    );
    await mockEstateToken.deployed();
    return mockEstateToken;
}