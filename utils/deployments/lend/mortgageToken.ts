import { BigNumber } from "ethers";
import { ethers, upgrades } from "hardhat";

export async function deployMortgageToken(
    signer: any,
    adminAddress: string,
    estateTokenAddress: string,
    commissionTokenAddress: string,
    feeReceiverAddress: string,
    name: string,
    symbol: string,
    baseURI: string,
    feeRate: BigNumber,
) {
    const MortgageToken = await ethers.getContractFactory('MortgageToken', signer);
    const mortgageToken = await upgrades.deployProxy(
        MortgageToken,
        [
            adminAddress,
            estateTokenAddress,
            commissionTokenAddress,
            feeReceiverAddress,
            name,
            symbol,
            baseURI,
            feeRate,
        ]
    );
    await mortgageToken.deployed();
    return mortgageToken;
}