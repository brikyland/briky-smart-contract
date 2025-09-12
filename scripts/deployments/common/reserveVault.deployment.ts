import { LedgerSigner } from '@anders-t/ethers-ledger';
import assert from 'assert';
import { ethers, network, upgrades } from 'hardhat';
import { deployReserveVault } from '@utils/deployments/common/reserveVault';

async function deployOrUpgradeReserveVault() {
    const config = network.config as any;
    const networkName = network.name == 'localhost' ? 'LOCAL' : network.name.toUpperCase();
    const signer = networkName == 'MAINNET'
        ? new LedgerSigner(ethers.provider)
        : (await ethers.getSigners())[0];
    const ReserveVault = await ethers.getContractFactory('ReserveVault', signer);
    const reserveVaultAddress = config.reserveVaultAddress ?
        await (async () => {
            await upgrades.upgradeProxy(
                config.reserveVaultAddress,
                ReserveVault,
            );
            console.log(`Contract ReserveVault has been updated to address ${config.reserveVaultAddress}`);
            return config.reserveVaultAddress;
        })() :
        await (async () => {
            const adminAddress = config.adminAddress;
            assert.ok(
                adminAddress,
                `Missing ${networkName}_ADMIN_ADDRESS from environment variables!`
            );

            const reserveVault = await deployReserveVault(signer, adminAddress);
            console.log(`Contract ReserveVault has been deployed to address ${reserveVault.address}`);
            return reserveVault.address;
        })();
    console.log(`${networkName}_RESERVE_VAULT_ADDRESS=${reserveVaultAddress}`);
}

deployOrUpgradeReserveVault()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
