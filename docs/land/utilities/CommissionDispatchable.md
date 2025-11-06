# Solidity API

## CommissionDispatchable

@author Briky Team

 @notice A `CommissionDispatchable` contract allows sharing a portion of incomes as affiliate commission, according to the
         commission token.

### __CommissionDispatchable_init

```solidity
function __CommissionDispatchable_init(address _commissionToken) internal
```

@notice Initialize `CommissionDispatchable`.

         Name                Description
 @param  _commissionToken    `CommissionToken` contract address.

### _dispatchCommission

```solidity
function _dispatchCommission(uint256 _estateId, uint256 _value, address _currency) internal returns (uint256 commission)
```

@notice Dispatch commission to the receiver corresponding to the commission token of an estate.

         Name        Description
 @param  _estateId   Estate token identifier.
 @param  _value      Commission derived from the value.
 @param  _currency   Currency address.

