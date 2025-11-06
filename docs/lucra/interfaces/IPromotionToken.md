# Solidity API

## IPromotionToken

@author Briky Team

 @notice Interface for contract `PromotionToken`.
 @notice The `PromotionToken` contract is an ERC-721 token issued exclusively for airdrop campaigns. It provides
         limited-time content that grants its minter airdrop scores.

### FeeUpdate

```solidity
event FeeUpdate(uint256 newValue)
```

@notice Emitted when the minting fee is updated.

         Name        Description
 @param  newValue    New minting fee.

### RoyaltyRateUpdate

```solidity
event RoyaltyRateUpdate(struct IRate.Rate newRate)
```

@notice Emitted when the default royalty rate is updated.

         Name        Description
 @param  newRate     New default royalty rate.

### NewContent

```solidity
event NewContent(uint256 contentId, string uri, uint40 startAt, uint40 duration)
```

@notice Emitted when a new content is created.

         Name            Description
 @param  contentId       Content identifier.
 @param  uri             URI of content metadata.
 @param  startAt         Start timestamp for minting.
 @param  duration        Mintable duration.

### ContentCancellation

```solidity
event ContentCancellation(uint256 contentId)
```

@notice Emitted when a content is cancelled.

         Name            Description
 @param  contentId       Content identifier.

### ContentURIUpdate

```solidity
event ContentURIUpdate(uint256 contentId, string uri)
```

@notice Emitted when the URI of a content is updated.

         Name            Description
 @param  contentId       Content identifier.
 @param  uri             URI of content metadata.

### NewToken

```solidity
event NewToken(uint256 tokenId, uint256 contentId, address owner)
```

@notice Emitted when a new promotion token is minted.

         Name            Description
 @param  tokenId         Token identifier.
 @param  contentId       Content identifier associated with the token.
 @param  owner           Owner address.

### AlreadyEnded

```solidity
error AlreadyEnded()
```

### AlreadyStarted

```solidity
error AlreadyStarted()
```

### InvalidContentId

```solidity
error InvalidContentId()
```

### NotOpened

```solidity
error NotOpened()
```

### contentNumber

```solidity
function contentNumber() external view returns (uint256 contentNumber)
```

Name            Description
 @return contentNumber   Number of contents.

### tokenNumber

```solidity
function tokenNumber() external view returns (uint256 tokenNumber)
```

Name            Description
 @return tokenNumber     Number of tokens.

### fee

```solidity
function fee() external view returns (uint256 fee)
```

Name            Description
 @return fee             Minting fee.

### getContent

```solidity
function getContent(uint256 contentId) external view returns (struct IContent.Content content)
```

Name            Description
 @param  contentId       Content identifier.
 @return content         Content information.

### mintCounts

```solidity
function mintCounts(address account, uint256 contentId) external view returns (uint256 count)
```

Name            Description
 @param  account         EVM address.
 @param  contentId       Content identifier.
 @return count           Number of tokens of the content minted by the account.

### mint

```solidity
function mint(uint256 contentId, uint256 amount) external payable returns (uint256 firstTokenId, uint256 lastTokenId)
```

@notice Mint tokens of a content.

         Name            Description
 @param  contentId       Content identifier.
 @param  amount          Number of tokens to mint.
 @return firstTokenId    First token identifier of minted tokens.
 @return lastTokenId     Last token identifier of minted tokens.

