import { BigNumber } from 'ethers';
import { ethers, upgrades } from 'hardhat';

export async function deployProjectMortgageToken(
    signer: any,
    adminAddress: string,
    projectTokenAddress: string,
    feeReceiverAddress: string,
    name: string,
    symbol: string,
    baseURI: string,
    feeRate: BigNumber
) {
    const ProjectMortgageToken = await ethers.getContractFactory('ProjectMortgageToken', signer);
    const projectMortgageToken = await upgrades.deployProxy(ProjectMortgageToken, [
        adminAddress,
        projectTokenAddress,
        feeReceiverAddress,
        name,
        symbol,
        baseURI,
        feeRate,
    ]);
    await projectMortgageToken.deployed();
    return projectMortgageToken;
}
