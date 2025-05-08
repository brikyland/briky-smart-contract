import { LedgerSigner } from '@anders-t/ethers-ledger';
import { ethers, network } from 'hardhat';
import { deployOrUpgradeDistributor } from "./base/distributor.deployment";

async function deployOrUpgradeSeedRoundDistributor() {
    const networkName = network.name.toUpperCase();
    const signer = networkName == 'MAINNET'
        ? new LedgerSigner(ethers.provider)
        : (await ethers.getSigners())[0];

    const seedRoundDistributor = await deployOrUpgradeDistributor(
        signer,
        'seedRound',
    );
    console.log(`${networkName}_SEED_ROUND_DISTRIBUTOR_ADDRESS=${seedRoundDistributor}`);
}

deployOrUpgradeSeedRoundDistributor()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });