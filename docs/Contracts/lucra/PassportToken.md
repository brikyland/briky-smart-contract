# Solidity API

## PassportToken

Interface for contract `PassportToken`.
The `PassportToken` contract is an ERC-721 token issued exclusively for airdrop campaigns. It grants its
minter airdrop privileges, and each account may mint only one passport.

### receive

```solidity
receive() external payable
```

Executed on a call to this contract with empty calldata.

### version

```solidity
function version() external pure returns (string)
```

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | Version of implementation. |

### initialize

```solidity
function initialize(address _admin, string _name, string _symbol, string _uri, uint256 _fee, uint256 _royaltyRate) external
```

Initialize the contract after deployment, serving as the constructor.

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _admin | address | `Admin` contract address. |
| _name | string | Token name. |
| _symbol | string | Token symbol. |
| _uri | string | Base URI. |
| _fee | uint256 | Minting fee. |
| _royaltyRate | uint256 | Default royalty rate. |

### updateBaseURI

```solidity
function updateBaseURI(string _uri, bytes[] _signatures) external
```

Update the base URI.

Name            Description

_Administrative operator._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _uri | string | New base URI. |
| _signatures | bytes[] | Array of admin signatures. |

### updateFee

```solidity
function updateFee(uint256 _fee, bytes[] _signatures) external
```

Update the minting fee.

Name            Description

_Administrative operator._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _fee | uint256 | New minting fee. |
| _signatures | bytes[] | Array of admin signatures. |

### updateRoyaltyRate

```solidity
function updateRoyaltyRate(uint256 _royaltyRate, bytes[] _signatures) external
```

Update the default royalty rate.

Name            Description

_Administrative operator._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _royaltyRate | uint256 | New default royalty rate. |
| _signatures | bytes[] | Array of admin signatures. |

### withdraw

```solidity
function withdraw(address _receiver, address[] _currencies, uint256[] _values, bytes[] _signatures) external
```

Withdraw sufficient amounts in multiple cryptocurrencies from this contract to an account.

Name            Description

_Administrative operator.
   Used to withdraw fee and royalty._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _receiver | address | Receiver address. |
| _currencies | address[] | Array of withdrawn currency addresses. |
| _values | uint256[] | Array of withdraw values, respective to each currency. |
| _signatures | bytes[] | Array of admin signatures. |

### getRoyaltyRate

```solidity
function getRoyaltyRate(uint256) external view returns (struct IRate.Rate)
```

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct IRate.Rate | Royalty rate of the token identifier. |

### tokenURI

```solidity
function tokenURI(uint256) public view returns (string)
```

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | Token URI. |

### supportsInterface

```solidity
function supportsInterface(bytes4 _interfaceId) public view returns (bool)
```

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _interfaceId | bytes4 | Interface identifier. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | Whether this contract implements the interface. |

### mint

```solidity
function mint() external payable returns (uint256)
```

Mint the passport token to an account.
Mint only once for each account.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Minted token identifier. |

### _royaltyReceiver

```solidity
function _royaltyReceiver() internal view returns (address)
```

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | Default royalty receiver address. |

