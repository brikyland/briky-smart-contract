import { LedgerSigner } from '@anders-t/ethers-ledger';
import assert from 'assert';
import { ethers, network, upgrades } from 'hardhat';
import { deployFeeReceiver } from '@utils/deployments/common/feeReceiver';

async function deployOrUpgradeFeeReceiver() {
    const config = network.config as any;
    const networkName = network.name == 'localhost' ? 'LOCAL' : network.name.toUpperCase();
    const signer = networkName == 'MAINNET'
        ? new LedgerSigner(ethers.provider)
        : (await ethers.getSigners())[0];
    const FeeReceiver = await ethers.getContractFactory('FeeReceiver', signer);
    const feeReceiverAddress = config.feeReceiverAddress ?
        await (async () => {
            await upgrades.upgradeProxy(
                config.feeReceiverAddress,
                FeeReceiver,
            );
            console.log(`Contract FeeReceiver has been updated to address ${config.feeReceiverAddress}`);
            return config.feeReceiverAddress;
        })() :
        await (async () => {
            const adminAddress = config.adminAddress;
            assert.ok(
                adminAddress,
                `Missing ${networkName}_ADMIN_ADDRESS from environment variables!`
            );

            const feeReceiver = await deployFeeReceiver(signer, adminAddress);
            console.log(`Contract FeeReceiver has been deployed to address ${feeReceiver.address}`);
            return feeReceiver.address;
        })();
    console.log(`${networkName}_FEE_RECEIVER_ADDRESS=${feeReceiverAddress}`);
}

deployOrUpgradeFeeReceiver()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
