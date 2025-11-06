# Solidity API

## CommissionToken

@author Briky Team

 @notice The `CommissionToken` contract is codependent with the `EstateToken` contract. For each newly tokenized estate,
         it will issue a unique corresponding token that represents the commission fraction shareable to its owner from
         incomes of designated operators involving the estate.

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
function initialize(address _admin, address _estateToken, address _feeReceiver, string _name, string _symbol, string _uri, uint256 _royaltyRate) external
```

@notice Initialize the contract after deployment, serving as the constructor.

         Name            Description
 @param  _admin          `Admin` contract address.
 @param  _estateToken    `EstateToken` contract address.
 @param  _feeReceiver    `FeeReceiver` contract address.
 @param  _name           Token name.
 @param  _symbol         Token symbol.
 @param  _uri            Base URI.
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

### updateRoyaltyRate

```solidity
function updateRoyaltyRate(uint256 _royaltyRate, bytes[] _signatures) external
```

@notice Update the default royalty rate.

         Name            Description
 @param  _royaltyRate    New default royalty rate.
 @param  _signatures     Array of admin signatures.

 @dev    Administrative operator.

### getCommissionRate

```solidity
function getCommissionRate(uint256 _tokenId) public view returns (struct IRate.Rate)
```

Name        Description
 @param  _tokenId    Token identifier.

 @return Commission rate of the token identifier.

### getBrokerCommissionRate

```solidity
function getBrokerCommissionRate(bytes32 _zone, address _broker) external view returns (struct IRate.Rate)
```

Name        Description
 @param  _zone       Zone code.
 @param  _broker     Broker address.

 @return Commission rate of the broker in the zone.

### commissionInfo

```solidity
function commissionInfo(uint256 _tokenId, uint256 _value) external view returns (address, uint256)
```

Name        Description
 @param  _tokenId    Token identifier.
 @param  _value      Value.

 @return Commission receiver address.
 @return Commission derived from the value.

### getRoyaltyRate

```solidity
function getRoyaltyRate(uint256) external view returns (struct IRate.Rate)
```

@return Royalty rate of the token identifier.

### tokenURI

```solidity
function tokenURI(uint256 _tokenId) public view returns (string)
```

Name            Description
 @param  _tokenId        Token identifier.

 @return Token URI.

### supportsInterface

```solidity
function supportsInterface(bytes4 _interfaceId) public view returns (bool)
```

Name            Description
 @param  _interfaceId    Interface identifier.

 @return Whether this contract implements the interface.

### registerBroker

```solidity
function registerBroker(bytes32 _zone, address _broker, uint256 _commissionRate) external
```

@notice Register a broker in a zone.

         Name                Description
 @param  _zone               Zone code.
 @param  _broker             Broker address.
 @param  _commissionRate     Commission rate.

 @dev    Permission: Managers in the zone.

### activateBroker

```solidity
function activateBroker(bytes32 _zone, address _broker, bool _isActive) external
```

@notice Activate or deactivate a broker in a zone.

         Name            Description
 @param  _zone           Zone code.
 @param  _broker         Broker address.
 @param  _isActive       Whether the operation is activating or deactivating.

 @dev    Permission: Managers in the zone.

### mint

```solidity
function mint(bytes32 _zone, address _broker, uint256 _tokenId) external
```

@notice Mint a commission token.

         Name        Description
 @param  _zone       Zone code.
 @param  _broker     Associated broker address.
 @param  _tokenId    Token identifier to be minted.

### _baseURI

```solidity
function _baseURI() internal view returns (string)
```

@return Prefix of all token URI.

### _mint

```solidity
function _mint(address _to, uint256 _tokenId) internal
```

@notice Mint a token.

         Name            Description
 @param  _to             To address.
 @param  _tokenId        Token identifier.

### _royaltyReceiver

```solidity
function _royaltyReceiver() internal view returns (address)
```

@return Default royalty receiver address.

