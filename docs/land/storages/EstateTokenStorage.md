# Solidity API

## EstateTokenStorage

@author Briky Team

 @notice Storage contract for contract `EstateToken`.

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
 @return estateNumber    Number of estates.

### admin

```solidity
address admin
```

Name        Description
 @return admin       `Admin` contract address.

### commissionToken

```solidity
address commissionToken
```

Name                Description
 @return commissionToken     `CommissionToken` contract address.

### feeReceiver

```solidity
address feeReceiver
```

Name                Description
 @return feeReceiver         `FeeReceiver` contract address.

