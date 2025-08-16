import { BigNumber } from "ethers";
import { ethers, upgrades } from "hardhat";

export async function deployProjectToken(
    signer: any,
    adminAddress: string,
    estateTokenAddress: string,
    feeReceiverAddress: string,
    validatorAddress: string,
    baseURI: string,
    royaltyRate: BigNumber,
) {
    const ProjectToken = await ethers.getContractFactory('ProjectToken', signer);

    const projectToken = await upgrades.deployProxy(
        ProjectToken,
        [
            adminAddress,
            estateTokenAddress,
            feeReceiverAddress,
            validatorAddress,
            baseURI,
            royaltyRate,
        ]
    );
    await projectToken.deployed();
    return projectToken;
}