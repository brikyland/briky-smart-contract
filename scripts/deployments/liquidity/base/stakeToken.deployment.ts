import assert from 'assert';
import { ethers, network, upgrades } from 'hardhat';
import { deployStakeToken } from '@utils/deployments/liquidity/stakeToken';
import { BigNumber } from 'ethers';

export async function deployOrUpgradeStakeToken(
    signer: any,
    stakeTokenIndex: number,
    name: string,
    symbol: string,
    feeRate: BigNumber,
) {
    const config = network.config as any;
    const networkName = network.name == 'localhost' ? 'LOCAL' : network.name.toUpperCase();
    const StakeToken = await ethers.getContractFactory('StakeToken', signer);
    return config[`stakeToken${stakeTokenIndex}Address`] ?
        await (async () => {
            await upgrades.upgradeProxy(
                config[`stakeToken${stakeTokenIndex}Address`],
                StakeToken,
            );
            console.log(`Contract StakeToken has been updated to address ${config[`stakeToken${stakeTokenIndex}Address`]}`);
            return config[`stakeToken${stakeTokenIndex}Address`];
        })() :
        await (async () => {
            const adminAddress = config.adminAddress;
            assert.ok(
                adminAddress,
                `Missing ${networkName}_ADMIN_ADDRESS from environment variables!`
            );
            const primaryTokenAddress = config.primaryTokenAddress;
            assert.ok(
                primaryTokenAddress,
                `Missing ${networkName}_PRIMARY_TOKEN_ADDRESS from environment variables!`
            );

            const stakeToken = await deployStakeToken(
                signer,
                adminAddress,
                primaryTokenAddress,
                name,
                symbol,
                feeRate,
            );
            console.log(`Contract StakeToken has been deployed to address ${stakeToken.address}`);

            return stakeToken.address;
        })();
}
