import { LedgerSigner } from '@anders-t/ethers-ledger';
import assert from 'assert';
import { ethers, network, upgrades } from 'hardhat';
import { deployPriceWatcher } from '@utils/deployments/common/priceWatcher';

async function deployOrUpgradePriceWatcher() {
    const config = network.config as any;
    const networkName = network.name == 'localhost' ? 'LOCAL' : network.name.toUpperCase();
    const signer = networkName == 'MAINNET'
        ? new LedgerSigner(ethers.provider)
        : (await ethers.getSigners())[0];
    const PriceWatcher = await ethers.getContractFactory('PriceWatcher', signer);
    const priceWatcherAddress = config.priceWatcherAddress ?
        await (async () => {
            await upgrades.upgradeProxy(
                config.priceWatcherAddress,
                PriceWatcher,
            );
            console.log(`Contract PriceWatcher has been updated to address ${config.priceWatcherAddress}`);
            return config.priceWatcherAddress;
        })() :
        await (async () => {
            const adminAddress = config.adminAddress;
            assert.ok(
                adminAddress,
                `Missing ${networkName}_ADMIN_ADDRESS from environment variables!`
            );

            const priceWatcher = await deployPriceWatcher(signer, adminAddress);
            console.log(`Contract PriceWatcher has been deployed to address ${priceWatcher.address}`);
            return priceWatcher.address;
        })();
    console.log(`${networkName}_PRICE_WATCHER_ADDRESS=${priceWatcherAddress}`);
}

deployOrUpgradePriceWatcher()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
