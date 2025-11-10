# ProjectMortgageToken

Interface for contract `IProjectMortgageToken`.

A `IProjectMortgageToken` contract facilitates peer-to-peer lending secured by project tokens as collateral. Each
provided mortgage is tokenized into an ERC-721 token, whose owner has the right to receive repayments from the
borrower or foreclose on the collateral from the contract once overdue.

{% hint style="info" %}
ERC-20 tokens are identified by their contract addresses.
Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
{% endhint %}

## initialize

```solidity
function initialize(address _admin, address _projectToken, address _feeReceiver, string _name, string _symbol, string _uri, uint256 _feeRate) external
```

Initialize the contract after deployment, serving as the constructor.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _admin | address | `Admin` contract address. |
| _projectToken | address | `ProjectToken` contract address. |
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

## getCollateral

```solidity
function getCollateral(uint256 _mortgageId) external view returns (struct IAssetCollateral.AssetCollateral)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _mortgageId | uint256 | Mortgage identifier. |

### Return Values

Collateral information.

## supportsInterface

```solidity
function supportsInterface(bytes4 _interfaceId) public view returns (bool)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _interfaceId | bytes4 | Interface identifier. |

### Return Values

Whether this contract supports the interface.

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

receiver        Royalty receiver address.

royalty         Royalty derived from the reference value.

## borrow

```solidity
function borrow(uint256 _projectId, uint256 _amount, uint256 _principal, uint256 _repayment, address _currency, uint40 _duration) external returns (uint256)
```

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
| _projectId | uint256 | Project identifier. |
| _amount | uint256 | Collateral amount. |
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

