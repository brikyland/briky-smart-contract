import { LedgerSigner } from '@anders-t/ethers-ledger';
import assert from 'assert';
import { ethers, network, upgrades } from 'hardhat';
import { deployDividendHub } from '@utils/deployments/common/dividendHub';

async function deployOrUpgradeDividendHub() {
    const config = network.config as any;
    const networkName = network.name == 'localhost' ? 'LOCAL' : network.name.toUpperCase();
    const signer = networkName == 'MAINNET'
        ? new LedgerSigner(ethers.provider)
        : (await ethers.getSigners())[0];
    const DividendHub = await ethers.getContractFactory('DividendHub', signer);
    const dividendHubAddress = config.dividendHubAddress ?
        await (async () => {
            await upgrades.upgradeProxy(
                config.dividendHubAddress,
                DividendHub,
            );
            console.log(`Contract DividendHub has been updated to address ${config.dividendHubAddress}`);
            return config.dividendHubAddress;
        })() :
        await (async () => {
            const adminAddress = config.adminAddress;
            assert.ok(
                adminAddress,
                `Missing ${networkName}_ADMIN_ADDRESS from environment variables!`
            );

            const dividendHub = await deployDividendHub(
                signer,
                adminAddress,
            );
            console.log(`Contract DividendHub has been deployed to address ${dividendHub.address}`);

            return dividendHub.address;
        })();
    console.log(`${networkName}_DIVIDEND_HUB_ADDRESS=${dividendHubAddress}`);
}

deployOrUpgradeDividendHub()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
