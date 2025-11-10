# Solidity API

## IValidatable

Interface for contract `Validatable`.
A `Validatable` contract relies on a trusted validator to verify data that is difficult to process on-chain.

_Implementation involves server-side support._

### ValidatorUpdate

```solidity
event ValidatorUpdate(address newAddress)
```

Emitted when the validator is updated.

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newAddress | address | New validator address. |

### ValidationExpired

```solidity
error ValidationExpired()
```

===== ERROR ===== *

### InvalidNonce

```solidity
error InvalidNonce()
```

### InvalidSignature

```solidity
error InvalidSignature()
```

### validator

```solidity
function validator() external view returns (address validator)
```

Name        Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| validator | address | Validator address. |

### isNonceUsed

```solidity
function isNonceUsed(uint256 nonce) external view returns (bool isUsed)
```

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| nonce | uint256 | Number used once combined with the message to prevent replay attacks. |

