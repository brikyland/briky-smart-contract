# Solidity API

## ProjectTokenStorage

Storage contract for contract `ProjectToken`.

### balanceSnapshots

```solidity
mapping(uint256 => mapping(address => struct ISnapshot.Uint256Snapshot[])) balanceSnapshots
```

_balanceSnapshots[projectId][account]_

### initiatorURI

```solidity
mapping(bytes32 => mapping(address => string)) initiatorURI
```

_initiatorURI[zone][account]_

### totalSupplySnapshots

```solidity
mapping(uint256 => struct ISnapshot.Uint256Snapshot[]) totalSupplySnapshots
```

_totalSupplySnapshots[projectId]_

### projects

```solidity
mapping(uint256 => struct IProject.Project) projects
```

_projects[projectId]_

### zoneRoyaltyRates

```solidity
mapping(bytes32 => uint256) zoneRoyaltyRates
```

_zoneRoyaltyRates[zone]_

### isLaunchpad

```solidity
mapping(address => bool) isLaunchpad
```

_isLaunchpad[account]_

### projectNumber

```solidity
uint256 projectNumber
```

Name            Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

### admin

```solidity
address admin
```

Name        Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

### estateToken

```solidity
address estateToken
```

Name            Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

### feeReceiver

```solidity
address feeReceiver
```

Name            Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

