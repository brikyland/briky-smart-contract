# PromotionToken

Interface for contract `PromotionToken`.

The `PromotionToken` contract is an ERC-721 token issued exclusively for airdrop campaigns. It provides
limited-time content that grants its minter airdrop scores.

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
function initialize(address _admin, string _name, string _symbol, uint256 _fee, uint256 _royaltyRate) external
```

Initialize the contract after deployment, serving as the constructor.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _admin | address | `Admin` contract address. |
| _name | string | Token name. |
| _symbol | string | Token symbol. |
| _fee | uint256 | Minting fee. |
| _royaltyRate | uint256 | Default royalty rate. |

## updateFee

```solidity
function updateFee(uint256 _fee, bytes[] _signatures) external
```

Update the minting fee.

{% hint style="info" %}
Administrative operator.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _fee | uint256 | New minting fee. |
| _signatures | bytes[] | Array of admin signatures. |

## updateRoyaltyRate

```solidity
function updateRoyaltyRate(uint256 _royaltyRate, bytes[] _signatures) external
```

Update the default royalty rate.

{% hint style="info" %}
Administrative operator.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _royaltyRate | uint256 | New default royalty rate. |
| _signatures | bytes[] | Array of admin signatures. |

## withdraw

```solidity
function withdraw(address _receiver, address[] _currencies, uint256[] _values, bytes[] _signatures) external
```

Withdraw sufficient amounts in multiple cryptocurrencies from this contract to an account.

{% hint style="info" %}
Administrative operator.

{% endhint %}

{% hint style="info" %}
Used to withdraw fee and royalty.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _receiver | address | Receiver address. |
| _currencies | address[] | Array of withdrawn currency addresses. |
| _values | uint256[] | Array of withdraw values, respective to each currency. |
| _signatures | bytes[] | Array of admin signatures. |

## createContents

```solidity
function createContents(string[] _uris, uint40[] _startAts, uint40[] _durations, bytes[] _signatures) external
```

Create new contents.

{% hint style="info" %}
Administrative operator.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _uris | string[] | Array of content URIs, respective to each content. |
| _startAts | uint40[] | Array of start timestamps for minting, respective to each content. |
| _durations | uint40[] | Array of mintable durations, respective to each content. |
| _signatures | bytes[] | Array of admin signatures. |

## updateContentURIs

```solidity
function updateContentURIs(uint256[] _contentIds, string[] _uris, bytes[] _signatures) external
```

Update URIs of multiple contents.

{% hint style="info" %}
Administrative operator.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _contentIds | uint256[] | Array of content identifiers. |
| _uris | string[] | Array of new URIs, respectively for each content. |
| _signatures | bytes[] | Array of admin signatures. |

## cancelContents

```solidity
function cancelContents(uint256[] _contentIds, bytes[] _signatures) external
```

Cancel multiple contents.

{% hint style="info" %}
Administrative operator.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _contentIds | uint256[] | Array of content identifiers. |
| _signatures | bytes[] | Array of admin signatures. |

## getContent

```solidity
function getContent(uint256 _contentId) public view returns (struct IContent.Content)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _contentId | uint256 | Content identifier. |

### Return Values

Content information.

## tokenURI

```solidity
function tokenURI(uint256 _tokenId) public view returns (string)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenId | uint256 | Token identifier. |

### Return Values

Token URI.

## getRoyaltyRate

```solidity
function getRoyaltyRate(uint256) external view returns (struct IRate.Rate)
```

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

Whether this contract implements the interface.

## mint

```solidity
function mint(uint256 _contentId, uint256 _amount) external payable returns (uint256, uint256)
```

Mint tokens of a content.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _contentId | uint256 | Content identifier. |
| _amount | uint256 | Number of tokens to mint. |

### Return Values

First token identifier of the minted tokens.

Last token identifier of the minted tokens.

## _royaltyReceiver

```solidity
function _royaltyReceiver() internal view returns (address)
```

### Return Values

Default royalty receiver address.

