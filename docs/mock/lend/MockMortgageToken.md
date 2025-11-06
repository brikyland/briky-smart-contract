# Solidity API

## MockMortgageToken

### version

```solidity
function version() external pure returns (string)
```

Name        Description
 @return version     Version of implementation.

### initialize

```solidity
function initialize(address _admin, address _feeReceiver, string _name, string _symbol, string _uri, uint256 _feeRate) external
```

### royaltyInfo

```solidity
function royaltyInfo(uint256, uint256 _price) external view returns (address, uint256)
```

### addMortgage

```solidity
function addMortgage(uint256 principal, uint256 repayment, uint256 fee, address currency, uint40 due, enum IMortgage.MortgageState state, address borrower, address lender) external
```

### mint

```solidity
function mint(address to, uint256 _mortgageId) external
```

### repay

```solidity
function repay(uint256 _mortgageId) external payable
```

@notice Repay a mortgage.
 @notice Repay only if the mortgage is in `Supplied` state and not overdue.
 @notice Burn the token associated with the mortgage.

         Name            Description
 @param  _mortgageId     Mortgage identifier.

 @dev    Permission: Borrower of the mortgage.

### foreclose

```solidity
function foreclose(uint256 _mortgageId) external
```

@notice Foreclose on the collateral of a mortgage.
 @notice Foreclose only if the mortgage is overdue.
 @notice Burn the token associated with the mortgage.

         Name            Description
 @param  _mortgageId     Mortgage identifier.

 @dev    The collateral is transferred to the mortgage token owner.

### _transferCollateral

```solidity
function _transferCollateral(uint256 _mortgageId, address _from, address _to) internal
```

@notice Transfer the collateral of a mortgage.

         Name            Description
 @param  _mortgageId     Mortgage identifier.
 @param  _from           Sender address.
 @param  _to             Receiver address.

### updateFeeReceiver

```solidity
function updateFeeReceiver(address _feeReceiver) external
```

