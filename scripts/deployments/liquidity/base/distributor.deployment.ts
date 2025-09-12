import assert from 'assert';
import { ethers, network, upgrades } from 'hardhat';
import { deployDistributor } from '@utils/deployments/liquidity/distributor';

export async function deployOrUpgradeDistributor(
    signer: any,
    roundName: string
) {
    const config = network.config as any;
    const networkName = network.name == 'localhost' ? 'LOCAL' : network.name.toUpperCase();
    const Distributor = await ethers.getContractFactory('Distributor', signer);
    return config[`${roundName}DistributorAddress`] ?
        await (async () => {
            await upgrades.upgradeProxy(
                config[`${roundName}DistributorAddress`],
                Distributor,
            );
            console.log(`Contract Distributor has been updated to address ${config[`${roundName}DistributorAddress`]}`);
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
            const treasuryAddress = config.treasuryAddress;
            assert.ok(
                treasuryAddress,
                `Missing ${networkName}_TREASURY_ADDRESS from environment variables!`
            );

            const distributor = await deployDistributor(signer, adminAddress, primaryTokenAddress, treasuryAddress);
            console.log(`Contract Distributor has been deployed to address ${distributor.address}`);

            return distributor.address;
        })();
}