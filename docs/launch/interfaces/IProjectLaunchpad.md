# Solidity API

## IProjectLaunchpad

@author Briky Team

 @notice Interface for launchpad contracts of `ProjectToken`.

 @notice An `IProjectLaunchpad` contract facilitates project fundraising through launches comprising multiple investment
         rounds, accordingly instructs `EstateToken` to securitize a real estate into a new class of tokens and receive them
         for subsequent distribution to contributors.

### ProjectTokenWithdrawal

```solidity
event ProjectTokenWithdrawal(uint256 launchId, uint256 roundId, address withdrawer, uint256 amount)
```

@notice Emitted when an contributor withdraw allocation from a launch.

         Name        Description
 @param  launchId    Launch identifier.
 @param  roundId     Round identifier.
 @param  withdrawer  Withdrawer address.
 @param  amount      Withdrawn amount.

### AlreadyFinalized

```solidity
error AlreadyFinalized()
```

===== ERROR ===== *

### NotRegisteredInitiator

```solidity
error NotRegisteredInitiator()
```

### isFinalized

```solidity
function isFinalized(uint256 launchId) external view returns (bool isFinalized)
```

Name            Description
 @param  launchId        Launch identifier.
 @return isFinalized     Whether the launch has settled.

### allocationOfAt

```solidity
function allocationOfAt(address account, uint256 launchId, uint256 at) external view returns (uint256 allocation)
```

Name            Description
 @param  account         EVM address.
 @param  launchId        Launch identifier.
 @param  at              Reference timestamp.
 @return allocation      Allocation of the account at the reference timestamp.

### withdrawProjectToken

```solidity
function withdrawProjectToken(uint256 launchId, uint256 index) external returns (uint256 amount)
```

@notice Withdraw the allocation of the message sender from a round of a launch.

         Name            Description
 @param  launchId        Launch identifier.
 @param  index           Index of the round in the launch.
 @return amount          Withdrawn amount.

