# Solidity API

## IEstate

Interface for struct `Estate`.

### Estate

Estate information.

```solidity
struct Estate {
  bytes32 zone;
  uint256 tokenizationId;
  address tokenizer;
  uint40 tokenizeAt;
  uint40 expireAt;
  uint40 deprecateAt;
  address custodian;
}
```

