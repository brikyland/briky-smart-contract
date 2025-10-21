import { ethers, upgrades } from 'hardhat';

export async function deployMockEstateLiquidator(
    signer: any,
    adminAddress: string,
    estateTokenAddress: string,
    commissionTokenAddress: string,
    governorHubAddress: string,
    dividendHubAddress: string,
    feeReceiverAddress: string,
    validatorAddress: string
) {
    const MockEstateLiquidator = await ethers.getContractFactory('MockEstateLiquidator', signer);
    const mockEstateLiquidator = await upgrades.deployProxy(MockEstateLiquidator, [
        adminAddress,
        estateTokenAddress,
        commissionTokenAddress,
        governorHubAddress,
        dividendHubAddress,
        feeReceiverAddress,
        validatorAddress,
    ]);
    await mockEstateLiquidator.deployed();
    return mockEstateLiquidator;
}
