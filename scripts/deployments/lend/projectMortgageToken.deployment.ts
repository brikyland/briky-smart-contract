import { LedgerSigner } from '@anders-t/ethers-ledger';
import assert from 'assert';
import { ethers, network, upgrades } from 'hardhat';
import { deployProjectMortgageToken } from '@utils/deployments/lend/projectMortgageToken';
import { Initialization } from './initialization';

async function deployOrUpgradeProjectMortgageToken() {
    const config = network.config as any;
    const networkName = network.name == 'localhost' ? 'LOCAL' : network.name.toUpperCase();
    const signer = networkName == 'MAINNET'
        ? new LedgerSigner(ethers.provider)
        : (await ethers.getSigners())[0];
    const ProjectMortgageToken = await ethers.getContractFactory('ProjectMortgageToken', signer);
    const projectMortgageTokenAddress = config.projectMortgageTokenAddress ?
        await (async () => {
            await upgrades.upgradeProxy(
                config.projectMortgageTokenAddress,
                ProjectMortgageToken,
            );
            console.log(`Contract ProjectMortgageToken has been updated to address ${config.mortgageTokenAddress}`);
            return config.projectMortgageTokenAddress;
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
            const feeReceiverAddress = config.feeReceiverAddress;
            assert.ok(
                feeReceiverAddress,
                `Missing ${networkName}_FEE_RECEIVER_ADDRESS from environment variables!`
            );

            const projectMortgageToken = await deployProjectMortgageToken(
                signer,
                adminAddress,
                projectTokenAddress,
                feeReceiverAddress,
                Initialization.PROJECT_MORTGAGE_TOKEN_Name,
                Initialization.PROJECT_MORTGAGE_TOKEN_Symbol,
                Initialization.PROJECT_MORTGAGE_TOKEN_BaseURI,
                Initialization.PROJECT_MORTGAGE_TOKEN_FeeRate,
            );
            console.log(`Contract ProjectMortgageToken has been deployed to address ${projectMortgageToken.address}`);

            return projectMortgageToken.address;
        })();
    console.log(`${networkName}_PROJECT_MORTGAGE_TOKEN_ADDRESS=${projectMortgageTokenAddress}`);
}

deployOrUpgradeProjectMortgageToken()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
