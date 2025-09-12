import { LedgerSigner } from '@anders-t/ethers-ledger';
import { ethers, network } from 'hardhat';
import { deployOrUpgradeStakeToken } from './base/stakeToken.deployment';
import { Initialization } from './initialization';

async function deployOrUpgradeStakeToken2() {
    const networkName = network.name == 'localhost' ? 'LOCAL' : network.name.toUpperCase();
    const signer = networkName == 'MAINNET'
        ? new LedgerSigner(ethers.provider)
        : (await ethers.getSigners())[0];

    const stakeToken2Address = await deployOrUpgradeStakeToken(
        signer,
        2,
        Initialization.STAKE_TOKEN_Name_2,
        Initialization.STAKE_TOKEN_Symbol_2,
        Initialization.STAKE_TOKEN_FeeRate_2,
    );

    console.log(`${networkName}_STAKE_TOKEN_2_ADDRESS=${stakeToken2Address}`);
}

deployOrUpgradeStakeToken2()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
