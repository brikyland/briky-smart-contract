# Solidity API

## ICommissionToken

@author Briky Team

 @notice Interface for contract `CommissionToken`.
 @notice The `CommissionToken` contract is codependent with the `EstateToken` contract. For each newly tokenized estate,
         it will issue a unique corresponding token that represents the commission fraction shareable to its owner from
         incomes of designated operators involving the estate.

### BaseURIUpdate

```solidity
event BaseURIUpdate(string newValue)
```

@notice Emitted when the base URI is updated.

         Name        Description
 @param  newValue    New base URI.

### RoyaltyRateUpdate

```solidity
event RoyaltyRateUpdate(struct IRate.Rate newRate)
```

@notice Emitted when the default royalty rate is updated.

         Name        Description
 @param  newRate     New default royalty rate.

### BrokerRegistration

```solidity
event BrokerRegistration(bytes32 zone, address broker, struct IRate.Rate commissionRate)
```

@notice Emitted when a broker is registered in a zone.

         Name            Description
 @param  zone            Zone code.
 @param  broker          Broker address.
 @param  commissionRate  Commission rate.

### BrokerActivation

```solidity
event BrokerActivation(bytes32 zone, address broker)
```

@notice Emitted when a broker is activated in a zone.

         Name            Description
 @param  zone            Zone code.
 @param  broker          Broker address.

### BrokerDeactivation

```solidity
event BrokerDeactivation(bytes32 zone, address broker)
```

@notice Emitted when a broker is deactivated in a zone.

         Name            Description
 @param  zone            Zone code.
 @param  broker          Broker address.

### NewToken

```solidity
event NewToken(uint256 tokenId, bytes32 zone, address broker, struct IRate.Rate rate)
```

@notice Emitted when a new commission token is minted.

         Name            Description
 @param  tokenId         Token identifier.
 @param  zone            Zone code.
 @param  broker          Original broker address.
 @param  rate            Commission rate.

### AlreadyMinted

```solidity
error AlreadyMinted()
```

===== ERROR ===== *

### AlreadyRegistered

```solidity
error AlreadyRegistered()
```

### InvalidBroker

```solidity
error InvalidBroker()
```

### NotActive

```solidity
error NotActive()
```

### estateToken

```solidity
function estateToken() external view returns (address estateToken)
```

Name            Description
 @return estateToken     `EstateToken` contract address.

### feeReceiver

```solidity
function feeReceiver() external view returns (address feeReceiver)
```

Name            Description
 @return feeReceiver     `FeeReceiver` contract address.

### totalSupply

```solidity
function totalSupply() external view returns (uint256 totalSupply)
```

Name            Description
 @return totalSupply     Total supply of the token.

### getCommissionRate

```solidity
function getCommissionRate(uint256 tokenId) external view returns (struct IRate.Rate rate)
```

Name            Description
 @param  tokenId         Token identifier.
 @return rate            Commission rate of the token identifier.

### getBrokerCommissionRate

```solidity
function getBrokerCommissionRate(bytes32 zone, address broker) external view returns (struct IRate.Rate rate)
```

Name            Description
 @param  zone            Zone code.
 @param  broker          Broker address.
 @return rate            Commission rate of the broker in the zone.

### isActiveIn

```solidity
function isActiveIn(bytes32 zone, address broker) external view returns (bool isBroker)
```

Name            Description
 @param  zone            Zone code.
 @param  broker          Broker address.
 @return isBroker        Whether the broker is eligible in the zone.

### commissionInfo

```solidity
function commissionInfo(uint256 tokenId, uint256 value) external view returns (address receiver, uint256 commission)
```

Name            Description
 @param  tokenId         Token identifier.
 @param  value           Value.
 @return receiver        Commission receiver address.
 @return commission      Commission derived from the value.

### registerBroker

```solidity
function registerBroker(bytes32 zone, address broker, uint256 commissionRate) external
```

@notice Register a broker in a zone.

         Name            Description
 @param  zone            Zone code.
 @param  broker          Broker address.
 @param  commissionRate  Commission rate.

 @dev    Permission: Managers in the zone.

### activateBroker

```solidity
function activateBroker(bytes32 zone, address broker, bool isActive) external
```

@notice Activate or deactivate a broker in a zone.

         Name            Description
 @param  zone            Zone code.
 @param  broker          Broker address.
 @param  isActive        Whether the operation is activating or deactivating.

 @dev    Permission: Managers in the zone.

### mint

```solidity
function mint(bytes32 zone, address broker, uint256 tokenId) external
```

@notice Mint a commission token.

         Name            Description
 @param  zone            Zone code.
 @param  broker          Broker address.
 @param  tokenId         Minted token identifier.

