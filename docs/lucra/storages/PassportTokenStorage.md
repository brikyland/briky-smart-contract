# Solidity API

## PassportTokenStorage

@author Briky Team

 @notice Storage contract for contract `PassportToken`.

### hasMinted

```solidity
mapping(address => bool) hasMinted
```

_hasMinted[account]_

### baseURI

```solidity
string baseURI
```

### tokenNumber

```solidity
uint256 tokenNumber
```

Name            Description
 @return tokenNumber     Number of tokens.

### fee

```solidity
uint256 fee
```

Name    Description
 @return fee     Minting fee.

### royaltyRate

```solidity
uint256 royaltyRate
```

### admin

```solidity
address admin
```

Name        Description
 @return admin       `Admin` contract address.

