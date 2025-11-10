# Solidity API

## IDistributor

Interface for contract `Distributor`.
The `Distributor` contract facilitates direct distributions of `PrimaryToken`.

### TokenDistribution

```solidity
event TokenDistribution(address receiver, uint256 amount)
```

Emitted when tokens are distributed to a receiver.

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| receiver | address | Receiver address. |
| amount | uint256 | Distributed amount. |

### primaryToken

```solidity
function primaryToken() external view returns (address stakeToken)
```

Name        Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| stakeToken | address | `PrimaryToken` contract address. |

### treasury

```solidity
function treasury() external view returns (address treasury)
```

Name        Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| treasury | address | `Treasury` contract address. |

### distributedTokens

```solidity
function distributedTokens(address account) external view returns (uint256 totalAmount)
```

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | EVM address. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| totalAmount | uint256 | Total tokens distributed to the account. |

