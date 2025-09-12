import { LedgerSigner } from '@anders-t/ethers-ledger';
import { ethers, network } from 'hardhat';
import { Constant } from '@utils/constant';
import { deployOrUpgradeDriptributor } from '../base/driptributor.deployment';

async function deployOrUpgradeBackerRoundDistributor() {
    const networkName = network.name == 'localhost' ? 'LOCAL' : network.name.toUpperCase();
    const signer = networkName == 'MAINNET'
        ? new LedgerSigner(ethers.provider)
        : (await ethers.getSigners())[0];

    const backerRoundDistributor = await deployOrUpgradeDriptributor(
        signer,
        'backerRound',
        Constant.PRIMARY_TOKEN_BACKER_ROUND,
    );
    console.log(`${networkName}_BACKER_ROUND_DISTRIBUTOR_ADDRESS=${backerRoundDistributor}`);
}

deployOrUpgradeBackerRoundDistributor()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });