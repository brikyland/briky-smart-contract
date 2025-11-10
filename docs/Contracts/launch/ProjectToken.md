# ProjectToken

The `ProjectToken` contract securitizes real-world estate projects into classes of fungible ERC-1155 tokens, where
each token class represents fractional credits for contributions to a project. Officially disclosed third-party
organizations are registered as initiators in designated zones to actively initiate a project they're developing
through a launchpad, serving as reference for future investment benefit distributions. Finalized estate projects
that satisfy the required conditions may be tokenized into `EstateToken` at the discretion of the initiator.

{% hint style="info" %}
Each unit of estate tokens is represented in scaled form as `10 ** decimals()`.

{% endhint %}

{% hint style="info" %}
Implementation involves server-side support.
{% endhint %}

## validProject

```solidity
modifier validProject(uint256 _projectId)
```

Verify a valid project identifier.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _projectId | uint256 | Project identifier. |

## onlyLaunchpad

```solidity
modifier onlyLaunchpad(uint256 _projectId)
```

Verify the message sender is the launchpad of a project.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _projectId | uint256 | Project identifier. |

## onlyActiveInZoneOf

```solidity
modifier onlyActiveInZoneOf(uint256 _projectId)
```

Verify the message sender is active in the zone of a project.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _projectId | uint256 | Project identifier. |

## receive

```solidity
receive() external payable
```

Executed on a call to this contract with empty calldata.

## version

```solidity
function version() external pure returns (string)
```

### Return Values

Version of implementation.

## initialize

```solidity
function initialize(address _admin, address _estateToken, address _feeReceiver, address _validator, string _uri) external
```

Initialize the contract after deployment, serving as the constructor.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _admin | address | `Admin` contract address. |
| _estateToken | address | `EstateToken` contract address. |
| _feeReceiver | address | `FeeReceiver` contract address. |
| _validator | address | Validator address. |
| _uri | string | Base URI for project metadata. |

## updateBaseURI

```solidity
function updateBaseURI(string _uri, bytes[] _signatures) external
```

Update the base URI.

{% hint style="info" %}
Administrative operator.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _uri | string | New base URI. |
| _signatures | bytes[] | Array of admin signatures. |

## updateZoneRoyaltyRate

```solidity
function updateZoneRoyaltyRate(bytes32 _zone, uint256 _royaltyRate, bytes[] _signatures) external
```

Update the royalty rate of a zone.

{% hint style="info" %}
Administrative operator.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _zone | bytes32 | Zone code. |
| _royaltyRate | uint256 | New default royalty rate. |
| _signatures | bytes[] | Array of admin signatures. |

## authorizeLaunchpads

```solidity
function authorizeLaunchpads(address[] _accounts, bool _isLaunchpad, bytes[] _signatures) external
```

Authorize or deauthorize contract addresses as launchpads.

{% hint style="info" %}
Administrative operator.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _accounts | address[] | Array of contract addresses. |
| _isLaunchpad | bool | Whether the operation is authorizing or deauthorizing. |
| _signatures | bytes[] | Array of admin signatures. |

## decimals

```solidity
function decimals() external pure returns (uint8)
```

### Return Values

decimals        Token decimals.

## projectToken

```solidity
function projectToken() external view returns (address)
```

### Return Values

projectToken    Address of this contract.

## getZoneRoyaltyRate

```solidity
function getZoneRoyaltyRate(bytes32 zone) external view returns (struct IRate.Rate)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| zone | bytes32 | Zone code. |

### Return Values

royaltyRate     Royalty rate of the zone.

## isInitiatorIn

```solidity
function isInitiatorIn(bytes32 zone, address account) public view returns (bool)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| zone | bytes32 | Zone code. |
| account | address | EVM address. |

### Return Values

isInitiator     Whether the account is a registered initiator in the zone.

## getProject

```solidity
function getProject(uint256 _projectId) external view returns (struct IProject.Project)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _projectId | uint256 | Project identifier. |

### Return Values

project         Project information.

## getRepresentative

```solidity
function getRepresentative(uint256 _projectId) external view returns (address)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _projectId | uint256 | Project identifier. |

### Return Values

representative  Representative address of the project.

