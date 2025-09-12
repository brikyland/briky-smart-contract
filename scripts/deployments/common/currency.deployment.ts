import { ethers, network, upgrades } from 'hardhat';
import { deployCurrency } from '@utils/deployments/common/currency';

async function deployOrUpgradeCurrency() {
    const config = network.config as any;
    const networkName = network.name == 'localhost' ? 'LOCAL' : network.name.toUpperCase();
    const signer = (await ethers.getSigners())[0];
    const Currency = await ethers.getContractFactory('Currency', signer);
    const currencyAddress = config.currencyAddress ?
        await (async () => {
            await upgrades.upgradeProxy(
                config.currencyAddress,
                Currency,
            );
            console.log(`Contract Currency has been updated to address ${config.currencyAddress}`);
            return config.currencyAddress;
        })() :
        await (async () => {
            const currency = await deployCurrency(signer, 'Tether USDt', 'USDT');
            console.log(`Contract Currency has been deployed to address ${currency.address}`);
            return currency.address;
        })();
    console.log(`${networkName}_CURRENCY_ADDRESS=${currencyAddress}`);
}

deployOrUpgradeCurrency()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
