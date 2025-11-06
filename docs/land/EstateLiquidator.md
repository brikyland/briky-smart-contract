# Solidity API

## EstateLiquidator

@author Briky Team

 @notice The `EstateLiquidator` contract facilitates the extraction of real estate through approved liquidations. Official
         disclosed accounts, who is legally qualified to own the estate, can offer to buy the entire asset with a specific
         value and the deal is voted to proceed. If the deal is approved, the associated custodian is grant a limited time
         window to complete the required administrative procedures in compliance with local regulations. Liquidation is
         finalized only if the custodian fulfills these obligations within the allotted timeframe. In that case, the
         proceeds are distributed to holders as the ultimate dividend, and then the corresponding class of estate token will
         be deprecated permanently.

 @dev    Implementation involves server-side support.
 @dev    ERC-20 tokens are identified by their contract addresses.
         Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).

### validRequest

```solidity
modifier validRequest(uint256 _requestId)
```

@notice Verify a valid request identifier.

         Name        Description
 @param  _requestId  Request identifier.

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
function initialize(address _admin, address _estateToken, address _commissionToken, address _governanceHub, address _dividendHub, address _feeReceiver, address _validator) external
```

@notice Initialize the contract after deployment, serving as the constructor.

         Name                Description
 @param  _admin              `Admin` contract address.
 @param  _estateToken        `EstateToken` contract address.
 @param  _commissionToken    `CommissionToken` contract address.
 @param  _governanceHub      `GovernanceHub` contract address.
 @param  _dividendHub        `DividendHub` contract address.
 @param  _feeReceiver        `FeeReceiver` contract address.
 @param  _validator          Validator address.

### getRequest

```solidity
function getRequest(uint256 _requestId) external view returns (struct IEstateLiquidatorRequest.EstateLiquidatorRequest)
```

Name            Description
 @param  _requestId      Request identifier.

 @return Configuration and progress of the extraction request.

### requestExtraction

```solidity
function requestExtraction(uint256 _estateId, address _buyer, uint256 _value, address _currency, uint256 _feeRate, bytes32 _uuid, uint40 _admissionExpiry, struct IValidation.Validation _validation) external payable returns (uint256)
```

@notice Request an estate to be extracted.
 @notice To prevent deceptive manipulation, the approval quorum to liquidate is initially set at 100% during the first
         year of estate and reduced to 75% thereafter.
 @notice The message sender must provide sufficient liquidation value and proposing fee for `GovernanceHub`.

         Name            Description
 @param  _estateId       Estate identifier.
 @param  _buyer          Buyer address.
 @param  _value          Liquidation value.
 @param  _currency       Liquidation currency address.
 @param  _feeRate        Fraction of the liquidation value charged as fee.
 @param  _uuid           Checksum of request context.
 @param  _validation     Validation package from the validator.

 @return New request identifier.

 @dev    Permission: Executives active in the zone of the estate.
 @dev    Through the validation mechanism, the server-side determines `uuid` and `admissionExpiry` based on the specific
         supported type of proposal and its context. Operators are also required to be pre-registered on the server-side
         to ensure proper assignments.
 @dev    `uuid`, `admissionExpiry`, and `validation` are used for proposing in `GovernanceHub`.

### conclude

```solidity
function conclude(uint256 _requestId) external returns (bool)
```

@notice Conclude a request according to the result of the proposal.
 @notice The class of estate token to be extract will be deprecated.

         Name            Description
 @param  _requestId      Request identifier.

 @return Whether the extraction has succeeded.

