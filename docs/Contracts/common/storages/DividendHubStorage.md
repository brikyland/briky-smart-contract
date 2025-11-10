# Solidity API

## DividendHubStorage

Storage contract for contract `DividendHub`.

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

