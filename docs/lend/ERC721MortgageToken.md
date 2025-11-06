# Solidity API

## ERC721MortgageToken

@author Briky Team

 @notice A `ERC721MortgageToken` contract facilitates peer-to-peer lending secured by ERC-721 tokens as collateral. Each
         provided mortgage is tokenized into an ERC-721 token, whose owner has the right to receive repayments from the
         borrower or foreclose on the collateral from the contract once overdue.

 @dev    ERC-20 tokens are identified by their contract addresses.
         Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).

### initialize

```solidity
function initialize(address _admin, address _feeReceiver, string _name, string _symbol, string _uri, uint256 _feeRate) external
```

@notice Initialize the contract after deployment, serving as the constructor.

         Name            Description
 @param  _admin          `Admin` contract address.
 @param  _feeReceiver    `FeeReceiver` contract address.
 @param  _name           Token name.
 @param  _symbol         Token symbol.
 @param  _uri            Base URI.
 @param  _feeRate        Borrowing fee rate.

### version

```solidity
function version() external pure returns (string)
```

Name       Description
 @return version    Version of implementation.

### registerCollaterals

```solidity
function registerCollaterals(address[] _tokens, bool _isCollateral, bytes[] _signatures) external
```

@notice Register or deregister collections as collaterals.

         Name             Description
 @param  _tokens          Array of collection addresses to register or deregister.
 @param  _isCollateral    Whether the operation is register or deregister.
 @param  _signatures      Array of admin signatures.

 @dev    Administrative operator.
 @dev    Collections must support interface `IERC721Upgradeable`.

### getCollateral

```solidity
function getCollateral(uint256 _mortgageId) external view returns (struct IERC721Collateral.ERC721Collateral)
```

Name           Description
 @param  _mortgageId    Mortgage identifier.

 @return Collateral information.

### royaltyInfo

```solidity
function royaltyInfo(uint256 _tokenId, uint256 _price) external view returns (address, uint256)
```

Name        Description
 @param  _tokenId    Token identifier.
 @param  _price      Reference value.

 @return receiver    Royalty receiver address.
 @return royalty     Royalty derived from the reference value.

### borrow

```solidity
function borrow(address _token, uint256 _tokenId, uint256 _principal, uint256 _repayment, address _currency, uint40 _duration) external returns (uint256)
```

@notice List a new mortgage offer with an ERC-721 token as collateral.

         Name          Description
 @param  _token        Collateral contract address.
 @param  _tokenId      Collateral token identifier.
 @param  _principal    Principal value.
 @param  _repayment    Repayment value.
 @param  _currency     Currency address.
 @param  _duration     Borrowing duration.

 @return mortgageId    New mortgage identifier.

 @dev    The collection must support interface `IERC721Upgradeable`.
 @dev    Approval must be granted for this contract to transfer collateral before borrowing. A mortgage can only be
         lent while approval remains active.
 @dev    Collateral will be secured in the contract until the mortgage is either repaid, foreclosed, or cancelled.

### _transferCollateral

```solidity
function _transferCollateral(uint256 _mortgageId, address _from, address _to) internal
```

@notice Transfer the collateral of a mortgage.

         Name           Description
 @param  _mortgageId    Mortgage identifier.
 @param  _from          Sender address.
 @param  _to            Receiver address.

