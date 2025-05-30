import { LedgerSigner } from '@anders-t/ethers-ledger';
import assert from 'assert';
import { ethers, network, upgrades } from 'hardhat';
import { deployMortgageToken } from '../../../utils/deployments/lend/mortgageToken';
import { Initialization } from "./initialization";

async function deployOrUpgradeMortgageToken() {
    const config = network.config as any;
    const networkName = network.name.toUpperCase();
    const signer = networkName == 'MAINNET'
        ? new LedgerSigner(ethers.provider)
        : (await ethers.getSigners())[0];
    const MortgageToken = await ethers.getContractFactory('MortgageToken', signer);
    const mortgageTokenAddress = config.mortgageTokenAddress ?
        await (async () => {
            await upgrades.upgradeProxy(
                config.mortgageTokenAddress,
                MortgageToken,
            );
            console.log(`Contract MortgageToken has been updated to address ${config.mortgageTokenAddress}`);
            return config.mortgageTokenAddress;
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
            const commissionTokenAddress = config.commissionTokenAddress;
            assert.ok(
                commissionTokenAddress,
                `Missing ${networkName}_COMMISSION_TOKEN_ADDRESS from environment variables!`
            );
            const feeReceiverAddress = config.feeReceiverAddress;
            assert.ok(
                feeReceiverAddress,
                `Missing ${networkName}_FEE_RECEIVER_ADDRESS from environment variables!`
            );

            const mortgageToken = await deployMortgageToken(
                signer,
                adminAddress,
                estateTokenAddress,
                commissionTokenAddress,
                feeReceiverAddress,
                Initialization.MORTGAGE_TOKEN_Name,
                Initialization.MORTGAGE_TOKEN_Symbol,
                Initialization.MORTGAGE_TOKEN_BaseURI,
                Initialization.MORTGAGE_TOKEN_FeeRate,
                Initialization.MORTGAGE_TOKEN_RoyaltyRate,
            );
            console.log(`Contract MortgageToken has been deployed to address ${mortgageToken.address}`);

            return mortgageToken.address;
        })();
    console.log(`${networkName}_MORTGAGE_TOKEN_ADDRESS=${mortgageTokenAddress}`);
}

deployOrUpgradeMortgageToken()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
