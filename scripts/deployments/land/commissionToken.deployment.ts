import { LedgerSigner } from '@anders-t/ethers-ledger';
import assert from 'assert';
import { ethers, network, upgrades } from 'hardhat';
import { Constant } from "../../../utils/constant";
import { deployCommissionToken } from '../../../utils/deployments/land/commissionToken';

async function deployOrUpgradeCommissionToken() {
    const config = network.config as any;
    const networkName = network.name.toUpperCase();
    const signer = networkName == 'MAINNET'
        ? new LedgerSigner(ethers.provider)
        : (await ethers.getSigners())[0];
    const CommissionToken = await ethers.getContractFactory('CommissionToken', signer);
    const commissionTokenAddress = config.commissionTokenAddress ?
        await (async () => {
            await upgrades.upgradeProxy(
                config.commissionTokenAddress,
                CommissionToken,
            );
            console.log(`Contract CommissionToken has been updated to address ${config.commissionTokenAddress}`);
            return config.commissionTokenAddress;
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

            const commissionToken = await deployCommissionToken(
                signer,
                adminAddress,
                estateTokenAddress,
                feeReceiverAddress,
                Constant.COMMISSION_TOKEN_INITIAL_Name,
                Constant.COMMISSION_TOKEN_INITIAL_Symbol,
                Constant.COMMISSION_TOKEN_INITIAL_BaseURI,
                Constant.COMMISSION_TOKEN_INITIAL_CommissionRate,
                Constant.COMMISSION_TOKEN_INITIAL_RoyaltyRate,
            );
            console.log(`Contract CommissionToken has been deployed to address ${commissionToken.address}`);

            return commissionToken.address;
        })();
    console.log(`${networkName}_COMMISSION_TOKEN_ADDRESS=${commissionTokenAddress}`);
}

deployOrUpgradeCommissionToken()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
