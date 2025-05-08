import { LedgerSigner } from '@anders-t/ethers-ledger';
import assert from 'assert';
import { ethers, network, upgrades } from 'hardhat';
import { Constant } from "../../../utils/constant";
import { deployCommissionMarketplace } from '../../../utils/deployments/land/commissionMarketplace';

async function deployOrUpgradeCommissionMarketplace() {
    const config = network.config as any;
    const networkName = network.name.toUpperCase();
    const signer = networkName == 'MAINNET'
        ? new LedgerSigner(ethers.provider)
        : (await ethers.getSigners())[0];
    const CommissionMarketplace = await ethers.getContractFactory('CommissionMarketplace', signer);
    const commissionMarketplaceAddress = config.commissionMarketplaceAddress ?
        await (async () => {
            await upgrades.upgradeProxy(
                config.commissionMarketplaceAddress,
                CommissionMarketplace,
            );
            console.log(`Contract CommissionMarketplace has been updated to address ${config.commissionMarketplaceAddress}`);
            return config.commissionMarketplaceAddress;
        })() :
        await (async () => {
            const adminAddress = config.adminAddress;
            assert.ok(
                adminAddress,
                `Missing ${networkName}_ADMIN_ADDRESS from environment variables!`
            );
            const commissionTokenAddress = config.commissionTokenAddress;
            assert.ok(
                commissionTokenAddress,
                `Missing ${networkName}_COMMISSION_TOKEN_ADDRESS from environment variables!`
            );

            const commissionMarketplace = await deployCommissionMarketplace(
                signer,
                adminAddress,
                commissionTokenAddress,
                Constant.MORTGAGE_TOKEN_INITIAL_ExclusiveRate,
                Constant.MORTGAGE_TOKEN_INITIAL_CommissionRate,
            );
            console.log(`Contract CommissionMarketplace has been deployed to address ${commissionMarketplace.address}`);

            return commissionMarketplace.address;
        })();
    console.log(`${networkName}_COMMISSION_MARKETPLACE_ADDRESS=${commissionMarketplaceAddress}`);
}

deployOrUpgradeCommissionMarketplace()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
