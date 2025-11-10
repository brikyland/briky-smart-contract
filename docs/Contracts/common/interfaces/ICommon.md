# Solidity API

## ICommon

Interface for standard contract administered by the `Admin` contract.

### AuthorizedAccount

```solidity
error AuthorizedAccount()
```

===== ERROR ===== *

### BadAnchor

```solidity
error BadAnchor()
```

### FailedVerification

```solidity
error FailedVerification()
```

### InsufficientFunds

```solidity
error InsufficientFunds()
```

### InvalidCurrency

```solidity
error InvalidCurrency()
```

### InvalidGovernor

```solidity
error InvalidGovernor()
```

### InvalidInput

```solidity
error InvalidInput()
```

### InvalidSignatureNumber

```solidity
error InvalidSignatureNumber()
```

### InvalidTimestamp

```solidity
error InvalidTimestamp()
```

### InvalidUpdating

```solidity
error InvalidUpdating()
```

### InvalidZone

```solidity
error InvalidZone()
```

### NotAuthorizedAccount

```solidity
error NotAuthorizedAccount()
```

### Unauthorized

```solidity
error Unauthorized()
```

### version

```solidity
function version() external pure returns (string version)
```

Name        Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| version | string | Version of implementation. |

### admin

```solidity
function admin() external view returns (address admin)
```

Name        Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| admin | address | `Admin` contract address. |

