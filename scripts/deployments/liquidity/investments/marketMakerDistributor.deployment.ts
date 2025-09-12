import { LedgerSigner } from '@anders-t/ethers-ledger';
import { ethers, network } from 'hardhat';
import { Constant } from '@utils/constant';
import { deployOrUpgradeDriptributor } from '../base/driptributor.deployment';

async function deployOrUpgradeMarketMakerDistributor() {
    const networkName = network.name == 'localhost' ? 'LOCAL' : network.name.toUpperCase();
    const signer = networkName == 'MAINNET'
        ? new LedgerSigner(ethers.provider)
        : (await ethers.getSigners())[0];

    const marketMakerDistributor = await deployOrUpgradeDriptributor(
        signer,
        'marketMaker',
        Constant.PRIMARY_TOKEN_MARKET_MAKER,
    );
    console.log(`${networkName}_MARKET_MAKER_DISTRIBUTOR_ADDRESS=${marketMakerDistributor}`);
}

deployOrUpgradeMarketMakerDistributor()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });