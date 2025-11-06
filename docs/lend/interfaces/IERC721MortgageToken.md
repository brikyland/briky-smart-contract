# Solidity API

## IERC721MortgageToken

@author Briky Team

 @notice Interface for contract `ERC721MortgageToken`.
 @notice A `ERC721MortgageToken` contract facilitates peer-to-peer lending secured by ERC-721 tokens as collateral. Each provided mortgage
         is tokenized into an ERC-721 token, whose owner has the right to receive repayments from the borrower or foreclose
         on the collateral from the contract once overdue.

 @dev    ERC-20 tokens are identified by their contract addresses.
         Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).

### CollateralRegistration

```solidity
event CollateralRegistration(address collateral)
```

@notice Emitted when a collection is registered as a collateral contract.

         Name        Description
 @param  collateral  Registered contract address.

### CollateralDeregistration

```solidity
event CollateralDeregistration(address collateral)
```

@notice Emitted when a collection is deregistered as a collateral contract.

         Name        Description
 @param  collateral  Deregistered contract address.

### NewCollateral

```solidity
event NewCollateral(uint256 mortgageId, address token, uint256 tokenId)
```

@notice Emitted when a new ERC-721 collateral is secured.

         Name        Description
 @param  mortgageId  Mortgage identifier.
 @param  token       Collateral collection contract address.
 @param  tokenId     Collateral token identifier.

### NotRegisteredCollateral

```solidity
error NotRegisteredCollateral()
```

### RegisteredCollateral

```solidity
error RegisteredCollateral()
```

### isCollateral

```solidity
function isCollateral(address token) external view returns (bool isCollateral)
```

Name            Description
 @param  token           Contract address.
 @return isCollateral    Whether the collection is registered.

 @dev    The collection must support interface `IERC721Upgradeable`.

### getCollateral

```solidity
function getCollateral(uint256 mortgageId) external view returns (struct IERC721Collateral.ERC721Collateral collateral)
```

Name            Description
 @param  mortgageId      Mortgage identifier.
 @return collateral      Collateral information.

### borrow

```solidity
function borrow(address token, uint256 tokenId, uint256 principal, uint256 repayment, address currency, uint40 duration) external returns (uint256 mortgageId)
```

@notice List a new mortgage offer with an ERC-721 token as collateral.

         Name            Description
 @param  token           Collateral contract address.
 @param  tokenId         Collateral token identifier.
 @param  principal       Principal value.
 @param  repayment       Repayment value.
 @param  currency        Currency address.
 @param  duration        Borrowing duration.
 @return mortgageId      New mortgage identifier.

 @dev    Approval must be granted for this contract to secure the collateral before borrowing.

