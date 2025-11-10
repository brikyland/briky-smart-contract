# IPassportToken

Interface for contract `PassportToken`.

The `PassportToken` contract is an ERC-721 token issued exclusively for airdrop campaigns. It grants its
minter airdrop privileges, and each account may mint only one passport.

## BaseURIUpdate

```solidity
event BaseURIUpdate(string newValue)
```

Emitted when the base URI is updated.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newValue | string | New base URI. |

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

## NewToken

```solidity
event NewToken(uint256 tokenId, address owner)
```

Emitted when a new passport token is minted.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | Token identifier. |
| owner | address | Owner address. |

## AlreadyMinted

```solidity
error AlreadyMinted()
```

## fee

```solidity
function fee() external view returns (uint256 fee)
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| fee | uint256 | Minting fee. |

## tokenNumber

```solidity
function tokenNumber() external view returns (uint256 tokenNumber)
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenNumber | uint256 | Number of tokens. |

## hasMinted

```solidity
function hasMinted(address account) external view returns (bool hasMinted)
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| hasMinted | bool | Whether the account has minted passport. |

## mint

```solidity
function mint() external payable returns (uint256 tokenId)
```

Mint the passport token to an account.

Mint only once for each account.

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | Minted token identifier. |

