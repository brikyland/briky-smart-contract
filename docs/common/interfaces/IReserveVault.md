# Solidity API

## IReserveVault

@author Briky Team

 @notice Interface for contract `ReserveVault`.
 @notice The `ReserveVault` contracts allows providers to open cryptocurrency reserve fund and withdraw them on demand.

 @dev    The fund is determined by a `quantity` value and denominations for each currency.
 @dev    Provision or withdrawal operations must specify a `quantity` to indicate equivalent values, calculated by
         multiplying with predefined denomination of each currency.
 @dev    The fund need to specify a main currency, other extras are optional.

### ProviderAuthorization

```solidity
event ProviderAuthorization(address account)
```

@notice Emitted when an account is authorized as a provider.

         Name        Description
 @param  account     Authorized address.

### ProviderDeauthorization

```solidity
event ProviderDeauthorization(address account)
```

@notice Emitted when a provider is deauthorized.

         Name        Description
 @param  account     Deauthorized address.

### NewFund

```solidity
event NewFund(uint256 fundId, address provider, address mainCurrency, uint256 mainDenomination, address[] extraCurrencies, uint256[] extraDenominations)
```

@notice Emitted when a new fund is opened.

         Name                Description
 @param  fundId              Fund identifier.
 @param  provider            Provider address.
 @param  mainCurrency        Main currency address.
 @param  mainDenomination    Main currency denomination.
 @param  extraCurrencies     Array of extra currency addresses.
 @param  extraDenominations  Array of extra currency denominations, respective to each extra currency.

### FundExpansion

```solidity
event FundExpansion(uint256 fundId, uint256 quantity)
```

@notice Emitted when a fund is expanded.

         Name                Description
 @param  fundId              Fund identifier.
 @param  quantity            Expanded quantity.

### FundProvision

```solidity
event FundProvision(uint256 fundId)
```

@notice Emitted when a fund is fully provided.

         Name                Description
 @param  fundId              Fund identifier.

### FundWithdrawal

```solidity
event FundWithdrawal(uint256 fundId, address receiver, uint256 quantity)
```

@notice Emitted when value is withdrawn from a fund.

         Name                Description
 @param  fundId              Fund identifier.
 @param  receiver            Receiver address.
 @param  quantity            Withdrawn quantity.

### AlreadyProvided

```solidity
error AlreadyProvided()
```

===== ERROR ===== *

### InvalidDenomination

```solidity
error InvalidDenomination()
```

### InvalidExpanding

```solidity
error InvalidExpanding()
```

### InvalidFundId

```solidity
error InvalidFundId()
```

### isProvider

```solidity
function isProvider(address account) external view returns (bool isProvider)
```

Name        Description
 @param  account     EVM address.
 @return isProvider  Whether the account is an authorized provider.

### fundNumber

```solidity
function fundNumber() external view returns (uint256 fundNumber)
```

Name        Description
 @return fundNumber  Number of funds.

### getFund

```solidity
function getFund(uint256 fundId) external view returns (struct IFund.Fund fund)
```

Name            Description
 @param  fundId          Fund identifier.
 @return fund            Configuration and reserves of the fund.

### isFundSufficient

```solidity
function isFundSufficient(uint256 fundId) external view returns (bool isSufficient)
```

Name            Description
 @param  fundId          Fund identifier.
 @return isSufficient    Whether the fund is provided sufficiently for the current quantity.

### openFund

```solidity
function openFund(address mainCurrency, uint256 mainDenomination, address[] extraCurrencies, uint256[] extraDenominations) external returns (uint256 fundId)
```

@notice Open a new fund.

         Name                Description
 @param  mainCurrency        Main currency address.
 @param  mainDenomination    Main currency denomination.
 @param  extraCurrencies     Array of extra currency addresses.
 @param  extraDenominations  Array of extra currency denominations, respective to each extra currency.

 @return fundId              New fund identifier.

 @dev    Permission: Providers.

### expandFund

```solidity
function expandFund(uint256 fundId, uint256 quantity) external
```

@notice Expand a fund.

         Name                Description
 @param  fundId              Fund identifier.
 @param  quantity            Expanded quantity.

 @dev    Permission: Provider of the fund.

### provideFund

```solidity
function provideFund(uint256 fundId) external payable
```

@notice Provide sufficiently to a fund.

         Name                Description
 @param  fundId              Fund identifier.

 @dev    Permission: Provider of the fund.

### withdrawFund

```solidity
function withdrawFund(uint256 fundId, address receiver, uint256 quantity) external
```

@notice Withdraw value from a fund to an account.

         Name                Description
 @param  fundId              Fund identifier.
 @param  receiver            Receiver address.
 @param  quantity            Withdrawn quantity.

 @dev    Permission: Provider of the fund.

