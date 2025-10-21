import { ethers, upgrades } from 'hardhat';
import { BigNumber } from 'ethers';

export async function deployMockStakeToken(
    signer: any,
    adminAddress: string,
    primaryTokenAddress: string,
    name: string,
    symbol: string,
    feeRate: BigNumber
) {
    const StakeToken = await ethers.getContractFactory('MockStakeToken', signer);
    const stakeToken = await upgrades.deployProxy(StakeToken, [
        adminAddress,
        primaryTokenAddress,
        name,
        symbol,
        feeRate
    ]);
    await stakeToken.deployed();
    return stakeToken;
}
