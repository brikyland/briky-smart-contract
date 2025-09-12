import { LedgerSigner } from '@anders-t/ethers-ledger';
import { ethers, network } from 'hardhat';
import { Constant } from '@utils/constant';
import { deployOrUpgradeDriptributor } from '../base/driptributor.deployment';

async function deployOrUpgradePrivateSale2Distributor() {
    const networkName = network.name == 'localhost' ? 'LOCAL' : network.name.toUpperCase();
    const signer = networkName == 'MAINNET'
        ? new LedgerSigner(ethers.provider)
        : (await ethers.getSigners())[0];

    const privateSale2Distributor = await deployOrUpgradeDriptributor(
        signer,
        'privateSale2',
        Constant.PRIMARY_TOKEN_PRIVATE_SALE_2,
    );
    console.log(`${networkName}_PRIVATE_SALE_2_DISTRIBUTOR_ADDRESS=${privateSale2Distributor}`);
}

deployOrUpgradePrivateSale2Distributor()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });