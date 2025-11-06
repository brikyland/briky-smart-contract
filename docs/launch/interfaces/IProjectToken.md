# Solidity API

## IProjectToken

@author Briky Team

 @notice Interface for contract `ProjectToken`.
 @notice The `ProjectToken` contract securitizes real-world estate projects into classes of fungible ERC-1155 tokens, where
         each token class represents fractional credits for contributions to a project. Officially disclosed third-party
         organizations are registered as initiators in designated zones to actively initiate a project they're developing
         through a launchpad, serving as reference for future investment benefit distributions. Finalized estate projects
         that satisfy the required conditions may be tokenized into `EstateToken` at the discretion of the initiator.

 @dev    Each unit of estate tokens is represented in scaled form as `10 ** decimals()`.
 @dev    Implementation involves server-side support.

### BaseURIUpdate

```solidity
event BaseURIUpdate(string newValue)
```

@notice Emitted when the base URI is updated.

         Name        Description
 @param  newValue    New base URI.

### ZoneRoyaltyRateUpdate

```solidity
event ZoneRoyaltyRateUpdate(bytes32 zone, struct IRate.Rate newValue)
```

@notice Emitted when the royalty rate for a zone is updated.

         Name        Description
 @param  zone        Zone code.
 @param  newValue    New royalty rate value.

### LaunchpadAuthorization

```solidity
event LaunchpadAuthorization(address account)
```

@notice Emitted when a contract address is authorized as a launchpad contract.

         Name        Description
 @param  account     Authorized contract address.

### LaunchpadDeauthorization

```solidity
event LaunchpadDeauthorization(address account)
```

@notice Emitted when a contract is deauthorized as a launchpad contract.

         Name        Description
 @param  account     Deauthorized contract address.

### InitiatorRegistration

```solidity
event InitiatorRegistration(bytes32 zone, address initiator, string uri)
```

@notice Emitted when an initiator is registered in a zone.

         Name        Description
 @param  zone        Zone code.
 @param  initiator   Initiator address.
 @param  uri         URI of initiator information.

### NewToken

```solidity
event NewToken(uint256 tokenId, bytes32 zone, uint256 launchId, address launchpad, address initiator)
```

@notice Emitted when a new class of project token is minted.

         Name        Description
 @param  tokenId     Project identifier.
 @param  zone        Zone code.
 @param  launchId    Launch identifier from the launchpad contract.
 @param  launchpad   Launchpad contract address.
 @param  initiator   Initiator address.

### ProjectDeprecation

```solidity
event ProjectDeprecation(uint256 projectId, string note)
```

@notice Emitted when a project is deprecated due to force majeure.

         Name            Description
 @param  projectId       Project identifier.
 @param  note            Deprecation note.

### ProjectTokenization

```solidity
event ProjectTokenization(uint256 projectId, uint256 estateId, uint256 totalSupply, address custodian, address broker)
```

@notice Emitted when a project is tokenized into an estate token.

         Name            Description
 @param  projectId       Project identifier.
 @param  estateId        Estate token identifier.
 @param  totalSupply     Total supply.
 @param  custodian       Associated custodian address.
 @param  broker          Associated broker address.

### InvalidLaunchpad

```solidity
error InvalidLaunchpad(address account)
```

===== ERROR ===== *

### InvalidProjectId

```solidity
error InvalidProjectId()
```

### InvalidTokenizing

```solidity
error InvalidTokenizing()
```

### InvalidURI

```solidity
error InvalidURI()
```

### InvalidWithdrawing

```solidity
error InvalidWithdrawing()
```

### NothingToTokenize

```solidity
error NothingToTokenize()
```

### feeReceiver

```solidity
function feeReceiver() external view returns (address feeReceiver)
```

Name            Description
 @return feeReceiver     `FeeReceiver` contract address.

### projectNumber

```solidity
function projectNumber() external view returns (uint256 projectNumber)
```

Name            Description
 @return projectNumber   Number of projects.

### getProject

```solidity
function getProject(uint256 projectId) external view returns (struct IProject.Project project)
```

