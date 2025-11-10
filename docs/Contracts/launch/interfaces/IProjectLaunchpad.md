# Solidity API

## IProjectLaunchpad

Interface for launchpad contracts of `ProjectToken`.

An `IProjectLaunchpad` contract facilitates project fundraising through launches comprising multiple investment
rounds, accordingly instructs `EstateToken` to securitize a real estate into a new class of tokens and receive them
for subsequent distribution to contributors.

### ProjectTokenWithdrawal

```solidity
event ProjectTokenWithdrawal(uint256 launchId, uint256 roundId, address withdrawer, uint256 amount)
```

Emitted when an contributor withdraw allocation from a launch.

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| launchId | uint256 | Launch identifier. |
| roundId | uint256 | Round identifier. |
| withdrawer | address | Withdrawer address. |
| amount | uint256 | Withdrawn amount. |

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

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| launchId | uint256 | Launch identifier. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| isFinalized | bool | Whether the launch has settled. |

### allocationOfAt

```solidity
function allocationOfAt(address account, uint256 launchId, uint256 at) external view returns (uint256 allocation)
```

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | EVM address. |
| launchId | uint256 | Launch identifier. |
| at | uint256 | Reference timestamp. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| allocation | uint256 | Allocation of the account at the reference timestamp. |

### withdrawProjectToken

```solidity
function withdrawProjectToken(uint256 launchId, uint256 index) external returns (uint256 amount)
```

Withdraw the allocation of the message sender from a round of a launch.

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| launchId | uint256 | Launch identifier. |
| index | uint256 | Index of the round in the launch. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | Withdrawn amount. |

