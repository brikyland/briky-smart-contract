# Solidity API

## DividendHubStorage

@author Briky Team

 @notice Storage contract for contract `DividendHub`.

### withdrawAt

```solidity
mapping(uint256 => mapping(address => uint256)) withdrawAt
```

_withdrawAt[dividendId][account]_

### dividends

```solidity
mapping(uint256 => struct IDividend.Dividend) dividends
```

_dividends[dividendId]_

### dividendNumber

```solidity
uint256 dividendNumber
```

Name            Description
 @return dividendNumber  Number of dividends.

### admin

```solidity
address admin
```

Name        Description
 @return admin       `Admin` contract address.

