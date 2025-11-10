# IMortgage

Interface for struct `Mortgage`.

## MortgageState

Variants of state of a mortgage.

```solidity
enum MortgageState {
  Nil,
  Pending,
  Supplied,
  Repaid,
  Foreclosed,
  Cancelled
}
```

## Mortgage

Mortgage information.

```solidity
struct Mortgage {
  uint256 principal;
  uint256 repayment;
  uint256 fee;
  address currency;
  uint40 due;
  enum IMortgage.MortgageState state;
  address borrower;
  address lender;
}
```

