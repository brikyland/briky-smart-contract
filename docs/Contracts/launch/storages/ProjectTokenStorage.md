# ProjectTokenStorage

Storage contract for contract `ProjectToken`.

## balanceSnapshots

```solidity
mapping(uint256 => mapping(address => struct ISnapshot.Uint256Snapshot[])) balanceSnapshots
```

{% hint style="info" %}
balanceSnapshots[projectId][account]
{% endhint %}

## initiatorURI

```solidity
mapping(bytes32 => mapping(address => string)) initiatorURI
```

{% hint style="info" %}
initiatorURI[zone][account]
{% endhint %}

## totalSupplySnapshots

```solidity
mapping(uint256 => struct ISnapshot.Uint256Snapshot[]) totalSupplySnapshots
```

{% hint style="info" %}
totalSupplySnapshots[projectId]
{% endhint %}

## projects

```solidity
mapping(uint256 => struct IProject.Project) projects
```

{% hint style="info" %}
projects[projectId]
{% endhint %}

## zoneRoyaltyRates

```solidity
mapping(bytes32 => uint256) zoneRoyaltyRates
```

{% hint style="info" %}
zoneRoyaltyRates[zone]
{% endhint %}

## isLaunchpad

```solidity
mapping(address => bool) isLaunchpad
```

{% hint style="info" %}
isLaunchpad[account]
{% endhint %}

## projectNumber

```solidity
uint256 projectNumber
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

## admin

```solidity
address admin
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

## estateToken

```solidity
address estateToken
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

## feeReceiver

```solidity
address feeReceiver
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

