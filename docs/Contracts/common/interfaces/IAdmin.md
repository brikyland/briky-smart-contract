# IAdmin

Interface for contract `Admin`.

A single `Admin` contract is responsible for governing the entire system with a designated group of administrator
addresses. Any global configurations of contracts within the system must be verified by their signatures. This
contract also maintains authorization registries and common configurations applied across the system.

{% hint style="info" %}
ERC-20 tokens are identified by their contract addresses.
Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
{% endhint %}

## AdminSignaturesVerification

```solidity
event AdminSignaturesVerification(bytes message, uint256 nonce, bytes[] signatures)
```

Emitted when a message is successfully verified with the current nonce and a set of admin signatures.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| message | bytes | Message bytes verified successfully. |
| nonce | uint256 | Number used once combined with the message to prevent replay attacks. |
| signatures | bytes[] | Array of admin signatures generated from the message and the current nonce of this contract. |

## Administration1Transfer

```solidity
event Administration1Transfer(address newAdmin1)
```

Emitted when the admin #1 role is transferred to another address.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newAdmin1 | address | New admin #1 address. |

## Administration2Transfer

```solidity
event Administration2Transfer(address newAdmin2)
```

Emitted when the admin #2 role is transferred to another address.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newAdmin2 | address | New admin #2 address. |

## Administration3Transfer

```solidity
event Administration3Transfer(address newAdmin3)
```

Emitted when the admin #3 role is transferred to another address.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newAdmin3 | address | New admin #3 address. |

## Administration4Transfer

```solidity
event Administration4Transfer(address newAdmin4)
```

Emitted when the admin #4 role is transferred to another address.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newAdmin4 | address | New admin #4 address. |

## Administration5Transfer

```solidity
event Administration5Transfer(address newAdmin5)
```

Emitted when the admin #5 is transferred to another address.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newAdmin5 | address | New admin #5 address. |

## ZoneDeclaration

```solidity
event ZoneDeclaration(bytes32 zone)
```

Emitted when a new zone is declared.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| zone | bytes32 | Zone code. |

## Activation

```solidity
event Activation(bytes32 zone, address account)
```

Emitted when an account is activated in a zone.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| zone | bytes32 | Zone code. |
| account | address | Activated address. |

## Deactivation

```solidity
event Deactivation(bytes32 zone, address account)
```

Emitted when an account is deactivated in a zone.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| zone | bytes32 | Zone code. |
| account | address | Deactivated address. |

## ManagerAuthorization

```solidity
event ManagerAuthorization(address account)
```

Emitted when an account is authorized as a manager.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | Authorized address. |

## ManagerDeauthorization

```solidity
event ManagerDeauthorization(address account)
```

Emitted when a manager is deauthorized.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | Deauthorized address. |

## ModeratorAuthorization

```solidity
event ModeratorAuthorization(address account)
```

Emitted when an account is authorized as a moderator.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | Authorized address. |

## ModeratorDeauthorization

```solidity
event ModeratorDeauthorization(address account)
```

Emitted when a moderator is deauthorized.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | Deauthorized address. |

## GovernorAuthorization

```solidity
event GovernorAuthorization(address account)
```

Emitted when a contract is authorized as a governor contract.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | Authorized contract address. |

## GovernorDeauthorization

```solidity
event GovernorDeauthorization(address account)
```

Emitted when a governor contract is deauthorized.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | Deauthorized contract address. |

## CurrencyRegistryUpdate

```solidity
event CurrencyRegistryUpdate(address currency, bool isAvailable, bool isExclusive)
```

Emitted when the registry of a currency is updated.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| currency | address | Currency address. |
| isAvailable | bool | Whether the currency is interactable within the system. |
| isExclusive | bool | Whether the currency grants exclusive privileges within the system. |

## ActivatedAccount

```solidity
error ActivatedAccount()
```

===== ERROR ===== *

## AuthorizedAccount

