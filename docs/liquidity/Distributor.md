# Solidity API

## Distributor

@author Briky Team

 @notice The `Distributor` contract facilitates direct distributions of `PrimaryToken`.

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
function initialize(address _admin, address _primaryToken, address _treasury) external
```

@notice Initialize the contract after deployment, serving as the constructor.

         Name            Description
 @param  _admin          `Admin` contract address.
 @param  _primaryToken   `PrimaryToken` contract address.
 @param  _treasury       `Treasury` contract address.

### distributeToken

```solidity
function distributeToken(address[] _receivers, uint256[] _amounts, string _note, bytes[] _signatures) external
```

@notice Distribute tokens to multiple receivers through administrative operations.

         Name            Description
 @param  _receivers      Array of receiver addresses.
 @param  _amounts        Array of distributed amounts, respective to each receiver address.
 @param  _note           Distribution note.
 @param  _signatures     Array of admin signatures.

 @dev    Administrative operator.

