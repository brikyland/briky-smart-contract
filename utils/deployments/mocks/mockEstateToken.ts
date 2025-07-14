import { ethers, upgrades } from "hardhat";
import { BigNumberish } from "ethers";

export async function deployMockEstateToken(
    signer: any,
    adminAddress: string,
    feeReceiverAddress: string,
    governanceHubAddress: string,
    paymentHubAddress: string,
    validatorAddress: string,
    baseURI: string,
    royaltyRate: BigNumberish,
) {
    const MockEstateToken = await ethers.getContractFactory('MockEstateToken', signer);

    const mockEstateToken = await upgrades.deployProxy(
        MockEstateToken,
        [
            adminAddress,
            feeReceiverAddress,
            governanceHubAddress,
            paymentHubAddress,
            validatorAddress,
            baseURI,
            royaltyRate,
        ]
    );
    await mockEstateToken.deployed();
    return mockEstateToken;
}