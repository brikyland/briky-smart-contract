import { LedgerSigner } from '@anders-t/ethers-ledger';
import { ethers, network } from 'hardhat';
import { Constant } from '../../../utils/constant';
import { deployOrUpgradeStakeToken } from "./base/stakeToken.deployment";

async function deployOrUpgradeStakeToken1() {
    const networkName = network.name.toUpperCase();
    const signer = networkName == 'MAINNET'
        ? new LedgerSigner(ethers.provider)
        : (await ethers.getSigners())[0];

    const stakeToken1Address = await deployOrUpgradeStakeToken(
        signer,
        1,
        Constant.STAKE_TOKEN_INITIAL_Name_1,
        Constant.STAKE_TOKEN_INITIAL_Symbol_1,
    );

    console.log(`${networkName}_STAKE_TOKEN_1_ADDRESS=${stakeToken1Address}`);
}

deployOrUpgradeStakeToken1()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
