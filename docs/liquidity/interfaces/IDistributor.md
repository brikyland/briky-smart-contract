# Solidity API

## IDistributor

@author Briky Team

 @notice Interface for contract `Distributor`.
 @notice The `Distributor` contract facilitates direct distributions of `PrimaryToken`.

### TokenDistribution

```solidity
event TokenDistribution(address receiver, uint256 amount)
```

@notice Emitted when tokens are distributed to a receiver.

         Name        Description
 @param  receiver    Receiver address.
 @param  amount      Distributed amount.

### primaryToken

```solidity
function primaryToken() external view returns (address stakeToken)
```

Name        Description
 @return stakeToken  `PrimaryToken` contract address.

### treasury

```solidity
function treasury() external view returns (address treasury)
```

Name        Description
 @return treasury    `Treasury` contract address.

### distributedTokens

```solidity
function distributedTokens(address account) external view returns (uint256 totalAmount)
```

Name            Description
 @param  account         EVM address.
 @return totalAmount     Total tokens distributed to the account.

