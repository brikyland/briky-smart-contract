import { LedgerSigner } from '@anders-t/ethers-ledger';
import assert from 'assert';
import { ethers, network, upgrades } from 'hardhat';
import { deployMortgageMarketplace } from '@utils/deployments/lux/mortgageMarketplace';

async function deployOrUpgradeMortgageMarketplace() {
    const config = network.config as any;
    const networkName = network.name == 'localhost' ? 'LOCAL' : network.name.toUpperCase();
    const signer = networkName == 'MAINNET'
        ? new LedgerSigner(ethers.provider)
        : (await ethers.getSigners())[0];
    const MortgageMarketplace = await ethers.getContractFactory('MortgageMarketplace', signer);
    const mortgageMarketplaceAddress = config.mortgageMarketplaceAddress ?
        await (async () => {
            await upgrades.upgradeProxy(
                config.mortgageMarketplaceAddress,
                MortgageMarketplace,
            );
            console.log(`Contract MortgageMarketplace has been updated to address ${config.mortgageMarketplaceAddress}`);
            return config.mortgageMarketplaceAddress;
        })() :
        await (async () => {
            const adminAddress = config.adminAddress;
            assert.ok(
                adminAddress,
                `Missing ${networkName}_ADMIN_ADDRESS from environment variables!`
            );
            const feeReceiverAddress = config.feeReceiverAddress;
            assert.ok(
                feeReceiverAddress,
                `Missing ${networkName}_FEE_RECEIVER_ADDRESS from environment variables!`
            );

            const mortgageMarketplace = await deployMortgageMarketplace(
                signer,
                adminAddress,
                feeReceiverAddress
            );
            console.log(`Contract MortgageMarketplace has been deployed to address ${mortgageMarketplace.address}`);

            return mortgageMarketplace.address;
        })();
    console.log(`${networkName}_MORTGAGE_MARKETPLACE_ADDRESS=${mortgageMarketplaceAddress}`);
}

deployOrUpgradeMortgageMarketplace()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
