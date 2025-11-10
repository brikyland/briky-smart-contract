# Solidity API

## Pausable

A `Pausable` contract applies pausing mechanism on its methods and can be paused by admins for maintenance or
damage control on attacks.

### pause

```solidity
function pause(bytes[] _signatures) external
```

Pause contract.
For maintenance only.

Name            Description

_Administrative operator._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _signatures | bytes[] | Array of admin signatures. |

### unpause

```solidity
function unpause(bytes[] _signatures) external
```

Unpause contract.
After maintenance completes.

Name            Description

_Administrative operator._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _signatures | bytes[] | Array of admin signatures. |

