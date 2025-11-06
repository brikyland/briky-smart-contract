# Solidity API

## PromotionTokenStorage

@author Briky Team

 @notice Storage contract for contract `PromotionToken`.

### mintCounts

```solidity
mapping(address => mapping(uint256 => uint256)) mintCounts
```

_mintCounts[account][contentId]_

### contents

```solidity
mapping(uint256 => struct IContent.Content) contents
```

_contents[contentId]_

### tokenContents

```solidity
mapping(uint256 => uint256) tokenContents
```

_tokenContents[tokenId]_

### contentNumber

```solidity
uint256 contentNumber
```

Name            Description
 @return contentNumber   Number of contents.

### tokenNumber

```solidity
uint256 tokenNumber
```

Name            Description
 @return tokenNumber     Number of tokens.

### fee

```solidity
uint256 fee
```

Name            Description
 @return fee             Minting fee.

### royaltyRate

```solidity
uint256 royaltyRate
```

### admin

```solidity
address admin
```

Name        Description
 @return admin       `Admin` contract address.

