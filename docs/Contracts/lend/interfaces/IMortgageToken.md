# IMortgageToken

Interface for contract `MortgageToken`.

A `MortgageToken` contract facilitates peer-to-peer lending secured by crypto collateral. Each mortgage being lent
is tokenized into an ERC-721 token, whose owner has the right to receive repayments from the borrower or foreclose
on the collateral from the contract once overdue.

{% hint style="info" %}
ERC-20 tokens are identified by their contract addresses.
Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
{% endhint %}

## BaseURIUpdate

```solidity
event BaseURIUpdate(string newValue)
```

Emitted when the base URI is updated.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newValue | string | New base URI. |

## FeeRateUpdate

```solidity
event FeeRateUpdate(struct IRate.Rate newRate)
```

Emitted when the borrowing fee rate is updated.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newRate | struct IRate.Rate | New borrowing fee rate. |

## NewToken

```solidity
event NewToken(uint256 tokenId, address lender, uint40 due)
```

Emitted when a new mortgage token is minted.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | Mortgage identifier. |
| lender | address | Lender address. |
| due | uint40 | Maturity timestamp. |

## NewMortgage

```solidity
event NewMortgage(uint256 mortgageId, address borrower, uint256 principal, uint256 repayment, uint256 fee, address currency, uint40 duration)
```

Emitted when a new mortgage is listed.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| mortgageId | uint256 | Mortgage identifier. |
| borrower | address | Borrower address. |
| principal | uint256 | Principal value. |
| repayment | uint256 | Repayment value. |
| fee | uint256 | Borrowing fee. |
| currency | address | Currency address. |
| duration | uint40 | Borrowing duration. |

## MortgageCancellation

```solidity
event MortgageCancellation(uint256 mortgageId)
```

Emitted when a mortgage is cancelled.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| mortgageId | uint256 | Mortgage identifier. |

## MortgageForeclosure

```solidity
event MortgageForeclosure(uint256 mortgageId, address receiver)
```

Emitted when a mortgage is foreclosed.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| mortgageId | uint256 | Mortgage identifier. |
| receiver | address | Collateral receiver address. |

## MortgageRepayment

```solidity
event MortgageRepayment(uint256 mortgageId)
```

Emitted when a mortgage is repaid.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| mortgageId | uint256 | Mortgage identifier. |

## InvalidCancelling

```solidity
error InvalidCancelling()
```

## InvalidCollateral

```solidity
error InvalidCollateral()
```

## InvalidTokenId

```solidity
error InvalidTokenId()
```

## InvalidForeclosing

```solidity
error InvalidForeclosing()
```

## InvalidLending

```solidity
error InvalidLending()
```

## InvalidMortgageId

```solidity
error InvalidMortgageId()
```

## InvalidPrincipal

```solidity
error InvalidPrincipal()
```

## InvalidRepaying

```solidity
error InvalidRepaying()
```

## InvalidRepayment

```solidity
error InvalidRepayment()
```

## Overdue

```solidity
error Overdue()
```

## feeReceiver

```solidity
function feeReceiver() external view returns (address feeReceiver)
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| feeReceiver | address | `FeeReceiver` contract address. |

## totalSupply

```solidity
function totalSupply() external view returns (uint256 totalSupply)
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| totalSupply | uint256 | Total supply of the token. |

## getFeeRate

```solidity
function getFeeRate() external view returns (struct IRate.Rate rate)
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| rate | struct IRate.Rate | Borrowing fee rate. |

## mortgageNumber

```solidity
function mortgageNumber() external view returns (uint256 mortgageNumber)
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| mortgageNumber | uint256 | Number of mortgages. |

## getMortgage

```solidity
function getMortgage(uint256 mortgageId) external view returns (struct IMortgage.Mortgage mortgage)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| mortgageId | uint256 | Mortgage identifier. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| mortgage | struct IMortgage.Mortgage | Configuration and progress of the mortgage. |

## cancel

```solidity
function cancel(uint256 mortgageId) external
```

Cancel a mortgage.

Cancel only if the mortgage is in `Pending` state.

{% hint style="info" %}
Permission:
- Borrower of the mortgage.
- Managers: disqualify defected mortgages only.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| mortgageId | uint256 | Mortgage identifier. |

## lend

```solidity
function lend(uint256 mortgageId) external payable returns (uint40 due)
```

Lend a mortgage.

Lend only if the mortgage is in `Pending` state.

Mint the token associated with the mortgage.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| mortgageId | uint256 | Mortgage identifier. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| due | uint40 | Maturity timestamp. |

## repay

```solidity
function repay(uint256 mortgageId) external payable
```

Repay a mortgage.

Repay only if the mortgage is in `Supplied` state and not overdue.

Burn the token associated with the mortgage.

{% hint style="info" %}
Permission: Borrower of the mortgage.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| mortgageId | uint256 | Mortgage identifier. |

## foreclose

```solidity
function foreclose(uint256 mortgageId) external
```

Foreclose on the collateral of a mortgage.

Foreclose only if the mortgage is overdue.

Burn the token associated with the mortgage.

{% hint style="info" %}
The collateral is transferred to the mortgage token owner and the token is burned.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| mortgageId | uint256 | Mortgage identifier. |

## safeLend

```solidity
function safeLend(uint256 mortgageId, uint256 anchor) external payable returns (uint40 due)
```

Lend a mortgage.

Lend only if the mortgage is in `Pending` state.

Mint the token associated with the mortgage.

{% hint style="info" %}
Anchor enforces consistency between this contract and the client-side.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| mortgageId | uint256 | Mortgage identifier. |
| anchor | uint256 | `principal` of the mortgage. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| due | uint40 | Maturity timestamp. |

## safeRepay

```solidity
function safeRepay(uint256 mortgageId, uint256 anchor) external payable
```

Repay a mortgage.

Repay only if the mortgage is in `Supplied` state and not overdue.

Burn the token associated with the mortgage.

{% hint style="info" %}
Permission: Borrower of the mortgage.

{% endhint %}

{% hint style="info" %}
Anchor enforces consistency between this contract and the client-side.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| mortgageId | uint256 | Mortgage identifier. |
| anchor | uint256 | `repayment` of the mortgage. |

