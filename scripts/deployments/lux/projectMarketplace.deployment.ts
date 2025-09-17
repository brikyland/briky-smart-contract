import { LedgerSigner } from '@anders-t/ethers-ledger';
import { deployProjectMarketplace } from '@utils/deployments/lux/projectMarketplace';
import assert from 'assert';
import { ethers, network, upgrades } from 'hardhat';

async function deployOrUpgradeProjectMarketplace() {
    const config = network.config as any;
    const networkName = network.name == 'localhost' ? 'LOCAL' : network.name.toUpperCase();
    const signer = networkName == 'MAINNET'
        ? new LedgerSigner(ethers.provider)
        : (await ethers.getSigners())[0];
    const ProjectMarketplace = await ethers.getContractFactory('ProjectMarketplace', signer);
    const projectMarketplaceAddress = config.projectMarketplaceAddress ?
        await (async () => {
            await upgrades.upgradeProxy(
                config.projectMarketplaceAddress,
                ProjectMarketplace,
            );
            console.log(`Contract ProjectMarketplace has been updated to address ${config.projectMarketplaceAddress}`);
            return config.projectMarketplaceAddress;
        })() :
        await (async () => {
            const adminAddress = config.adminAddress;
            assert.ok(
                adminAddress,
                `Missing ${networkName}_ADMIN_ADDRESS from environment variables!`
            );
            const projectTokenAddress = config[`projectTokenAddress`];
            assert.ok(
                projectTokenAddress,
                `Missing ${networkName}_PROJECT_TOKEN_ADDRESS from environment variables!`
            );

            const projectMarketplace = await deployProjectMarketplace(
                signer,
                adminAddress,
                projectTokenAddress,
            );
            console.log(`Contract ProjectMarketplace has been deployed to address ${projectMarketplace.address}`);

            return projectMarketplace.address;
        })();
    console.log(`${networkName}_PROJECT_MARKETPLACE_ADDRESS=${projectMarketplaceAddress}`);
}

deployOrUpgradeProjectMarketplace()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
