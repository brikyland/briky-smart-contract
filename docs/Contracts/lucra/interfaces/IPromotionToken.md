# IPromotionToken

Interface for contract `PromotionToken`.

The `PromotionToken` contract is an ERC-721 token issued exclusively for airdrop campaigns. It provides
limited-time content that grants its minter airdrop scores.

## FeeUpdate

```solidity
event FeeUpdate(uint256 newValue)
```

Emitted when the minting fee is updated.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newValue | uint256 | New minting fee. |

## RoyaltyRateUpdate

```solidity
event RoyaltyRateUpdate(struct IRate.Rate newRate)
```

Emitted when the default royalty rate is updated.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newRate | struct IRate.Rate | New default royalty rate. |

## NewContent

```solidity
event NewContent(uint256 contentId, string uri, uint40 startAt, uint40 duration)
```

Emitted when a new content is created.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| contentId | uint256 | Content identifier. |
| uri | string | URI of content metadata. |
| startAt | uint40 | Start timestamp for minting. |
| duration | uint40 | Mintable duration. |

## ContentCancellation

```solidity
event ContentCancellation(uint256 contentId)
```

Emitted when a content is cancelled.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| contentId | uint256 | Content identifier. |

## ContentURIUpdate

```solidity
event ContentURIUpdate(uint256 contentId, string uri)
```

Emitted when the URI of a content is updated.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| contentId | uint256 | Content identifier. |
| uri | string | URI of content metadata. |

## NewToken

```solidity
event NewToken(uint256 tokenId, uint256 contentId, address owner)
```

Emitted when a new promotion token is minted.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | Token identifier. |
| contentId | uint256 | Content identifier associated with the token. |
| owner | address | Owner address. |

## AlreadyEnded

```solidity
error AlreadyEnded()
```

## AlreadyStarted

```solidity
error AlreadyStarted()
```

## InvalidContentId

```solidity
error InvalidContentId()
```

## NotOpened

```solidity
error NotOpened()
```

## contentNumber

```solidity
function contentNumber() external view returns (uint256 contentNumber)
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| contentNumber | uint256 | Number of contents. |

## tokenNumber

```solidity
function tokenNumber() external view returns (uint256 tokenNumber)
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenNumber | uint256 | Number of tokens. |

## fee

```solidity
function fee() external view returns (uint256 fee)
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| fee | uint256 | Minting fee. |

## getContent

```solidity
function getContent(uint256 contentId) external view returns (struct IContent.Content content)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| contentId | uint256 | Content identifier. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| content | struct IContent.Content | Content information. |

## mintCounts

```solidity
function mintCounts(address account, uint256 contentId) external view returns (uint256 count)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | EVM address. |
| contentId | uint256 | Content identifier. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| count | uint256 | Number of tokens of the content minted by the account. |

## mint

```solidity
function mint(uint256 contentId, uint256 amount) external payable returns (uint256 firstTokenId, uint256 lastTokenId)
```

Mint tokens of a content.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| contentId | uint256 | Content identifier. |
| amount | uint256 | Number of tokens to mint. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| firstTokenId | uint256 | First token identifier of minted tokens. |
| lastTokenId | uint256 | Last token identifier of minted tokens. |

