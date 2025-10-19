import { ethers, upgrades } from 'hardhat';

export async function deployEstateLiquidator(
    signer: any,
    adminAddress: string,
    estateTokenAddress: string,
    commissionTokenAddress: string,
    governanceHubAddress: string,
    dividendHubAddress: string,
    feeReceiverAddress: string,
    estateLiquidatorValidatorAddress: string
) {
    const EstateLiquidator = await ethers.getContractFactory('EstateLiquidator', signer);
    const estateLiquidator = await upgrades.deployProxy(EstateLiquidator, [
        adminAddress,
        estateTokenAddress,
        commissionTokenAddress,
        governanceHubAddress,
        dividendHubAddress,
        feeReceiverAddress,
        estateLiquidatorValidatorAddress,
    ]);
    await estateLiquidator.deployed();
    return estateLiquidator;
}
