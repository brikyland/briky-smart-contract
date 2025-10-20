import { ethers, upgrades } from 'hardhat';

export async function deployPrimaryToken(
    signer: any,
    adminAddress: string,
    name: string,
    symbol: string,
    liquidationUnlockedAt: number
) {
    const PrimaryToken = await ethers.getContractFactory('PrimaryToken', signer);

    const primaryToken = await upgrades.deployProxy(PrimaryToken, [adminAddress, name, symbol, liquidationUnlockedAt]);
    await primaryToken.deployed();
    return primaryToken;
}
