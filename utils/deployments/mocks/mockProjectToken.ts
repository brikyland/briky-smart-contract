import { BigNumber } from "ethers";
import { ethers, upgrades } from "hardhat";

export async function deployMockProjectToken(
    signer: any,
    adminAddress: string,
    estateTokenAddress: string,
    feeReceiverAddress: string,
    validatorAddress: string,
    baseURI: string,
    royaltyRate: BigNumber,
) {
    const MockProjectToken = await ethers.getContractFactory('MockProjectToken', signer);

    const mockProjectToken = await upgrades.deployProxy(
        MockProjectToken,
        [
            adminAddress,
            estateTokenAddress,
            feeReceiverAddress,
            validatorAddress,
            baseURI,
            royaltyRate,
        ]
    );
    await mockProjectToken.deployed();
    return mockProjectToken;
}