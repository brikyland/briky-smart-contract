# Solidity API

## Distributor

The `Distributor` contract facilitates direct distributions of `PrimaryToken`.

### receive

```solidity
receive() external payable
```

Executed on a call to this contract with empty calldata.

### version

```solidity
function version() external pure returns (string)
```

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | Version of implementation. |

### initialize

```solidity
function initialize(address _admin, address _primaryToken, address _treasury) external
```

Initialize the contract after deployment, serving as the constructor.

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _admin | address | `Admin` contract address. |
| _primaryToken | address | `PrimaryToken` contract address. |
| _treasury | address | `Treasury` contract address. |

### distributeToken

```solidity
function distributeToken(address[] _receivers, uint256[] _amounts, string _note, bytes[] _signatures) external
```

Distribute tokens to multiple receivers through administrative operations.

Name            Description

_Administrative operator._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _receivers | address[] | Array of receiver addresses. |
| _amounts | uint256[] | Array of distributed amounts, respective to each receiver address. |
| _note | string | Distribution note. |
| _signatures | bytes[] | Array of admin signatures. |

