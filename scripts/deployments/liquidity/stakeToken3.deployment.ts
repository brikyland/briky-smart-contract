import { LedgerSigner } from '@anders-t/ethers-ledger';
import { ethers, network } from 'hardhat';
import { deployOrUpgradeStakeToken } from './base/stakeToken.deployment';
import { Initialization } from './initialization';

async function deployOrUpgradeStakeToken3() {
    const networkName = network.name == 'localhost' ? 'LOCAL' : network.name.toUpperCase();
    const signer = networkName == 'MAINNET'
        ? new LedgerSigner(ethers.provider)
        : (await ethers.getSigners())[0];

    const stakeToken3Address = await deployOrUpgradeStakeToken(
        signer,
        3,
        Initialization.STAKE_TOKEN_Name_3,
        Initialization.STAKE_TOKEN_Symbol_3,
        Initialization.STAKE_TOKEN_FeeRate_3,
    );

    console.log(`${networkName}_STAKE_TOKEN_3_ADDRESS=${stakeToken3Address}`);
}

deployOrUpgradeStakeToken3()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
