import assert from 'assert';
import { BigNumber } from 'ethers';
import { ethers, network, upgrades } from 'hardhat';
import { deployDriptributor } from '@utils/deployments/liquidity/driptributor';

export async function deployOrUpgradeDriptributor(
    signer: any,
    roundName: string,
    totalAmount: BigNumber,
) {
    const config = network.config as any;
    const networkName = network.name == 'localhost' ? 'LOCAL' : network.name.toUpperCase();
    const Driptributor = await ethers.getContractFactory('Driptributor', signer);
    return config[`${roundName}DistributorAddress`] ?
        await (async () => {
            await upgrades.upgradeProxy(
                config[`${roundName}DistributorAddress`],
                Driptributor,
            );
            console.log(`Contract Driptributor has been updated to address ${config[`${roundName}DistributorAddress`]}`);
            return config[`${roundName}DistributorAddress`];
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

            const driptributor = await deployDriptributor(
                signer,
                adminAddress,
                primaryTokenAddress,
                totalAmount,
            );
            console.log(`Contract Driptributor has been deployed to address ${driptributor.address}`);

            return driptributor.address;
        })();
}