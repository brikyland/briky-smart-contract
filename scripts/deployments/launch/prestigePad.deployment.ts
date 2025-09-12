import { LedgerSigner } from '@anders-t/ethers-ledger';
import assert from 'assert';
import { ethers, network, upgrades } from 'hardhat';
import { deployPrestigePad } from '@utils/deployments/launch/prestigePad';
import { Initialization } from './initialization';

async function deployOrUpgradePrestigePad() {
    const config = network.config as any;
    const networkName = network.name == 'localhost' ? 'LOCAL' : network.name.toUpperCase();
    const signer = networkName == 'MAINNET'
        ? new LedgerSigner(ethers.provider)
        : (await ethers.getSigners())[0];
    const PrestigePad = await ethers.getContractFactory('PrestigePad', signer);
    const prestigePadAddress = config.prestigePadAddress ?
        await (async () => {
            await upgrades.upgradeProxy(
                config.prestigePadAddress,
                PrestigePad,
            );
            console.log(`Contract PrestigePad has been updated to address ${config.prestigePadAddress}`);
            return config.prestigePadAddress;
        })() :
        await (async () => {
            const adminAddress = config.adminAddress;
            assert.ok(
                adminAddress,
                `Missing ${networkName}_ADMIN_ADDRESS from environment variables!`
            );
            const projectTokenAddress = config.projectTokenAddress;
            assert.ok(
                projectTokenAddress,
                `Missing ${networkName}_PROJECT_TOKEN_ADDRESS from environment variables!`
            );
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
            const prestigePadValidatorAddress = config.prestigePadValidatorAddress;
            assert.ok(
                prestigePadValidatorAddress,
                `Missing ${networkName}_PRESTIGE_PAD_VALIDATOR_ADDRESS from environment variables!`
            );
            
            const prestigePad = await deployPrestigePad(
                signer,
                adminAddress,
                projectTokenAddress,
                priceWatcherAddress,
                feeReceiverAddress,
                reserveVaultAddress,
                prestigePadValidatorAddress,
                Initialization.PRESTIGE_PAD_BaseMinUnitPrice,
                Initialization.PRESTIGE_PAD_BaseMaxUnitPrice,
            );
            console.log(`Contract PrestigePad has been deployed to address ${prestigePad.address}`);

            return prestigePad.address;
        })();
    console.log(`${networkName}_PRESTIGE_PAD_ADDRESS=${prestigePadAddress}`);
}

deployOrUpgradePrestigePad()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
