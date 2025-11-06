# Solidity API

## Admin

@author Briky Team

 @notice A single `Admin` contract is responsible for governing the entire system with a designated group of administrator
         addresses. Any global configurations of contracts within the system must be verified by their signatures. This
         contract also maintains authorization registries and common configurations applied across the system.

 @dev    ERC-20 tokens are identified by their contract addresses.
         Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).

### receive

```solidity
receive() external payable
```

@notice Executed on a call to this contract with empty calldata.

### version

```solidity
function version() external pure returns (string)
```

@return Version of implementation.

### initialize

```solidity
function initialize(address _admin1, address _admin2, address _admin3, address _admin4, address _admin5) external
```

@notice Initialize the contract after deployment, serving as the constructor.

         Name            Description
 @param  _admin1     Admin #1 address.
 @param  _admin2     Admin #2 address.
 @param  _admin3     Admin #3 address.
 @param  _admin4     Admin #4 address.
 @param  _admin5     Admin #5 address.

### verifyAdminSignatures

```solidity
function verifyAdminSignatures(bytes _message, bytes[] _signatures) public
```

@notice Verify a message and a set of signatures conform admin addresses and the current nonce of this contract.
 @notice After successful verification, the nonce is incremented by 1 for the next message.

         Name            Description
 @param  _message        Message bytes to verify.
 @param  _signatures     Array of admin signatures.

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

### transferAdministration1

```solidity
function transferAdministration1(address _admin1, bytes[] _signatures) external
```

@notice Transfer admin #1 role to another address.

         Name           Description
 @param  _admin1        New admin #1 address.
 @param  _signatures    Array of admin signatures.

 @dev    Administrative operator.

### transferAdministration2

```solidity
function transferAdministration2(address _admin2, bytes[] _signatures) external
```

@notice Transfer admin #2 role to another address.

         Name           Description
 @param  _admin2        New admin #2 address.
 @param  _signatures    Array of admin signatures.

 @dev    Administrative operator.

### transferAdministration3

```solidity
function transferAdministration3(address _admin3, bytes[] _signatures) external
```

@notice Transfer admin #3 role to another address.

         Name           Description
 @param  _admin3        New admin #3 address.
 @param  _signatures    Array of admin signatures.

 @dev    Administrative operator.

### transferAdministration4

```solidity
function transferAdministration4(address _admin4, bytes[] _signatures) external
```

@notice Transfer admin #4 role to another address.

         Name           Description
 @param  _admin4        New admin #4 address.
 @param  _signatures    Array of admin signatures.

 @dev    Administrative operator.

### transferAdministration5

```solidity
function transferAdministration5(address _admin5, bytes[] _signatures) external
```

@notice Transfer admin #5 role to another address.

         Name           Description
 @param  _admin5        New admin #5 address.
 @param  _signatures    Array of admin signatures.

 @dev    Administrative operator.

### authorizeManagers

```solidity
function authorizeManagers(address[] _accounts, bool _isManager, bytes[] _signatures) external
```

@notice Authorize or deauthorize addresses as managers.

         Name           Description
 @param  _accounts      Array of EVM addresses.
 @param  _isManager     This whether the operation is authorizing or deauthorizing.
 @param  _signatures    Array of admin signatures.

 @dev    Administrative operator.

### authorizeModerators

```solidity
function authorizeModerators(address[] _accounts, bool _isModerator, bytes[] _signatures) external
```

@notice Authorize or deauthorize addresses as moderators.

         Name           Description
 @param  _accounts      Array of EVM addresses.
 @param  _isModerator   This whether the operation is authorizing or deauthorizing.
 @param  _signatures    Array of admin signatures.

 @dev    Administrative operator.

### authorizeGovernors

```solidity
function authorizeGovernors(address[] _accounts, bool _isGovernor, bytes[] _signatures) external
```

@notice Authorize or deauthorize contract addresses as governors.

         Name           Description
 @param  _accounts      Array of contract addresses.
 @param  _isGovernor    This whether the operation is authorizing or deauthorizing.
 @param  _signatures    Array of admin signatures.

 @dev    Administrative operator.

### declareZone

```solidity
function declareZone(bytes32 _zone, bytes[] _signatures) external
```

@notice Declare a new zone.

         Name           Description
 @param  _zone          Zone code.
 @param  _signatures    Array of admin signatures.

 @dev    Administrative operator.

### activateIn

```solidity
function activateIn(bytes32 _zone, address[] _accounts, bool _isActive, bytes[] _signatures) external
```

@notice Activate or deactivate addresses in a zone.

         Name           Description
 @param  _zone          Zone code.
 @param  _accounts      Array of EVM addresses.
 @param  _isActive      Whether the operation is activating or deactivating.
 @param  _signatures    Array of admin signatures.

 @dev    Administrative operator.

### updateCurrencyRegistries

```solidity
function updateCurrencyRegistries(address[] _currencies, bool[] _isAvailable, bool[] _isExclusive, bytes[] _signatures) external
```

@notice Update the registries of multiple currencies.

         Name            Description
 @param  _currencies     Array of updated currency addresses.
 @param  _isAvailable    Whether the currency is interactable within the system, respectively for each currency.
 @param  _isExclusive    Whether the currency grants exclusive privileges within the system, respectively for each currency.
 @param  _signatures     Array of admin signatures.

 @dev    Administrative operator.

### isExecutive

```solidity
function isExecutive(address _account) external view returns (bool)
```

Name        Description
 @param  _account    EVM address.

 @return Whether the account is an authorized manager or an authorized moderator.

### getCurrencyRegistry

```solidity
function getCurrencyRegistry(address _currency) external view returns (struct ICurrencyRegistry.CurrencyRegistry)
```

Name        Description
 @param  _currency   Currency address.

 @return Interaction configuration of the currency.

### isAvailableCurrency

```solidity
function isAvailableCurrency(address _currency) external view returns (bool)
```

Name        Description
 @param  _currency   Currency address.

 @return Whether the currency is interactable within the system.

 @dev    Cryptocurrencies require authorization to be interactable to prevent unknown deceptive codes.

### isExclusiveCurrency

```solidity
function isExclusiveCurrency(address _currency) external view returns (bool)
```

Name        Description
 @param  _currency   Currency address.

 @return Whether the currency grants exclusive privileges within the system.

