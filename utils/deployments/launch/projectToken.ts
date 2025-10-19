import { ethers, upgrades } from 'hardhat';

export async function deployProjectToken(
    signer: any,
    adminAddress: string,
    estateTokenAddress: string,
    feeReceiverAddress: string,
    validatorAddress: string,
    baseURI: string
) {
    const ProjectToken = await ethers.getContractFactory('ProjectToken', signer);

    const projectToken = await upgrades.deployProxy(ProjectToken, [
        adminAddress,
        estateTokenAddress,
        feeReceiverAddress,
        validatorAddress,
        baseURI,
    ]);
    await projectToken.deployed();
    return projectToken;
}
