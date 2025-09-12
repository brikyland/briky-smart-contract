<picture>
  <source media="(prefers-color-scheme: dark)" srcset="img/logo-night.svg">
  <source media="(prefers-color-scheme: light)" srcset="img/logo-day.svg">
  <img alt="Briky Capital black logo (in light color mode) or white logo (in dark color mode)." src="https://user-images.githubusercontent.com/25423296/163456779-a8556205-d0a5-45e2-ac17-42d089e3c3f8.png">
</picture>

---

BrikyLand provides all-in-one solution for tokenized assets. Our products:
- [Briky Land](https://brikyland.com/): Invest in a transparent market of tokenized real, proven estates backed by institutional custodians. Start with as fews as $100.
- [Briky Lend](https://testnet.brikylend.com/): Access flexible loans using your tokenized asset and unlock the power of mortgage-backed NFT. Lend and earn money.
- Briky Launch (coming soon): A streamlined platform to tokenize properties, making real estate investment accessible to a global audience and unlocking new opportunities.

This repo contains the core smart contracts for the BrikyLand system. 

## Setup

Step 1: After cloning the repo, run:

``` 
npm install
```

Step 2: Create the environment (`.env`) file from the template `.env.example`. Fill in the RPC endpoints for staging / testnet / main as mentioned in [RPC Endpoints](#rpc_endpoints).


## Compilation

To compile the contracts, run:

``` 
npx hardhat compile
```

## Deployment on local node

Step 1: Start local hardhat node

```
npx hardhat node
```

Step 2: Fill the required contract / validator addresses in `.env`, and the required deployment constants in the `scripts/deployments/<app_name>/initialization.ts`. Check the contract deployment scripts in `scripts/deployments` to know the required addresses and deployment constants that need to be filled in.

Step 3: Run the deploy script:

```
npm run deploy<contract_name>:local
```

For example:
- To deploy `Admin.sol`, fill in `LOCAL_ADMIN_1_ADDRESS` to `LOCAL_ADMIN_5_ADDRESS` (use the first account provided by hardhat local node), then run `npm run deployAdmin:local`
- To deploy `FeeReceiver.sol`, fill in `LOCAL_ADMIN_ADDRESS`, then run `npm run deployFeeReceiver:local`

## Unit testing

To perform unit testing, run:

```
npx hardhat test
```

## <a name="rpc_endpoints"></a>RPC Endpoints

Our smart contracts are ran on [Binance Smart Chain (BSC)](https://www.bnbchain.org/en/bnb-smart-chain).

```
STAGING_URL=https://bsc-testnet-dataseed.bnbchain.org
STAGING_CHAIN_ID=97

TESTNET_URL=https://bsc-testnet-dataseed.bnbchain.org
TESTNET_CHAIN_ID=97

MAINNET_URL=https://bsc-dataseed.binance.org/
MAINNET_CHAIN_ID=56
```
