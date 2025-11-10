# Solidity API

## PromotionTokenStorage

Storage contract for contract `PromotionToken`.

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

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

### tokenNumber

```solidity
uint256 tokenNumber
```

Name            Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

### fee

```solidity
uint256 fee
```

Name            Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

### royaltyRate

```solidity
uint256 royaltyRate
```

### admin

```solidity
address admin
```

Name        Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

