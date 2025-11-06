# Solidity API

## FeeReceiver

@author Briky Team

 @notice The `FeeReceiver` contract passively receives and holds fee from operators within the system until being withdrawn
         on demands of admins.

 @dev    ERC-20 tokens are identified by their contract addresses.
         Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).

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

         Name    Description
 @param  _admin  `Admin` contract address.

### withdraw

```solidity
function withdraw(address _receiver, address[] _currencies, uint256[] _values, bytes[] _signatures) external
```

@notice Withdraw sufficient amounts in multiple cryptocurrencies from this contract to an account.

         Name            Description
 @param  _receiver       Receiver address.
 @param  _currencies     Array of withdrawn currency addresses.
 @param  _values         Array of withdrawn values, respective to each currency.
 @param  _signatures     Array of admin signatures.

 @dev    Administrative operator.

