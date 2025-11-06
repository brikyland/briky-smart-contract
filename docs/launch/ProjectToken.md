# Solidity API

## ProjectToken

@author Briky Team

 @notice The `ProjectToken` contract securitizes real-world estate projects into classes of fungible ERC-1155 tokens, where
         each token class represents fractional credits for contributions to a project. Officially disclosed third-party
         organizations are registered as initiators in designated zones to actively initiate a project they're developing
         through a launchpad, serving as reference for future investment benefit distributions. Finalized estate projects
         that satisfy the required conditions may be tokenized into `EstateToken` at the discretion of the initiator.

 @dev    Each unit of estate tokens is represented in scaled form as `10 ** decimals()`.
 @dev    Implementation involves server-side support.

### validProject

```solidity
modifier validProject(uint256 _projectId)
```

@notice Verify a valid project identifier.

         Name        Description
 @param  _projectId  Project identifier.

### onlyLaunchpad

```solidity
modifier onlyLaunchpad(uint256 _projectId)
```

@notice Verify the message sender is the launchpad of a project.

         Name        Description
 @param  _projectId  Project identifier.

### onlyActiveInZoneOf

```solidity
modifier onlyActiveInZoneOf(uint256 _projectId)
```

@notice Verify the message sender is active in the zone of a project.

         Name        Description
 @param  _projectId  Project identifier.

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
function initialize(address _admin, address _estateToken, address _feeReceiver, address _validator, string _uri) external
```

@notice Initialize the contract after deployment, serving as the constructor.

         Name            Description
 @param  _admin          `Admin` contract address.
 @param  _estateToken    `EstateToken` contract address.
 @param  _feeReceiver    `FeeReceiver` contract address.
 @param  _validator      Validator address.
 @param  _uri            Base URI for project metadata.

### updateBaseURI

```solidity
function updateBaseURI(string _uri, bytes[] _signatures) external
```

@notice Update the base URI.

         Name            Description
 @param  _uri            New base URI.
 @param  _signatures     Array of admin signatures.

 @dev    Administrative operator.

### updateZoneRoyaltyRate

```solidity
function updateZoneRoyaltyRate(bytes32 _zone, uint256 _royaltyRate, bytes[] _signatures) external
```

@notice Update the royalty rate of a zone.

         Name            Description
 @param  _zone           Zone code.
 @param  _royaltyRate    New default royalty rate.
 @param  _signatures     Array of admin signatures.

 @dev    Administrative operator.

### authorizeLaunchpads

```solidity
function authorizeLaunchpads(address[] _accounts, bool _isLaunchpad, bytes[] _signatures) external
```

@notice Authorize or deauthorize contract addresses as launchpads.

         Name            Description
 @param  _accounts       Array of contract addresses.
 @param  _isLaunchpad    Whether the operation is authorizing or deauthorizing.
 @param  _signatures     Array of admin signatures.

 @dev    Administrative operator.

### decimals

```solidity
function decimals() external pure returns (uint8)
```

@return decimals        Token decimals.

### projectToken

```solidity
function projectToken() external view returns (address)
```

@return projectToken    Address of this contract.

### getZoneRoyaltyRate

```solidity
function getZoneRoyaltyRate(bytes32 zone) external view returns (struct IRate.Rate)
```

Name            Description
 @param  zone            Zone code.

 @return royaltyRate     Royalty rate of the zone.

### isInitiatorIn

```solidity
function isInitiatorIn(bytes32 zone, address account) public view returns (bool)
```

Name            Description
 @param  zone            Zone code.
 @param  account         EVM address.

 @return isInitiator     Whether the account is a registered initiator in the zone.

### getProject

```solidity
function getProject(uint256 _projectId) external view returns (struct IProject.Project)
```

Name            Description
 @param  _projectId      Project identifier.

 @return project         Project information.

### getRepresentative

```solidity
function getRepresentative(uint256 _projectId) external view returns (address)
```

Name            Description
 @param  _projectId      Project identifier.

 @return representative  Representative address of the project.

### isAvailable

```solidity
function isAvailable(uint256 _projectId) public view returns (bool)
```

Name            Description
 @param  _projectId      Project identifier.

 @return isAvailable     Whether the project is available.

### zoneOf

```solidity
function zoneOf(uint256 _projectId) public view returns (bytes32)
```

Name            Description
 @param  _projectId      Project identifier.

 @return zone            Zone code of the project.

### balanceOf

```solidity
function balanceOf(address _account, uint256 _projectId) public view returns (uint256)
```

Name            Description
 @param  _account        Account address.
 @param  _projectId      Project identifier.

 @return balance         Token balance of the account.

### balanceOfAt

```solidity
function balanceOfAt(address _account, uint256 _projectId, uint256 _at) public view returns (uint256)
```

Name            Description
 @param  _account        Account address.
 @param  _projectId      Project identifier.
 @param  _at             Reference timestamp.

 @return balance         Balance of the account in the project at the reference timestamp.

### allocationOfAt

```solidity
function allocationOfAt(address _account, uint256 _tokenizationId, uint256 _at) external view returns (uint256)
```

Name                Description
 @param  _account            Account address.
 @param  _tokenizationId     Tokenization identifier.
 @param  _at                 Reference timestamp.

 @return Allocation of the account at the reference timestamp.

### equityOfAt

```solidity
function equityOfAt(address _account, uint256 _projectId, uint256 _at) external view returns (uint256)
```

Name            Description
 @param  _account        Account address.
 @param  _projectId      Project identifier.
 @param  _at             Reference timestamp.

 @return Equity of the account in the project at the reference timestamp.

### uri

```solidity
function uri(uint256 _projectId) public view returns (string)
```

Name            Description
 @param  _projectId      Project identifier.

 @return URI of project metadata.

### totalSupply

```solidity
function totalSupply(uint256 _projectId) public view returns (uint256)
```

Name            Description
 @param  _projectId      Project identifier.

 @return Total supply of the token class.

### totalEquityAt

```solidity
function totalEquityAt(uint256 _projectId, uint256 _at) external view returns (uint256)
```

Name            Description
 @param  _projectId      Project identifier.
 @param  _at             Reference timestamp.

 @return Total equity in the project at the reference timestamp.

### getRoyaltyRate

```solidity
function getRoyaltyRate(uint256 _tokenId) external view returns (struct IRate.Rate)
```

Name            Description
 @param  _tokenId        Token identifier.

 @return Royalty rate of the token identifier.

### isTokenized

```solidity
function isTokenized(uint256 _projectId) public view returns (bool)
```

Name            Description
 @param  _projectId      Project identifier.

 @return Whether the project tokens is converted to estate tokens.

### supportsInterface

```solidity
function supportsInterface(bytes4 _interfaceId) public view virtual returns (bool)
```

Name            Description
 @param  _interfaceId    Interface identifier.

 @return Whether this contract supports the interface.

### onERC1155Received

```solidity
function onERC1155Received(address _operator, address _from, uint256 _id, uint256 _value, bytes _data) public virtual returns (bytes4)
```

Name        Description
 @param  _operator   Operator address.
 @param  _from       Sender address.
 @param  _id         Token identifier.
 @param  _value      Token amount.
 @param  _data       Additional data.

 @return Selector of the `onERC1155Received` function if the message sender is either the estate token contract or the
         project token contract.

### onERC1155BatchReceived

```solidity
function onERC1155BatchReceived(address _operator, address _from, uint256[] _ids, uint256[] _values, bytes _data) public virtual returns (bytes4)
```

Name        Description
 @param  _operator   Operator address.
 @param  _from       Sender address.
 @param  _ids        List of token identifiers.
 @param  _values     List of token amounts, respective to each token identifier.
 @param  _data       Additional data.

 @return Selector of the `onERC1155Received` function if the message sender is either the estate token contract or the
         project token contract.

### registerInitiator

```solidity
function registerInitiator(bytes32 _zone, address _initiator, string _uri, struct IValidation.Validation _validation) external
```

@notice Register an initiator in a zone.

         Name            Description
 @param  _zone           Zone code.
 @param  _initiator      Initiator address.
 @param  _uri            URI of initiator information.
 @param  _validation     Validation package from the validator.

 @dev    Permission: Managers active in the zone.

### launchProject

```solidity
function launchProject(bytes32 _zone, uint256 _launchId, address _initiator, string _uri) external returns (uint256)
```

@notice Launch a project associated with a new class of token.

         Name            Description
 @param  _zone           Zone code.
 @param  _launchId       Launch identifier from the launchpad contract.
 @param  _initiator      Initiator address.
 @param  _uri            URI of project metadata.

 @return New project identifier.

 @dev    Permission: Launchpads.

### mint

```solidity
function mint(uint256 _projectId, uint256 _amount) external
```

@notice Mint new tokens for a project to the launchpad contract.

         Name            Description
 @param  _projectId      Project identifier.
 @param  _amount         Minted amount.

 @dev    Permission: Launchpad of the project.

### withdrawEstateToken

```solidity
function withdrawEstateToken(uint256 _projectId) external returns (uint256)
```

@notice Withdraw the allocation of the message sender from a tokenization.
 @notice Withdraw only if the project has been tokenized.

         Name            Description
 @param  _projectId      Project identifier.

 @return amount          Amount of estate tokens withdrawn.

### safeDeprecateProject

```solidity
function safeDeprecateProject(uint256 _projectId, string _data, bytes32 _anchor) external
```

@notice Deprecate a project due to force majeure.

         Name            Description
 @param  _projectId      Project identifier.
 @param  _data           Deprecation note.
 @param  _anchor         Keccak256 hash of `uri` of the estate.

 @dev    Permission: Managers active in the zone of the project.
 @dev    Anchor enforces consistency between this contract and the client-side.

### safeUpdateProjectURI

```solidity
function safeUpdateProjectURI(uint256 _projectId, string _uri, struct IValidation.Validation _validation, bytes32 _anchor) external
```

@notice Update the URI of metadata of a project.

         Name            Description
 @param  _projectId      Project identifier.
 @param  _uri            New URI of project metadata.
 @param  _validation     Validation package from the validator.
 @param  _anchor         Keccak256 hash of `uri` of the project.

 @dev    Permission: Managers active in the zone of the project.
 @dev    Anchor enforces consistency between this contract and the client-side.

### safeTokenizeProject

```solidity
function safeTokenizeProject(uint256 _projectId, address _custodian, address _broker, bytes32 _anchor) external returns (uint256)
```

@notice Tokenize an legitimate estate project into a new class of estate token.
 @notice Tokenize only if the project has been finalized.

         Name            Description
 @param  _projectId      Project identifier.
 @param  _custodian      Assigned custodian address.
 @param  _broker         Associated broker address.
 @param  _anchor         Keccak256 hash of `uri` of the project.

 @return Estate identifier tokenized from the project.

 @dev    Permission: Managers active in the zone of the project.
 @dev    Anchor enforces consistency between this contract and the client-side.

### _beforeTokenTransfer

```solidity
function _beforeTokenTransfer(address _operator, address _from, address _to, uint256[] _projectIds, uint256[] _amounts, bytes _data) internal
```

@notice Hook to be called before any token transfer.

         Name            Description
 @param  _operator       Operator address.
 @param  _from           Sender address.
 @param  _to             Receiver address.
 @param  _projectIds     Array of project identifiers.
 @param  _amounts        Array of transferred amounts, respective to each estate identifier.
 @param  _data           Additional data.

### _afterTokenTransfer

```solidity
function _afterTokenTransfer(address _operator, address _from, address _to, uint256[] _projectIds, uint256[] _amounts, bytes _data) internal
```

@notice Hook to be called after any token transfer.

         Name            Description
 @param  _operator       Operator address.
 @param  _from           Sender address.
 @param  _to             Receiver address.
 @param  _projectIds     Array of project identifiers.
 @param  _amounts        Array of transferred amounts, respective to each estate identifier.
 @param  _data           Additional data.

### _royaltyReceiver

```solidity
function _royaltyReceiver() internal view returns (address)
```

@return Default royalty receiver address.

