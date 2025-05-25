import { BigNumber } from "ethers";
import { ethers, upgrades } from "hardhat";

export async function deployCommissionToken(
    signer: any,
    adminAddress: string,
    estateTokenAddress: string,
    feeReceiverAddress: string,
    name: string,
    symbol: string,
    baseURI: string,
    commissionRate: BigNumber,
    royaltyRate: BigNumber,
) {
    const CommissionToken = await ethers.getContractFactory('CommissionToken', signer);

    const commissionToken = await upgrades.deployProxy(
        CommissionToken,
        [
            adminAddress,
            estateTokenAddress,
            feeReceiverAddress,
            name,
            symbol,
            baseURI,
            commissionRate,
            royaltyRate
        ]
    );
    await commissionToken.deployed();
    return commissionToken;
}