# Solidity API

## IProjectToken

Interface for contract `ProjectToken`.
The `ProjectToken` contract securitizes real-world estate projects into classes of fungible ERC-1155 tokens, where
each token class represents fractional credits for contributions to a project. Officially disclosed third-party
organizations are registered as initiators in designated zones to actively initiate a project they're developing
through a launchpad, serving as reference for future investment benefit distributions. Finalized estate projects
that satisfy the required conditions may be tokenized into `EstateToken` at the discretion of the initiator.

_Each unit of estate tokens is represented in scaled form as `10 ** decimals()`.
   Implementation involves server-side support._

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

### ZoneRoyaltyRateUpdate

```solidity
event ZoneRoyaltyRateUpdate(bytes32 zone, struct IRate.Rate newValue)
```

Emitted when the royalty rate for a zone is updated.

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| zone | bytes32 | Zone code. |
| newValue | struct IRate.Rate | New royalty rate value. |

### LaunchpadAuthorization

```solidity
event LaunchpadAuthorization(address account)
```

Emitted when a contract address is authorized as a launchpad contract.

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | Authorized contract address. |

### LaunchpadDeauthorization

```solidity
event LaunchpadDeauthorization(address account)
```

Emitted when a contract is deauthorized as a launchpad contract.

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | Deauthorized contract address. |

### InitiatorRegistration

```solidity
event InitiatorRegistration(bytes32 zone, address initiator, string uri)
```

Emitted when an initiator is registered in a zone.

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| zone | bytes32 | Zone code. |
| initiator | address | Initiator address. |
| uri | string | URI of initiator information. |

### NewToken

```solidity
event NewToken(uint256 tokenId, bytes32 zone, uint256 launchId, address launchpad, address initiator)
```

Emitted when a new class of project token is minted.

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | Project identifier. |
| zone | bytes32 | Zone code. |
| launchId | uint256 | Launch identifier from the launchpad contract. |
| launchpad | address | Launchpad contract address. |
| initiator | address | Initiator address. |

### ProjectDeprecation

```solidity
event ProjectDeprecation(uint256 projectId, string note)
```

Emitted when a project is deprecated due to force majeure.

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| projectId | uint256 | Project identifier. |
| note | string | Deprecation note. |

### ProjectTokenization

```solidity
event ProjectTokenization(uint256 projectId, uint256 estateId, uint256 totalSupply, address custodian, address broker)
```

Emitted when a project is tokenized into an estate token.

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| projectId | uint256 | Project identifier. |
| estateId | uint256 | Estate token identifier. |
| totalSupply | uint256 | Total supply. |
| custodian | address | Associated custodian address. |
| broker | address | Associated broker address. |

### InvalidLaunchpad

```solidity
error InvalidLaunchpad(address account)
```

===== ERROR ===== *

### InvalidProjectId

```solidity
error InvalidProjectId()
```

### InvalidTokenizing

```solidity
error InvalidTokenizing()
```

### InvalidURI

```solidity
error InvalidURI()
```

### InvalidWithdrawing

```solidity
error InvalidWithdrawing()
```

### NothingToTokenize

```solidity
error NothingToTokenize()
```

### feeReceiver

```solidity
function feeReceiver() external view returns (address feeReceiver)
```

Name            Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| feeReceiver | address | `FeeReceiver` contract address. |

### projectNumber

```solidity
function projectNumber() external view returns (uint256 projectNumber)
```

Name            Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| projectNumber | uint256 | Number of projects. |

### getProject

```solidity
function getProject(uint256 projectId) external view returns (struct IProject.Project project)
```

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| projectId | uint256 | Project identifier. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| project | struct IProject.Project | Project information. |

### getZoneRoyaltyRate

```solidity
function getZoneRoyaltyRate(bytes32 zone) external view returns (struct IRate.Rate royaltyRate)
```

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| zone | bytes32 | Zone code. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| royaltyRate | struct IRate.Rate | Royalty rate of the zone. |

### isLaunchpad

```solidity
function isLaunchpad(address account) external view returns (bool isLaunchpad)
```

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | EVM address. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| isLaunchpad | bool | Whether the account is an authorized launchpad. |

### initiatorURI

```solidity
function initiatorURI(bytes32 zone, address account) external view returns (string uri)
```

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| zone | bytes32 | Zone code. |
| account | address | Initiator address. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| uri | string | URI of initiator information. |

### isInitiatorIn

```solidity
function isInitiatorIn(bytes32 zone, address account) external view returns (bool isInitiator)
```

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| zone | bytes32 | Zone code. |
| account | address | Address to check. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| isInitiator | bool | Whether the account is a registered initiator in the zone. |

### registerInitiator

```solidity
function registerInitiator(bytes32 zone, address initiator, string uri, struct IValidation.Validation validation) external
```

Register an initiator in a zone.

Name        Description

_Permission: Managers active in the zone._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| zone | bytes32 | Zone code. |
| initiator | address | Initiator address. |
| uri | string | URI of initiator information. |
| validation | struct IValidation.Validation | Validation package from the validator. |

### launchProject

```solidity
function launchProject(bytes32 zone, uint256 launchId, address initiator, string uri) external returns (uint256 projectId)
```

Launch a project associated with a new class of token.

Name        Description

_Permission: Launchpads._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| zone | bytes32 | Zone code. |
| launchId | uint256 | Launch identifier from the launchpad contract. |
| initiator | address | Initiator address for the project. |
| uri | string | URI of project metadata. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| projectId | uint256 | New project identifier. |

### mint

```solidity
function mint(uint256 projectId, uint256 amount) external
```

Mint new tokens for a project.

Name        Description

_Permission: Launchpad of the project._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| projectId | uint256 | Project identifier. |
| amount | uint256 | Minted amount. |

### safeDeprecateProject

```solidity
function safeDeprecateProject(uint256 projectId, string data, bytes32 anchor) external
```

Deprecate a project due to force majeure.

Name        Description

_Permission: Managers active in the zone of the project.
   Anchor enforces consistency between this contract and the client-side._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| projectId | uint256 | Project identifier. |
| data | string | Deprecation note. |
| anchor | bytes32 | Keccak256 hash of `uri` of the estate. |

### safeTokenizeProject

```solidity
function safeTokenizeProject(uint256 projectId, address custodian, address broker, bytes32 anchor) external returns (uint256 estateId)
```

Tokenize an legitimate estate project into a new class of estate token.
Tokenize only if the project has been finalized.

Name        Description

_Permission: Managers active in the zone of the project.
   Anchor enforces consistency between this contract and the client-side._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| projectId | uint256 | Project identifier. |
| custodian | address | Assigned custodian address. |
| broker | address | Associated broker address. |
| anchor | bytes32 | Keccak256 hash of `uri` of the project. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| estateId | uint256 | Estate identifier tokenized from the project. |

### safeUpdateProjectURI

```solidity
function safeUpdateProjectURI(uint256 projectId, string uri, struct IValidation.Validation validation, bytes32 anchor) external
```

Update the URI of metadata of a project.

Name        Description

_Permission: Managers active in the zone of the project.
   Anchor enforces consistency between this contract and the client-side.
   Validation data:
```
data = abi.encode(
projectId,
uri
);
```_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| projectId | uint256 | Project identifier. |
| uri | string | New URI of project metadata. |
| validation | struct IValidation.Validation | Validation package from the validator. |
| anchor | bytes32 | Keccak256 hash of `uri` of the project. |

