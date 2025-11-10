# IDataFeed

Interface for struct `DataFeed`.

## InvalidDataFeed

```solidity
error InvalidDataFeed()
```

===== ERROR ===== *

## DataFeed

Connection configuration of a Data Feed.

{% hint style="info" %}
Document for Data Feed: https://docs.chain.link/data-feeds
{% endhint %}

```solidity
struct DataFeed {
  address feed;
  uint40 heartbeat;
}
```

