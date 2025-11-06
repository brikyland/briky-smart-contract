# Solidity API

## IPassportToken

@author Briky Team

 @notice Interface for contract `PassportToken`.
 @notice The `PassportToken` contract is an ERC-721 token issued exclusively for airdrop campaigns. It grants its
         minter airdrop privileges, and each account may mint only one passport.

### BaseURIUpdate

```solidity
event BaseURIUpdate(string newValue)
```

@notice Emitted when the base URI is updated.

         Name        Description
 @param  newValue    New base URI.

### FeeUpdate

```solidity
event FeeUpdate(uint256 newValue)
```

@notice Emitted when the minting fee is updated.

         Name        Description
 @param  newValue    New minting fee.

### RoyaltyRateUpdate

```solidity
event RoyaltyRateUpdate(struct IRate.Rate newRate)
```

@notice Emitted when the default royalty rate is updated.

         Name        Description
 @param  newRate     New default royalty rate.

### NewToken

```solidity
event NewToken(uint256 tokenId, address owner)
```

@notice Emitted when a new passport token is minted.

         Name        Description
 @param  tokenId     Token identifier.
 @param  owner       Owner address.

### AlreadyMinted

```solidity
error AlreadyMinted()
```

### fee

```solidity
function fee() external view returns (uint256 fee)
```

Name    Description
 @return fee     Minting fee.

### tokenNumber

```solidity
function tokenNumber() external view returns (uint256 tokenNumber)
```

Name            Description
 @return tokenNumber     Number of tokens.

### hasMinted

```solidity
function hasMinted(address account) external view returns (bool hasMinted)
```

Name        Description
 @return hasMinted   Whether the account has minted passport.

### mint

```solidity
function mint() external payable returns (uint256 tokenId)
```

@notice Mint the passport token to an account.
 @notice Mint only once for each account.

         Name        Description
 @return tokenId     Minted token identifier.

