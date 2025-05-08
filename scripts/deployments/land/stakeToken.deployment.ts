import { LedgerSigner } from '@anders-t/ethers-ledger';
import assert from 'assert';
import { ethers, network, upgrades } from 'hardhat';
import { Constant } from '../../../utils/constant';
import { deployStateToken } from '../../../utils/deployments/land/stateToken';

async function deployOrUpgradeStakeToken() {
    const config = network.config as any;
    const networkName = network.name.toUpperCase();
    const signer = networkName == 'MAINNET'
        ? new LedgerSigner(ethers.provider)
        : (await ethers.getSigners())[0];
    const StakeToken = await ethers.getContractFactory('StakeToken', signer);
    const stakeTokenAddress = config.stakeTokenAddress ?
        await (async () => {
            await upgrades.upgradeProxy(
                config.stakeTokenAddress,
                StakeToken,
            );
            console.log(`Contract StakeToken has been updated to address ${config.stakeTokenAddress}`);
            return config.stakeTokenAddress;
        })() :
        await (async () => {
            const adminAddress = config.adminAddress;
            assert.ok(
                adminAddress,
                `Missing ${networkName}_ADMIN_ADDRESS from environment variables!`
            );
            const primaryTokenAddress = config.primaryTokenAddress;
            assert.ok(
                primaryTokenAddress,
                `Missing ${networkName}_PRIMARY_TOKEN_ADDRESS from environment variables!`
            );

            const stakeToken = await deployStateToken(
                signer,
                adminAddress,
                primaryTokenAddress,
                Constant.STAKE_TOKEN_INITIAL_Name,
                Constant.STAKE_TOKEN_INITIAL_Symbol,
            );
            console.log(`Contract StakeToken has been deployed to address ${stakeToken.address}`);

            return stakeToken.address;
        })();
    console.log(`${networkName}_STAKE_TOKEN_ADDRESS=${stakeTokenAddress}`);
}

deployOrUpgradeStakeToken()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
