# IValidation

Interface for struct `Validation`.

{% hint style="info" %}
Implementation involves server-side support.
{% endhint %}

## Validation

Validation information provided from a trusted validator.

```solidity
struct Validation {
  uint256 nonce;
  uint256 expiry;
  bytes signature;
}
```

