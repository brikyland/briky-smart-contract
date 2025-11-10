# Solidity API

## AdminStorage

Storage contract for contract `Admin`.

### isManager

```solidity
mapping(address => bool) isManager
```

_isManager[account]_

### nonce

```solidity
uint256 nonce
```

Name    Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

### admin1

```solidity
address admin1
```

Name    Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

### admin2

```solidity
address admin2
```

Name    Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

### admin3

```solidity
address admin3
```

Name    Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

### admin4

```solidity
address admin4
```

Name    Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

### admin5

```solidity
address admin5
```

Name    Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

### isModerator

```solidity
mapping(address => bool) isModerator
```

_isModerator[account]_

### currencyRegistries

```solidity
mapping(address => struct ICurrencyRegistry.CurrencyRegistry) currencyRegistries
```

_currencyRegistries[currency]_

### isZone

```solidity
mapping(bytes32 => bool) isZone
```

_isZone[zone]_

### isActiveIn

```solidity
mapping(bytes32 => mapping(address => bool)) isActiveIn
```

_isActiveIn[zone][account]_

### isGovernor

```solidity
mapping(address => bool) isGovernor
```

_isGovernor[account]_

