# Solidity API

## IDataFeed

Interface for struct `DataFeed`.

### InvalidDataFeed

```solidity
error InvalidDataFeed()
```

===== ERROR ===== *

### DataFeed

Connection configuration of a Data Feed.

_Document for Data Feed: https://docs.chain.link/data-feeds_

```solidity
struct DataFeed {
  address feed;
  uint40 heartbeat;
}
```

