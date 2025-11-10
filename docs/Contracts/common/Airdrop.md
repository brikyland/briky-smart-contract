# Airdrop

The `Airdrop` contract facilitates cryptocurrency distribution in the form of an airdrop to multiple addresses.

{% hint style="info" %}
ERC-20 tokens are identified by their contract addresses.
Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
{% endhint %}

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

## airdrop

```solidity
function airdrop(address[] _receivers, uint256[] _amounts, address _currency) external payable
```

Execute an airdrop by transferring cryptocurrency to multiple receiver addresses.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _receivers | address[] | Array of receiver addresses. |
| _amounts | uint256[] | Array of airdrop amount, respective to each receiver. |
| _currency | address | Airdrop currency. |

