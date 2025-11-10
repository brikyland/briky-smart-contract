# Solidity API

## IProject

Interface for struct `Project`.

### Project

Project information.

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

