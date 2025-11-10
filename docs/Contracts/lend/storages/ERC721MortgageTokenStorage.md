# ERC721MortgageTokenStorage

Storage contract for contract `ERC721MortgageToken`.

## collaterals

```solidity
mapping(uint256 => struct IERC721Collateral.ERC721Collateral) collaterals
```

{% hint style="info" %}
collaterals[mortgageId]
{% endhint %}

## isCollateral

```solidity
mapping(address => bool) isCollateral
```

{% hint style="info" %}
isCollateral[collection]
{% endhint %}

