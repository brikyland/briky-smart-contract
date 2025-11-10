# IAssetMortgageToken

Interface for mortgage token using `IAssetToken` as collateral.

An `IAssetMortgageToken` contract facilitates peer-to-peer lending secured by estate tokens as collateral. Each
provided mortgage is tokenized into an ERC-721 token, whose owner has the right to receive repayments from the
borrower or foreclose on the collateral from the contract once overdue.

{% hint style="info" %}
ERC-20 tokens are identified by their contract addresses.
Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
{% endhint %}

## NewCollateral

```solidity
event NewCollateral(uint256 mortgageId, uint256 tokenId, uint256 amount)
```

Emitted when a new asset collateral is secured.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| mortgageId | uint256 | Mortgage identifier. |
| tokenId | uint256 | Collateral asset identifier. |
| amount | uint256 | Collateral amount. |

## getCollateral

```solidity
function getCollateral(uint256 mortgageId) external view returns (struct IAssetCollateral.AssetCollateral collateral)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| mortgageId | uint256 | Mortgage identifier. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| collateral | struct IAssetCollateral.AssetCollateral | Collateral information. |

## borrow

```solidity
function borrow(uint256 tokenId, uint256 amount, uint256 principal, uint256 repayment, address currency, uint40 duration) external returns (uint256 mortgageId)
```

List a new mortgage with asset tokens as collateral.

{% hint style="info" %}
Approval must be granted for this contract to secure the collateral before borrowing.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | Collateral asset identifier. |
| amount | uint256 | Collateral amount. |
| principal | uint256 | Principal value. |
| repayment | uint256 | Repayment value. |
| currency | address | Currency address. |
| duration | uint40 | Borrowing duration. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| mortgageId | uint256 | New mortgage identifier. |

