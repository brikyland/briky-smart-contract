# Revert

## revertFromReturnedData

```solidity
function revertFromReturnedData(bytes returnedData) internal pure
```

This is needed in order to provide some human-readable revert message from a call

{% hint style="info" %}
Bubble up the revert from the returnedData (supports Panic, Error & Custom Errors)

{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| returnedData | bytes | Response of the call |

