# Solidity API

## PrimaryTokenConstant

@author Briky Team

 @notice Constant library for contract `PrimaryToken`.

### BASE_DISCOUNT

```solidity
uint256 BASE_DISCOUNT
```

Base discount rate coefficient.

_Percentage: 15%_

### MAX_SUPPLY

```solidity
uint256 MAX_SUPPLY
```

Maximum value of total supply.

### BACKER_ROUND_ALLOCATION

```solidity
uint256 BACKER_ROUND_ALLOCATION
```

Allocation of Backer Round.

### PRIVATE_SALE_1_ALLOCATION

```solidity
uint256 PRIVATE_SALE_1_ALLOCATION
```

Allocation of Private Sale #1.

### PRIVATE_SALE_2_ALLOCATION

```solidity
uint256 PRIVATE_SALE_2_ALLOCATION
```

Allocation of Private Sale #2.

### PUBLIC_SALE_ALLOCATION

```solidity
uint256 PUBLIC_SALE_ALLOCATION
```

Allocation of Public Sale.

### SEED_ROUND_ALLOCATION

```solidity
uint256 SEED_ROUND_ALLOCATION
```

Allocation of Seed Round.

### CORE_TEAM_ALLOCATION

```solidity
uint256 CORE_TEAM_ALLOCATION
```

Allocation of Core Team.

### EXTERNAL_TREASURY_ALLOCATION

```solidity
uint256 EXTERNAL_TREASURY_ALLOCATION
```

Allocation of External Treasury.

### MARKET_MAKER_ALLOCATION

```solidity
uint256 MARKET_MAKER_ALLOCATION
```

Allocation of Market Maker.

### STAKE_1_WAVE_REWARD

```solidity
uint256 STAKE_1_WAVE_REWARD
```

Reward for a wave of staking pool #1. After culmination, no more wave and reward.

### STAKE_2_WAVE_REWARD

```solidity
uint256 STAKE_2_WAVE_REWARD
```

Reward for a wave of staking pool #2. After culmination, no more wave and reward.

### STAKE_3_WAVE_REWARD

```solidity
uint256 STAKE_3_WAVE_REWARD
```

Reward for a wave of staking pool #3. After culmination, reward is the lesser between this value and the remain
        mintable tokens to reach the maximum supply cap.

### STAKE_1_CULMINATING_WAVE

```solidity
uint256 STAKE_1_CULMINATING_WAVE
```

Wave index that culminates staking pool #1. After the wave, staking costs fee and reward stops.

### STAKE_2_CULMINATING_WAVE

```solidity
uint256 STAKE_2_CULMINATING_WAVE
```

Wave index that culminates staking pool #2. After the wave, staking costs fee and reward stops.

### STAKE_3_CULMINATING_WAVE

```solidity
uint256 STAKE_3_CULMINATING_WAVE
```

Wave index that culminates staking pool #3. After the wave, staking costs fee but reward can still be minted
        only if the total supply has not exceeded its cap.

