# IEstateToken

Interface for contract `EstateToken`.

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

## BaseURIUpdate

```solidity
event BaseURIUpdate(string newValue)
```

Emitted when the base URI is updated.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newValue | string | New base URI. |

## ZoneRoyaltyRateUpdate

```solidity
event ZoneRoyaltyRateUpdate(bytes32 zone, struct IRate.Rate newRate)
```

Emitted when the royalty rate of a zone is updated.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| zone | bytes32 | Zone code. |
| newRate | struct IRate.Rate | New royalty rate of the zone. |

## TokenizerAuthorization

```solidity
event TokenizerAuthorization(address account)
```

Emitted when a contract is authorized as a tokenizer contract.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | Authorized contract address. |

## TokenizerDeauthorization

```solidity
event TokenizerDeauthorization(address account)
```

Emitted when a contract is deauthorized as a tokenizer contract.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | Deauthorized contract address. |

## ExtractorAuthorization

```solidity
event ExtractorAuthorization(address account)
```

Emitted when a contract is authorized as an extractor contract.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | Authorized contract address. |

## ExtractorDeauthorization

```solidity
event ExtractorDeauthorization(address account)
```

Emitted when a contract is deauthorized as an extractor contract.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | Deauthorized contract address. |

## CustodianRegistration

```solidity
event CustodianRegistration(bytes32 zone, address custodian, string uri)
```

Emitted when a custodian is registered in a zone.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| zone | bytes32 | Zone code. |
| custodian | address | Custodian address. |
| uri | string | URI of custodian information. |

## NewToken

```solidity
event NewToken(uint256 tokenId, bytes32 zone, uint256 tokenizationId, address tokenizer, address custodian, uint40 expireAt)
```

Emitted when a new class of estate token is minted.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | Estate identifier. |
| zone | bytes32 | Zone code. |
| tokenizationId | uint256 | Tokenization request identifier from the tokenizer contract. |
| tokenizer | address | Tokenizer contract address. |
| custodian | address | Custodian address. |
| expireAt | uint40 | Estate expiration timestamp. |

## EstateCustodianUpdate

```solidity
event EstateCustodianUpdate(uint256 estateId, address custodian)
```

Emitted when the custodian of an estate is updated.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| estateId | uint256 | Estate identifier. |
| custodian | address | New custodian address. |

## EstateDeprecation

```solidity
event EstateDeprecation(uint256 estateId, string note)
```

Emitted when an estate is deprecated due to force majeure or extraction.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| estateId | uint256 | Estate identifier. |
| note | string | Deprecation note. |

## EstateExpirationExtension

```solidity
event EstateExpirationExtension(uint256 estateId, uint40 expireAt)
```

Emitted when expiration of an estate is extended.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| estateId | uint256 | Estate identifier. |
| expireAt | uint40 | New expiration timestamp. |

## EstateExtraction

```solidity
event EstateExtraction(uint256 estateId, uint256 extractionId)
```

Emitted when an estate is extracted.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| estateId | uint256 | Estate identifier. |
| extractionId | uint256 | Extraction identifier. |

## InvalidCustodian

```solidity
error InvalidCustodian()
```

===== ERROR ===== *

## InvalidEstateId

```solidity
error InvalidEstateId()
```

## InvalidURI

```solidity
error InvalidURI()
```

## InvalidTokenizer

```solidity
error InvalidTokenizer()
```

## commissionToken

```solidity
function commissionToken() external view returns (address commissionToken)
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| commissionToken | address | `CommissionToken` contract address. |

## feeReceiver

```solidity
function feeReceiver() external view returns (address feeReceiver)
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| feeReceiver | address | `FeeReceiver` contract address. |

## estateNumber

```solidity
function estateNumber() external view returns (uint256 estateNumber)
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| estateNumber | uint256 | Number of estates. |

## getEstate

```solidity
function getEstate(uint256 estateId) external view returns (struct IEstate.Estate estate)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| estateId | uint256 | Estate identifier. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| estate | struct IEstate.Estate | Estate information. |

## getZoneRoyaltyRate

```solidity
function getZoneRoyaltyRate(bytes32 zone) external view returns (struct IRate.Rate royaltyRate)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| zone | bytes32 | Zone code. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| royaltyRate | struct IRate.Rate | Royalty rate of the zone. |

## isExtractor

```solidity
function isExtractor(address account) external view returns (bool isExtractor)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | EVM address. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| isExtractor | bool | Whether the account is an authorized extractor contract. |

## isTokenizer

