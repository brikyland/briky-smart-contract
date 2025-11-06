# Solidity API

## EstateToken

@author Briky Team

 @notice The `EstateToken` contract securitizes real-world estates into classes of fungible ERC-1155 tokens, where each
         token class represents fractional ownership of a specific tokenized estate. Official disclosed third party
         agents are registered as custodians in designated zones to actively provide estates to tokenize and escrows those
         assets on behalf of holders after successful tokenization.

 @dev    Each unit of estate tokens is represented in scaled form as `10 ** decimals()`.
 @dev    Implementation involves server-side support.

### validEstate

```solidity
modifier validEstate(uint256 _estateId)
```

@notice Verify a valid estate identifier.

         Name        Description
 @param  _estateId   Estate identifier.

### onlyActiveInZoneOf

```solidity
modifier onlyActiveInZoneOf(uint256 _estateId)
```

@notice Verify the message sender is active in the zone of the estate.

         Name        Description
 @param  _estateId   Estate identifier.

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
function initialize(address _admin, address _feeReceiver, address _validator, string _uri) external
```

@notice Initialize the contract after deployment, serving as the constructor.

         Name            Description
 @param  _admin          `Admin` contract address.
 @param  _feeReceiver    `FeeReceiver` contract address.
 @param  _validator      Validator address.
 @param  _uri            Base URI.

### updateCommissionToken

```solidity
function updateCommissionToken(address _commissionToken, bytes[] _signatures) external
```

@notice Update the commission token contract.

         Name                Description
 @param  _commissionToken    `CommissionToken` contract address.
 @param  _signatures         Array of admin signatures.

 @dev    Administrative operator.

### updateBaseURI

```solidity
function updateBaseURI(string _uri, bytes[] _signatures) external
```

@notice Update the base URI.

         Name            Description
 @param  _uri            New base URI.
 @param  _signatures     Array of admin signatures.

 @dev    Administrative operator.

### authorizeTokenizers

```solidity
function authorizeTokenizers(address[] _accounts, bool _isTokenizer, bytes[] _signatures) external
```

@notice Authorize or deauthorize contract addresses as tokenizers.

         Name            Description
 @param  _accounts       Array of contract addresses.
 @param  _isTokenizer    This whether the operation is authorizing or deauthorizing.
 @param  _signatures     Array of admin signatures.

 @dev    Administrative operator.

### authorizeExtractors

```solidity
function authorizeExtractors(address[] _accounts, bool _isExtractor, bytes[] _signatures) external
```

@notice Authorize or deauthorize contract addresses as extractors.

         Name            Description
 @param  _accounts       Array of contract addresses.
 @param  _isExtractor    This whether the operation is authorizing or deauthorizing.
 @param  _signatures     Array of admin signatures.

 @dev    Administrative operator.

### updateZoneRoyaltyRate

```solidity
function updateZoneRoyaltyRate(bytes32 _zone, uint256 _royaltyRate, bytes[] _signatures) external
```

@notice Update the royalty rate of a zone.

         Name            Description
 @param  _zone           Zone code.
 @param  _royaltyRate    New royalty rate for the zone.
 @param  _signatures     Array of admin signatures.

 @dev    Administrative operator.

### decimals

```solidity
function decimals() external pure returns (uint8)
```

@return Token decimals.

### getZoneRoyaltyRate

```solidity
function getZoneRoyaltyRate(bytes32 _zone) external view returns (struct IRate.Rate)
```

Name            Description
 @param  _zone           Zone code.

 @return Royalty rate of the zone.

### isCustodianIn

```solidity
function isCustodianIn(bytes32 _zone, address _account) public view returns (bool)
```

Name            Description
 @param  _zone           Zone code.
 @param  _account        EVM address.

 @return Whether the account is a registered custodian in the zone.

### balanceOfAt

```solidity
function balanceOfAt(address _account, uint256 _tokenId, uint256 _at) public view returns (uint256)
```

Name            Description
 @param  _account        EVM address.
 @param  _tokenId        Estate identifier.
 @param  _at             Reference timestamp.

 @return Balance of the account in the estate at the reference timestamp.

### totalSupply

```solidity
function totalSupply(uint256 _tokenId) public view returns (uint256)
```

Name            Description
 @param  _tokenId        Estate identifier.

 @return Total supply of the token class.

### getEstate

```solidity
function getEstate(uint256 _estateId) external view returns (struct IEstate.Estate)
```

Name            Description
 @param  _estateId       Estate identifier.

 @return Estate information.

### getRepresentative

```solidity
function getRepresentative(uint256 _estateId) external view returns (address)
```

Name            Description
 @param  _estateId       Estate identifier.

 @return Representative address of the estate.

### isAvailable

```solidity
function isAvailable(uint256 _estateId) public view returns (bool)
```

Name            Description
 @param  _estateId       Estate identifier.

 @return Whether the estate is available.

### zoneOf

```solidity
function zoneOf(uint256 _estateId) external view returns (bytes32)
```

Name            Description
 @param  _estateId       Estate identifier.

 @return Zone code of the estate.

### equityOfAt

```solidity
function equityOfAt(address _account, uint256 _estateId, uint256 _at) external view returns (uint256)
```

Name            Description
 @param  _account        EVM address.
 @param  _estateId       Estate identifier.
 @param  _at             Reference timestamp.

 @return Equity of the account in the estate at the reference timestamp.

### uri

```solidity
function uri(uint256 _estateId) public view returns (string)
```

Name            Description
 @param  _estateId       Estate identifier.

 @return URI of estate metadata.

### totalEquityAt

```solidity
function totalEquityAt(uint256 _estateId, uint256 _at) external view returns (uint256)
```

Name            Description
 @param  _estateId       Estate identifier.
 @param  _at             Reference timestamp.

 @return Total equity in the estate at the reference timestamp.

### getRoyaltyRate

```solidity
function getRoyaltyRate(uint256 _tokenId) external view returns (struct IRate.Rate)
```

Name            Description
 @param  _tokenId        Estate identifier.

 @return Royalty rate of the token identifier.

### supportsInterface

```solidity
function supportsInterface(bytes4 _interfaceId) public view returns (bool)
```

Name            Description
 @param  _interfaceId    Interface identifier.

 @return Whether the interface is supported.

### registerCustodian

```solidity
function registerCustodian(bytes32 _zone, address _custodian, string _uri, struct IValidation.Validation _validation) external
```

@notice Register a custodian in a zone.

         Name            Description
 @param  _zone           Zone code.
 @param  _custodian      Custodian address.
 @param  _uri            URI of custodian information.
 @param  _validation     Validation package from the validator.

 @dev    Permissions: Managers active in the zone.

### tokenizeEstate

```solidity
function tokenizeEstate(uint256 _totalSupply, bytes32 _zone, uint256 _tokenizationId, string _uri, uint40 _expireAt, address _custodian, address _broker) external returns (uint256)
```

@notice Tokenize an estate into a new class of token.

         Name                Description
 @param  _totalSupply        Number of tokens to mint.
 @param  _zone               Zone code.
 @param  _tokenizationId     Tokenization identifier from the tokenizer contract.
 @param  _uri                URI of estate information.
 @param  _expireAt           Estate expiration timestamp.
 @param  _custodian          Assigned custodian address.
 @param  _broker             Associated broker address.

 @return New estate identifier.

 @dev    Permissions: Tokenizers.

### extractEstate

```solidity
function extractEstate(uint256 _estateId, uint256 _extractionId) external
```

@notice Extract an estate.

         Name                Description
 @param  _estateId           Estate identifier.
 @param  _extractionId       Extraction identifier.

 @dev    Permissions: Extractors.

### safeDeprecateEstate

```solidity
function safeDeprecateEstate(uint256 _estateId, string _note, bytes32 _anchor) external
```

@notice Deprecate an estate by managers due to force majeure or extraction.

         Name        Description
 @param  _estateId   Estate identifier.
 @param  _note       Deprecation note.
 @param  _anchor     Keccak256 hash of `uri` of the estate.

 @dev    Permissions: Managers active in the zone of the estate.
 @dev    Anchor enforces consistency between this contract and the client-side.

### safeExtendEstateExpiration

```solidity
function safeExtendEstateExpiration(uint256 _estateId, uint40 _expireAt, bytes32 _anchor) external
```

@notice Extend the expiration of an estate.

         Name            Description
 @param  _estateId       Estate identifier.
 @param  _expireAt       New expiration timestamp.
 @param  _anchor         Keccak256 hash of `uri` of the estate.

 @dev    Permissions: Managers active in the zone of the estate.
 @dev    Anchor enforces consistency between this contract and the client-side.

### safeUpdateEstateCustodian

```solidity
function safeUpdateEstateCustodian(uint256 _estateId, address _custodian, bytes32 _anchor) external
```

@notice Update the custodian of an estate.

         Name            Description
 @param  _estateId       Estate identifier.
 @param  _custodian      New custodian address.
 @param  _anchor         Keccak256 hash of `uri` of the estate.

 @dev    Permissions: Managers active in the zone of the estate.
 @dev    Anchor enforces consistency between this contract and the client-side.

### safeUpdateEstateURI

```solidity
function safeUpdateEstateURI(uint256 _estateId, string _uri, struct IValidation.Validation _validation, bytes32 _anchor) external
```

@notice Update the URI of metadata of an estate.

         Name            Description
 @param  _estateId       Estate identifier.
 @param  _uri            New URI of estate metadata.
 @param  _validation     Validation package from the validator.
 @param  _anchor         Keccak256 hash of `uri` of the estate.

 @dev    Permissions: Managers active in the zone of the estate.
 @dev    Anchor enforces consistency between this contract and the client-side.

### _royaltyReceiver

```solidity
function _royaltyReceiver() internal view returns (address)
```

@return Default royalty receiver address.

### _beforeTokenTransfer

```solidity
function _beforeTokenTransfer(address _operator, address _from, address _to, uint256[] _estateIds, uint256[] _amounts, bytes _data) internal
```

@notice Hook to be called before any token transfer.

         Name            Description
 @param  _operator       Operator address.
 @param  _from           Sender address.
 @param  _to             Receiver address.
 @param  _estateIds      Array of estate identifiers.
 @param  _amounts        Array of transferred amounts, respective to each estate identifier.
 @param  _data           Additional data.

### _afterTokenTransfer

```solidity
function _afterTokenTransfer(address _operator, address _from, address _to, uint256[] _estateIds, uint256[] _amounts, bytes _data) internal
```

@notice Hook to be called after any token transfer.

         Name            Description
 @param  _operator       Operator address.
 @param  _from           Sender address.
 @param  _to             Receiver address.
 @param  _estateIds      Array of estate identifiers.
 @param  _amounts        Array of transferred amounts, respective to each estate identifier.
 @param  _data           Additional data.

