# Solidity API

## IFeeReceiver

@author Briky Team

 @notice Interface for contract `FeeReceiver`.
 @notice The `FeeReceiver` contract passively receives and holds fee from operators within the system until being withdrawn
         on demands of admins.

 @dev    ERC-20 tokens are identified by their contract addresses.
         Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).

### Withdrawal

```solidity
event Withdrawal(address receiver, address currency, uint256 value)
```

@notice Emitted when a sufficient amount of cryptocurrency is withdrawn from this contract to an account.

         Name        Description
 @param  receiver    Receiver address.
 @param  currency    Withdrawn currency address.
 @param  value       Withdrawn value.

