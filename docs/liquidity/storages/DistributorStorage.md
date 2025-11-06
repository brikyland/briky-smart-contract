# Solidity API

## DistributorStorage

@author Briky Team

 @notice Storage contract for contract `Distributor`.

### admin

```solidity
address admin
```

Name        Description
 @return admin       `Admin` contract address.

### primaryToken

```solidity
address primaryToken
```

Name        Description
 @return stakeToken  `PrimaryToken` contract address.

### treasury

```solidity
address treasury
```

Name        Description
 @return treasury    `Treasury` contract address.

### distributedTokens

```solidity
mapping(address => uint256) distributedTokens
```

_distributedTokens[account]_

