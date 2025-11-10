# Admin

A single `Admin` contract is responsible for governing the entire system with a designated group of administrator
addresses. Any global configurations of contracts within the system must be verified by their signatures. This
contract also maintains authorization registries and common configurations applied across the system.

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

## initialize

```solidity
function initialize(address _admin1, address _admin2, address _admin3, address _admin4, address _admin5) external
```

Initialize the contract after deployment, serving as the constructor.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _admin1 | address | Admin #1 address. |
| _admin2 | address | Admin #2 address. |
| _admin3 | address | Admin #3 address. |
| _admin4 | address | Admin #4 address. |
| _admin5 | address | Admin #5 address. |

## verifyAdminSignatures

```solidity
function verifyAdminSignatures(bytes _message, bytes[] _signatures) public
```

Verify a message and a set of signatures conform admin addresses and the current nonce of this contract.

After successful verification, the nonce is incremented by 1 for the next message.

{% hint style="info" %}
Only transactions whose original sender is a manager can request verification.

{% endhint %}

{% hint style="info" %}
Pseudo code of signature for `_message` and `nonce`:
```
signature = ethSign(
    keccak256(abi.encodePacked(
        _message,
        nonce
    ))
);
```
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _message | bytes | Message bytes to verify. |
| _signatures | bytes[] | Array of admin signatures. |

## transferAdministration1

```solidity
function transferAdministration1(address _admin1, bytes[] _signatures) external
```

Transfer admin #1 role to another address.

{% hint style="info" %}
Administrative operator.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _admin1 | address | New admin #1 address. |
| _signatures | bytes[] | Array of admin signatures. |

## transferAdministration2

```solidity
function transferAdministration2(address _admin2, bytes[] _signatures) external
```

Transfer admin #2 role to another address.

{% hint style="info" %}
Administrative operator.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _admin2 | address | New admin #2 address. |
| _signatures | bytes[] | Array of admin signatures. |

## transferAdministration3

```solidity
function transferAdministration3(address _admin3, bytes[] _signatures) external
```

Transfer admin #3 role to another address.

{% hint style="info" %}
Administrative operator.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _admin3 | address | New admin #3 address. |
| _signatures | bytes[] | Array of admin signatures. |

## transferAdministration4

```solidity
function transferAdministration4(address _admin4, bytes[] _signatures) external
```

Transfer admin #4 role to another address.

{% hint style="info" %}
Administrative operator.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _admin4 | address | New admin #4 address. |
| _signatures | bytes[] | Array of admin signatures. |

## transferAdministration5

```solidity
function transferAdministration5(address _admin5, bytes[] _signatures) external
```

Transfer admin #5 role to another address.

{% hint style="info" %}
Administrative operator.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _admin5 | address | New admin #5 address. |
| _signatures | bytes[] | Array of admin signatures. |

## authorizeManagers

```solidity
function authorizeManagers(address[] _accounts, bool _isManager, bytes[] _signatures) external
```

Authorize or deauthorize addresses as managers.

{% hint style="info" %}
Administrative operator.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _accounts | address[] | Array of EVM addresses. |
| _isManager | bool | This whether the operation is authorizing or deauthorizing. |
| _signatures | bytes[] | Array of admin signatures. |

## authorizeModerators

```solidity
function authorizeModerators(address[] _accounts, bool _isModerator, bytes[] _signatures) external
```

Authorize or deauthorize addresses as moderators.

{% hint style="info" %}
Administrative operator.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _accounts | address[] | Array of EVM addresses. |
| _isModerator | bool | This whether the operation is authorizing or deauthorizing. |
| _signatures | bytes[] | Array of admin signatures. |

## authorizeGovernors

```solidity
function authorizeGovernors(address[] _accounts, bool _isGovernor, bytes[] _signatures) external
```

Authorize or deauthorize contract addresses as governors.

{% hint style="info" %}
Administrative operator.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _accounts | address[] | Array of contract addresses. |
| _isGovernor | bool | This whether the operation is authorizing or deauthorizing. |
| _signatures | bytes[] | Array of admin signatures. |

## declareZone

```solidity
function declareZone(bytes32 _zone, bytes[] _signatures) external
```

Declare a new zone.

{% hint style="info" %}
Administrative operator.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _zone | bytes32 | Zone code. |
| _signatures | bytes[] | Array of admin signatures. |

## activateIn

```solidity
function activateIn(bytes32 _zone, address[] _accounts, bool _isActive, bytes[] _signatures) external
```

Activate or deactivate addresses in a zone.

{% hint style="info" %}
Administrative operator.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _zone | bytes32 | Zone code. |
| _accounts | address[] | Array of EVM addresses. |
| _isActive | bool | Whether the operation is activating or deactivating. |
| _signatures | bytes[] | Array of admin signatures. |

## updateCurrencyRegistries

```solidity
function updateCurrencyRegistries(address[] _currencies, bool[] _isAvailable, bool[] _isExclusive, bytes[] _signatures) external
```

Update the registries of multiple currencies.

{% hint style="info" %}
Administrative operator.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _currencies | address[] | Array of updated currency addresses. |
| _isAvailable | bool[] | Whether the currency is interactable within the system, respectively for each currency. |
| _isExclusive | bool[] | Whether the currency grants exclusive privileges within the system, respectively for each currency. |
| _signatures | bytes[] | Array of admin signatures. |

## isExecutive

```solidity
function isExecutive(address _account) external view returns (bool)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _account | address | EVM address. |

### Return Values

Whether the account is an authorized manager or an authorized moderator.

## getCurrencyRegistry

```solidity
function getCurrencyRegistry(address _currency) external view returns (struct ICurrencyRegistry.CurrencyRegistry)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _currency | address | Currency address. |

### Return Values

Interaction configuration of the currency.

## isAvailableCurrency

```solidity
function isAvailableCurrency(address _currency) external view returns (bool)
```

{% hint style="info" %}
Cryptocurrencies require authorization to be interactable to prevent unknown deceptive codes.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _currency | address | Currency address. |

### Return Values

Whether the currency is interactable within the system.

## isExclusiveCurrency

```solidity
function isExclusiveCurrency(address _currency) external view returns (bool)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _currency | address | Currency address. |

### Return Values

Whether the currency grants exclusive privileges within the system.

