import { ethers, upgrades } from "hardhat";

export async function deployMortgageToken(
    signer: any,
    adminAddress: string,
    estateTokenAddress: string,
    commissionTokenAddress: string,
    feeReceiverAddress: string,
    name: string,
    symbol: string,
    uri: string,
    royaltyRate: number,
    feeRate: number,
    exclusiveRate: number,
    commissionRate: number,
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
            uri,
            royaltyRate,
            feeRate,
            exclusiveRate,
            commissionRate,
        ]
    );
    await mortgageToken.deployed();
    return mortgageToken;
}