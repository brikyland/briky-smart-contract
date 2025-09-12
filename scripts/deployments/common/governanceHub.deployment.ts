import { LedgerSigner } from '@anders-t/ethers-ledger';
import assert from 'assert';
import { ethers, network, upgrades } from 'hardhat';
import { deployGovernanceHub } from '@utils/deployments/common/governanceHub';
import { Initialization } from "./initialization";

async function deployOrUpgradeGovernanceHub() {
    const config = network.config as any;
    const networkName = network.name == 'localhost' ? 'LOCAL' : network.name.toUpperCase();
    const signer = networkName == 'MAINNET'
        ? new LedgerSigner(ethers.provider)
        : (await ethers.getSigners())[0];
    const GovernanceHub = await ethers.getContractFactory('GovernanceHub', signer);
    const governanceHubAddress = config.governanceHubAddress ?
        await (async () => {
            await upgrades.upgradeProxy(
                config.governanceHubAddress,
                GovernanceHub,
            );
            console.log(`Contract GovernanceHub has been updated to address ${config.governanceHubAddress}`);
            return config.governanceHubAddress;
        })() :
        await (async () => {
            const adminAddress = config.adminAddress;
            assert.ok(
                adminAddress,
                `Missing ${networkName}_ADMIN_ADDRESS from environment variables!`
            );
            const governanceHubValidatorAddress = config.governanceHubValidatorAddress;
            assert.ok(
                governanceHubValidatorAddress,
                `Missing ${networkName}_GOVERNANCE_HUB_VALIDATOR_ADDRESS from environment variables!`
            );

            const governanceHub = await deployGovernanceHub(
                signer,
                adminAddress,
                governanceHubValidatorAddress,
                Initialization.GOVERNANCE_HUB_Fee,
            );
            console.log(`Contract GovernanceHub has been deployed to address ${governanceHub.address}`);
            return governanceHub.address;
        })();
    console.log(`${networkName}_GOVERNANCE_HUB_ADDRESS=${governanceHubAddress}`);
}

deployOrUpgradeGovernanceHub()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
