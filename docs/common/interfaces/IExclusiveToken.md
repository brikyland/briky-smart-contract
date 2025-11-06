# Solidity API

## IExclusiveToken

@author Briky Team

 @notice Interface for exclusive ERC-20 tokens of the system.
 @notice An `IExclusiveToken` contract provides a discount rate applied when it is used as the currency of fee charged in
         operators within the system.

### exclusiveDiscount

```solidity
function exclusiveDiscount() external view returns (struct IRate.Rate rate)
```

Name    Description
 @return rate    Discount rate for exclusive token.

