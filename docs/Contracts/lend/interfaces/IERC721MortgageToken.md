# IERC721MortgageToken

Interface for contract `ERC721MortgageToken`.

A `ERC721MortgageToken` contract facilitates peer-to-peer lending secured by ERC-721 tokens as collateral. Each provided mortgage
is tokenized into an ERC-721 token, whose owner has the right to receive repayments from the borrower or foreclose
on the collateral from the contract once overdue.

{% hint style="info" %}
ERC-20 tokens are identified by their contract addresses.
Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).

{% endhint %}

## CollateralRegistration

```solidity
event CollateralRegistration(address collateral)
```

Emitted when a collection is registered as a collateral contract.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| collateral | address | Registered contract address. |

## CollateralDeregistration

```solidity
event CollateralDeregistration(address collateral)
```

Emitted when a collection is deregistered as a collateral contract.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| collateral | address | Deregistered contract address. |

## NewCollateral

```solidity
event NewCollateral(uint256 mortgageId, address token, uint256 tokenId)
```

Emitted when a new ERC-721 collateral is secured.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| mortgageId | uint256 | Mortgage identifier. |
| token | address | Collateral collection contract address. |
| tokenId | uint256 | Collateral token identifier. |

## NotRegisteredCollateral

```solidity
error NotRegisteredCollateral()
```

## RegisteredCollateral

```solidity
error RegisteredCollateral()
```

## isCollateral

```solidity
function isCollateral(address token) external view returns (bool isCollateral)
```

{% hint style="info" %}
The collection must support interface `IERC721Upgradeable`.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | Contract address. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| isCollateral | bool | Whether the collection is registered. |

## getCollateral

```solidity
function getCollateral(uint256 mortgageId) external view returns (struct IERC721Collateral.ERC721Collateral collateral)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| mortgageId | uint256 | Mortgage identifier. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| collateral | struct IERC721Collateral.ERC721Collateral | Collateral information. |

## borrow

```solidity
function borrow(address token, uint256 tokenId, uint256 principal, uint256 repayment, address currency, uint40 duration) external returns (uint256 mortgageId)
```

List a new mortgage offer with an ERC-721 token as collateral.

{% hint style="info" %}
Approval must be granted for this contract to secure the collateral before borrowing.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | Collateral contract address. |
| tokenId | uint256 | Collateral token identifier. |
| principal | uint256 | Principal value. |
| repayment | uint256 | Repayment value. |
| currency | address | Currency address. |
| duration | uint40 | Borrowing duration. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| mortgageId | uint256 | New mortgage identifier. |

