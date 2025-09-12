import { LedgerSigner } from '@anders-t/ethers-ledger';
import { ethers, network } from 'hardhat';
import { Constant } from '@utils/constant';
import { deployOrUpgradeDriptributor } from '../base/driptributor.deployment';

async function deployOrUpgradeSeedRoundDistributor() {
    const networkName = network.name == 'localhost' ? 'LOCAL' : network.name.toUpperCase();
    const signer = networkName == 'MAINNET'
        ? new LedgerSigner(ethers.provider)
        : (await ethers.getSigners())[0];

    const seedRoundDistributor = await deployOrUpgradeDriptributor(
        signer,
        'seedRound',
        Constant.PRIMARY_TOKEN_SEED_ROUND,
    );
    console.log(`${networkName}_SEED_ROUND_DISTRIBUTOR_ADDRESS=${seedRoundDistributor}`);
}

deployOrUpgradeSeedRoundDistributor()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });