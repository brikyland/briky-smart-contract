import { BigNumber } from 'ethers';
import { ethers, upgrades } from 'hardhat';

export async function deployEstateMortgageToken(
    signer: any,
    adminAddress: string,
    estateTokenAddress: string,
    feeReceiverAddress: string,
    name: string,
    symbol: string,
    baseURI: string,
    feeRate: BigNumber
) {
    const EstateMortgageToken = await ethers.getContractFactory('EstateMortgageToken', signer);
    const estateMortgageToken = await upgrades.deployProxy(EstateMortgageToken, [
        adminAddress,
        estateTokenAddress,
        feeReceiverAddress,
        name,
        symbol,
        baseURI,
        feeRate,
    ]);
    await estateMortgageToken.deployed();
    return estateMortgageToken;
}
