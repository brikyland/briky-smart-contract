# Administrable

A `Administrable` contract need to query administrative information from the `Admin` contract for its operations.

{% hint style="info" %}
ERC-20 tokens are identified by their contract addresses.
Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
{% endhint %}

## onlyManager

```solidity
modifier onlyManager()
```

Verify the message sender is an authorized manager.

## onlyExecutive

```solidity
modifier onlyExecutive()
```

Verify the message sender is an authorized manager or an authorized moderator.

## validGovernor

```solidity
modifier validGovernor(address _account)
```

Verify an account is an authorized governor contract.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _account | address | EVM address. |

## onlyAvailableCurrency

```solidity
modifier onlyAvailableCurrency(address _currency)
```

Verify a currency is interactable within the system.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _currency | address | Currency address. |

