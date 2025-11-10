# IDistribution

Interface for struct `Distribution`.

## Distribution

Distribution of token that vests evenly on a per-second basis.

```solidity
struct Distribution {
  uint256 totalAmount;
  uint256 withdrawnAmount;
  address receiver;
  uint40 distributeAt;
  uint40 vestingDuration;
  bool isStaked;
}
```

