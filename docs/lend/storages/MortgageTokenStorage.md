# Solidity API

## MortgageTokenStorage

@author Briky Team

 @notice Storage contract for contract `MortgageToken`.

### mortgages

```solidity
mapping(uint256 => struct IMortgage.Mortgage) mortgages
```

_mortgages[mortgageId]_

### baseURI

```solidity
string baseURI
```

### totalSupply

```solidity
uint256 totalSupply
```

Name            Description
 @return totalSupply     Total supply of the token.

### mortgageNumber

```solidity
uint256 mortgageNumber
```

Name              Description
 @return mortgageNumber    Number of mortgages.

### feeRate

```solidity
uint256 feeRate
```

### admin

```solidity
address admin
```

Name        Description
 @return admin       `Admin` contract address.

### feeReceiver

```solidity
address feeReceiver
```

Name            Description
 @return feeReceiver     `FeeReceiver` contract address.

