# Solidity API

## SnapshotHandler

@author Briky Team

 @notice Utility library to query a mutable value at a specified timestamp from its time-ordered snapshot list.

### getValueAt

```solidity
function getValueAt(struct ISnapshot.Uint256Snapshot[] _snapshots, uint256 _at) internal view returns (uint256)
```

Name            Description
 @param  _snapshots      Array of time-ordered snapshots of the mutable value.
 @param  _at             Reference timestamp.

 @return Value at the reference timestamp.

