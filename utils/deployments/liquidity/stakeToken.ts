import { ethers, upgrades } from 'hardhat';
import { BigNumber } from 'ethers';

export async function deployStakeToken(
    signer: any,
    adminAddress: string,
    primaryTokenAddress: string,
    name: string,
    symbol: string,
    feeRate: BigNumber
) {
    const StakeToken = await ethers.getContractFactory('StakeToken', signer);
    const stakeToken = await upgrades.deployProxy(StakeToken, [
        adminAddress,
        primaryTokenAddress,
        name,
        symbol,
        feeRate,
    ]);
    await stakeToken.deployed();
    return stakeToken;
}
