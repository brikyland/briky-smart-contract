# Solidity API

## IEstateTokenizer

@author Briky Team

 @notice Interface for tokenizer contracts of `EstateToken`.

 @notice An `IEstateTokenizer` contract instructs `EstateToken` to securitize a real estate into a new class of tokens and
         receive them for subsequent distribution to holders.

### EstateTokenWithdrawal

```solidity
event EstateTokenWithdrawal(uint256 tokenizationId, address withdrawer, uint256 amount)
```

@notice Emitted when a holder withdraw allocation from a tokenization.

         Name            Description
 @param  tokenizationId  Tokenization identifier.
 @param  withdrawer      Withdrawer address.
 @param  amount          Withdrawn amount.

### AlreadyTokenized

```solidity
error AlreadyTokenized()
```

===== ERROR ===== *

### NotRegisteredCustodian

```solidity
error NotRegisteredCustodian()
```

### NotTokenized

```solidity
error NotTokenized()
```

### isTokenized

```solidity
function isTokenized(uint256 tokenizationId) external view returns (bool isTokenized)
```

Name            Description
 @param  tokenizationId  Tokenization identifier.
 @return isTokenized     Whether the tokenization has succeeded.

### allocationOfAt

```solidity
function allocationOfAt(address account, uint256 tokenizationId, uint256 at) external view returns (uint256 allocation)
```

Name            Description
 @param  account         Account address.
 @param  tokenizationId  Tokenization identifier.
 @param  at              Reference timestamp.
 @return allocation      Allocation of the account at the reference timestamp.

### withdrawEstateToken

```solidity
function withdrawEstateToken(uint256 tokenizationId) external returns (uint256 amount)
```

@notice Withdraw the allocation of the message sender from a tokenization.

         Name            Description
 @param  tokenizationId  Tokenization identifier.
 @return amount          Withdrawn amount.

