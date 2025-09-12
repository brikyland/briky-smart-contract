import { LedgerSigner } from '@anders-t/ethers-ledger';
import assert from 'assert';
import { ethers, network, upgrades } from 'hardhat';
import { deployEstateMarketplace } from '@utils/deployments/lux/estateMarketplace';

async function deployOrUpgradeEstateMarketplace() {
    const config = network.config as any;
    const networkName = network.name == 'localhost' ? 'LOCAL' : network.name.toUpperCase();
    const signer = networkName == 'MAINNET'
        ? new LedgerSigner(ethers.provider)
        : (await ethers.getSigners())[0];
    const EstateMarketplace = await ethers.getContractFactory('EstateMarketplace', signer);
    const estateMarketplaceAddress = config.estateMarketplaceAddress ?
        await (async () => {
            await upgrades.upgradeProxy(
                config.estateMarketplaceAddress,
                EstateMarketplace,
            );
            console.log(`Contract EstateMarketplace has been updated to address ${config.estateMarketplaceAddress}`);
            return config.estateMarketplaceAddress;
        })() :
        await (async () => {
            const adminAddress = config.adminAddress;
            assert.ok(
                adminAddress,
                `Missing ${networkName}_ADMIN_ADDRESS from environment variables!`
            );
            const estateTokenAddress = config.estateTokenAddress;
            assert.ok(
                estateTokenAddress,
                `Missing ${networkName}_ESTATE_TOKEN_ADDRESS from environment variables!`
            );
            const commissionTokenAddress = config.commissionTokenAddress;
            assert.ok(
                commissionTokenAddress,
                `Missing ${networkName}_COMMISSION_TOKEN_ADDRESS from environment variables!`
            );

            const estateMarketplace = await deployEstateMarketplace(
                signer,
                adminAddress,
                estateTokenAddress,
                commissionTokenAddress,
            );
            console.log(`Contract EstateMarketplace has been deployed to address ${estateMarketplace.address}`);

            return estateMarketplace.address;
        })();
    console.log(`${networkName}_ESTATE_MARKETPLACE_ADDRESS=${estateMarketplaceAddress}`);
}

deployOrUpgradeEstateMarketplace()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
