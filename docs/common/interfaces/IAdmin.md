# Solidity API

## IAdmin

@author Briky Team

 @notice Interface for contract `Admin`.
 @notice A single `Admin` contract is responsible for governing the entire system with a designated group of administrator
         addresses. Any global configurations of contracts within the system must be verified by their signatures. This
         contract also maintains authorization registries and common configurations applied across the system.

 @dev    ERC-20 tokens are identified by their contract addresses.
         Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).

### AdminSignaturesVerification

```solidity
event AdminSignaturesVerification(bytes message, uint256 nonce, bytes[] signatures)
```

@notice Emitted when a message is successfully verified with the current nonce and a set of admin signatures.

         Name        Description
 @param  message     Message bytes verified successfully.
 @param  nonce       Number used once combined with the message to prevent replay attacks.
 @param  signatures  Array of admin signatures generated from the message and the current nonce of this contract.

### Administration1Transfer

```solidity
event Administration1Transfer(address newAdmin1)
```

@notice Emitted when the admin #1 role is transferred to another address.

         Name        Description
 @param  newAdmin1   New admin #1 address.

### Administration2Transfer

```solidity
event Administration2Transfer(address newAdmin2)
```

@notice Emitted when the admin #2 role is transferred to another address.

         Name        Description
 @param  newAdmin2   New admin #2 address.

### Administration3Transfer

```solidity
event Administration3Transfer(address newAdmin3)
```

@notice Emitted when the admin #3 role is transferred to another address.

         Name        Description
 @param  newAdmin3   New admin #3 address.

### Administration4Transfer

```solidity
event Administration4Transfer(address newAdmin4)
```

@notice Emitted when the admin #4 role is transferred to another address.

         Name        Description
 @param  newAdmin4   New admin #4 address.

### Administration5Transfer

```solidity
event Administration5Transfer(address newAdmin5)
```

@notice Emitted when the admin #5 is transferred to another address.

         Name        Description
 @param  newAdmin5   New admin #5 address.

### ZoneDeclaration

```solidity
event ZoneDeclaration(bytes32 zone)
```

@notice Emitted when a new zone is declared.

         Name        Description
 @param  zone        Zone code.

### Activation

```solidity
event Activation(bytes32 zone, address account)
```

@notice Emitted when an account is activated in a zone.

         Name        Description
 @param  zone        Zone code.
 @param  account     Activated address.

### Deactivation

```solidity
event Deactivation(bytes32 zone, address account)
```

@notice Emitted when an account is deactivated in a zone.

         Name        Description
 @param  zone        Zone code.
 @param  account     Deactivated address.

### ManagerAuthorization

```solidity
event ManagerAuthorization(address account)
```

@notice Emitted when an account is authorized as a manager.

         Name        Description
 @param  account     Authorized address.

### ManagerDeauthorization

```solidity
event ManagerDeauthorization(address account)
```

@notice Emitted when a manager is deauthorized.

         Name        Description
 @param  account     Deauthorized address.

### ModeratorAuthorization

```solidity
event ModeratorAuthorization(address account)
```

@notice Emitted when an account is authorized as a moderator.

         Name        Description
 @param  account     Authorized address.

### ModeratorDeauthorization

```solidity
event ModeratorDeauthorization(address account)
```

@notice Emitted when a moderator is deauthorized.

         Name        Description
 @param  account     Deauthorized address.

### GovernorAuthorization

```solidity
event GovernorAuthorization(address account)
```

@notice Emitted when a contract is authorized as a governor contract.

         Name        Description
 @param  account     Authorized contract address.

### GovernorDeauthorization

```solidity
event GovernorDeauthorization(address account)
```

@notice Emitted when a governor contract is deauthorized.

         Name        Description
 @param  account     Deauthorized contract address.

### CurrencyRegistryUpdate

```solidity
event CurrencyRegistryUpdate(address currency, bool isAvailable, bool isExclusive)
```

@notice Emitted when the registry of a currency is updated.

         Name            Description
 @param  currency        Currency address.
 @param  isAvailable     Whether the currency is interactable within the system.
 @param  isExclusive     Whether the currency grants exclusive privileges within the system.

### ActivatedAccount

