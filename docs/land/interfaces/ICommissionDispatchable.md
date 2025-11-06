# Solidity API

## ICommissionDispatchable

@author Briky Team

 @notice Interface for contract `CommissionDispatchable`.
 @notice A `CommissionDispatchable` contract allows sharing a portion of incomes as affiliate commission, according to the
         commission token.

### CommissionDispatch

```solidity
event CommissionDispatch(address receiver, uint256 value, address currency)
```

@notice Emitted when a commission is dispatched.

         Name        Description
 @param  receiver    Receiver address.
 @param  value       Commission derived from the value.
 @param  currency    Currency address.

### commissionToken

```solidity
function commissionToken() external view returns (address commissionToken)
```

Name               Description
 @return commissionToken    `CommissionToken` contract address.

