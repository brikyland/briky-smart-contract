# IDividendHub

Interface for contract `DividendHub`.

The `DividendHub` contract collects incomes associated to assets from governor contracts and distribute them
among asset holders.

{% hint style="info" %}
ERC-20 tokens are identified by their contract addresses.
Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
{% endhint %}

## NewDividend

```solidity
event NewDividend(address governor, uint256 tokenId, address issuer, uint256 totalWeight, uint256 value, address currency, string note)
```

Emitted when a new dividend package is issued.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| governor | address | Governor contract address. |
| tokenId | uint256 | Asset identifier from the governor contract. |
| issuer | address | Issuer address. |
| totalWeight | uint256 | Current total weight of all holders of the asset. |
| value | uint256 | Total dividend value. |
| currency | address | Dividend currency address. |
| note | string | Issuance note. |

## Withdrawal

```solidity
event Withdrawal(uint256 dividendId, address withdrawer, uint256 value)
```

Emitted when value is withdrawn from a dividend package by an entitled receiver.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| dividendId | uint256 | Dividend identifier. |
| withdrawer | address | Withdrawer address. |
| value | uint256 | Withdrawn value. |

## AlreadyWithdrawn

```solidity
error AlreadyWithdrawn()
```

===== ERROR ===== *

## InvalidDividendId

```solidity
error InvalidDividendId()
```

## InvalidTokenId

```solidity
error InvalidTokenId()
```

## InvalidWithdrawing

```solidity
error InvalidWithdrawing()
```

## dividendNumber

```solidity
function dividendNumber() external view returns (uint256 dividendNumber)
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| dividendNumber | uint256 | Number of dividends. |

## getDividend

```solidity
function getDividend(uint256 dividendId) external view returns (struct IDividend.Dividend dividend)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| dividendId | uint256 | Dividend identifier. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| dividend | struct IDividend.Dividend | Configuration and progress of the dividend package. |

## withdrawAt

```solidity
function withdrawAt(uint256 dividendId, address withdrawer) external view returns (uint256 withdrawAt)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| dividendId | uint256 | Dividend identifier. |
| withdrawer | address | Withdrawer address. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| withdrawAt | uint256 | Withdrawal timestamp. |

## issueDividend

```solidity
function issueDividend(address governor, uint256 tokenId, uint256 value, address currency, string note) external payable returns (uint256 dividendId)
```

Issue a new dividend package for an asset from a governor contract.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| governor | address | Governor contract address. |
| tokenId | uint256 | Asset identifier from the governor contract. |
| value | uint256 | Total dividend value. |
| currency | address | Dividend currency address. |
| note | string | Issuance note. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| dividendId | uint256 | New dividend identifier. |

## withdraw

```solidity
function withdraw(uint256[] dividendIds) external
```

Withdraw entitled portions of the message sender from multiple dividend packages.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| dividendIds | uint256[] | Array of dividend identifiers to withdraw. |

