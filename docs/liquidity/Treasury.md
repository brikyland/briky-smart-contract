# Solidity API

## Treasury

@author Briky Team

 @notice The `Treasury` contract serves as a stablecoin reserve pool that backs the intrinsic value of `PrimaryToken` and
         facilitates token liquidation.
 @notice 20% of provided liquidity is allocated into the operation fund for sponsoring administrative expenses.

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
function initialize(address _admin, address _currency, address _primaryToken) external
```

@notice Initialize the contract after deployment, serving as the constructor.

         Name            Description
 @param  _admin          `Admin` contract address.
 @param  _currency       Currency contract address used by the treasury.
 @param  _primaryToken   `PrimaryToken` contract address.

### withdrawOperationFund

```solidity
function withdrawOperationFund(address _operator, uint256 _value, bytes[] _signatures) external
```

@notice Withdraw from the operation fund to an operator.

         Name            Description
 @param  _value          Amount withdrawn from operation fund.
 @param  _operator       Operator address that received the funds.
 @param  _signatures     Array of admin signatures.

 @dev    Administrative operator.

### withdrawLiquidity

```solidity
function withdrawLiquidity(address _withdrawer, uint256 _value) external
```

@notice Withdraw liquidity from the treasury.

         Name            Description
 @param  _withdrawer     Receiver address.
 @param  _value          Withdrawn value.

 @dev    Permission: PrimaryToken.

### provideLiquidity

```solidity
function provideLiquidity(uint256 _value) external
```

@notice Provide liquidity to the treasury.

         Name        Description
 @param  _value      Provided value.

