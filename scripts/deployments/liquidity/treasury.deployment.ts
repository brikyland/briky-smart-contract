import { LedgerSigner } from '@anders-t/ethers-ledger';
import assert from 'assert';
import { ethers, network, upgrades } from 'hardhat';
import { deployTreasury } from '@utils/deployments/liquidity/treasury';

async function deployOrUpgradeTreasury() {
    const config = network.config as any;
    const networkName = network.name == 'localhost' ? 'LOCAL' : network.name.toUpperCase();
    const signer = networkName == 'MAINNET'
        ? new LedgerSigner(ethers.provider)
        : (await ethers.getSigners())[0];
    const Treasury = await ethers.getContractFactory('Treasury', signer);
    const treasuryAddress = config.treasuryAddress ?
        await (async () => {
            await upgrades.upgradeProxy(
                config.treasuryAddress,
                Treasury,
            );
            console.log(`Contract Treasury has been updated to address ${config.treasuryAddress}`);
            return config.treasuryAddress;
        })() :
        await (async () => {
            const adminAddress = config.adminAddress;
            assert.ok(
                adminAddress,
                `Missing ${networkName}_ADMIN_ADDRESS from environment variables!`
            );
            const liquidationCurrencyAddress = config.liquidationCurrencyAddress;
            assert.ok(
                liquidationCurrencyAddress,
                `Missing ${networkName}_LIQUIDATION_CURRENCY_ADDRESS from environment variables!`
            );
            const primaryTokenAddress = config.primaryTokenAddress;
            assert.ok(
                primaryTokenAddress,
                `Missing ${networkName}_PRIMARY_TOKEN_ADDRESS from environment variables!`
            );

            const treasury = await deployTreasury(
                signer,
                adminAddress,
                liquidationCurrencyAddress,
                primaryTokenAddress,
            );
            console.log(`Contract Treasury has been deployed to address ${treasury.address}`);

            return treasury.address;
        })();
    console.log(`${networkName}_TREASURY_ADDRESS=${treasuryAddress}`);
}

deployOrUpgradeTreasury()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
