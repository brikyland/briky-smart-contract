# PromotionTokenStorage

Storage contract for contract `PromotionToken`.

## mintCounts

```solidity
mapping(address => mapping(uint256 => uint256)) mintCounts
```

{% hint style="info" %}
mintCounts[account][contentId]
{% endhint %}

## contents

```solidity
mapping(uint256 => struct IContent.Content) contents
```

{% hint style="info" %}
contents[contentId]
{% endhint %}

## tokenContents

```solidity
mapping(uint256 => uint256) tokenContents
```

{% hint style="info" %}
tokenContents[tokenId]
{% endhint %}

## contentNumber

```solidity
uint256 contentNumber
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

## tokenNumber

```solidity
uint256 tokenNumber
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

## fee

```solidity
uint256 fee
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

## royaltyRate

```solidity
uint256 royaltyRate
```

## admin

```solidity
address admin
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