```solidity
error AuthorizedAccount()
```

## AuthorizedZone

```solidity
error AuthorizedZone()
```

## CannotSelfDeauthorizing

```solidity
error CannotSelfDeauthorizing()
```

## FailedVerification

```solidity
error FailedVerification()
```

## InvalidGovernor

```solidity
error InvalidGovernor()
```

## InvalidInput

```solidity
error InvalidInput()
```

## InvalidSignatureNumber

```solidity
error InvalidSignatureNumber()
```

## NotActivatedAccount

```solidity
error NotActivatedAccount()
```

## NotAuthorizedAccount

```solidity
error NotAuthorizedAccount()
```

## NotAuthorizedZone

```solidity
error NotAuthorizedZone()
```

## Unauthorized

```solidity
error Unauthorized()
```

## version

```solidity
function version() external pure returns (string version)
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| version | string | Version of implementation. |

## admin1

```solidity
function admin1() external view returns (address admin1)
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| admin1 | address | Admin #1 address. |

## admin2

```solidity
function admin2() external view returns (address admin2)
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| admin2 | address | Admin #2 address. |

## admin3

```solidity
function admin3() external view returns (address admin3)
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| admin3 | address | Admin #3 address. |

## admin4

```solidity
function admin4() external view returns (address admin4)
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| admin4 | address | Admin #4 address. |

## admin5

```solidity
function admin5() external view returns (address admin5)
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| admin5 | address | Admin #5 address. |

## nonce

```solidity
function nonce() external view returns (uint256 nonce)
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| nonce | uint256 | Number used once in the next verification. |

## isExecutive

```solidity
function isExecutive(address account) external view returns (bool isExecutive)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | EVM address. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| isExecutive | bool | Whether the account is an authorized manager or an authorized moderator. |

## isGovernor

```solidity
function isGovernor(address account) external view returns (bool isGovernor)
```

{% hint style="info" %}
The contract must support interface `IGovernor`.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | EVM address. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| isGovernor | bool | Whether the account is an authorized governor contract. |

## isManager

```solidity
function isManager(address account) external view returns (bool isManager)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | EVM address. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| isManager | bool | Whether the account is an authorized manager. |

## isModerator

```solidity
function isModerator(address account) external view returns (bool isModerator)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | EVM address. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| isModerator | bool | Whether the account is an authorized moderator. |

## isZone

```solidity
function isZone(bytes32 value) external view returns (bool isZone)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| value | bytes32 | Zone code. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| isZone | bool | Whether there is a zone declared with code `value`. |

## getCurrencyRegistry

```solidity
function getCurrencyRegistry(address currency) external view returns (struct ICurrencyRegistry.CurrencyRegistry currencyRegistry)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| currency | address | Currency address. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| currencyRegistry | struct ICurrencyRegistry.CurrencyRegistry | Interaction configuration of the currency. |

## isAvailableCurrency

```solidity
function isAvailableCurrency(address currency) external view returns (bool isAvailable)
```

{% hint style="info" %}
Cryptocurrencies require authorization to be interactable to prevent unknown deceptive codes.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| currency | address | Currency address. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| isAvailable | bool | Whether the currency is interactable within the system. |

## isExclusiveCurrency

```solidity
function isExclusiveCurrency(address currency) external view returns (bool isExclusive)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| currency | address | Currency address. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| isExclusive | bool | Whether the currency grants exclusive privileges within the system. |

## isActiveIn

```solidity
function isActiveIn(bytes32 zone, address account) external view returns (bool isActive)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| zone | bytes32 | Zone code. |
| account | address | EVM address. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| isActive | bool | Whether the account is eligible in the zone. |

## verifyAdminSignatures

```solidity
function verifyAdminSignatures(bytes message, bytes[] signatures) external
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
| message | bytes | Message bytes to verify. |
| signatures | bytes[] | Array of admin signatures. |

