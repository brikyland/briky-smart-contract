# Solidity API

## PrimaryTokenStorage

@author Briky Team

 @notice Storage contract for contract `PrimaryToken`.

### backerRoundContribution

```solidity
uint256 backerRoundContribution
```

Name            Description
 @return contribution    Total liquidity contributed from operating of Backer Round .

### externalTreasuryContribution

```solidity
uint256 externalTreasuryContribution
```

Name            Description
 @return contribution    Total liquidity contributed from operating of External Treasury.

### marketMakerContribution

```solidity
uint256 marketMakerContribution
```

Name            Description
 @return contribution    Total liquidity contributed from operating of Market Maker.

### privateSale1Contribution

```solidity
uint256 privateSale1Contribution
```

Name            Description
 @return contribution    Total liquidity contributed from operating of Private Sale #1.

### privateSale2Contribution

```solidity
uint256 privateSale2Contribution
```

Name            Description
 @return contribution    Total liquidity contributed from operating of Private Sale #2.

### publicSaleContribution

```solidity
uint256 publicSaleContribution
```

Name            Description
 @return contribution    Total liquidity contributed from operating of Public Sale.

### seedRoundContribution

```solidity
uint256 seedRoundContribution
```

Name            Description
 @return contribution    Total liquidity contributed from operating of Seed Round.

### liquidationUnlockedAt

```solidity
uint256 liquidationUnlockedAt
```

Name                    Description
 @return liquidationUnlockedAt   Liquidation unlock timestamp.

### backerRoundUnlocked

```solidity
bool backerRoundUnlocked
```

Name        Description
 @return isUnlocked  Whether Backer Round tokens have been unlocked.

### coreTeamTokensUnlocked

```solidity
bool coreTeamTokensUnlocked
```

Name        Description
 @return isUnlocked  Whether Core Team tokens have been unlocked.

### externalTreasuryTokensUnlocked

```solidity
bool externalTreasuryTokensUnlocked
```

Name        Description
 @return isUnlocked  Whether External Treasury tokens have been unlocked.

### marketMakerTokensUnlocked

```solidity
bool marketMakerTokensUnlocked
```

Name        Description
 @return isUnlocked  Whether Market Maker tokens have been unlocked.

### privateSale1Unlocked

```solidity
bool privateSale1Unlocked
```

Name        Description
 @return isUnlocked  Whether Private Sale #1 tokens have been unlocked.

### privateSale2Unlocked

```solidity
bool privateSale2Unlocked
```

Name        Description
 @return isUnlocked  Whether Private Sale #2 tokens have been unlocked.

### publicSaleUnlocked

```solidity
bool publicSaleUnlocked
```

Name        Description
 @return isUnlocked  Whether Public Sale tokens have been unlocked.

### seedRoundUnlocked

```solidity
bool seedRoundUnlocked
```

Name        Description
 @return isUnlocked  Whether Seed Round tokens have been unlocked.

### admin

```solidity
address admin
```

Name        Description
 @return admin       `Admin` contract address.

### treasury

```solidity
address treasury
```

Name            Description
 @return treasury        `Treasury` contract address.

### stakeToken1Waves

```solidity
uint256 stakeToken1Waves
```

===== UPGRADE ===== *

### stakeToken2Waves

```solidity
uint256 stakeToken2Waves
```

Name        Description
 @return wave        Current wave number for staking pool #2.

### stakeToken3Waves

```solidity
uint256 stakeToken3Waves
```

Name        Description
 @return wave        Current wave number for staking pool #3.

### stakeToken1Contribution

```solidity
uint256 stakeToken1Contribution
```

Name            Description
 @return contribution    Total liquidity contributed from operating of staking pool #1.

### stakeToken2Contribution

```solidity
uint256 stakeToken2Contribution
```

Name            Description
 @return contribution    Total liquidity contributed from operating of staking pool #2.

### stakeToken3Contribution

```solidity
uint256 stakeToken3Contribution
```

Name            Description
 @return contribution    Total liquidity contributed from operating of staking pool #3.

### stakeToken1

```solidity
address stakeToken1
```

Name            Description
 @return stakeToken1     `StakeToken` contract address #1.

### stakeToken2

```solidity
address stakeToken2
```

Name            Description
 @return stakeToken2     `StakeToken` contract address #2.

### stakeToken3

```solidity
address stakeToken3
```

Name            Description
 @return stakeToken3     `StakeToken` contract address #3.

