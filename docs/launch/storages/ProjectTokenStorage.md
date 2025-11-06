# Solidity API

## ProjectTokenStorage

@author Briky Team

 @notice Storage contract for contract `ProjectToken`.

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
 @return projectNumber   Number of projects.

### admin

```solidity
address admin
```

Name        Description
 @return admin       `Admin` contract address.

### estateToken

```solidity
address estateToken
```

Name            Description
 @return estateToken     `EstateToken` contract address.

### feeReceiver

```solidity
address feeReceiver
```

Name            Description
 @return feeReceiver     `FeeReceiver` contract address.

