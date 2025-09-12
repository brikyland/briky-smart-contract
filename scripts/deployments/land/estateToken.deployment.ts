import { LedgerSigner } from '@anders-t/ethers-ledger';
import assert from 'assert';
import { ethers, network, upgrades } from 'hardhat';
import { deployEstateToken } from '@utils/deployments/land/estateToken';
import { Initialization } from './initialization';

async function deployOrUpgradeEstateToken() {
    const config = network.config as any;
    const networkName = network.name == 'localhost' ? 'LOCAL' : network.name.toUpperCase();
    const signer = networkName == 'MAINNET'
        ? new LedgerSigner(ethers.provider)
        : (await ethers.getSigners())[0];
    const EstateToken = await ethers.getContractFactory('EstateToken', signer);
    const estateTokenAddress = config.estateTokenAddress ?
        await (async () => {
            await upgrades.upgradeProxy(
                config.estateTokenAddress,
                EstateToken,
            );
            console.log(`Contract EstateToken has been updated to address ${config.estateTokenAddress}`);
            return config.estateTokenAddress;
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
            const estateTokenValidatorAddress = config.estateTokenValidatorAddress;
            assert.ok(
                estateTokenValidatorAddress,
                `Missing ${networkName}_ESTATE_TOKEN_VALIDATOR_ADDRESS from environment variables!`
            );

            const estateToken = await deployEstateToken(
                signer,
                adminAddress,
                feeReceiverAddress,
                estateTokenValidatorAddress,
                Initialization.ESTATE_TOKEN_BaseURI,
            );
            console.log(`Contract EstateToken has been deployed to address ${estateToken.address}`);

            return estateToken.address;
        })();
    console.log(`${networkName}_ESTATE_TOKEN_ADDRESS=${estateTokenAddress}`);
}

deployOrUpgradeEstateToken()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
