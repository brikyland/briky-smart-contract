# DividendHub

The `DividendHub` contract collects incomes associated to assets from governor contracts and distribute them
among asset holders.

{% hint style="info" %}
ERC-20 tokens are identified by their contract addresses.
Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
{% endhint %}

## validDividend

```solidity
modifier validDividend(uint256 _dividendId)
```

Verify a valid dividend identifier.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _dividendId | uint256 | Dividend identifier. |

## receive

```solidity
receive() external payable
```

Executed on a call to this contract with empty calldata.

## version

```solidity
function version() external pure returns (string)
```

### Return Values

Version of implementation.

## initialize

```solidity
function initialize(address _admin) external
```

Initialize the contract after deployment, serving as the constructor.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _admin | address | `Admin` contract address. |

## getDividend

```solidity
function getDividend(uint256 _dividendId) external view returns (struct IDividend.Dividend)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _dividendId | uint256 | Dividend identifier. |

### Return Values

Configuration and progress of the dividend package.

## issueDividend

```solidity
function issueDividend(address _governor, uint256 _tokenId, uint256 _value, address _currency, string _note) external payable returns (uint256)
```

Issue a new dividend package for an asset from a governor contract.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _governor | address | Governor contract address. |
| _tokenId | uint256 | Asset identifier from the governor contract. |
| _value | uint256 | Total dividend value. |
| _currency | address | Dividend currency address. |
| _note | string | Issuance note. |

### Return Values

dividendId  New dividend identifier.

## withdraw

```solidity
function withdraw(uint256[] _dividendIds) external
```

Withdraw entitled portions of the message sender from multiple dividend packages.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _dividendIds | uint256[] | Array of dividend identifiers to withdraw. |

