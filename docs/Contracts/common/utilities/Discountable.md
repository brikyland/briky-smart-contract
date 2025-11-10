# Discountable

A `Discountable` contract applies discounting to payments made in exclusive tokens.

{% hint style="info" %}
ERC-20 tokens are identified by their contract addresses.
Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
{% endhint %}

## _applyDiscount

```solidity
function _applyDiscount(uint256 _value, address _currency) internal view returns (uint256 _discountedValue)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _value | uint256 | Original value. |
| _currency | address | Currency address. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| _discountedValue | uint256 | Value after subtracting exclusive discount if applicable. |

