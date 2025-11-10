# Solidity API

## IEstateLiquidatorRequest

Interface for struct `EstateLiquidatorRequest`.

_ERC-20 tokens are identified by their contract addresses.
Native coin is represented by the zero address (0x0000000000000000000000000000000000000000)._

### EstateLiquidatorRequest

A request for `EstateLiquidator` to extract an estate from `EstateToken` by selling the asset to a legitimate
estate buyer.
Proceeds from the sale will be shared among holders proportionally to their balances.

```solidity
struct EstateLiquidatorRequest {
  uint256 estateId;
  uint256 proposalId;
  uint256 value;
  address currency;
  struct IRate.Rate feeRate;
  address buyer;
}
```

