# Solidity API

## IProject

@author Briky Team

 @notice Interface for struct `Project`.

### Project

@notice Project information.

```solidity
struct Project {
  uint256 estateId;
  bytes32 zone;
  uint256 launchId;
  address launchpad;
  uint40 tokenizeAt;
  uint40 deprecateAt;
  address initiator;
}
```

