# Solidity API

## RoyaltyCollection

### admin

```solidity
address admin
```

Name        Description
 @return admin       `Admin` contract address.

### royaltyReceiver

```solidity
address royaltyReceiver
```

### royaltyRate

```solidity
uint256 royaltyRate
```

### tokenNumber

```solidity
uint256 tokenNumber
```

### initialize

```solidity
function initialize(address _admin, address _feeReceiver, uint256 _royaltyRate, string _name, string _symbol) external
```

### version

```solidity
function version() external pure returns (string)
```

Name        Description
 @return version     Version of implementation.

### updateRoyaltyRate

```solidity
function updateRoyaltyRate(uint256 _rate) external
```

### updateRoyaltyReceiver

```solidity
function updateRoyaltyReceiver(address _receiver) external
```

### mint

```solidity
function mint(address _account, uint256 _tokenId) external
```

### burn

```solidity
function burn(uint256 _tokenId) external
```

### supportsInterface

```solidity
function supportsInterface(bytes4 _interfaceId) public view returns (bool)
```

### getRoyaltyRate

```solidity
function getRoyaltyRate(uint256) public view returns (struct IRate.Rate rate)
```

### _royaltyReceiver

```solidity
function _royaltyReceiver() internal view virtual returns (address)
```

Name                Description
 @return royaltyReceiver     Default royalty receiver address.

### _beforeTokenTransfer

```solidity
function _beforeTokenTransfer(address _from, address _to, uint256 _firstTokenId, uint256 _batchSize) internal
```

