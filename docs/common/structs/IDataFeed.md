# Solidity API

## IDataFeed

@author Briky Team

 @notice Interface for struct `DataFeed`.

### InvalidDataFeed

```solidity
error InvalidDataFeed()
```

===== ERROR ===== *

### DataFeed

@notice Connection configuration of a Data Feed.
 @dev    Document for Data Feed: https://docs.chain.link/data-feeds

```solidity
struct DataFeed {
  address feed;
  uint40 heartbeat;
}
```

