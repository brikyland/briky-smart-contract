# EstateLiquidator

The `EstateLiquidator` contract facilitates the extraction of real estate through approved liquidations. Official
disclosed accounts, who is legally qualified to own the estate, can offer to buy the entire asset with a specific
value and the deal is voted to proceed. If the deal is approved, the associated custodian is grant a limited time
window to complete the required administrative procedures in compliance with local regulations. Liquidation is
finalized only if the custodian fulfills these obligations within the allotted timeframe. In that case, the
proceeds are distributed to holders as the ultimate dividend, and then the corresponding class of estate token will
be deprecated permanently.

{% hint style="info" %}
Implementation involves server-side support.

{% endhint %}

{% hint style="info" %}
ERC-20 tokens are identified by their contract addresses.
Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
{% endhint %}

## validRequest

```solidity
modifier validRequest(uint256 _requestId)
```

Verify a valid request identifier.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _requestId | uint256 | Request identifier. |

## receive

```solidity
receive() external payable
```

Executed on a call to this contract with empty calldata.

## version

```solidity
function version() external pure returns (string)
```

### Return Values

Version of implementation.

## initialize

```solidity
function initialize(address _admin, address _estateToken, address _commissionToken, address _governanceHub, address _dividendHub, address _feeReceiver, address _validator) external
```

Initialize the contract after deployment, serving as the constructor.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _admin | address | `Admin` contract address. |
| _estateToken | address | `EstateToken` contract address. |
| _commissionToken | address | `CommissionToken` contract address. |
| _governanceHub | address | `GovernanceHub` contract address. |
| _dividendHub | address | `DividendHub` contract address. |
| _feeReceiver | address | `FeeReceiver` contract address. |
| _validator | address | Validator address. |

## getRequest

```solidity
function getRequest(uint256 _requestId) external view returns (struct IEstateLiquidatorRequest.EstateLiquidatorRequest)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _requestId | uint256 | Request identifier. |

### Return Values

Configuration and progress of the extraction request.

## requestExtraction

```solidity
function requestExtraction(uint256 _estateId, address _buyer, uint256 _value, address _currency, uint256 _feeRate, bytes32 _uuid, uint40 _admissionExpiry, struct IValidation.Validation _validation) external payable returns (uint256)
```

Request an estate to be extracted.

To prevent deceptive manipulation, the approval quorum to liquidate is initially set at 100% during the first
year of estate and reduced to 75% thereafter.

The message sender must provide sufficient liquidation value and proposing fee for `GovernanceHub`.

{% hint style="info" %}
Permission: Executives active in the zone of the estate.

{% endhint %}

{% hint style="info" %}
Through the validation mechanism, the server-side determines `uuid` and `admissionExpiry` based on the specific
supported type of proposal and its context. Operators are also required to be pre-registered on the server-side
to ensure proper assignments.

{% endhint %}

{% hint style="info" %}
`uuid`, `admissionExpiry`, and `validation` are used for proposing in `GovernanceHub`.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _estateId | uint256 | Estate identifier. |
| _buyer | address | Buyer address. |
| _value | uint256 | Liquidation value. |
| _currency | address | Liquidation currency address. |
| _feeRate | uint256 | Fraction of the liquidation value charged as fee. |
| _uuid | bytes32 | Checksum of request context. |
| _admissionExpiry | uint40 |  |
| _validation | struct IValidation.Validation | Validation package from the validator. |

### Return Values

New request identifier.

## conclude

```solidity
function conclude(uint256 _requestId) external returns (bool)
```

Conclude a request according to the result of the proposal.

The class of estate token to be extract will be deprecated.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _requestId | uint256 | Request identifier. |

### Return Values

Whether the extraction has succeeded.

