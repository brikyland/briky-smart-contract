# Solidity API

## ISnapshot

Interface for snapshot structs.

### Uint256Snapshot

Capture of a mutable value of type `uint256` at a specific timestamp.

```solidity
struct Uint256Snapshot {
  uint256 value;
  uint256 timestamp;
}
```

