# Solidity API

## AssetMarketplace

@author Briky Team

 @notice An `AssetMarketplace` contract hosts a marketplace for a specific `IAssetToken`.

 @dev    Each unit of asset token is represented in scaled form as `10 ** IAssetToken(collection).decimals()` following the
         convention of `IAssetToken`.
 @dev    ERC-20 tokens are identified by their contract addresses.
         Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).

### validOffer

```solidity
modifier validOffer(uint256 _offerId)
```

@notice Verify a valid offer identifier.

         Name        Description
 @param  _offerId    Offer identifier.

### receive

```solidity
receive() external payable
```

@notice Executed on a call to this contract with empty calldata.

### version

```solidity
function version() external pure returns (string)
```

@return Version of implementation.

### __AssetMarketplace_init

```solidity
function __AssetMarketplace_init(address _admin, address _collection) internal
```

@notice Initialize "AssetMarketplace".

         Name            Description
 @param  _admin          `Admin` contract address.
 @param  _collection     `IAssetToken` contract address.

 @dev    The asset token must support interface `IAssetToken`.

### getOffer

```solidity
function getOffer(uint256 _offerId) external view returns (struct IAssetOffer.AssetOffer)
```

@notice Get an offer.

         Name        Description
 @param  _offerId    Offer identifier.

 @return Configuration and progress of the offer.

### list

```solidity
function list(uint256 _tokenId, uint256 _sellingAmount, uint256 _unitPrice, address _currency, bool _isDivisible) external returns (uint256)
```

@notice List a new offer of asset tokens.

         Name            Description
 @param  _tokenId        Asset identifier.
 @param  _sellingAmount  Selling amount.
 @param  _unitPrice      Sale value of each token unit.
 @param  _currency       Sale currency address.
 @param  _isDivisible    Whether the offer can be sold partially.

 @return New offer identifier.

 @dev    Approval must be granted for this contract to transfer asset tokens before listing. An offer can only be
         sold while approval remains active.

### buy

```solidity
function buy(uint256 _offerId) external payable returns (uint256)
```

@notice Buy an offer.
 @notice Buy only if the offer is in `Selling` state.

         Name        Description
 @param  _offerId    Offer identifier.

 @return Sum of sale price and royalty.

### buy

```solidity
function buy(uint256 _offerId, uint256 _amount) external payable returns (uint256)
```

@notice Buy a part of the offer.
 @notice Buy only if the offer is in `Selling` state.

         Name        Description
 @param  _offerId    Offer identifier.
 @param  _amount     Amount of tokens to buy.

 @return Sum of sale price and royalty.

### cancel

```solidity
function cancel(uint256 _offerId) external
```

@notice Cancel an offer.
 @notice Cancel only if the offer is in `Selling` state.

         Name        Description
 @param  _offerId    Offer identifier.

 @dev    Permission:
         - Seller of the offer.
         - Managers: disqualify defected offers only.

### safeBuy

```solidity
function safeBuy(uint256 _offerId, bytes32 _anchor) external payable returns (uint256)
```

@notice Buy an offer.
 @notice Buy only if the offer is in `Selling` state.

         Name        Description
 @param  _offerId    Offer identifier.
 @param  _anchor     Keccak256 hash of token amount, `tokenId` and `unitPrice` of the offer.

 @return Sum of sale price and royalty.

 @dev    Anchor enforces consistency between this contract and the client-side.

### safeBuy

```solidity
function safeBuy(uint256 _offerId, uint256 _amount, bytes32 _anchor) external payable returns (uint256)
```

@notice Buy a part of the offer.
 @notice Buy only if the offer is in `Selling` state.

         Name        Description
 @param  _offerId    Offer identifier.
 @param  _amount     Token amount.
 @param  _anchor     Keccak256 hash of token amount, `tokenId` and `unitPrice` of the offer.

 @return Sum of sale price and royalty.

 @dev    Anchor enforces consistency between this contract and the client-side.

### _buy

```solidity
function _buy(uint256 _offerId, uint256 _amount) internal returns (uint256)
```

@notice Buy an offer.
 @notice Buy only if the offer is in `Selling` state.

         Name        Description
 @param  _offerId    Offer identifier.
 @param  _amount     Amount of tokens to be bought.

 @return Sum of sale price and royalty.

### _chargeRoyalty

```solidity
function _chargeRoyalty(uint256 _offerId, uint256 _royalty) internal virtual
```

@notice Charge royalty on an offer.

         Name        Description
 @param  _offerId    Offer identifier.
 @param  _royalty    Charged royalty.

