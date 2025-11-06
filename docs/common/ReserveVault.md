# Solidity API

## ReserveVault

@author Briky Team

 @notice The `ReserveVault` contracts allows providers to open cryptocurrency reserve fund and withdraw them on demand.

 @dev    The fund is determined by a `quantity` value and denominations for each currency.
 @dev    Provision or withdrawal operations must specify a `quantity` to indicate equivalent values, calculated by
         multiplying with predefined denomination of each currency.
 @dev    The fund need to specify a main currency, other extras are optional.

### validFund

```solidity
modifier validFund(uint256 _fundId)
```

@notice Verify a valid fund identifier.

         Name       Description
 @param  _fundId    Fund identifier.

### onlyProvider

```solidity
modifier onlyProvider(uint256 _fundId)
```

@notice Verify the message sender is the provider of a fund.

         Name       Description
 @param  _fundId    Fund identifier.

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
function initialize(address _admin) external
```

@notice Initialize the contract after deployment, serving as the constructor.

         Name      Description
 @param  _admin    Admin` contract address.

### authorizeProviders

```solidity
function authorizeProviders(address[] _accounts, bool _isProvider, bytes[] _signatures) external
```

@notice Authorize or deauthorize addresses as providers.

         Name           Description
 @param  _accounts      Array of EVM addresses.
 @param  _isProvider    Whether the operation is authorizing or deauthorizing.
 @param  _signatures    Array of admin signatures.

 @dev    Administrative operator.

### getFund

```solidity
function getFund(uint256 _fundId) external view returns (struct IFund.Fund)
```

Name        Description
 @param  _fundId     Fund identifier.

 @return Configuration and reserves of the fund.

### isFundSufficient

```solidity
function isFundSufficient(uint256 _fundId) external view returns (bool)
```

Name        Description
 @param  _fundId     Fund identifier.

 @return Whether the fund is provided sufficiently for the current quantity.

### openFund

```solidity
function openFund(address _mainCurrency, uint256 _mainDenomination, address[] _extraCurrencies, uint256[] _extraDenominations) external returns (uint256)
```

@notice Open a new fund.

         Name                    Description
 @param  _mainCurrency           Main currency address.
 @param  _mainDenomination       Main currency denomination.
 @param  _extraCurrencies        Array of extra currency addresses.
 @param  _extraDenominations     Array of extra currency denominations, respective to each extra currency.

 @return New fund identifier.

 @dev    Permission: Providers.

### expandFund

```solidity
function expandFund(uint256 _fundId, uint256 _quantity) external
```

@notice Expand a fund.

         Name                    Description
 @param  _fundId                 Fund identifier.
 @param  _quantity               Expanded quantity.

 @dev    Permission: Provider of the fund.

### provideFund

```solidity
function provideFund(uint256 _fundId) external payable
```

@notice Provide sufficiently to a fund.

         Name                    Description
 @param  _fundId                 Fund identifier.

 @dev    Permission: Provider of the fund.

### withdrawFund

```solidity
function withdrawFund(uint256 _fundId, address _receiver, uint256 _quantity) external
```

@notice Withdraw from a fund to an account.

         Name                    Description
 @param  _fundId                 Fund identifier.
 @param  _receiver               Receiver address.
 @param  _quantity               Withdrawn quantity.

 @dev    Permission: Provider of the fund.

