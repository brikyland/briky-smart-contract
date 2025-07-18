import { BigNumber } from "ethers";
import { ethers, upgrades } from "hardhat";

export async function deployEstateLiquidator(
    signer: any,
    adminAddress: string,
    estateTokenAddress: string,
    commissionTokenAddress: string,
    governanceHubAddress: string,
    dividendHubAddress: string,
    feeReceiverAddress: string,
    estateLiquidatorValidatorAddress: string,
    feeRate: BigNumber,
) {
    const EstateLiquidator = await ethers.getContractFactory('EstateLiquidator', signer);
    const estateLiquidator = await upgrades.deployProxy(
        EstateLiquidator,
        [
            adminAddress,
            estateTokenAddress,
            commissionTokenAddress,
            governanceHubAddress,
            dividendHubAddress,
            feeReceiverAddress,
            estateLiquidatorValidatorAddress,
            feeRate,
        ]
    );
    await estateLiquidator.deployed();
    return estateLiquidator;
}
