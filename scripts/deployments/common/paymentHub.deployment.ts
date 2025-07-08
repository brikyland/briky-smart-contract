import { LedgerSigner } from '@anders-t/ethers-ledger';
import assert from 'assert';
import { ethers, network, upgrades } from 'hardhat';
import { deployPaymentHub } from '@utils/deployments/common/paymentHub';

async function deployOrUpgradePaymentHub() {
    const config = network.config as any;
    const networkName = network.name.toUpperCase();
    const signer = networkName == 'MAINNET'
        ? new LedgerSigner(ethers.provider)
        : (await ethers.getSigners())[0];
    const PaymentHub = await ethers.getContractFactory('PaymentHub', signer);
    const paymentHubAddress = config.paymentHubAddress ?
        await (async () => {
            await upgrades.upgradeProxy(
                config.paymentHubAddress,
                PaymentHub,
            );
            console.log(`Contract PaymentHub has been updated to address ${config.paymentHubAddress}`);
            return config.paymentHubAddress;
        })() :
        await (async () => {
            const adminAddress = config.adminAddress;
            assert.ok(
                adminAddress,
                `Missing ${networkName}_ADMIN_ADDRESS from environment variables!`
            );

            const paymentHub = await deployPaymentHub(
                signer,
                adminAddress,
            );
            console.log(`Contract PaymentHub has been deployed to address ${paymentHub.address}`);

            return paymentHub.address;
        })();
    console.log(`${networkName}_PAYMENT_HUB_ADDRESS=${paymentHubAddress}`);
}

deployOrUpgradePaymentHub()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
