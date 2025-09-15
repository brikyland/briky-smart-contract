import { LedgerSigner } from '@anders-t/ethers-ledger';
import assert from 'assert';
import { ethers, network, upgrades } from 'hardhat';
import { deployEstateMortgageToken } from '@utils/deployments/lend/estateMortgageToken';
import { Initialization } from './initialization';

async function deployOrUpgradeEstateMortgageToken() {
    const config = network.config as any;
    const networkName = network.name == 'localhost' ? 'LOCAL' : network.name.toUpperCase();
    const signer = networkName == 'MAINNET'
        ? new LedgerSigner(ethers.provider)
        : (await ethers.getSigners())[0];
    const EstateMortgageToken = await ethers.getContractFactory('EstateMortgageToken', signer);
    const estateMortgageTokenAddress = config.estateMortgageTokenAddress ?
        await (async () => {
            await upgrades.upgradeProxy(
                config.estateMortgageTokenAddress,
                EstateMortgageToken,
            );
            console.log(`Contract EstateMortgageToken has been updated to address ${config.mortgageTokenAddress}`);
            return config.estateMortgageTokenAddress;
        })() :
        await (async () => {
            const adminAddress = config.adminAddress;
            assert.ok(
                adminAddress,
                `Missing ${networkName}_ADMIN_ADDRESS from environment variables!`
            );
            const estateTokenAddress = config.estateTokenAddress;
            assert.ok(
                estateTokenAddress,
                `Missing ${networkName}_ESTATE_TOKEN_ADDRESS from environment variables!`
            );
            const feeReceiverAddress = config.feeReceiverAddress;
            assert.ok(
                feeReceiverAddress,
                `Missing ${networkName}_FEE_RECEIVER_ADDRESS from environment variables!`
            );

            const estateMortgageToken = await deployEstateMortgageToken(
                signer,
                adminAddress,
                estateTokenAddress,
                feeReceiverAddress,
                Initialization.ESTATE_MORTGAGE_TOKEN_Name,
                Initialization.ESTATE_MORTGAGE_TOKEN_Symbol,
                Initialization.ESTATE_MORTGAGE_TOKEN_BaseURI,
                Initialization.ESTATE_MORTGAGE_TOKEN_FeeRate,
            );
            console.log(`Contract EstateMortgageToken has been deployed to address ${estateMortgageToken.address}`);

            return estateMortgageToken.address;
        })();
    console.log(`${networkName}_ESTATE_MORTGAGE_TOKEN_ADDRESS=${estateMortgageTokenAddress}`);
}

deployOrUpgradeEstateMortgageToken()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
