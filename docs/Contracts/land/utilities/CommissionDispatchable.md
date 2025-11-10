# Solidity API

## CommissionDispatchable

A `CommissionDispatchable` contract allows sharing a portion of incomes as affiliate commission, according to the
commission token.

### __CommissionDispatchable_init

```solidity
function __CommissionDispatchable_init(address _commissionToken) internal
```

Initialize `CommissionDispatchable`.

Name                Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _commissionToken | address | `CommissionToken` contract address. |

### _dispatchCommission

```solidity
function _dispatchCommission(uint256 _estateId, uint256 _value, address _currency) internal returns (uint256 commission)
```

Dispatch commission to the receiver corresponding to the commission token of an estate.

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _estateId | uint256 | Estate token identifier. |
| _value | uint256 | Commission derived from the value. |
| _currency | address | Currency address. |

