import { BigNumber } from 'ethers';
import { ethers, upgrades } from 'hardhat';

export async function deployMockMortgageToken(
    signer: any,
    adminAddress: string,
    feeReceiverAddress: string,
    name: string,
    symbol: string,
    baseURI: string,
    feeRate: BigNumber
) {
    const MockMortgageToken = await ethers.getContractFactory('MockMortgageToken', signer);

    const mockMortgageToken = await upgrades.deployProxy(MockMortgageToken, [
        adminAddress,
        feeReceiverAddress,
        name,
        symbol,
        baseURI,
        feeRate,
    ]);
    await mockMortgageToken.deployed();
    return mockMortgageToken;
}
