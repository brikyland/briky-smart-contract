# Solidity API

## EstateTokenStorage

Storage contract for contract `EstateToken`.

### balanceSnapshots

```solidity
mapping(uint256 => mapping(address => struct ISnapshot.Uint256Snapshot[])) balanceSnapshots
```

_balanceSnapshots[estateId][account]_

### custodianURIs

```solidity
mapping(bytes32 => mapping(address => string)) custodianURIs
```

_custodianURI[zone][account]_

### estates

```solidity
mapping(uint256 => struct IEstate.Estate) estates
```

_estates[estateId]_

### zoneRoyaltyRates

```solidity
mapping(bytes32 => uint256) zoneRoyaltyRates
```

_zoneRoyaltyRates[zone]_

### isExtractor

```solidity
mapping(address => bool) isExtractor
```

_isExtractor[account]_

### isTokenizer

```solidity
mapping(address => bool) isTokenizer
```

_isTokenizer[account]_

### estateNumber

```solidity
uint256 estateNumber
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

### commissionToken

```solidity
address commissionToken
```

Name                Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

### feeReceiver

```solidity
address feeReceiver
```

Name                Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

