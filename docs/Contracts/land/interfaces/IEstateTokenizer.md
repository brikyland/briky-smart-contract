# Solidity API

## IEstateTokenizer

Interface for tokenizer contracts of `EstateToken`.

An `IEstateTokenizer` contract instructs `EstateToken` to securitize a real estate into a new class of tokens and
receive them for subsequent distribution to holders.

### EstateTokenWithdrawal

```solidity
event EstateTokenWithdrawal(uint256 tokenizationId, address withdrawer, uint256 amount)
```

Emitted when a holder withdraw allocation from a tokenization.

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenizationId | uint256 | Tokenization identifier. |
| withdrawer | address | Withdrawer address. |
| amount | uint256 | Withdrawn amount. |

### AlreadyTokenized

```solidity
error AlreadyTokenized()
```

===== ERROR ===== *

### NotRegisteredCustodian

```solidity
error NotRegisteredCustodian()
```

### NotTokenized

```solidity
error NotTokenized()
```

### isTokenized

```solidity
function isTokenized(uint256 tokenizationId) external view returns (bool isTokenized)
```

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenizationId | uint256 | Tokenization identifier. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| isTokenized | bool | Whether the tokenization has succeeded. |

### allocationOfAt

```solidity
function allocationOfAt(address account, uint256 tokenizationId, uint256 at) external view returns (uint256 allocation)
```

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | Account address. |
| tokenizationId | uint256 | Tokenization identifier. |
| at | uint256 | Reference timestamp. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| allocation | uint256 | Allocation of the account at the reference timestamp. |

### withdrawEstateToken

```solidity
function withdrawEstateToken(uint256 tokenizationId) external returns (uint256 amount)
```

Withdraw the allocation of the message sender from a tokenization.

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenizationId | uint256 | Tokenization identifier. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | Withdrawn amount. |

