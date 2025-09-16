import { LedgerSigner } from '@anders-t/ethers-ledger';
import assert from 'assert';
import { ethers, network, upgrades } from 'hardhat';
import { deployERC721MortgageToken } from '@utils/deployments/lend/erc721MortgageToken';
import { Initialization } from './initialization';

async function deployOrUpgradeERC721MortgageToken() {
    const config = network.config as any;
    const networkName = network.name == 'localhost' ? 'LOCAL' : network.name.toUpperCase();
    const signer = networkName == 'MAINNET'
        ? new LedgerSigner(ethers.provider)
        : (await ethers.getSigners())[0];
    const ERC721MortgageToken = await ethers.getContractFactory('ERC721MortgageToken', signer);
    const erc721MortgageTokenAddress = config.erc721MortgageTokenAddress ?
        await (async () => {
            await upgrades.upgradeProxy(
                config.erc721MortgageTokenAddress,
                ERC721MortgageToken,
            );
            console.log(`Contract ERC721MortgageToken has been updated to address ${config.mortgageTokenAddress}`);
            return config.erc721MortgageTokenAddress;
        })() :
        await (async () => {
            const adminAddress = config.adminAddress;
            assert.ok(
                adminAddress,
                `Missing ${networkName}_ADMIN_ADDRESS from environment variables!`
            );
            const feeReceiverAddress = config.feeReceiverAddress;
            assert.ok(
                feeReceiverAddress,
                `Missing ${networkName}_FEE_RECEIVER_ADDRESS from environment variables!`
            );

            const erc721MortgageToken = await deployERC721MortgageToken(
                signer,
                adminAddress,
                feeReceiverAddress,
                Initialization.ERC721_MORTGAGE_TOKEN_Name,
                Initialization.ERC721_MORTGAGE_TOKEN_Symbol,
                Initialization.ERC721_MORTGAGE_TOKEN_BaseURI,
                Initialization.ERC721_MORTGAGE_TOKEN_FeeRate,
            );
            console.log(`Contract ERC721MortgageToken has been deployed to address ${erc721MortgageToken.address}`);

            return erc721MortgageToken.address;
        })();
    console.log(`${networkName}_ERC721_MORTGAGE_TOKEN_ADDRESS=${erc721MortgageTokenAddress}`);
}

deployOrUpgradeERC721MortgageToken()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