Name        Description
 @param  projectId   Project identifier.
 @return project     Project information.

### getZoneRoyaltyRate

```solidity
function getZoneRoyaltyRate(bytes32 zone) external view returns (struct IRate.Rate royaltyRate)
```

Name            Description
 @param  zone            Zone code.
 @return royaltyRate     Royalty rate of the zone.

### isLaunchpad

```solidity
function isLaunchpad(address account) external view returns (bool isLaunchpad)
```

Name            Description
 @param  account         EVM address.
 @return isLaunchpad     Whether the account is an authorized launchpad.

### initiatorURI

```solidity
function initiatorURI(bytes32 zone, address account) external view returns (string uri)
```

Name            Description
 @param  zone            Zone code.
 @param  account         Initiator address.
 @return uri             URI of initiator information.

### isInitiatorIn

```solidity
function isInitiatorIn(bytes32 zone, address account) external view returns (bool isInitiator)
```

Name            Description
 @param  zone            Zone code.
 @param  account         Address to check.
 @return isInitiator     Whether the account is a registered initiator in the zone.

### registerInitiator

```solidity
function registerInitiator(bytes32 zone, address initiator, string uri, struct IValidation.Validation validation) external
```

@notice Register an initiator in a zone.

         Name        Description
 @param  zone        Zone code.
 @param  initiator   Initiator address.
 @param  uri         URI of initiator information.
 @param  validation  Validation package from the validator.

 @dev    Permission: Managers active in the zone.

### launchProject

```solidity
function launchProject(bytes32 zone, uint256 launchId, address initiator, string uri) external returns (uint256 projectId)
```

@notice Launch a project associated with a new class of token.

         Name        Description
 @param  zone        Zone code.
 @param  launchId    Launch identifier from the launchpad contract.
 @param  initiator   Initiator address for the project.
 @param  uri         URI of project metadata.
 @return projectId   New project identifier.

 @dev    Permission: Launchpads.

### mint

```solidity
function mint(uint256 projectId, uint256 amount) external
```

@notice Mint new tokens for a project.

         Name        Description
 @param  projectId   Project identifier.
 @param  amount      Minted amount.

 @dev    Permission: Launchpad of the project.

### safeDeprecateProject

```solidity
function safeDeprecateProject(uint256 projectId, string data, bytes32 anchor) external
```

@notice Deprecate a project due to force majeure.

         Name        Description
 @param  projectId   Project identifier.
 @param  data        Deprecation note.
 @param  anchor      Keccak256 hash of `uri` of the estate.

 @dev    Permission: Managers active in the zone of the project.
 @dev    Anchor enforces consistency between this contract and the client-side.

### safeTokenizeProject

```solidity
function safeTokenizeProject(uint256 projectId, address custodian, address broker, bytes32 anchor) external returns (uint256 estateId)
```

@notice Tokenize an legitimate estate project into a new class of estate token.
 @notice Tokenize only if the project has been finalized.

         Name        Description
 @param  projectId   Project identifier.
 @param  custodian   Assigned custodian address.
 @param  broker      Associated broker address.
 @param  anchor      Keccak256 hash of `uri` of the project.
 @return estateId    Estate identifier tokenized from the project.

 @dev    Permission: Managers active in the zone of the project.
 @dev    Anchor enforces consistency between this contract and the client-side.

### safeUpdateProjectURI

```solidity
function safeUpdateProjectURI(uint256 projectId, string uri, struct IValidation.Validation validation, bytes32 anchor) external
```

@notice Update the URI of metadata of a project.

         Name        Description
 @param  projectId   Project identifier.
 @param  uri         New URI of project metadata.
 @param  validation  Validation package from the validator.
 @param  anchor      Keccak256 hash of `uri` of the project.

 @dev    Permission: Managers active in the zone of the project.
 @dev    Anchor enforces consistency between this contract and the client-side.
 @dev    Validation data:
         ```
         data = abi.encode(
             projectId,
             uri
         );
         ```

