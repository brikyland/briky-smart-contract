import { LedgerSigner } from '@anders-t/ethers-ledger';
import assert from 'assert';
import { ethers, network, upgrades } from 'hardhat';
import { deployEstateForger } from '@utils/deployments/land/estateForger';
import { Initialization } from './initialization';

async function deployOrUpgradeEstateForger() {
    const config = network.config as any;
    const networkName = network.name == 'localhost' ? 'LOCAL' : network.name.toUpperCase();
    const signer = networkName == 'MAINNET'
        ? new LedgerSigner(ethers.provider)
        : (await ethers.getSigners())[0];
    const EstateForger = await ethers.getContractFactory('EstateForger', signer);
    const estateForgerAddress = config.estateForgerAddress ?
        await (async () => {
            await upgrades.upgradeProxy(
                config.estateForgerAddress,
                EstateForger,
            );
            console.log(`Contract EstateForger has been updated to address ${config.estateForgerAddress}`);
            return config.estateForgerAddress;
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
            )
            const priceWatcherAddress = config.priceWatcherAddress;
            assert.ok(
                priceWatcherAddress,
                `Missing ${networkName}_PRICE_WATCHER_ADDRESS from environment variables!`
            );
            const feeReceiverAddress = config.feeReceiverAddress;
            assert.ok(
                feeReceiverAddress,
                `Missing ${networkName}_FEE_RECEIVER_ADDRESS from environment variables!`
            );
            const reserveVaultAddress = config.reserveVaultAddress;
            assert.ok(
                reserveVaultAddress,
                `Missing ${networkName}_RESERVE_VAULT_ADDRESS from environment variables!`
            );
            const estateForgerValidatorAddress = config.estateForgerValidatorAddress;
            assert.ok(
                estateForgerValidatorAddress,
                `Missing ${networkName}_ESTATE_FORGER_VALIDATOR_ADDRESS from environment variables!`
            );
            
            const estateForger = await deployEstateForger(
                signer,
                adminAddress,
                estateTokenAddress,
                commissionTokenAddress,
                priceWatcherAddress,
                feeReceiverAddress,
                reserveVaultAddress,
                estateForgerValidatorAddress,
                Initialization.ESTATE_FORGER_BaseMinUnitPrice,
                Initialization.ESTATE_FORGER_BaseMaxUnitPrice
            );
            console.log(`Contract EstateForger has been deployed to address ${estateForger.address}`);

            return estateForger.address;
        })();
    console.log(`${networkName}_ESTATE_FORGER_ADDRESS=${estateForgerAddress}`);
}

deployOrUpgradeEstateForger()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
