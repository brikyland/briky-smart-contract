# Solidity API

## EstateMortgageToken

A `IEstateMortgageToken` contract facilitates peer-to-peer lending secured by estate tokens as collateral. Each
provided mortgage is tokenized into an ERC-721 token, whose owner has the right to receive repayments from the
borrower or foreclose on the collateral from the contract once overdue.

_ERC-20 tokens are identified by their contract addresses.
Native coin is represented by the zero address (0x0000000000000000000000000000000000000000)._

### initialize

```solidity
function initialize(address _admin, address _estateToken, address _feeReceiver, string _name, string _symbol, string _uri, uint256 _feeRate) external
```

Initialize the contract after deployment, serving as the constructor.

Name           Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _admin | address | `Admin` contract address. |
| _estateToken | address | `EstateToken` contract address. |
| _feeReceiver | address | `FeeReceiver` contract address. |
| _name | string | Token name. |
| _symbol | string | Token symbol. |
| _uri | string | Base URI. |
| _feeRate | uint256 | Borrowing fee rate. |

### version

```solidity
function version() external pure returns (string)
```

Name       Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | version    Version of implementation. |

### getCollateral

```solidity
function getCollateral(uint256 _mortgageId) external view returns (struct IAssetCollateral.AssetCollateral)
```

Name           Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _mortgageId | uint256 | Mortgage identifier. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct IAssetCollateral.AssetCollateral | Collateral information. |

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
| [0] | bool | Whether this contract supports the interface. |

### royaltyInfo

```solidity
function royaltyInfo(uint256 _tokenId, uint256 _price) external view returns (address, uint256)
```

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenId | uint256 | Token identifier. |
| _price | uint256 | Reference value. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | receiver        Royalty receiver address. |
| [1] | uint256 | royalty         Royalty derived from the reference value. |

### borrow

```solidity
function borrow(uint256 _estateId, uint256 _amount, uint256 _principal, uint256 _repayment, address _currency, uint40 _duration) external returns (uint256)
```

List a new mortgage offer with estate tokens as collateral.

Name        Description

_Approval must be granted for this contract to transfer collateral before borrowing. A mortgage can only be
lent while approval remains active.
   Collateral will be secured in the contract until the mortgage is either repaid, foreclosed, or cancelled._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _estateId | uint256 | Estate identifier. |
| _amount | uint256 | Collateral amount. |
| _principal | uint256 | Principal value. |
| _repayment | uint256 | Repayment value. |
| _currency | address | Currency address. |
| _duration | uint40 | Borrowing duration. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | New mortgage identifier. |

### _transferCollateral

```solidity
function _transferCollateral(uint256 _mortgageId, address _from, address _to) internal
```

Transfer the collateral of a mortgage.

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _mortgageId | uint256 | Mortgage identifier. |
| _from | address | Sender address. |
| _to | address | Receiver address. |

### _chargeFee

```solidity
function _chargeFee(uint256 _mortgageId) internal
```

Charge borrowing fee.

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _mortgageId | uint256 | Mortgage identifier. |

