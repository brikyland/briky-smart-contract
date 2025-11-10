# ICommissionDispatchable

Interface for contract `CommissionDispatchable`.

A `CommissionDispatchable` contract allows sharing a portion of incomes as affiliate commission, according to the
commission token.

## CommissionDispatch

```solidity
event CommissionDispatch(address receiver, uint256 value, address currency)
```

Emitted when a commission is dispatched.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| receiver | address | Receiver address. |
| value | uint256 | Commission derived from the value. |
| currency | address | Currency address. |

## commissionToken

```solidity
function commissionToken() external view returns (address commissionToken)
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| commissionToken | address | `CommissionToken` contract address. |

