# Solidity API

## EstateMarketplace

The `EstateMarketplace` contract hosts a marketplace for estate tokens.

_Each unit of asset token is represented in scaled form as `10 ** IAssetToken(collection).decimals()` following the
convention of interface `IAssetToken`.
   ERC-20 tokens are identified by their contract addresses.
Native coin is represented by the zero address (0x0000000000000000000000000000000000000000)._

### initialize

```solidity
function initialize(address _admin, address _estateToken, address _commissionToken) external
```

Initialize the contract after deployment, serving as the constructor.

Name                Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _admin | address | `Admin` contract address. |
| _estateToken | address | `EstateToken` contract address. |
| _commissionToken | address | `CommissionToken` contract address. |

### _chargeRoyalty

```solidity
function _chargeRoyalty(uint256 _offerId, uint256 _royalty) internal
```

Charge royalty on an offer.

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _offerId | uint256 | Offer identifier. |
| _royalty | uint256 | Charged royalty. |

