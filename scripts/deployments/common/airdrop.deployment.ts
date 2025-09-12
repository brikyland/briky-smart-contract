import { LedgerSigner } from '@anders-t/ethers-ledger';
import { ethers, network, upgrades } from 'hardhat';
import { deployAirdrop } from '@utils/deployments/common/airdrop';

async function deployOrUpgradeAirdrop() {
    const config = network.config as any;
    const networkName = network.name == 'localhost' ? 'LOCAL' : network.name.toUpperCase();
    const signer = networkName == 'MAINNET'
        ? new LedgerSigner(ethers.provider)
        : (await ethers.getSigners())[0];
    const Airdrop = await ethers.getContractFactory('Airdrop', signer);
    const airdropAddress = config.airdropAddress ?
        await (async () => {
            await upgrades.upgradeProxy(
                config.airdropAddress,
                Airdrop,
            );
            console.log(`Contract Airdrop has been updated to address ${config.airdropAddress}`);
            return config.airdropAddress;
        })() :
        await (async () => {
            const airdrop = await deployAirdrop(signer);
            console.log(`Contract Airdrop has been deployed to address ${airdrop.address}`);

            return airdrop.address;
        })();
    console.log(`${networkName}_PASSPORT_TOKEN_ADDRESS=${airdropAddress}`);
}

deployOrUpgradeAirdrop()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
