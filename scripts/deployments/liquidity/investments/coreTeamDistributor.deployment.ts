import { LedgerSigner } from '@anders-t/ethers-ledger';
import { ethers, network } from 'hardhat';
import { Constant } from '@utils/constant';
import { deployOrUpgradeDriptributor } from '../base/driptributor.deployment';

async function deployOrUpgradeCoreTeamDistributor() {
    const networkName = network.name == 'localhost' ? 'LOCAL' : network.name.toUpperCase();
    const signer = networkName == 'MAINNET'
        ? new LedgerSigner(ethers.provider)
        : (await ethers.getSigners())[0];

    const coreTeamDistributor = await deployOrUpgradeDriptributor(
        signer,
        'coreTeam',
        Constant.PRIMARY_TOKEN_CORE_TEAM,
    );
    console.log(`${networkName}_CORE_TEAM_DISTRIBUTOR_ADDRESS=${coreTeamDistributor}`);
}

deployOrUpgradeCoreTeamDistributor()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });