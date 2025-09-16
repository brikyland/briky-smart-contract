import { LedgerSigner } from '@anders-t/ethers-ledger';
import assert from 'assert';
import { ethers, network, upgrades } from 'hardhat';
import { deployProjectToken } from '@utils/deployments/launch/projectToken';
import { Initialization } from './initialization';

async function deployOrUpgradeProjectToken() {
    const config = network.config as any;
    const networkName = network.name == 'localhost' ? 'LOCAL' : network.name.toUpperCase();
    const signer = networkName == 'MAINNET'
        ? new LedgerSigner(ethers.provider)
        : (await ethers.getSigners())[0];
    const ProjectToken = await ethers.getContractFactory('ProjectToken', signer);
    const projectTokenAddress = config.projectTokenAddress ?
        await (async () => {
            await upgrades.upgradeProxy(
                config.projectTokenAddress,
                ProjectToken,
            );
            console.log(`Contract ProjectToken has been updated to address ${config.projectTokenAddress}`);
            return config.projectTokenAddress;
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
            const feeReceiverAddress = config.feeReceiverAddress;
            assert.ok(
                feeReceiverAddress,
                `Missing ${networkName}_FEE_RECEIVER_ADDRESS from environment variables!`
            );
            const projectTokenValidatorAddress = config.projectTokenValidatorAddress;
            assert.ok(
                projectTokenValidatorAddress,
                `Missing ${networkName}_PROJECT_TOKEN_VALIDATOR_ADDRESS from environment variables!`
            );

            const projectToken = await deployProjectToken(
                signer,
                adminAddress,
                estateTokenAddress,
                feeReceiverAddress,
                projectTokenValidatorAddress,
                Initialization.PROJECT_TOKEN_BaseURI,
            );
            console.log(`Contract ProjectToken has been deployed to address ${projectToken.address}`);

            return projectToken.address;
        })();
    console.log(`${networkName}_PROJECT_TOKEN_ADDRESS=${projectTokenAddress}`);
}

deployOrUpgradeProjectToken()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
