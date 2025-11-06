# Solidity API

## IMortgageToken

@author Briky Team

 @notice Interface for contract `MortgageToken`.
 @notice A `MortgageToken` contract facilitates peer-to-peer lending secured by crypto collateral. Each mortgage being lent
         is tokenized into an ERC-721 token, whose owner has the right to receive repayments from the borrower or foreclose
         on the collateral from the contract once overdue.

 @dev    ERC-20 tokens are identified by their contract addresses.
         Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).

### BaseURIUpdate

```solidity
event BaseURIUpdate(string newValue)
```

@notice Emitted when the base URI is updated.

         Name        Description
 @param  newValue    New base URI.

### FeeRateUpdate

```solidity
event FeeRateUpdate(struct IRate.Rate newRate)
```

@notice Emitted when the borrowing fee rate is updated.

         Name        Description
 @param  newRate     New borrowing fee rate.

### NewToken

```solidity
event NewToken(uint256 tokenId, address lender, uint40 due)
```

@notice Emitted when a new mortgage token is minted.

         Name        Description
 @param  tokenId     Mortgage identifier.
 @param  lender      Lender address.
 @param  due         Maturity timestamp.

### NewMortgage

```solidity
event NewMortgage(uint256 mortgageId, address borrower, uint256 principal, uint256 repayment, uint256 fee, address currency, uint40 duration)
```

@notice Emitted when a new mortgage is listed.

         Name        Description
 @param  mortgageId  Mortgage identifier.
 @param  borrower    Borrower address.
 @param  principal   Principal value.
 @param  repayment   Repayment value.
 @param  fee         Borrowing fee.
 @param  currency    Currency address.
 @param  duration    Borrowing duration.

### MortgageCancellation

```solidity
event MortgageCancellation(uint256 mortgageId)
```

@notice Emitted when a mortgage is cancelled.

         Name        Description
 @param  mortgageId  Mortgage identifier.

### MortgageForeclosure

```solidity
event MortgageForeclosure(uint256 mortgageId, address receiver)
```

@notice Emitted when a mortgage is foreclosed.

         Name        Description
 @param  mortgageId  Mortgage identifier.
 @param  receiver    Collateral receiver address.

### MortgageRepayment

```solidity
event MortgageRepayment(uint256 mortgageId)
```

@notice Emitted when a mortgage is repaid.

         Name        Description
 @param  mortgageId  Mortgage identifier.

### InvalidCancelling

```solidity
error InvalidCancelling()
```

### InvalidCollateral

```solidity
error InvalidCollateral()
```

### InvalidTokenId

```solidity
error InvalidTokenId()
```

### InvalidForeclosing

```solidity
error InvalidForeclosing()
```

### InvalidLending

```solidity
error InvalidLending()
```

### InvalidMortgageId

```solidity
error InvalidMortgageId()
```

### InvalidPrincipal

```solidity
error InvalidPrincipal()
```

### InvalidRepaying

```solidity
error InvalidRepaying()
```

### InvalidRepayment

```solidity
error InvalidRepayment()
```

### Overdue

```solidity
error Overdue()
```

### feeReceiver

```solidity
function feeReceiver() external view returns (address feeReceiver)
```

Name            Description
 @return feeReceiver     `FeeReceiver` contract address.

### totalSupply

```solidity
function totalSupply() external view returns (uint256 totalSupply)
```

Name            Description
 @return totalSupply     Total supply of the token.

### getFeeRate

```solidity
function getFeeRate() external view returns (struct IRate.Rate rate)
```

Name    Description
 @return rate    Borrowing fee rate.

### mortgageNumber

```solidity
function mortgageNumber() external view returns (uint256 mortgageNumber)
```

Name              Description
 @return mortgageNumber    Number of mortgages.

### getMortgage

```solidity
function getMortgage(uint256 mortgageId) external view returns (struct IMortgage.Mortgage mortgage)
```

Name              Description
 @param  mortgageId        Mortgage identifier.
 @return mortgage          Configuration and progress of the mortgage.

### cancel

```solidity
function cancel(uint256 mortgageId) external
```

@notice Cancel a mortgage.
 @notice Cancel only if the mortgage is in `Pending` state.

         Name        Description
 @param  mortgageId  Mortgage identifier.

 @dev    Permission:
         - Borrower of the mortgage.
         - Managers: disqualify defected mortgages only.

### lend

```solidity
function lend(uint256 mortgageId) external payable returns (uint40 due)
```

@notice Lend a mortgage.
 @notice Lend only if the mortgage is in `Pending` state.
 @notice Mint the token associated with the mortgage.

         Name        Description
 @param  mortgageId  Mortgage identifier.
 @return due         Maturity timestamp.

### repay

```solidity
function repay(uint256 mortgageId) external payable
```

@notice Repay a mortgage.
 @notice Repay only if the mortgage is in `Supplied` state and not overdue.
 @notice Burn the token associated with the mortgage.

         Name        Description
 @param  mortgageId  Mortgage identifier.

 @dev    Permission: Borrower of the mortgage.

### foreclose

```solidity
function foreclose(uint256 mortgageId) external
```

@notice Foreclose on the collateral of a mortgage.
 @notice Foreclose only if the mortgage is overdue.
 @notice Burn the token associated with the mortgage.

         Name        Description
 @param  mortgageId  Mortgage identifier.

 @dev    The collateral is transferred to the mortgage token owner and the token is burned.

### safeLend

```solidity
function safeLend(uint256 mortgageId, uint256 anchor) external payable returns (uint40 due)
```

@notice Lend a mortgage.
 @notice Lend only if the mortgage is in `Pending` state.
 @notice Mint the token associated with the mortgage.

         Name        Description
 @param  mortgageId  Mortgage identifier.
 @param  anchor      `principal` of the mortgage.
 @return due         Maturity timestamp.

 @dev    Anchor enforces consistency between this contract and the client-side.

### safeRepay

```solidity
function safeRepay(uint256 mortgageId, uint256 anchor) external payable
```

@notice Repay a mortgage.
 @notice Repay only if the mortgage is in `Supplied` state and not overdue.
 @notice Burn the token associated with the mortgage.

         Name        Description
 @param  mortgageId  Mortgage identifier.
 @param  anchor      `repayment` of the mortgage.

 @dev    Permission: Borrower of the mortgage.
 @dev    Anchor enforces consistency between this contract and the client-side.

