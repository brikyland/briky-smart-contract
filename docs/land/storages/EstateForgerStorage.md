# Solidity API

## EstateForgerStorage

@author Briky Team

 @notice Storage contract for contract `EstateForger`.

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
 @return requestNumber   Number of requests.

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

### estateToken

```solidity
address estateToken
```

Name            Description
 @return estateToken     `EstateToken` contract address.

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

