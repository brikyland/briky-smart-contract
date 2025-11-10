# EstateToken

The `EstateToken` contract securitizes real-world estates into classes of fungible ERC-1155 tokens, where each
token class represents fractional ownership of a specific tokenized estate. Official disclosed third party
agents are registered as custodians in designated zones to actively provide estates to tokenize and escrows those
assets on behalf of holders after successful tokenization.

{% hint style="info" %}
Each unit of estate tokens is represented in scaled form as `10 ** decimals()`.

{% endhint %}

{% hint style="info" %}
Implementation involves server-side support.
{% endhint %}

## validEstate

```solidity
modifier validEstate(uint256 _estateId)
```

Verify a valid estate identifier.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _estateId | uint256 | Estate identifier. |

## onlyActiveInZoneOf

```solidity
modifier onlyActiveInZoneOf(uint256 _estateId)
```

Verify the message sender is active in the zone of the estate.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _estateId | uint256 | Estate identifier. |

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
function initialize(address _admin, address _feeReceiver, address _validator, string _uri) external
```

Initialize the contract after deployment, serving as the constructor.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _admin | address | `Admin` contract address. |
| _feeReceiver | address | `FeeReceiver` contract address. |
| _validator | address | Validator address. |
| _uri | string | Base URI. |

## updateCommissionToken

```solidity
function updateCommissionToken(address _commissionToken, bytes[] _signatures) external
```

Update the commission token contract.

{% hint style="info" %}
Administrative operator.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _commissionToken | address | `CommissionToken` contract address. |
| _signatures | bytes[] | Array of admin signatures. |

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

## authorizeTokenizers

```solidity
function authorizeTokenizers(address[] _accounts, bool _isTokenizer, bytes[] _signatures) external
```

Authorize or deauthorize contract addresses as tokenizers.

{% hint style="info" %}
Administrative operator.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _accounts | address[] | Array of contract addresses. |
| _isTokenizer | bool | This whether the operation is authorizing or deauthorizing. |
| _signatures | bytes[] | Array of admin signatures. |

## authorizeExtractors

```solidity
function authorizeExtractors(address[] _accounts, bool _isExtractor, bytes[] _signatures) external
```

Authorize or deauthorize contract addresses as extractors.

{% hint style="info" %}
Administrative operator.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _accounts | address[] | Array of contract addresses. |
| _isExtractor | bool | This whether the operation is authorizing or deauthorizing. |
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
| _royaltyRate | uint256 | New royalty rate for the zone. |
| _signatures | bytes[] | Array of admin signatures. |

## decimals

```solidity
function decimals() external pure returns (uint8)
```

### Return Values

Token decimals.

## getZoneRoyaltyRate

```solidity
function getZoneRoyaltyRate(bytes32 _zone) external view returns (struct IRate.Rate)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _zone | bytes32 | Zone code. |

### Return Values

Royalty rate of the zone.

## isCustodianIn

```solidity
function isCustodianIn(bytes32 _zone, address _account) public view returns (bool)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _zone | bytes32 | Zone code. |
| _account | address | EVM address. |

### Return Values

Whether the account is a registered custodian in the zone.

## balanceOfAt

```solidity
function balanceOfAt(address _account, uint256 _tokenId, uint256 _at) public view returns (uint256)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _account | address | EVM address. |
| _tokenId | uint256 | Estate identifier. |
| _at | uint256 | Reference timestamp. |

### Return Values

Balance of the account in the estate at the reference timestamp.

## totalSupply

```solidity
function totalSupply(uint256 _tokenId) public view returns (uint256)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenId | uint256 | Estate identifier. |

### Return Values

Total supply of the token class.

## getEstate

```solidity
function getEstate(uint256 _estateId) external view returns (struct IEstate.Estate)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _estateId | uint256 | Estate identifier. |

### Return Values

Estate information.

## getRepresentative

```solidity
function getRepresentative(uint256 _estateId) external view returns (address)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _estateId | uint256 | Estate identifier. |

### Return Values

Representative address of the estate.

## isAvailable

```solidity
function isAvailable(uint256 _estateId) public view returns (bool)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _estateId | uint256 | Estate identifier. |

### Return Values

Whether the estate is available.

## zoneOf

```solidity
function zoneOf(uint256 _estateId) external view returns (bytes32)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _estateId | uint256 | Estate identifier. |

### Return Values

Zone code of the estate.

## equityOfAt

```solidity
function equityOfAt(address _account, uint256 _estateId, uint256 _at) external view returns (uint256)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _account | address | EVM address. |
| _estateId | uint256 | Estate identifier. |
| _at | uint256 | Reference timestamp. |

### Return Values

Equity of the account in the estate at the reference timestamp.

## uri

```solidity
function uri(uint256 _estateId) public view returns (string)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _estateId | uint256 | Estate identifier. |

### Return Values

URI of estate metadata.

## totalEquityAt

```solidity
function totalEquityAt(uint256 _estateId, uint256 _at) external view returns (uint256)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _estateId | uint256 | Estate identifier. |
| _at | uint256 | Reference timestamp. |

### Return Values

Total equity in the estate at the reference timestamp.

## getRoyaltyRate

