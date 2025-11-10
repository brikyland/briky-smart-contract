# Solidity API

## Revert

### revertFromReturnedData

```solidity
function revertFromReturnedData(bytes returnedData) internal pure
```

This is needed in order to provide some human-readable revert message from a call

_Bubble up the revert from the returnedData (supports Panic, Error & Custom Errors)_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| returnedData | bytes | Response of the call |