## isAvailable

```solidity
function isAvailable(uint256 _projectId) public view returns (bool)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _projectId | uint256 | Project identifier. |

### Return Values

isAvailable     Whether the project is available.

## zoneOf

```solidity
function zoneOf(uint256 _projectId) public view returns (bytes32)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _projectId | uint256 | Project identifier. |

### Return Values

zone            Zone code of the project.

## balanceOf

```solidity
function balanceOf(address _account, uint256 _projectId) public view returns (uint256)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _account | address | Account address. |
| _projectId | uint256 | Project identifier. |

### Return Values

balance         Token balance of the account.

## balanceOfAt

```solidity
function balanceOfAt(address _account, uint256 _projectId, uint256 _at) public view returns (uint256)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _account | address | Account address. |
| _projectId | uint256 | Project identifier. |
| _at | uint256 | Reference timestamp. |

### Return Values

balance         Balance of the account in the project at the reference timestamp.

## allocationOfAt

```solidity
function allocationOfAt(address _account, uint256 _tokenizationId, uint256 _at) external view returns (uint256)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _account | address | Account address. |
| _tokenizationId | uint256 | Tokenization identifier. |
| _at | uint256 | Reference timestamp. |

### Return Values

Allocation of the account at the reference timestamp.

## equityOfAt

```solidity
function equityOfAt(address _account, uint256 _projectId, uint256 _at) external view returns (uint256)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _account | address | Account address. |
| _projectId | uint256 | Project identifier. |
| _at | uint256 | Reference timestamp. |

### Return Values

Equity of the account in the project at the reference timestamp.

## uri

```solidity
function uri(uint256 _projectId) public view returns (string)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _projectId | uint256 | Project identifier. |

### Return Values

URI of project metadata.

## totalSupply

```solidity
function totalSupply(uint256 _projectId) public view returns (uint256)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _projectId | uint256 | Project identifier. |

### Return Values

Total supply of the token class.

## totalEquityAt

```solidity
function totalEquityAt(uint256 _projectId, uint256 _at) external view returns (uint256)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _projectId | uint256 | Project identifier. |
| _at | uint256 | Reference timestamp. |

### Return Values

Total equity in the project at the reference timestamp.

## getRoyaltyRate

```solidity
function getRoyaltyRate(uint256 _tokenId) external view returns (struct IRate.Rate)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenId | uint256 | Token identifier. |

### Return Values

Royalty rate of the token identifier.

## isTokenized

```solidity
function isTokenized(uint256 _projectId) public view returns (bool)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _projectId | uint256 | Project identifier. |

### Return Values

Whether the project tokens is converted to estate tokens.

## supportsInterface

```solidity
function supportsInterface(bytes4 _interfaceId) public view virtual returns (bool)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _interfaceId | bytes4 | Interface identifier. |

### Return Values

Whether this contract supports the interface.

## onERC1155Received

```solidity
function onERC1155Received(address _operator, address _from, uint256 _id, uint256 _value, bytes _data) public virtual returns (bytes4)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _operator | address | Operator address. |
| _from | address | Sender address. |
| _id | uint256 | Token identifier. |
| _value | uint256 | Token amount. |
| _data | bytes | Additional data. |

### Return Values

Selector of the `onERC1155Received` function if the message sender is either the estate token contract or the
project token contract.

## onERC1155BatchReceived

```solidity
function onERC1155BatchReceived(address _operator, address _from, uint256[] _ids, uint256[] _values, bytes _data) public virtual returns (bytes4)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _operator | address | Operator address. |
| _from | address | Sender address. |
| _ids | uint256[] | List of token identifiers. |
| _values | uint256[] | List of token amounts, respective to each token identifier. |
| _data | bytes | Additional data. |

### Return Values

Selector of the `onERC1155Received` function if the message sender is either the estate token contract or the
project token contract.

## registerInitiator

```solidity
function registerInitiator(bytes32 _zone, address _initiator, string _uri, struct IValidation.Validation _validation) external
```

Register an initiator in a zone.

{% hint style="info" %}
Permission: Managers active in the zone.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _zone | bytes32 | Zone code. |
| _initiator | address | Initiator address. |
| _uri | string | URI of initiator information. |
| _validation | struct IValidation.Validation | Validation package from the validator. |

