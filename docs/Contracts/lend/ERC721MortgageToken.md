# ERC721MortgageToken

A `ERC721MortgageToken` contract facilitates peer-to-peer lending secured by ERC-721 tokens as collateral. Each
provided mortgage is tokenized into an ERC-721 token, whose owner has the right to receive repayments from the
borrower or foreclose on the collateral from the contract once overdue.

{% hint style="info" %}
ERC-20 tokens are identified by their contract addresses.
Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
{% endhint %}

## initialize

```solidity
function initialize(address _admin, address _feeReceiver, string _name, string _symbol, string _uri, uint256 _feeRate) external
```

Initialize the contract after deployment, serving as the constructor.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _admin | address | `Admin` contract address. |
| _feeReceiver | address | `FeeReceiver` contract address. |
| _name | string | Token name. |
| _symbol | string | Token symbol. |
| _uri | string | Base URI. |
| _feeRate | uint256 | Borrowing fee rate. |

## version

```solidity
function version() external pure returns (string)
```

### Return Values

version    Version of implementation.

## registerCollaterals

```solidity
function registerCollaterals(address[] _tokens, bool _isCollateral, bytes[] _signatures) external
```

Register or deregister collections as collaterals.

{% hint style="info" %}
Administrative operator.

{% endhint %}

{% hint style="info" %}
Collections must support interface `IERC721Upgradeable`.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokens | address[] | Array of collection addresses to register or deregister. |
| _isCollateral | bool | Whether the operation is register or deregister. |
| _signatures | bytes[] | Array of admin signatures. |

## getCollateral

```solidity
function getCollateral(uint256 _mortgageId) external view returns (struct IERC721Collateral.ERC721Collateral)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _mortgageId | uint256 | Mortgage identifier. |

### Return Values

Collateral information.

## royaltyInfo

```solidity
function royaltyInfo(uint256 _tokenId, uint256 _price) external view returns (address, uint256)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenId | uint256 | Token identifier. |
| _price | uint256 | Reference value. |

### Return Values

receiver    Royalty receiver address.

royalty     Royalty derived from the reference value.

## borrow

```solidity
function borrow(address _token, uint256 _tokenId, uint256 _principal, uint256 _repayment, address _currency, uint40 _duration) external returns (uint256)
```

List a new mortgage offer with an ERC-721 token as collateral.

{% hint style="info" %}
The collection must support interface `IERC721Upgradeable`.

{% endhint %}

{% hint style="info" %}
Approval must be granted for this contract to transfer collateral before borrowing. A mortgage can only be
lent while approval remains active.

{% endhint %}

{% hint style="info" %}
Collateral will be secured in the contract until the mortgage is either repaid, foreclosed, or cancelled.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _token | address | Collateral contract address. |
| _tokenId | uint256 | Collateral token identifier. |
| _principal | uint256 | Principal value. |
| _repayment | uint256 | Repayment value. |
| _currency | address | Currency address. |
| _duration | uint40 | Borrowing duration. |

### Return Values

mortgageId    New mortgage identifier.

## _transferCollateral

```solidity
function _transferCollateral(uint256 _mortgageId, address _from, address _to) internal
```

Transfer the collateral of a mortgage.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _mortgageId | uint256 | Mortgage identifier. |
| _from | address | Sender address. |
| _to | address | Receiver address. |

