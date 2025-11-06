# Solidity API

## ERC721Marketplace

@author Briky Team

 @notice An `ERC721Marketplace` contract hosts a marketplace for ERC-721 tokens.

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

### initialize

```solidity
function initialize(address _admin, address _feeReceiver) public virtual
```

@notice Initialize the contract after deployment, serving as the constructor.

         Name            Description
 @param  _admin          `Admin` contract address.
 @param  _feeReceiver    `FeeReceiver` contract address.

### registerCollections

```solidity
function registerCollections(address[] _collections, bool _isCollection, bytes[] _signatures) external
```

@notice Register or deregister multiple collections.

         Name            Description
 @param  _collections    Array of contract addresses.
 @param  _isCollection   Whether the operation is registration or deregistration.
 @param  _signatures     Array of admin signatures.

 @dev    Administrative operator.

### getOffer

```solidity
function getOffer(uint256 _offerId) external view returns (struct IERC721Offer.ERC721Offer)
```

@notice Get an offer.

         Name        Description
 @param  _offerId    Offer identifier.

 @return Configuration and progress of the offer.

### list

```solidity
function list(address _collection, uint256 _tokenId, uint256 _price, address _currency) external returns (uint256)
```

@notice List a new offer of an ERC721 token.

         Name            Description
 @param  _collection     Token collection contract address.
 @param  _tokenId        Token identifier.
 @param  _price          Sale price.
 @param  _currency       Sale currency address.

 @return New offer identifier.

 @dev    The collection must support interface `IERC721Upgradeable`.
 @dev    Approval must be granted for this contract to transfer collateral before borrowing. A mortgage can only be
         lent while approval remains active.

### buy

```solidity
function buy(uint256 _offerId) external payable returns (uint256)
```

@notice Buy an offer.
 @notice Buy only if the offer is in `Selling` state.

         Name            Description
 @param  _offerId        Offer identifier.

 @return Sum of sale price and royalty.

### cancel

```solidity
function cancel(uint256 _offerId) external
```

@notice Cancel an offer.
 @notice Cancel only if the offer is in `Selling` state.

         Name            Description
 @param  _offerId        Offer identifier.

 @dev    Permission:
         - Seller of the offer.
         - Managers: disqualify defected offers only.

### safeBuy

```solidity
function safeBuy(uint256 _offerId, uint256 _anchor) external payable returns (uint256)
```

@notice Buy an offer.
 @notice Buy only if the offer is in `Selling` state.

         Name        Description
 @param  _offerId    Offer identifier.
 @param  _anchor     `tokenId` of the offer.

 @return Sum of sale price and royalty.

 @dev    Anchor enforces consistency between this contract and the client-side.

### _buy

```solidity
function _buy(uint256 _offerId) internal returns (uint256)
```

@notice Buy an offer.
 @notice Buy only if the offer is in `Selling` state.

         Name        Description
 @param  _offerId    Offer identifier.

 @return Sum of sale price and royalty.

### _validCollection

```solidity
function _validCollection(address _collection) internal view virtual returns (bool)
```

Name            Description
 @param  _collection     Collection contract address.

 @return Whether the collection is supported by the marketplace.

### _validToken

```solidity
function _validToken(address, uint256) internal view virtual returns (bool)
```

@return Whether the token is valid for sale.

### _chargeRoyalty

```solidity
function _chargeRoyalty(uint256 _offerId) internal virtual
```

@notice Charge royalty on an offer.

         Name            Description
 @param  _offerId        Offer identifier.

