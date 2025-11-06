# Solidity API

## Discountable

@author Briky Team

 @notice A `Discountable` contract applies discounting to payments made in exclusive tokens.

 @dev    ERC-20 tokens are identified by their contract addresses.
         Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).

### _applyDiscount

```solidity
function _applyDiscount(uint256 _value, address _currency) internal view returns (uint256 _discountedValue)
```

Name                Description
 @param  _value              Original value.
 @param  _currency           Currency address.
 @return _discountedValue    Value after subtracting exclusive discount if applicable.

