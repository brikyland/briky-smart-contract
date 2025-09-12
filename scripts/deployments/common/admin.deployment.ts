import { LedgerSigner } from '@anders-t/ethers-ledger';
import assert from 'assert';
import { ethers, network, upgrades } from 'hardhat';
import { deployAdmin } from '@utils/deployments/common/admin';

async function deployOrUpgradeAdmin() {
    const config = network.config as any;
    const networkName = network.name == 'localhost' ? 'LOCAL' : network.name.toUpperCase();
    const signer = networkName == 'MAINNET'
        ? new LedgerSigner(ethers.provider)
        : (await ethers.getSigners())[0];
    const Admin = await ethers.getContractFactory('Admin', signer);
    const adminAddress = config.adminAddress ?
        await (async () => {
            await upgrades.upgradeProxy(
                config.adminAddress,
                Admin,
            );
            console.log(`Contract Admin has been updated to address ${config.adminAddress}`);
            return config.adminAddress;
        })() :
        await (async () => {
            const admin1Address = config.admin1Address;
            assert.ok(
                admin1Address,
                `Missing ${networkName}_ADMIN_1_ADDRESS from environment variables!`
            );
            const admin2Address = config.admin2Address;
            assert.ok(
                admin2Address,
                `Missing ${networkName}_ADMIN_2_ADDRESS from environment variables!`
            );
            const admin3Address = config.admin3Address;
            assert.ok(
                admin3Address,
                `Missing ${networkName}_ADMIN_3_ADDRESS from environment variables!`
            );
            const admin4Address = config.admin4Address;
            assert.ok(
                admin4Address,
                `Missing ${networkName}_ADMIN_4_ADDRESS from environment variables!`
            );
            const admin5Address = config.admin5Address;
            assert.ok(
                admin5Address,
                `Missing ${networkName}_ADMIN_5_ADDRESS from environment variables!`
            );

            const admin = await deployAdmin(signer, admin1Address, admin2Address, admin3Address, admin4Address, admin5Address);
            console.log(`Contract Admin has been deployed to address ${admin.address}`);

            return admin.address;
        })();
    console.log(`${networkName}_ADMIN_ADDRESS=${adminAddress}`);
}

deployOrUpgradeAdmin()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
