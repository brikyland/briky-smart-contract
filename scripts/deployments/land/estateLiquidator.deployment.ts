import { LedgerSigner } from '@anders-t/ethers-ledger';
import assert from 'assert';
import { ethers, network, upgrades } from 'hardhat';
import { deployEstateLiquidator } from '@utils/deployments/land/estateLiquidator';

async function deployOrUpgradeEstateLiquidator() {
    const config = network.config as any;
    const networkName = network.name == 'localhost' ? 'LOCAL' : network.name.toUpperCase();
    const signer = networkName == 'MAINNET'
        ? new LedgerSigner(ethers.provider)
        : (await ethers.getSigners())[0];
    const EstateLiquidator = await ethers.getContractFactory('EstateLiquidator', signer);
    const estateLiquidatorAddress = config.estateLiquidatorAddress ?
        await (async () => {
            await upgrades.upgradeProxy(
                config.estateLiquidatorAddress,
                EstateLiquidator,
            );
            console.log(`Contract EstateLiquidator has been updated to address ${config.estateLiquidatorAddress}`);
            return config.estateLiquidatorAddress;
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
            const commissionTokenAddress = config.commissionTokenAddress;
            assert.ok(
                commissionTokenAddress,
                `Missing ${networkName}_COMMISSION_TOKEN_ADDRESS from environment variables!`
            )
            const governanceHubAddress = config.governanceHubAddress;
            assert.ok(
                governanceHubAddress,
                `Missing ${networkName}_GOVERNANCE_HUB_TOKEN_ADDRESS from environment variables!`
            )
            const dividendHubAddress = config.dividendHubAddress;
            assert.ok(
                dividendHubAddress,
                `Missing ${networkName}_DIVIDEND_HUB_TOKEN_ADDRESS from environment variables!`
            )
            const feeReceiverAddress = config.feeReceiverAddress;
            assert.ok(
                feeReceiverAddress,
                `Missing ${networkName}_FEE_RECEIVER_ADDRESS from environment variables!`
            );
            const estateLiquidatorValidatorAddress = config.estateLiquidatorValidatorAddress;
            assert.ok(
                estateLiquidatorValidatorAddress,
                `Missing ${networkName}_ESTATE_LIQUIDATOR_VALIDATOR_ADDRESS from environment variables!`
            );
            
            const estateLiquidator = await deployEstateLiquidator(
                signer,
                adminAddress,
                estateTokenAddress,
                commissionTokenAddress,
                governanceHubAddress,
                dividendHubAddress,
                feeReceiverAddress,
                estateLiquidatorValidatorAddress,
            );
            console.log(`Contract EstateLiquidator has been deployed to address ${estateLiquidator.address}`);

            return estateLiquidator.address;
        })();
    console.log(`${networkName}_ESTATE_LIQUIDATOR_ADDRESS=${estateLiquidatorAddress}`);
}

deployOrUpgradeEstateLiquidator()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
