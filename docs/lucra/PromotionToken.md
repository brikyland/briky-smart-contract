# Solidity API

## PromotionToken

@author Briky Team

 @notice Interface for contract `PromotionToken`.
 @notice The `PromotionToken` contract is an ERC-721 token issued exclusively for airdrop campaigns. It provides
         limited-time content that grants its minter airdrop scores.

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
function initialize(address _admin, string _name, string _symbol, uint256 _fee, uint256 _royaltyRate) external
```

@notice Initialize the contract after deployment, serving as the constructor.

         Name            Description
 @param  _admin          `Admin` contract address.
 @param  _name           Token name.
 @param  _symbol         Token symbol.
 @param  _fee            Minting fee.
 @param  _royaltyRate    Default royalty rate.

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

### createContents

```solidity
function createContents(string[] _uris, uint40[] _startAts, uint40[] _durations, bytes[] _signatures) external
```

@notice Create new contents.

         Name            Description
 @param  _uris           Array of content URIs, respective to each content.
 @param  _startAts       Array of start timestamps for minting, respective to each content.
 @param  _durations      Array of mintable durations, respective to each content.
 @param  _signatures     Array of admin signatures.

 @dev    Administrative operator.

### updateContentURIs

```solidity
function updateContentURIs(uint256[] _contentIds, string[] _uris, bytes[] _signatures) external
```

@notice Update URIs of multiple contents.

         Name            Description
 @param  _contentIds     Array of content identifiers.
 @param  _uris           Array of new URIs, respectively for each content.
 @param  _signatures     Array of admin signatures.

 @dev    Administrative operator.

### cancelContents

```solidity
function cancelContents(uint256[] _contentIds, bytes[] _signatures) external
```

@notice Cancel multiple contents.

         Name            Description
 @param  _contentIds     Array of content identifiers.
 @param  _signatures     Array of admin signatures.

 @dev    Administrative operator.

### getContent

```solidity
function getContent(uint256 _contentId) public view returns (struct IContent.Content)
```

Name            Description
 @param  _contentId      Content identifier.

 @return Content information.

### tokenURI

```solidity
function tokenURI(uint256 _tokenId) public view returns (string)
```

Name        Description
 @param  _tokenId    Token identifier.

 @return Token URI.

### getRoyaltyRate

```solidity
function getRoyaltyRate(uint256) external view returns (struct IRate.Rate)
```

@return Royalty rate of the token identifier.

### supportsInterface

```solidity
function supportsInterface(bytes4 _interfaceId) public view returns (bool)
```

Name            Description
 @param  _interfaceId    Interface identifier.

 @return Whether this contract implements the interface.

### mint

```solidity
function mint(uint256 _contentId, uint256 _amount) external payable returns (uint256, uint256)
```

@notice Mint tokens of a content.

         Name            Description
 @param  _contentId      Content identifier.
 @param  _amount         Number of tokens to mint.

 @return First token identifier of the minted tokens.
 @return Last token identifier of the minted tokens.

### _royaltyReceiver

```solidity
function _royaltyReceiver() internal view returns (address)
```

@return Default royalty receiver address.

