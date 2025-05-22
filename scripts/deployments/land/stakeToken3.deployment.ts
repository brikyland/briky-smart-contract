import { LedgerSigner } from '@anders-t/ethers-ledger';
import { ethers, network } from 'hardhat';
import { Constant } from '../../../utils/constant';
import { deployOrUpgradeStakeToken } from "./base/stakeToken.deployment";

async function deployOrUpgradeStakeToken3() {
    const networkName = network.name.toUpperCase();
    const signer = networkName == 'MAINNET'
        ? new LedgerSigner(ethers.provider)
        : (await ethers.getSigners())[0];

    const stakeToken3Address = await deployOrUpgradeStakeToken(
        signer,
        3,
        Constant.STAKE_TOKEN_INITIAL_Name_3,
        Constant.STAKE_TOKEN_INITIAL_Symbol_3,
    );

    console.log(`${networkName}_STAKE_TOKEN_3_ADDRESS=${stakeToken3Address}`);
}

deployOrUpgradeStakeToken3()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
