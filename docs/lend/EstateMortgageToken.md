# Solidity API

## EstateMortgageToken

@author Briky Team

 @notice A `IEstateMortgageToken` contract facilitates peer-to-peer lending secured by estate tokens as collateral. Each
         provided mortgage is tokenized into an ERC-721 token, whose owner has the right to receive repayments from the
         borrower or foreclose on the collateral from the contract once overdue.

 @dev    ERC-20 tokens are identified by their contract addresses.
         Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).

### initialize

```solidity
function initialize(address _admin, address _estateToken, address _feeReceiver, string _name, string _symbol, string _uri, uint256 _feeRate) external
```

@notice Initialize the contract after deployment, serving as the constructor.

         Name           Description
 @param  _admin         `Admin` contract address.
 @param  _estateToken   `EstateToken` contract address.
 @param  _feeReceiver   `FeeReceiver` contract address.
 @param  _name          Token name.
 @param  _symbol        Token symbol.
 @param  _uri           Base URI.
 @param  _feeRate       Borrowing fee rate.

### version

```solidity
function version() external pure returns (string)
```

Name       Description
 @return version    Version of implementation.

### getCollateral

```solidity
function getCollateral(uint256 _mortgageId) external view returns (struct IAssetCollateral.AssetCollateral)
```

Name           Description
 @param  _mortgageId    Mortgage identifier.

 @return Collateral information.

### supportsInterface

```solidity
function supportsInterface(bytes4 _interfaceId) public view returns (bool)
```

Name            Description
 @param  _interfaceId    Interface identifier.

 @return Whether this contract supports the interface.

### royaltyInfo

```solidity
function royaltyInfo(uint256 _tokenId, uint256 _price) external view returns (address, uint256)
```

Name            Description
 @param  _tokenId        Token identifier.
 @param  _price          Reference value.

 @return receiver        Royalty receiver address.
 @return royalty         Royalty derived from the reference value.

### borrow

```solidity
function borrow(uint256 _estateId, uint256 _amount, uint256 _principal, uint256 _repayment, address _currency, uint40 _duration) external returns (uint256)
```

@notice List a new mortgage offer with estate tokens as collateral.

         Name        Description
 @param  _estateId   Estate identifier.
 @param  _amount     Collateral amount.
 @param  _principal  Principal value.
 @param  _repayment  Repayment value.
 @param  _currency   Currency address.
 @param  _duration   Borrowing duration.

 @return New mortgage identifier.

 @dev    Approval must be granted for this contract to transfer collateral before borrowing. A mortgage can only be
         lent while approval remains active.
 @dev    Collateral will be secured in the contract until the mortgage is either repaid, foreclosed, or cancelled.

### _transferCollateral

```solidity
function _transferCollateral(uint256 _mortgageId, address _from, address _to) internal
```

@notice Transfer the collateral of a mortgage.

         Name            Description
 @param  _mortgageId     Mortgage identifier.
 @param  _from           Sender address.
 @param  _to             Receiver address.

### _chargeFee

```solidity
function _chargeFee(uint256 _mortgageId) internal
```

@notice Charge borrowing fee.

         Name            Description
 @param  _mortgageId     Mortgage identifier.

