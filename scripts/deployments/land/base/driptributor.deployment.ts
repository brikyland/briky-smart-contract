import assert from 'assert';
import { BigNumber } from "ethers";
import { ethers, network, upgrades } from 'hardhat';
import { deployDriptributor } from '../../../../utils/deployments/land/driptributor';

export async function deployOrUpgradeDriptributor(
    signer: any,
    roundName: string,
    totalAmount: BigNumber,
) {
    const config = network.config as any;
    const networkName = network.name.toUpperCase();
    const Driptributor = await ethers.getContractFactory('Driptributor', signer);
    return config[`${roundName}DriptributorAddress`] ?
        await (async () => {
            await upgrades.upgradeProxy(
                config[`${roundName}DriptributorAddress`],
                Driptributor,
            );
            console.log(`Contract Driptributor has been updated to address ${config[`${roundName}DriptributorAddress`]}`);
            return config[`${roundName}DriptributorAddress`];
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
            const stakeToken1Address = config.stakeToken1Address;
            assert.ok(
                stakeToken1Address,
                `Missing ${networkName}_STAKE_TOKEN_1_ADDRESS from environment variables!`
            );
            const stakeToken2Address = config.stakeToken2Address;
            assert.ok(
                stakeToken2Address,
                `Missing ${networkName}_STAKE_TOKEN_2_ADDRESS from environment variables!`
            );
            const stakeToken3Address = config.stakeToken3Address;
            assert.ok(
                stakeToken3Address,
                `Missing ${networkName}_STAKE_TOKEN_3_ADDRESS from environment variables!`
            );

            const driptributor = await deployDriptributor(
                signer,
                adminAddress,
                primaryTokenAddress,
                stakeToken1Address,
                stakeToken2Address,
                stakeToken3Address,
                totalAmount,
            );
            console.log(`Contract Driptributor has been deployed to address ${driptributor.address}`);

            return driptributor.address;
        })();
}