```solidity
error ActivatedAccount()
```

===== ERROR ===== *

### AuthorizedAccount

```solidity
error AuthorizedAccount()
```

### AuthorizedZone

```solidity
error AuthorizedZone()
```

### CannotSelfDeauthorizing

```solidity
error CannotSelfDeauthorizing()
```

### FailedVerification

```solidity
error FailedVerification()
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

### NotActivatedAccount

```solidity
error NotActivatedAccount()
```

### NotAuthorizedAccount

```solidity
error NotAuthorizedAccount()
```

### NotAuthorizedZone

```solidity
error NotAuthorizedZone()
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
 @return version     Version of implementation.

### admin1

```solidity
function admin1() external view returns (address admin1)
```

Name    Description
 @return admin1  Admin #1 address.

### admin2

```solidity
function admin2() external view returns (address admin2)
```

Name    Description
 @return admin2  Admin #2 address.

### admin3

```solidity
function admin3() external view returns (address admin3)
```

Name    Description
 @return admin3  Admin #3 address.

### admin4

```solidity
function admin4() external view returns (address admin4)
```

Name    Description
 @return admin4  Admin #4 address.

### admin5

```solidity
function admin5() external view returns (address admin5)
```

Name    Description
 @return admin5  Admin #5 address.

### nonce

```solidity
function nonce() external view returns (uint256 nonce)
```

Name    Description
 @return nonce   Number used once in the next verification.

### isExecutive

```solidity
function isExecutive(address account) external view returns (bool isExecutive)
```

Name            Description
 @param  account         EVM address.
 @return isExecutive     Whether the account is an authorized manager or an authorized moderator.

### isGovernor

```solidity
function isGovernor(address account) external view returns (bool isGovernor)
```

Name            Description
 @param  account         EVM address.
 @return isGovernor      Whether the account is an authorized governor contract.

 @dev    The contract must support interface `IGovernor`.

### isManager

```solidity
function isManager(address account) external view returns (bool isManager)
```

Name            Description
 @param  account         EVM address.
 @return isManager       Whether the account is an authorized manager.

### isModerator

```solidity
function isModerator(address account) external view returns (bool isModerator)
```

Name            Description
 @param  account         EVM address.
 @return isModerator     Whether the account is an authorized moderator.

### isZone

```solidity
function isZone(bytes32 value) external view returns (bool isZone)
```

Name            Description
 @param  value           Zone code.
 @return isZone          Whether there is a zone declared with code `value`.

### getCurrencyRegistry

```solidity
function getCurrencyRegistry(address currency) external view returns (struct ICurrencyRegistry.CurrencyRegistry currencyRegistry)
```

Name                Description
 @param  currency            Currency address.
 @return currencyRegistry    Interaction configuration of the currency.

### isAvailableCurrency

```solidity
function isAvailableCurrency(address currency) external view returns (bool isAvailable)
```

Name                Description
 @param  currency            Currency address.
 @return isAvailable         Whether the currency is interactable within the system.

 @dev    Cryptocurrencies require authorization to be interactable to prevent unknown deceptive codes.

### isExclusiveCurrency

```solidity
function isExclusiveCurrency(address currency) external view returns (bool isExclusive)
```

Name                Description
 @param  currency            Currency address.
 @return isExclusive         Whether the currency grants exclusive privileges within the system.

### isActiveIn

```solidity
function isActiveIn(bytes32 zone, address account) external view returns (bool isActive)
```

Name        Description
 @param  zone        Zone code.
 @param  account     EVM address.
 @return isActive    Whether the account is eligible in the zone.

### verifyAdminSignatures

```solidity
function verifyAdminSignatures(bytes message, bytes[] signatures) external
```

@notice Verify a message and a set of signatures conform admin addresses and the current nonce of this contract.
 @notice After successful verification, the nonce is incremented by 1 for the next message.

         Name        Description
 @param  message     Message bytes to verify.
 @param  signatures  Array of admin signatures.

 @dev    Only transactions whose original sender is a manager can request verification.
 @dev    Pseudo code of signature for `_message` and `nonce`:
         ```
         signature = ethSign(
             keccak256(abi.encodePacked(
                 _message,
                 nonce
             ))
         );
         ```

