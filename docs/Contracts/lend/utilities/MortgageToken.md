# Solidity API

## MortgageToken

A `MortgageToken` contract facilitates peer-to-peer lending secured by crypto collateral. Each provided mortgage
is tokenized into an ERC-721 token, whose owner has the right to receive repayments from the borrower or foreclose
on the collateral from the contract once overdue.

_ERC-20 tokens are identified by their contract addresses.
Native coin is represented by the zero address (0x0000000000000000000000000000000000000000)._

### validMortgage

```solidity
modifier validMortgage(uint256 _mortgageId)
```

Verify a mortgage identifier is valid.

Name           Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _mortgageId | uint256 | Mortgage identifier. |

### receive

```solidity
receive() external payable
```

Executed on a call to this contract with empty calldata.

### __MortgageToken_init

```solidity
function __MortgageToken_init(address _admin, address _feeReceiver, string _name, string _symbol, string _uri, uint256 _feeRate) internal
```

Initialize `MortgageToken`.

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _admin | address | `Admin` contract address. |
| _feeReceiver | address | `FeeReceiver` contract address. |
| _name | string | Token name. |
| _symbol | string | Token symbol. |
| _uri | string | Base URI. |
| _feeRate | uint256 | Borrowing fee rate. |

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

### updateFeeRate

```solidity
function updateFeeRate(uint256 _feeRate, bytes[] _signatures) external
```

Update the borrowing fee rate.

Name            Description

_Administrative operator._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _feeRate | uint256 | New borrowing fee rate. |
| _signatures | bytes[] | Array of admin signatures. |

### getFeeRate

```solidity
function getFeeRate() external view returns (struct IRate.Rate)
```

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct IRate.Rate | Borrowing fee rate. |

### getMortgage

```solidity
function getMortgage(uint256 _mortgageId) external view returns (struct IMortgage.Mortgage)
```

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _mortgageId | uint256 | Mortgage identifier. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct IMortgage.Mortgage | Configuration and progress of the mortgage. |

### tokenURI

```solidity
function tokenURI(uint256 _tokenId) public view returns (string)
```

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenId | uint256 | Token identifier. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | Token URI. |

### supportsInterface

```solidity
function supportsInterface(bytes4 _interfaceId) public view virtual returns (bool)
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

### cancel

```solidity
function cancel(uint256 _mortgageId) external virtual
```

Cancel a mortgage.
Cancel only if the mortgage is in `Pending` state.

Name            Description

_Permission:
- Borrower of the mortgage.
- Managers: disqualify defected mortgages only._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _mortgageId | uint256 | Mortgage identifier. |

### lend

```solidity
function lend(uint256 _mortgageId) external payable virtual returns (uint40)
```

Lend a mortgage.
Lend only if the mortgage is in `Pending` state.
Mint new token associated with the mortgage.

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _mortgageId | uint256 | Mortgage identifier. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint40 | Maturity timestamp. |

### safeLend

```solidity
function safeLend(uint256 _mortgageId, uint256 _anchor) external payable virtual returns (uint40)
```

Lend a mortgage.
Lend only if the mortgage is in `Pending` state.
Mint new token associated with the mortgage.

Name            Description

_Anchor enforces consistency between this contract and the client-side._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _mortgageId | uint256 | Mortgage identifier. |
| _anchor | uint256 | `principal` of the mortgage. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint40 | Maturity timestamp. |

### repay

```solidity
function repay(uint256 _mortgageId) external payable virtual
```

Repay a mortgage.
Repay only if the mortgage is in `Supplied` state and not overdue.
Burn the token associated with the mortgage.

Name            Description

_Permission: Borrower of the mortgage._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _mortgageId | uint256 | Mortgage identifier. |

### safeRepay

```solidity
function safeRepay(uint256 _mortgageId, uint256 _anchor) external payable virtual
```

Repay a mortgage.
Repay only if the mortgage is in `Supplied` state and not overdue.
Burn the token associated with the mortgage.

Name            Description

_Permission: Borrower of the mortgage.
   Anchor enforces consistency between this contract and the client-side._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _mortgageId | uint256 | Mortgage identifier. |
| _anchor | uint256 | `repayment` of the mortgage. |

### foreclose

```solidity
function foreclose(uint256 _mortgageId) external virtual
```

Foreclose on the collateral of a mortgage.
Foreclose only if the mortgage is overdue.
Burn the token associated with the mortgage.

Name            Description

_The collateral is transferred to the mortgage token owner._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _mortgageId | uint256 | Mortgage identifier. |

### _baseURI

```solidity
function _baseURI() internal view returns (string)
```

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | Prefix of all token URI. |

### _mint

```solidity
function _mint(address _to, uint256 _tokenId) internal
```

Mint a token.

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _to | address | Receiver address. |
| _tokenId | uint256 | Token identifier. |

### _burn

```solidity
function _burn(uint256 _tokenId) internal
```

Burn a token.

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenId | uint256 | Token identifier. |

### _borrow

```solidity
function _borrow(uint256 _principal, uint256 _repayment, address _currency, uint40 _duration) internal returns (uint256)
```

List a new mortgage.

Name            Description

_Approval must be granted for this contract to transfer collateral before borrowing. A mortgage can only be
lent while approval remains active._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _principal | uint256 | Principal value. |
| _repayment | uint256 | Repayment value. |
| _currency | address | Currency address. |
| _duration | uint40 | Borrowing duration. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | New mortgage identifier. |

### _lend

```solidity
function _lend(uint256 _mortgageId) internal returns (uint40)
```

Lend a mortgage.
Mint the token associated with the mortgage.

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _mortgageId | uint256 | Mortgage identifier. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint40 | Repayment due timestamp. |

### _repay

```solidity
function _repay(uint256 _mortgageId) internal
```

Repay a mortgage.
Burn the token associated with the mortgage.

Name            Description

_Permission: Borrower of the mortgage._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _mortgageId | uint256 | Mortgage identifier. |

### _chargeFee

```solidity
function _chargeFee(uint256 _mortgageId) internal virtual
```

Charge borrowing fee.

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _mortgageId | uint256 | Mortgage identifier. |

### _transferCollateral

```solidity
function _transferCollateral(uint256 _mortgageId, address _from, address _to) internal virtual
```

Transfer the collateral of a mortgage.

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _mortgageId | uint256 | Mortgage identifier. |
| _from | address | Sender address. |
| _to | address | Receiver address. |

