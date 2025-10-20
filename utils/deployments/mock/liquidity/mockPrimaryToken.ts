import { ethers, upgrades } from 'hardhat';

export async function deployMockPrimaryToken(
    signer: any,
    adminAddress: string,
    name: string,
    symbol: string,
    liquidationUnlockedAt: number
) {
    const PrimaryToken = await ethers.getContractFactory('MockPrimaryToken', signer);

    const primaryToken = await upgrades.deployProxy(PrimaryToken, [
        adminAddress,
        name,
        symbol,
        liquidationUnlockedAt
    ]);
    await primaryToken.deployed();
    return primaryToken;
}
