<p align="center">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://brikycapital.com/images/logo-with-text-white.svg">
  <source media="(prefers-color-scheme: light)" srcset="https://brikycapital.com/images/logo-with-text-black.svg">
  <img alt="Briky Capital logo" width="300">
</picture>
</p>

## Overview

BrikyLand provides an all-in-one solution for tokenized real estate assets. This repository contains the core smart contracts powering the BrikyLand ecosystem.

### Our Products

- **[Briky Land](https://brikyland.com/)**: Invest in a transparent marketplace of tokenized real estate properties backed by institutional custodians.
- **[Briky Lend](https://testnet.brikylend.com/)**: Access flexible loans using your tokenized assets as collateral and unlock the power of mortgage-backed NFTs. Lend and earn competitive returns.
- **Briky Launch** *(coming soon)*: A streamlined platform for tokenizing properties, making real estate investment accessible to a global audience and unlocking new opportunities for property owners. 

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn package manager
- Git

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/brikyland/briky-smart-contract
   cd briky-smart-contract
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Compilation

Compile all smart contracts:

```bash
npx hardhat compile
```

## Local Development

### 1. Start Local Network

Launch a local Hardhat network:

```bash
npx hardhat node
```

This will start a local blockchain with pre-funded accounts.

### 2. Environment Configuration

1. Create an environment file from the template:
```bash
cp .env.example .env
```

2. Fill in the required contract and validator addresses in `.env`

### 3. Deployment Constants Configuration

1. Create a deployment constants file from the template in the corresponding directory:
```bash
cp scripts/deployments/<app_name>/initialization.sample.ts scripts/deployments/<app_name>/initialization.ts
```

2. Configure deployment constants in `scripts/deployments/<app_name>/initialization.ts`

> **Note**: Check the deployment scripts in `scripts/deployments/` to understand which environment variables and deployment constants are required.

### 4. Deploy Contracts

Deploy specific contracts using the following pattern:

```bash
npm run deploy<ContractName>:local
```

**Examples:**

- **Admin Contract**: 
  - Fill `LOCAL_ADMIN_1_ADDRESS` through `LOCAL_ADMIN_5_ADDRESS` in `.env` (use accounts from local node)
  - Run: `npm run deployAdmin:local`

- **FeeReceiver Contract**:
  - Fill `LOCAL_ADMIN_ADDRESS` in `.env`
  - Run: `npm run deployFeeReceiver:local`

## Testing

Run the complete test suite:

```bash
npx hardhat test
```

For specific test files:

```bash
npx hardhat test test/YourTestFile.test.ts
```

## Project Structure

```
contracts/
├── common/         # Core shared contracts and utilities
├── land/           # Estate tokenization (Briky Land)
├── launch/         # Project funding and tokenization (Briky Launch)
├── lend/           # Token lending, mortgage (Briky Lend)
├── liquidity/      # Primary token and staking tokens
├── lucra/          # Tokens for airdrop campaign
└── lux/            # Token marketplaces
```