```solidity
function getRoyaltyRate(uint256 _tokenId) external view returns (struct IRate.Rate)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenId | uint256 | Estate identifier. |

### Return Values

Royalty rate of the token identifier.

## supportsInterface

```solidity
function supportsInterface(bytes4 _interfaceId) public view returns (bool)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _interfaceId | bytes4 | Interface identifier. |

### Return Values

Whether the interface is supported.

## registerCustodian

```solidity
function registerCustodian(bytes32 _zone, address _custodian, string _uri, struct IValidation.Validation _validation) external
```

Register a custodian in a zone.

{% hint style="info" %}
Permissions: Managers active in the zone.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _zone | bytes32 | Zone code. |
| _custodian | address | Custodian address. |
| _uri | string | URI of custodian information. |
| _validation | struct IValidation.Validation | Validation package from the validator. |

## tokenizeEstate

```solidity
function tokenizeEstate(uint256 _totalSupply, bytes32 _zone, uint256 _tokenizationId, string _uri, uint40 _expireAt, address _custodian, address _broker) external returns (uint256)
```

Tokenize an estate into a new class of token.

{% hint style="info" %}
Permissions: Tokenizers.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _totalSupply | uint256 | Number of tokens to mint. |
| _zone | bytes32 | Zone code. |
| _tokenizationId | uint256 | Tokenization identifier from the tokenizer contract. |
| _uri | string | URI of estate information. |
| _expireAt | uint40 | Estate expiration timestamp. |
| _custodian | address | Assigned custodian address. |
| _broker | address | Associated broker address. |

### Return Values

New estate identifier.

## extractEstate

```solidity
function extractEstate(uint256 _estateId, uint256 _extractionId) external
```

Extract an estate.

{% hint style="info" %}
Permissions: Extractors.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _estateId | uint256 | Estate identifier. |
| _extractionId | uint256 | Extraction identifier. |

## safeDeprecateEstate

```solidity
function safeDeprecateEstate(uint256 _estateId, string _note, bytes32 _anchor) external
```

Deprecate an estate by managers due to force majeure or extraction.

{% hint style="info" %}
Permissions: Managers active in the zone of the estate.

{% endhint %}

{% hint style="info" %}
Anchor enforces consistency between this contract and the client-side.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _estateId | uint256 | Estate identifier. |
| _note | string | Deprecation note. |
| _anchor | bytes32 | Keccak256 hash of `uri` of the estate. |

## safeExtendEstateExpiration

```solidity
function safeExtendEstateExpiration(uint256 _estateId, uint40 _expireAt, bytes32 _anchor) external
```

Extend the expiration of an estate.

{% hint style="info" %}
Permissions: Managers active in the zone of the estate.

{% endhint %}

{% hint style="info" %}
Anchor enforces consistency between this contract and the client-side.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _estateId | uint256 | Estate identifier. |
| _expireAt | uint40 | New expiration timestamp. |
| _anchor | bytes32 | Keccak256 hash of `uri` of the estate. |

## safeUpdateEstateCustodian

```solidity
function safeUpdateEstateCustodian(uint256 _estateId, address _custodian, bytes32 _anchor) external
```

Update the custodian of an estate.

{% hint style="info" %}
Permissions: Managers active in the zone of the estate.

{% endhint %}

{% hint style="info" %}
Anchor enforces consistency between this contract and the client-side.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _estateId | uint256 | Estate identifier. |
| _custodian | address | New custodian address. |
| _anchor | bytes32 | Keccak256 hash of `uri` of the estate. |

## safeUpdateEstateURI

```solidity
function safeUpdateEstateURI(uint256 _estateId, string _uri, struct IValidation.Validation _validation, bytes32 _anchor) external
```

Update the URI of metadata of an estate.

{% hint style="info" %}
Permissions: Managers active in the zone of the estate.

{% endhint %}

{% hint style="info" %}
Anchor enforces consistency between this contract and the client-side.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _estateId | uint256 | Estate identifier. |
| _uri | string | New URI of estate metadata. |
| _validation | struct IValidation.Validation | Validation package from the validator. |
| _anchor | bytes32 | Keccak256 hash of `uri` of the estate. |

## _royaltyReceiver

```solidity
function _royaltyReceiver() internal view returns (address)
```

### Return Values

Default royalty receiver address.

## _beforeTokenTransfer

```solidity
function _beforeTokenTransfer(address _operator, address _from, address _to, uint256[] _estateIds, uint256[] _amounts, bytes _data) internal
```

Hook to be called before any token transfer.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _operator | address | Operator address. |
| _from | address | Sender address. |
| _to | address | Receiver address. |
| _estateIds | uint256[] | Array of estate identifiers. |
| _amounts | uint256[] | Array of transferred amounts, respective to each estate identifier. |
| _data | bytes | Additional data. |

## _afterTokenTransfer

```solidity
function _afterTokenTransfer(address _operator, address _from, address _to, uint256[] _estateIds, uint256[] _amounts, bytes _data) internal
```

Hook to be called after any token transfer.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _operator | address | Operator address. |
| _from | address | Sender address. |
| _to | address | Receiver address. |
| _estateIds | uint256[] | Array of estate identifiers. |
| _amounts | uint256[] | Array of transferred amounts, respective to each estate identifier. |
| _data | bytes | Additional data. |

