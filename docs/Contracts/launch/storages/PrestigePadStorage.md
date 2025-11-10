# Solidity API

## PrestigePadStorage

Storage contract for contract `PrestigePad`.

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

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

### roundNumber

```solidity
uint256 roundNumber
```

Name            Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

### baseMinUnitPrice

```solidity
uint256 baseMinUnitPrice
```

Name                Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

### baseMaxUnitPrice

```solidity
uint256 baseMaxUnitPrice
```

Name                Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

### admin

```solidity
address admin
```

Name        Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

### projectToken

```solidity
address projectToken
```

Name            Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

### feeReceiver

```solidity
address feeReceiver
```

Name            Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

### priceWatcher

```solidity
address priceWatcher
```

Name            Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

### reserveVault

```solidity
address reserveVault
```

Name            Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

