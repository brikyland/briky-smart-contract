import { ethers, upgrades } from 'hardhat';

export async function deployMockProjectToken(
    signer: any,
    adminAddress: string,
    estateTokenAddress: string,
    feeReceiverAddress: string,
    validatorAddress: string,
    baseURI: string
) {
    const MockProjectToken = await ethers.getContractFactory('MockProjectToken', signer);

    const mockProjectToken = await upgrades.deployProxy(MockProjectToken, [
        adminAddress,
        estateTokenAddress,
        feeReceiverAddress,
        validatorAddress,
        baseURI,
    ]);
    await mockProjectToken.deployed();
    return mockProjectToken;
}
