# IGovernor

Interface for ERC-1155 tokens that governs RWAs.

A `Governor` contract digitizes shared holdings and supports querying holder equity for governance decisions or
dividend distributions. Each asset must have a representative address entitled to perform restricted functions
that involve the real condition of the asset on the behalf of holders.

## isAvailable

```solidity
function isAvailable(uint256 tokenId) external view returns (bool isAvailable)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | Asset identifier. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| isAvailable | bool | Whether the asset is available. |

## getRepresentative

```solidity
function getRepresentative(uint256 tokenId) external view returns (address representative)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | Asset identifier. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| representative | address | Representative address of the asset. |

## zoneOf

```solidity
function zoneOf(uint256 tokenId) external view returns (bytes32 zone)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | Asset identifier. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| zone | bytes32 | Zone code of the asset. |

## totalEquityAt

```solidity
function totalEquityAt(uint256 tokenId, uint256 at) external view returns (uint256 totalEquity)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | Asset identifier. |
| at | uint256 | Reference timestamp. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| totalEquity | uint256 | Total equity in the asset at the reference timestamp. |

## equityOfAt

```solidity
function equityOfAt(address account, uint256 tokenId, uint256 at) external view returns (uint256 equity)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | EVM address. |
| tokenId | uint256 | Asset identifier. |
| at | uint256 | Reference timestamp. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| equity | uint256 | Equity of the account in the asset at the reference timestamp. |