```solidity
function isTokenizer(address account) external view returns (bool isTokenizer)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | EVM address. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| isTokenizer | bool | Whether the account is an authorized tokenizer contract. |

## custodianURIs

```solidity
function custodianURIs(bytes32 zone, address account) external view returns (string uri)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| zone | bytes32 | Zone code. |
| account | address | EVM address. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| uri | string | URI of custodian information. |

## isCustodianIn

```solidity
function isCustodianIn(bytes32 zone, address account) external view returns (bool isCustodian)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| zone | bytes32 | Zone code. |
| account | address | EVM address. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| isCustodian | bool | Whether the account is a registered custodian in the zone. |

## registerCustodian

```solidity
function registerCustodian(bytes32 zone, address custodian, string uri, struct IValidation.Validation validation) external
```

Register a custodian in a zone.

{% hint style="info" %}
Permission: Managers active in the zone.

{% endhint %}

{% hint style="info" %}
Validation data:
```
data = abi.encode(
    zone,
    custodian,
    uri
);
```
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| zone | bytes32 | Zone code. |
| custodian | address | Custodian address. |
| uri | string | URI of custodian information. |
| validation | struct IValidation.Validation | Validation package from the validator. |

## tokenizeEstate

```solidity
function tokenizeEstate(uint256 totalSupply, bytes32 zone, uint256 tokenizationId, string uri, uint40 expireAt, address custodian, address broker) external returns (uint256 estateId)
```

Tokenize an estate into a new class of token.

{% hint style="info" %}
Permission: Tokenizers.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| totalSupply | uint256 | Number of tokens to mint. |
| zone | bytes32 | Zone code. |
| tokenizationId | uint256 | Tokenization identifier from the tokenizer contract. |
| uri | string | URI of estate metadata. |
| expireAt | uint40 | Estate expiration timestamp. |
| custodian | address | Assigned custodian address. |
| broker | address | Associated broker address. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| estateId | uint256 | New estate identifier. |

## extractEstate

```solidity
function extractEstate(uint256 estateId, uint256 extractionId) external
```

Extract an estate.

{% hint style="info" %}
Permission: Extractors.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| estateId | uint256 | Estate identifier. |
| extractionId | uint256 | Extraction identifier. |

## safeDeprecateEstate

```solidity
function safeDeprecateEstate(uint256 estateId, string note, bytes32 anchor) external
```

Deprecate an estate by managers due to force majeure or extraction.

{% hint style="info" %}
Permission: Managers active in the zone of the estate.

{% endhint %}

{% hint style="info" %}
Anchor enforces consistency between this contract and the client-side.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| estateId | uint256 | Estate identifier. |
| note | string | Deprecation note. |
| anchor | bytes32 | Keccak256 hash of `uri` of the estate. |

## safeExtendEstateExpiration

```solidity
function safeExtendEstateExpiration(uint256 estateId, uint40 expireAt, bytes32 anchor) external
```

Extend the expiration of an estate.

{% hint style="info" %}
Permission: Managers active in the zone of the estate.

{% endhint %}

{% hint style="info" %}
Anchor enforces consistency between this contract and the client-side.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| estateId | uint256 | Estate identifier. |
| expireAt | uint40 | New expiration timestamp. |
| anchor | bytes32 | Keccak256 hash of `uri` of the estate. |

## safeUpdateEstateCustodian

```solidity
function safeUpdateEstateCustodian(uint256 estateId, address custodian, bytes32 anchor) external
```

Update the custodian of an estate.

{% hint style="info" %}
Permission: Managers active in the zone of the estate.

{% endhint %}

{% hint style="info" %}
Anchor enforces consistency between this contract and the client-side.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| estateId | uint256 | Estate identifier. |
| custodian | address | New custodian address. |
| anchor | bytes32 | Keccak256 hash of `uri` of the estate. |

## safeUpdateEstateURI

```solidity
function safeUpdateEstateURI(uint256 estateId, string uri, struct IValidation.Validation validation, bytes32 anchor) external
```

Update the URI of metadata of an estate.

{% hint style="info" %}
Permission: Managers active in the zone of the estate.

{% endhint %}

{% hint style="info" %}
Validation data:
```
data = abi.encode(
    estateId,
    uri
);
```

{% endhint %}

{% hint style="info" %}
Anchor enforces consistency between this contract and the client-side.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| estateId | uint256 | Estate identifier. |
| uri | string | New URI of estate metadata. |
| validation | struct IValidation.Validation | Validation package from the validator. |
| anchor | bytes32 | Keccak256 hash of `uri` of the estate. |

