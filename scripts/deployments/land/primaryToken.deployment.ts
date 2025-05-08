import { LedgerSigner } from '@anders-t/ethers-ledger';
import assert from 'assert';
import { ethers, network, upgrades } from 'hardhat';
import { Constant } from '../../../utils/constant';
import { deployPrimaryToken } from '../../../utils/deployments/land/primaryToken';

async function deployOrUpgradePrimaryToken() {
    const config = network.config as any;
    const networkName = network.name.toUpperCase();
    const signer = networkName == 'MAINNET'
        ? new LedgerSigner(ethers.provider)
        : (await ethers.getSigners())[0];
    const PrimaryToken = await ethers.getContractFactory('PrimaryToken', signer);
    const primaryTokenAddress = config.primaryTokenAddress ?
        await (async () => {
            await upgrades.upgradeProxy(
                config.primaryTokenAddress,
                PrimaryToken,
            );
            console.log(`Contract PrimaryToken has been updated to address ${config.primaryTokenAddress}`);
            return config.primaryTokenAddress;
        })() :
        await (async () => {
            const adminAddress = config.adminAddress;
            assert.ok(
                adminAddress,
                `Missing ${networkName}_ADMIN_ADDRESS from environment variables!`
            );

            const primaryToken = await deployPrimaryToken(
                signer,
                adminAddress,
                Constant.PRIMARY_TOKEN_INITIAL_Name,
                Constant.PRIMARY_TOKEN_INITIAL_Symbol,
                Constant.PRIMARY_TOKEN_INITIAL_LiquidationUnlockedAt,
            );
            console.log(`Contract PrimaryToken has been deployed to address ${primaryToken.address}`);

            return primaryToken.address;
        })();
    console.log(`${networkName}_PRIMARY_TOKEN_ADDRESS=${primaryTokenAddress}`);
}

deployOrUpgradePrimaryToken()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
