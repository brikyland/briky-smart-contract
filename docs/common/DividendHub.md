# Solidity API

## DividendHub

@author Briky Team

 @notice The `DividendHub` contract collects incomes associated to assets from governor contracts and distribute them
         among asset holders.

 @dev    ERC-20 tokens are identified by their contract addresses.
         Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).

### validDividend

```solidity
modifier validDividend(uint256 _dividendId)
```

@notice Verify a valid dividend identifier.

         Name            Description
 @param  _dividendId     Dividend identifier.

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
function initialize(address _admin) external
```

@notice Initialize the contract after deployment, serving as the constructor.

         Name            Description
 @param  _admin          `Admin` contract address.

### getDividend

```solidity
function getDividend(uint256 _dividendId) external view returns (struct IDividend.Dividend)
```

Name            Description
 @param  _dividendId     Dividend identifier.

 @return Configuration and progress of the dividend package.

### issueDividend

```solidity
function issueDividend(address _governor, uint256 _tokenId, uint256 _value, address _currency, string _note) external payable returns (uint256)
```

@notice Issue a new dividend package for an asset from a governor contract.

         Name        Description
 @param  _governor   Governor contract address.
 @param  _tokenId    Asset identifier from the governor contract.
 @param  _value      Total dividend value.
 @param  _currency   Dividend currency address.
 @param  _note       Issuance note.
 @return dividendId  New dividend identifier.

### withdraw

```solidity
function withdraw(uint256[] _dividendIds) external
```

@notice Withdraw entitled portions of the message sender from multiple dividend packages.

         Name            Description
 @param  _dividendIds    Array of dividend identifiers to withdraw.

