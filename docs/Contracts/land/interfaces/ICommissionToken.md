# Solidity API

## ICommissionToken

Interface for contract `CommissionToken`.
The `CommissionToken` contract is codependent with the `EstateToken` contract. For each newly tokenized estate,
it will issue a unique corresponding token that represents the commission fraction shareable to its owner from
incomes of designated operators involving the estate.

### BaseURIUpdate

```solidity
event BaseURIUpdate(string newValue)
```

Emitted when the base URI is updated.

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newValue | string | New base URI. |

### RoyaltyRateUpdate

```solidity
event RoyaltyRateUpdate(struct IRate.Rate newRate)
```

Emitted when the default royalty rate is updated.

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newRate | struct IRate.Rate | New default royalty rate. |

### BrokerRegistration

```solidity
event BrokerRegistration(bytes32 zone, address broker, struct IRate.Rate commissionRate)
```

Emitted when a broker is registered in a zone.

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| zone | bytes32 | Zone code. |
| broker | address | Broker address. |
| commissionRate | struct IRate.Rate | Commission rate. |

### BrokerActivation

```solidity
event BrokerActivation(bytes32 zone, address broker)
```

Emitted when a broker is activated in a zone.

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| zone | bytes32 | Zone code. |
| broker | address | Broker address. |

### BrokerDeactivation

```solidity
event BrokerDeactivation(bytes32 zone, address broker)
```

Emitted when a broker is deactivated in a zone.

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| zone | bytes32 | Zone code. |
| broker | address | Broker address. |

### NewToken

```solidity
event NewToken(uint256 tokenId, bytes32 zone, address broker, struct IRate.Rate rate)
```

Emitted when a new commission token is minted.

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | Token identifier. |
| zone | bytes32 | Zone code. |
| broker | address | Original broker address. |
| rate | struct IRate.Rate | Commission rate. |

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

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| estateToken | address | `EstateToken` contract address. |

### feeReceiver

```solidity
function feeReceiver() external view returns (address feeReceiver)
```

Name            Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| feeReceiver | address | `FeeReceiver` contract address. |

### totalSupply

```solidity
function totalSupply() external view returns (uint256 totalSupply)
```

Name            Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| totalSupply | uint256 | Total supply of the token. |

### getCommissionRate

```solidity
function getCommissionRate(uint256 tokenId) external view returns (struct IRate.Rate rate)
```

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | Token identifier. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| rate | struct IRate.Rate | Commission rate of the token identifier. |

### getBrokerCommissionRate

```solidity
function getBrokerCommissionRate(bytes32 zone, address broker) external view returns (struct IRate.Rate rate)
```

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| zone | bytes32 | Zone code. |
| broker | address | Broker address. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| rate | struct IRate.Rate | Commission rate of the broker in the zone. |

### isActiveIn

```solidity
function isActiveIn(bytes32 zone, address broker) external view returns (bool isBroker)
```

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| zone | bytes32 | Zone code. |
| broker | address | Broker address. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| isBroker | bool | Whether the broker is eligible in the zone. |

### commissionInfo

```solidity
function commissionInfo(uint256 tokenId, uint256 value) external view returns (address receiver, uint256 commission)
```

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | Token identifier. |
| value | uint256 | Value. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| receiver | address | Commission receiver address. |
| commission | uint256 | Commission derived from the value. |

### registerBroker

```solidity
function registerBroker(bytes32 zone, address broker, uint256 commissionRate) external
```

Register a broker in a zone.

Name            Description

_Permission: Managers in the zone._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| zone | bytes32 | Zone code. |
| broker | address | Broker address. |
| commissionRate | uint256 | Commission rate. |

### activateBroker

```solidity
function activateBroker(bytes32 zone, address broker, bool isActive) external
```

Activate or deactivate a broker in a zone.

Name            Description

_Permission: Managers in the zone._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| zone | bytes32 | Zone code. |
| broker | address | Broker address. |
| isActive | bool | Whether the operation is activating or deactivating. |

### mint

```solidity
function mint(bytes32 zone, address broker, uint256 tokenId) external
```

Mint a commission token.

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| zone | bytes32 | Zone code. |
| broker | address | Broker address. |
| tokenId | uint256 | Minted token identifier. |

