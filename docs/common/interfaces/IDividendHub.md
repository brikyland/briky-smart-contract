# Solidity API

## IDividendHub

@author Briky Team

 @notice Interface for contract `DividendHub`.
 @notice The `DividendHub` contract collects incomes associated to assets from governor contracts and distribute them
         among asset holders.

 @dev    ERC-20 tokens are identified by their contract addresses.
         Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).

### NewDividend

```solidity
event NewDividend(address governor, uint256 tokenId, address issuer, uint256 totalWeight, uint256 value, address currency, string note)
```

@notice Emitted when a new dividend package is issued.

         Name            Description
 @param  governor        Governor contract address.
 @param  tokenId         Asset identifier from the governor contract.
 @param  issuer          Issuer address.
 @param  totalWeight     Current total weight of all holders of the asset.
 @param  value           Total dividend value.
 @param  currency        Dividend currency address.
 @param  note            Issuance note.

### Withdrawal

```solidity
event Withdrawal(uint256 dividendId, address withdrawer, uint256 value)
```

@notice Emitted when value is withdrawn from a dividend package by an entitled receiver.

         Name            Description
 @param  dividendId      Dividend identifier.
 @param  withdrawer      Withdrawer address.
 @param  value           Withdrawn value.

### AlreadyWithdrawn

```solidity
error AlreadyWithdrawn()
```

===== ERROR ===== *

### InvalidDividendId

```solidity
error InvalidDividendId()
```

### InvalidTokenId

```solidity
error InvalidTokenId()
```

### InvalidWithdrawing

```solidity
error InvalidWithdrawing()
```

### dividendNumber

```solidity
function dividendNumber() external view returns (uint256 dividendNumber)
```

Name            Description
 @return dividendNumber  Number of dividends.

### getDividend

```solidity
function getDividend(uint256 dividendId) external view returns (struct IDividend.Dividend dividend)
```

Name            Description
 @param  dividendId      Dividend identifier.
 @return dividend        Configuration and progress of the dividend package.

### withdrawAt

```solidity
function withdrawAt(uint256 dividendId, address withdrawer) external view returns (uint256 withdrawAt)
```

Name            Description
 @param  dividendId      Dividend identifier.
 @param  withdrawer      Withdrawer address.
 @return withdrawAt      Withdrawal timestamp.

### issueDividend

```solidity
function issueDividend(address governor, uint256 tokenId, uint256 value, address currency, string note) external payable returns (uint256 dividendId)
```

@notice Issue a new dividend package for an asset from a governor contract.

         Name            Description
 @param  governor        Governor contract address.
 @param  tokenId         Asset identifier from the governor contract.
 @param  value           Total dividend value.
 @param  currency        Dividend currency address.
 @param  note            Issuance note.
 @return dividendId      New dividend identifier.

### withdraw

```solidity
function withdraw(uint256[] dividendIds) external
```

@notice Withdraw entitled portions of the message sender from multiple dividend packages.

         Name            Description
 @param  dividendIds     Array of dividend identifiers to withdraw.

