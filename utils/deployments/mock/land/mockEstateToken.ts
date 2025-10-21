import { ethers, upgrades } from 'hardhat';

export async function deployMockEstateToken(
    signer: any,
    adminAddress: string,
    feeReceiverAddress: string,
    validatorAddress: string,
    baseURI: string
) {
    const MockEstateToken = await ethers.getContractFactory('MockEstateToken', signer);

    const mockEstateToken = await upgrades.deployProxy(MockEstateToken, [
        adminAddress,
        feeReceiverAddress,
        validatorAddress,
        baseURI,
    ]);
    
    await mockEstateToken.deployed();
    return mockEstateToken;
}
