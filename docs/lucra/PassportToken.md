# Solidity API

## PassportToken

@author Briky Team

 @notice Interface for contract `PassportToken`.
 @notice The `PassportToken` contract is an ERC-721 token issued exclusively for airdrop campaigns. It grants its
         minter airdrop privileges, and each account may mint only one passport.

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
function initialize(address _admin, string _name, string _symbol, string _uri, uint256 _fee, uint256 _royaltyRate) external
```

@notice Initialize the contract after deployment, serving as the constructor.

         Name            Description
 @param  _admin          `Admin` contract address.
 @param  _name           Token name.
 @param  _symbol         Token symbol.
 @param  _uri            Base URI.
 @param  _fee            Minting fee.
 @param  _royaltyRate    Default royalty rate.

### updateBaseURI

```solidity
function updateBaseURI(string _uri, bytes[] _signatures) external
```

@notice Update the base URI.

         Name            Description
 @param  _uri            New base URI.
 @param  _signatures     Array of admin signatures.

 @dev    Administrative operator.

### updateFee

```solidity
function updateFee(uint256 _fee, bytes[] _signatures) external
```

@notice Update the minting fee.

         Name            Description
 @param  _fee            New minting fee.
 @param  _signatures     Array of admin signatures.

 @dev    Administrative operator.

### updateRoyaltyRate

```solidity
function updateRoyaltyRate(uint256 _royaltyRate, bytes[] _signatures) external
```

@notice Update the default royalty rate.

         Name            Description
 @param  _royaltyRate    New default royalty rate.
 @param  _signatures     Array of admin signatures.

 @dev    Administrative operator.

### withdraw

```solidity
function withdraw(address _receiver, address[] _currencies, uint256[] _values, bytes[] _signatures) external
```

@notice Withdraw sufficient amounts in multiple cryptocurrencies from this contract to an account.

         Name            Description
 @param  _receiver       Receiver address.
 @param  _currencies     Array of withdrawn currency addresses.
 @param  _values         Array of withdraw values, respective to each currency.
 @param  _signatures     Array of admin signatures.

 @dev    Administrative operator.
 @dev    Used to withdraw fee and royalty.

### getRoyaltyRate

```solidity
function getRoyaltyRate(uint256) external view returns (struct IRate.Rate)
```

@return Royalty rate of the token identifier.

### tokenURI

```solidity
function tokenURI(uint256) public view returns (string)
```

@return Token URI.

### supportsInterface

```solidity
function supportsInterface(bytes4 _interfaceId) public view returns (bool)
```

Name            Description
 @param  _interfaceId    Interface identifier.

 @return Whether this contract implements the interface.

### mint

```solidity
function mint() external payable returns (uint256)
```

@notice Mint the passport token to an account.
 @notice Mint only once for each account.

 @return Minted token identifier.

### _royaltyReceiver

```solidity
function _royaltyReceiver() internal view returns (address)
```

@return Default royalty receiver address.

