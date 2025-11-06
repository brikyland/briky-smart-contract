# Solidity API

## EstateMarketplace

@author Briky Team

 @notice The `EstateMarketplace` contract hosts a marketplace for estate tokens.

 @dev    Each unit of asset token is represented in scaled form as `10 ** IAssetToken(collection).decimals()` following the
         convention of interface `IAssetToken`.
 @dev    ERC-20 tokens are identified by their contract addresses.
         Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).

### initialize

```solidity
function initialize(address _admin, address _estateToken, address _commissionToken) external
```

@notice Initialize the contract after deployment, serving as the constructor.

         Name                Description
 @param  _admin              `Admin` contract address.
 @param  _estateToken        `EstateToken` contract address.
 @param  _commissionToken    `CommissionToken` contract address.

### _chargeRoyalty

```solidity
function _chargeRoyalty(uint256 _offerId, uint256 _royalty) internal
```

@notice Charge royalty on an offer.

         Name        Description
 @param  _offerId    Offer identifier.
 @param  _royalty    Charged royalty.

