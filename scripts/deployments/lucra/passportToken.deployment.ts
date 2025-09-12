import { LedgerSigner } from '@anders-t/ethers-ledger';
import assert from 'assert';
import { ethers, network, upgrades } from 'hardhat';
import { deployPassportToken } from '@utils/deployments/lucra/passportToken';
import { Initialization } from './initialization';

async function deployOrUpgradePassportToken() {
    const config = network.config as any;
    const networkName = network.name == 'localhost' ? 'LOCAL' : network.name.toUpperCase();
    const signer = networkName == 'MAINNET'
        ? new LedgerSigner(ethers.provider)
        : (await ethers.getSigners())[0];
    const PassportToken = await ethers.getContractFactory('PassportToken', signer);
    const passportTokenAddress = config.passportTokenAddress ?
        await (async () => {
            await upgrades.upgradeProxy(
                config.passportTokenAddress,
                PassportToken,
            );
            console.log(`Contract PassportToken has been updated to address ${config.passportTokenAddress}`);
            return config.passportTokenAddress;
        })() :
        await (async () => {
            const adminAddress = config.adminAddress;
            assert.ok(
                adminAddress,
                `Missing ${networkName}_ADMIN_ADDRESS from environment variables!`
            );

            const passportToken = await deployPassportToken(
                signer,
                adminAddress,
                Initialization.PASSPORT_TOKEN_Name,
                Initialization.PASSPORT_TOKEN_Symbol,
                Initialization.PASSPORT_TOKEN_BaseURI,
                Initialization.PASSPORT_TOKEN_Fee,
                Initialization.PASSPORT_TOKEN_RoyaltyRate,
            );
            console.log(`Contract PassportToken has been deployed to address ${passportToken.address}`);

            return passportToken.address;
        })();
    console.log(`${networkName}_PASSPORT_TOKEN_ADDRESS=${passportTokenAddress}`);
}

deployOrUpgradePassportToken()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
