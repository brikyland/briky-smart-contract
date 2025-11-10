# CommissionToken

The `CommissionToken` contract is codependent with the `EstateToken` contract. For each newly tokenized estate,
it will issue a unique corresponding token that represents the commission fraction shareable to its owner from
incomes of designated operators involving the estate.

## receive

```solidity
receive() external payable
```

Executed on a call to this contract with empty calldata.

## version

```solidity
function version() external pure returns (string)
```

### Return Values

Version of implementation.

## initialize

```solidity
function initialize(address _admin, address _estateToken, address _feeReceiver, string _name, string _symbol, string _uri, uint256 _royaltyRate) external
```

Initialize the contract after deployment, serving as the constructor.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _admin | address | `Admin` contract address. |
| _estateToken | address | `EstateToken` contract address. |
| _feeReceiver | address | `FeeReceiver` contract address. |
| _name | string | Token name. |
| _symbol | string | Token symbol. |
| _uri | string | Base URI. |
| _royaltyRate | uint256 | Default royalty rate. |

## updateBaseURI

```solidity
function updateBaseURI(string _uri, bytes[] _signatures) external
```

Update the base URI.

{% hint style="info" %}
Administrative operator.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _uri | string | New base URI. |
| _signatures | bytes[] | Array of admin signatures. |

## updateRoyaltyRate

```solidity
function updateRoyaltyRate(uint256 _royaltyRate, bytes[] _signatures) external
```

Update the default royalty rate.

{% hint style="info" %}
Administrative operator.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _royaltyRate | uint256 | New default royalty rate. |
| _signatures | bytes[] | Array of admin signatures. |

## getCommissionRate

```solidity
function getCommissionRate(uint256 _tokenId) public view returns (struct IRate.Rate)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenId | uint256 | Token identifier. |

### Return Values

Commission rate of the token identifier.

## getBrokerCommissionRate

```solidity
function getBrokerCommissionRate(bytes32 _zone, address _broker) external view returns (struct IRate.Rate)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _zone | bytes32 | Zone code. |
| _broker | address | Broker address. |

### Return Values

Commission rate of the broker in the zone.

## commissionInfo

```solidity
function commissionInfo(uint256 _tokenId, uint256 _value) external view returns (address, uint256)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenId | uint256 | Token identifier. |
| _value | uint256 | Value. |

### Return Values

Commission receiver address.

Commission derived from the value.

## getRoyaltyRate

```solidity
function getRoyaltyRate(uint256) external view returns (struct IRate.Rate)
```

### Return Values

Royalty rate of the token identifier.

## tokenURI

```solidity
function tokenURI(uint256 _tokenId) public view returns (string)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenId | uint256 | Token identifier. |

### Return Values

Token URI.

## supportsInterface

```solidity
function supportsInterface(bytes4 _interfaceId) public view returns (bool)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _interfaceId | bytes4 | Interface identifier. |

### Return Values

Whether this contract implements the interface.

## registerBroker

```solidity
function registerBroker(bytes32 _zone, address _broker, uint256 _commissionRate) external
```

Register a broker in a zone.

{% hint style="info" %}
Permission: Managers in the zone.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _zone | bytes32 | Zone code. |
| _broker | address | Broker address. |
| _commissionRate | uint256 | Commission rate. |

## activateBroker

```solidity
function activateBroker(bytes32 _zone, address _broker, bool _isActive) external
```

Activate or deactivate a broker in a zone.

{% hint style="info" %}
Permission: Managers in the zone.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _zone | bytes32 | Zone code. |
| _broker | address | Broker address. |
| _isActive | bool | Whether the operation is activating or deactivating. |

## mint

```solidity
function mint(bytes32 _zone, address _broker, uint256 _tokenId) external
```

Mint a commission token.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _zone | bytes32 | Zone code. |
| _broker | address | Associated broker address. |
| _tokenId | uint256 | Token identifier to be minted. |

## _baseURI

```solidity
function _baseURI() internal view returns (string)
```

### Return Values

Prefix of all token URI.

## _mint

```solidity
function _mint(address _to, uint256 _tokenId) internal
```

Mint a token.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _to | address | To address. |
| _tokenId | uint256 | Token identifier. |

## _royaltyReceiver

```solidity
function _royaltyReceiver() internal view returns (address)
```

### Return Values

Default royalty receiver address.

