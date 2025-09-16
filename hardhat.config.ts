import { ethers } from "ethers";
import { HardhatUserConfig } from 'hardhat/config';
import 'dotenv/config';
import '@nomicfoundation/hardhat-toolbox';
import '@nomicfoundation/hardhat-network-helpers';
import '@nomiclabs/hardhat-solhint';
import '@openzeppelin/hardhat-upgrades';
import 'hardhat-contract-sizer';
import 'tsconfig-paths/register';

function getNetworkEnvVariable(
    networkName: string,
    variableNames: string[]
) {
    const env: { [id: string]: any } = {};
    for (const variableName of variableNames) {
        env[variableName.toLowerCase().replace(/(_\w)/g, k => k[1].toUpperCase())]
            = process.env[`${networkName.toUpperCase()}_${variableName}`];
    }
    return env;
}

const COMMON_ENV_VARIABLE_NAMES = [
    'ADMIN_1_ADDRESS',
    'ADMIN_2_ADDRESS',
    'ADMIN_3_ADDRESS',
    'ADMIN_4_ADDRESS',
    'ADMIN_5_ADDRESS',

    'ADMIN_ADDRESS',
    'AIRDROP_ADDRESS',
    'FEE_RECEIVER_ADDRESS',
    'RESERVE_VAULT_ADDRESS',
    'PRICE_WATCHER_ADDRESS',
    'GOVERNANCE_HUB_ADDRESS',
    'DIVIDEND_HUB_ADDRESS',

    'LIQUIDATION_CURRENCY_ADDRESS',
    'PRIMARY_TOKEN_ADDRESS',
    'TREASURY_ADDRESS',

    'BACKER_ROUND_DISTRIBUTOR_ADDRESS',
    'SEED_ROUND_DISTRIBUTOR_ADDRESS',
    'PRIVATE_SALE_1_DISTRIBUTOR_ADDRESS',
    'PRIVATE_SALE_2_DISTRIBUTOR_ADDRESS',
    'CORE_TEAM_DISTRIBUTOR_ADDRESS',
    'MARKET_MAKER_DISTRIBUTOR_ADDRESS',
    'PUBLIC_SALE_AUCTION_ADDRESS',

    'STAKE_TOKEN_1_ADDRESS',
    'STAKE_TOKEN_2_ADDRESS',
    'STAKE_TOKEN_3_ADDRESS',

    'COMMISSION_TOKEN_ADDRESS',
    'ESTATE_TOKEN_ADDRESS',
    'ESTATE_FORGER_ADDRESS',
    'ESTATE_LIQUIDATOR_ADDRESS',
    
    'ERC721_MORTGAGE_TOKEN_ADDRESS',
    'ESTATE_MORTGAGE_TOKEN_ADDRESS',
    'PROJECT_MORTGAGE_TOKEN_ADDRESS',

    'ESTATE_MARKETPLACE_ADDRESS',
    'PROJECT_MARKETPLACE_ADDRESS',
    'ERC721_MARKETPLACE_ADDRESS',
    'MORTGAGE_MARKETPLACE_ADDRESS',

    'PROMOTION_TOKEN_ADDRESS',
    'PASSPORT_TOKEN_ADDRESS',

    'PRESTIGE_PAD_ADDRESS',
    'PROJECT_TOKEN_ADDRESS',

    'ESTATE_FORGER_VALIDATOR_ADDRESS',
    'ESTATE_LIQUIDATOR_VALIDATOR_ADDRESS',
    'ESTATE_TOKEN_VALIDATOR_ADDRESS',
    'GOVERNANCE_HUB_VALIDATOR_ADDRESS',
    'PRESTIGE_PAD_VALIDATOR_ADDRESS',
    'PROJECT_TOKEN_VALIDATOR_ADDRESS',
];

const config: HardhatUserConfig = {
    defaultNetwork: 'hardhat',
    networks: {
        hardhat: {
            gas: 100000000,
            blockGasLimit: 1000000000,
            ...getNetworkEnvVariable('local', COMMON_ENV_VARIABLE_NAMES),
        } as any,
        localhost: {
            gas: 100000000,
            blockGasLimit: 1000000000,
            ...getNetworkEnvVariable('local', COMMON_ENV_VARIABLE_NAMES),
        } as any,
        staging: {
            url: process.env.STAGING_URL || "",
            chainId: Number(process.env.STAGING_CHAIN_ID) || 0,
            accounts: [process.env.STAGING_DEPLOYER_PRIVATE_KEY || ethers.utils.id("")],
            ...getNetworkEnvVariable('staging', COMMON_ENV_VARIABLE_NAMES),
        } as any,
        testnet: {
            url: process.env.TESTNET_URL || "",
            chainId: Number(process.env.TESTNET_CHAIN_ID) || 0,
            accounts: [process.env.TESTNET_DEPLOYER_PRIVATE_KEY || ethers.utils.id("")],
            ...getNetworkEnvVariable('testnet', COMMON_ENV_VARIABLE_NAMES),
        } as any,
        mainnet: {
            url: process.env.MAINNET_URL || "",
            chainId: Number(process.env.MAINNET_CHAIN_ID) || 0,
            ...getNetworkEnvVariable('mainnet', COMMON_ENV_VARIABLE_NAMES),
        } as any,
    },
    etherscan: {
        customChains: [
            {
                network: 'staging',
                chainId: Number(process.env.STAGING_CHAIN_ID) || 0,
                urls: {
                    apiURL: process.env.STAGING_API_URL || "",
                    browserURL: process.env.STAGING_BROWSER_URL || "",
                },
            },
            {
                network: 'testnet',
                chainId: Number(process.env.TESTNET_CHAIN_ID) || 0,
                urls: {
                    apiURL: process.env.TESTNET_API_URL || "",
                    browserURL: process.env.TESTNET_BROWSER_URL || "",
                }
            },
            {
                network: 'mainnet',
                chainId: Number(process.env.MAINNET_CHAIN_ID) || 0,
                urls: {
                    apiURL: process.env.MAINNET_API_URL || "",
                    browserURL: process.env.MAINNET_BROWER_URL || "",
                },
            },
        ],
    },
    solidity: {
        compilers: [
            {
                version: '0.8.20',
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                    viaIR: true,
                    outputSelection: {
                        "*": {
                            "*": ["storageLayout"],
                        },
                    },
                },
            },
        ],
    },
    paths: {
        sources: './contracts',
        tests: './tests',
        cache: './cache',
        artifacts: './artifacts',
    },
    mocha: {
        timeout: 2000000,
        color: true,
        reporter: 'mocha-multi-reporters',
        reporterOptions: {
            configFile: './mocha-report.json',
        },
    },
};

export default config;
