# Solidity API

## MortgageToken

@author Briky Team

 @notice A `MortgageToken` contract facilitates peer-to-peer lending secured by crypto collateral. Each provided mortgage
         is tokenized into an ERC-721 token, whose owner has the right to receive repayments from the borrower or foreclose
         on the collateral from the contract once overdue.

 @dev    ERC-20 tokens are identified by their contract addresses.
         Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).

### validMortgage

```solidity
modifier validMortgage(uint256 _mortgageId)
```

@notice Verify a mortgage identifier is valid.

         Name           Description
 @param  _mortgageId    Mortgage identifier.

### receive

```solidity
receive() external payable
```

@notice Executed on a call to this contract with empty calldata.

### __MortgageToken_init

```solidity
function __MortgageToken_init(address _admin, address _feeReceiver, string _name, string _symbol, string _uri, uint256 _feeRate) internal
```

@notice Initialize `MortgageToken`.

         Name            Description
 @param  _admin          `Admin` contract address.
 @param  _feeReceiver    `FeeReceiver` contract address.
 @param  _name           Token name.
 @param  _symbol         Token symbol.
 @param  _uri            Base URI.
 @param  _feeRate        Borrowing fee rate.

### updateBaseURI

```solidity
function updateBaseURI(string _uri, bytes[] _signatures) external
```

@notice Update the base URI.

         Name            Description
 @param  _uri            New base URI.
 @param  _signatures     Array of admin signatures.

 @dev    Administrative operator.

### updateFeeRate

```solidity
function updateFeeRate(uint256 _feeRate, bytes[] _signatures) external
```

@notice Update the borrowing fee rate.

         Name            Description
 @param  _feeRate        New borrowing fee rate.
 @param  _signatures     Array of admin signatures.

 @dev    Administrative operator.

### getFeeRate

```solidity
function getFeeRate() external view returns (struct IRate.Rate)
```

@return Borrowing fee rate.

### getMortgage

```solidity
function getMortgage(uint256 _mortgageId) external view returns (struct IMortgage.Mortgage)
```

Name            Description
 @param  _mortgageId     Mortgage identifier.

 @return Configuration and progress of the mortgage.

### tokenURI

```solidity
function tokenURI(uint256 _tokenId) public view returns (string)
```

Name            Description
 @param  _tokenId        Token identifier.

 @return Token URI.

### supportsInterface

```solidity
function supportsInterface(bytes4 _interfaceId) public view virtual returns (bool)
```

Name            Description
 @param  _interfaceId    Interface identifier.

 @return Whether this contract supports the interface.

### cancel

```solidity
function cancel(uint256 _mortgageId) external virtual
```

@notice Cancel a mortgage.
 @notice Cancel only if the mortgage is in `Pending` state.

         Name            Description
 @param  _mortgageId     Mortgage identifier.

 @dev    Permission:
         - Borrower of the mortgage.
         - Managers: disqualify defected mortgages only.

### lend

```solidity
function lend(uint256 _mortgageId) external payable virtual returns (uint40)
```

@notice Lend a mortgage.
 @notice Lend only if the mortgage is in `Pending` state.
 @notice Mint new token associated with the mortgage.

         Name            Description
 @param  _mortgageId     Mortgage identifier.

 @return Maturity timestamp.

### safeLend

```solidity
function safeLend(uint256 _mortgageId, uint256 _anchor) external payable virtual returns (uint40)
```

@notice Lend a mortgage.
 @notice Lend only if the mortgage is in `Pending` state.
 @notice Mint new token associated with the mortgage.

         Name            Description
 @param  _mortgageId     Mortgage identifier.
 @param  _anchor         `principal` of the mortgage.

 @return Maturity timestamp.

 @dev    Anchor enforces consistency between this contract and the client-side.

### repay

```solidity
function repay(uint256 _mortgageId) external payable virtual
```

@notice Repay a mortgage.
 @notice Repay only if the mortgage is in `Supplied` state and not overdue.
 @notice Burn the token associated with the mortgage.

         Name            Description
 @param  _mortgageId     Mortgage identifier.

 @dev    Permission: Borrower of the mortgage.

### safeRepay

```solidity
function safeRepay(uint256 _mortgageId, uint256 _anchor) external payable virtual
```

@notice Repay a mortgage.
 @notice Repay only if the mortgage is in `Supplied` state and not overdue.
 @notice Burn the token associated with the mortgage.

         Name            Description
 @param  _mortgageId     Mortgage identifier.
 @param  _anchor         `repayment` of the mortgage.

 @dev    Permission: Borrower of the mortgage.
 @dev    Anchor enforces consistency between this contract and the client-side.

### foreclose

```solidity
function foreclose(uint256 _mortgageId) external virtual
```

@notice Foreclose on the collateral of a mortgage.
 @notice Foreclose only if the mortgage is overdue.
 @notice Burn the token associated with the mortgage.

         Name            Description
 @param  _mortgageId     Mortgage identifier.

 @dev    The collateral is transferred to the mortgage token owner.

### _baseURI

```solidity
function _baseURI() internal view returns (string)
```

@return Prefix of all token URI.

### _mint

```solidity
function _mint(address _to, uint256 _tokenId) internal
```

@notice Mint a token.

         Name            Description
 @param  _to             Receiver address.
 @param  _tokenId        Token identifier.

### _burn

```solidity
function _burn(uint256 _tokenId) internal
```

@notice Burn a token.

         Name            Description
 @param  _tokenId        Token identifier.

### _borrow

```solidity
function _borrow(uint256 _principal, uint256 _repayment, address _currency, uint40 _duration) internal returns (uint256)
```

@notice List a new mortgage.

         Name            Description
 @param  _principal      Principal value.
 @param  _repayment      Repayment value.
 @param  _currency       Currency address.
 @param  _duration       Borrowing duration.

 @return New mortgage identifier.

 @dev    Approval must be granted for this contract to transfer collateral before borrowing. A mortgage can only be
         lent while approval remains active.

### _lend

```solidity
function _lend(uint256 _mortgageId) internal returns (uint40)
```

@notice Lend a mortgage.
 @notice Mint the token associated with the mortgage.

         Name            Description
 @param  _mortgageId     Mortgage identifier.

 @return Repayment due timestamp.

### _repay

```solidity
function _repay(uint256 _mortgageId) internal
```

@notice Repay a mortgage.
 @notice Burn the token associated with the mortgage.

         Name            Description
 @param  _mortgageId     Mortgage identifier.

 @dev    Permission: Borrower of the mortgage.

### _chargeFee

```solidity
function _chargeFee(uint256 _mortgageId) internal virtual
```

@notice Charge borrowing fee.

         Name            Description
 @param  _mortgageId     Mortgage identifier.

### _transferCollateral

```solidity
function _transferCollateral(uint256 _mortgageId, address _from, address _to) internal virtual
```

@notice Transfer the collateral of a mortgage.

         Name            Description
 @param  _mortgageId     Mortgage identifier.
 @param  _from           Sender address.
 @param  _to             Receiver address.

