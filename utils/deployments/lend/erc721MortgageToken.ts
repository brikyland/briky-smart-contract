import { BigNumber } from 'ethers';
import { ethers, upgrades } from 'hardhat';

export async function deployERC721MortgageToken(
    signer: any,
    adminAddress: string,
    feeReceiverAddress: string,
    name: string,
    symbol: string,
    baseURI: string,
    feeRate: BigNumber
) {
    const ERC721MortgageToken = await ethers.getContractFactory('ERC721MortgageToken', signer);
    const erc721MortgageToken = await upgrades.deployProxy(ERC721MortgageToken, [
        adminAddress,
        feeReceiverAddress,
        name,
        symbol,
        baseURI,
        feeRate,
    ]);
    await erc721MortgageToken.deployed();
    return erc721MortgageToken;
}