## launchProject

```solidity
function launchProject(bytes32 _zone, uint256 _launchId, address _initiator, string _uri) external returns (uint256)
```

Launch a project associated with a new class of token.

{% hint style="info" %}
Permission: Launchpads.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _zone | bytes32 | Zone code. |
| _launchId | uint256 | Launch identifier from the launchpad contract. |
| _initiator | address | Initiator address. |
| _uri | string | URI of project metadata. |

### Return Values

New project identifier.

## mint

```solidity
function mint(uint256 _projectId, uint256 _amount) external
```

Mint new tokens for a project to the launchpad contract.

{% hint style="info" %}
Permission: Launchpad of the project.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _projectId | uint256 | Project identifier. |
| _amount | uint256 | Minted amount. |

## withdrawEstateToken

```solidity
function withdrawEstateToken(uint256 _projectId) external returns (uint256)
```

Withdraw the allocation of the message sender from a tokenization.

Withdraw only if the project has been tokenized.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _projectId | uint256 | Project identifier. |

### Return Values

amount          Amount of estate tokens withdrawn.

## safeDeprecateProject

```solidity
function safeDeprecateProject(uint256 _projectId, string _data, bytes32 _anchor) external
```

Deprecate a project due to force majeure.

{% hint style="info" %}
Permission: Managers active in the zone of the project.

{% endhint %}

{% hint style="info" %}
Anchor enforces consistency between this contract and the client-side.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _projectId | uint256 | Project identifier. |
| _data | string | Deprecation note. |
| _anchor | bytes32 | Keccak256 hash of `uri` of the estate. |

## safeUpdateProjectURI

```solidity
function safeUpdateProjectURI(uint256 _projectId, string _uri, struct IValidation.Validation _validation, bytes32 _anchor) external
```

Update the URI of metadata of a project.

{% hint style="info" %}
Permission: Managers active in the zone of the project.

{% endhint %}

{% hint style="info" %}
Anchor enforces consistency between this contract and the client-side.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _projectId | uint256 | Project identifier. |
| _uri | string | New URI of project metadata. |
| _validation | struct IValidation.Validation | Validation package from the validator. |
| _anchor | bytes32 | Keccak256 hash of `uri` of the project. |

## safeTokenizeProject

```solidity
function safeTokenizeProject(uint256 _projectId, address _custodian, address _broker, bytes32 _anchor) external returns (uint256)
```

Tokenize an legitimate estate project into a new class of estate token.

Tokenize only if the project has been finalized.

{% hint style="info" %}
Permission: Managers active in the zone of the project.

{% endhint %}

{% hint style="info" %}
Anchor enforces consistency between this contract and the client-side.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _projectId | uint256 | Project identifier. |
| _custodian | address | Assigned custodian address. |
| _broker | address | Associated broker address. |
| _anchor | bytes32 | Keccak256 hash of `uri` of the project. |

### Return Values

Estate identifier tokenized from the project.

## _beforeTokenTransfer

```solidity
function _beforeTokenTransfer(address _operator, address _from, address _to, uint256[] _projectIds, uint256[] _amounts, bytes _data) internal
```

Hook to be called before any token transfer.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _operator | address | Operator address. |
| _from | address | Sender address. |
| _to | address | Receiver address. |
| _projectIds | uint256[] | Array of project identifiers. |
| _amounts | uint256[] | Array of transferred amounts, respective to each estate identifier. |
| _data | bytes | Additional data. |

## _afterTokenTransfer

```solidity
function _afterTokenTransfer(address _operator, address _from, address _to, uint256[] _projectIds, uint256[] _amounts, bytes _data) internal
```

Hook to be called after any token transfer.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _operator | address | Operator address. |
| _from | address | Sender address. |
| _to | address | Receiver address. |
| _projectIds | uint256[] | Array of project identifiers. |
| _amounts | uint256[] | Array of transferred amounts, respective to each estate identifier. |
| _data | bytes | Additional data. |

## _royaltyReceiver

```solidity
function _royaltyReceiver() internal view returns (address)
```

### Return Values

Default royalty receiver address.

