# Solidity API

## IPrestigePadLaunch

Interface for struct `PrestigePadLaunch`.

### PrestigePadLaunch

A launch of `PrestigePad` for capital raise for a project and initial issuance of a new associated class of
`ProjectToken` to contributors as referenced distribution for future benefit returning.

```solidity
struct PrestigePadLaunch {
  uint256 projectId;
  string uri;
  uint256 currentIndex;
  uint256[] roundIds;
  struct IRate.Rate feeRate;
  address initiator;
  bool isFinalized;
}
```

