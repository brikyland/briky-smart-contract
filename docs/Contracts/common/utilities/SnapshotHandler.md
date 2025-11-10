# SnapshotHandler

Utility library to query a mutable value at a specified timestamp from its time-ordered snapshot list.

## getValueAt

```solidity
function getValueAt(struct ISnapshot.Uint256Snapshot[] _snapshots, uint256 _at) internal view returns (uint256)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _snapshots | struct ISnapshot.Uint256Snapshot[] | Array of time-ordered snapshots of the mutable value. |
| _at | uint256 | Reference timestamp. |

### Return Values

Value at the reference timestamp.

