# Solidity API

## PrestigePadStorage

@author Briky Team

 @notice Storage contract for contract `PrestigePad`.

### contributions

```solidity
mapping(uint256 => mapping(address => uint256)) contributions
```

_contributions[roundId][account]_

### withdrawAt

```solidity
mapping(uint256 => mapping(address => uint256)) withdrawAt
```

_withdrawAt[roundId][account]_

### launches

```solidity
mapping(uint256 => struct IPrestigePadLaunch.PrestigePadLaunch) launches
```

_launches[launchId]_

### rounds

```solidity
mapping(uint256 => struct IPrestigePadRound.PrestigePadRound) rounds
```

_rounds[roundId]_

### launchNumber

```solidity
uint256 launchNumber
```

Name            Description
 @return launchNumber    Total number of launches created.

### roundNumber

```solidity
uint256 roundNumber
```

Name            Description
 @return roundNumber     Total number of rounds created.

### baseMinUnitPrice

```solidity
uint256 baseMinUnitPrice
```

Name                Description
 @return baseMinUnitPrice    Minimum unit price denominated in USD.

### baseMaxUnitPrice

```solidity
uint256 baseMaxUnitPrice
```

Name                Description
 @return baseMaxUnitPrice    Maximum unit price denominated in USD.

### admin

```solidity
address admin
```

Name        Description
 @return admin       `Admin` contract address.

### projectToken

```solidity
address projectToken
```

Name            Description
 @return projectToken    `ProjectToken` contract address.

### feeReceiver

```solidity
address feeReceiver
```

Name            Description
 @return feeReceiver     `FeeReceiver` contract address.

### priceWatcher

```solidity
address priceWatcher
```

Name            Description
 @return priceWatcher    `PriceWatcher` contract address.

### reserveVault

```solidity
address reserveVault
```

Name            Description
 @return reserveVault    `ReserveVault` contract address.

