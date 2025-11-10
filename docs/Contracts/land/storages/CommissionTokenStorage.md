# Solidity API

## CommissionTokenStorage

Storage contract for contract `CommissionToken`.

### brokerCommissionRates

```solidity
mapping(bytes32 => mapping(address => struct IRate.Rate)) brokerCommissionRates
```

_brokerCommissionRates[zone][account]_

### isActiveIn

```solidity
mapping(bytes32 => mapping(address => bool)) isActiveIn
```

_isActiveIn[zone][account]_

### commissionRates

```solidity
mapping(uint256 => struct IRate.Rate) commissionRates
```

_commissionRates[tokenId]_

### baseURI

```solidity
string baseURI
```

### royaltyRate

```solidity
uint256 royaltyRate
```

### totalSupply

```solidity
uint256 totalSupply
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

