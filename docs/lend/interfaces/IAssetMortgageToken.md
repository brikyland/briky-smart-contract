# Solidity API

## IAssetMortgageToken

@author Briky Team

 @notice Interface for mortgage token using `IAssetToken` as collateral.
 @notice An `IAssetMortgageToken` contract facilitates peer-to-peer lending secured by estate tokens as collateral. Each
         provided mortgage is tokenized into an ERC-721 token, whose owner has the right to receive repayments from the
         borrower or foreclose on the collateral from the contract once overdue.

 @dev    ERC-20 tokens are identified by their contract addresses.
         Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).

### NewCollateral

```solidity
event NewCollateral(uint256 mortgageId, uint256 tokenId, uint256 amount)
```

@notice Emitted when a new asset collateral is secured.

         Name        Description
 @param  mortgageId  Mortgage identifier.
 @param  tokenId     Collateral asset identifier.
 @param  amount      Collateral amount.

### getCollateral

```solidity
function getCollateral(uint256 mortgageId) external view returns (struct IAssetCollateral.AssetCollateral collateral)
```

Name        Description
 @param  mortgageId  Mortgage identifier.
 @return collateral  Collateral information.

### borrow

```solidity
function borrow(uint256 tokenId, uint256 amount, uint256 principal, uint256 repayment, address currency, uint40 duration) external returns (uint256 mortgageId)
```

@notice List a new mortgage with asset tokens as collateral.

         Name        Description
 @param  tokenId     Collateral asset identifier.
 @param  amount      Collateral amount.
 @param  principal   Principal value.
 @param  repayment   Repayment value.
 @param  currency    Currency address.
 @param  duration    Borrowing duration.
 @return mortgageId  New mortgage identifier.

 @dev    Approval must be granted for this contract to secure the collateral before borrowing.

