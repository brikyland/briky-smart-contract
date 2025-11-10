# Solidity API

## EstateForgerStorage

Storage contract for contract `EstateForger`.

### deposits

```solidity
mapping(uint256 => mapping(address => uint256)) deposits
```

_deposits[requestId][account]_

### withdrawAt

```solidity
mapping(uint256 => mapping(address => uint256)) withdrawAt
```

_withdrawAt[requestId][account]_

### isWhitelistedFor

```solidity
mapping(uint256 => mapping(address => bool)) isWhitelistedFor
```

_isWhitelistedFor[requestId][account]_

### requests

```solidity
mapping(uint256 => struct IEstateForgerRequest.EstateForgerRequest) requests
```

_requests[requestId]_

### isWhitelisted

```solidity
mapping(address => bool) isWhitelisted
```

_isWhitelisted[account]_

### requestNumber

```solidity
uint256 requestNumber
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

### estateToken

```solidity
address estateToken
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

