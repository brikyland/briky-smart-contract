# IFeeReceiver

Interface for contract `FeeReceiver`.

The `FeeReceiver` contract passively receives and holds fee from operators within the system until being withdrawn
on demands of admins.

{% hint style="info" %}
ERC-20 tokens are identified by their contract addresses.
Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
{% endhint %}

## Withdrawal

```solidity
event Withdrawal(address receiver, address currency, uint256 value)
```

Emitted when a sufficient amount of cryptocurrency is withdrawn from this contract to an account.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| receiver | address | Receiver address. |
| currency | address | Withdrawn currency address. |
| value | uint256 | Withdrawn value. |

