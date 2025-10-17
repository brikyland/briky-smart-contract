import { BigNumber } from 'ethers';
import { ethers, upgrades } from 'hardhat';

export async function deployPassportToken(
    signer: any,
    adminAddress: string,
    name: string,
    symbol: string,
    baseURI: string,
    fee: BigNumber,
    royaltyRate: BigNumber
) {
    const PassportToken = await ethers.getContractFactory('PassportToken', signer);
    const passportToken = await upgrades.deployProxy(PassportToken, [
        adminAddress,
        name,
        symbol,
        baseURI,
        fee,
        royaltyRate,
    ]);
    await passportToken.deployed();
    return passportToken;
}
