# IEstateLiquidator

Interface for contract `EstateLiquidator`.

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

## NewRequest

```solidity
event NewRequest(uint256 requestId, uint256 estateId, uint256 proposalId, address buyer, uint256 value, address currency, struct IRate.Rate feeRate)
```

Emitted when a new extraction request is submitted.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | Request identifier. |
| estateId | uint256 | Estate identifier. |
| proposalId | uint256 | Proposal identifier. |
| buyer | address | Buyer address. |
| value | uint256 | Offered value. |
| currency | address | Currency address. |
| feeRate | struct IRate.Rate | Fraction of offered value charged as fee. |

## RequestApproval

```solidity
event RequestApproval(uint256 requestId, uint256 fee)
```

Emitted when an extraction request is approved and executed.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | Request identifier. |
| fee | uint256 | Extracting fee. |

## RequestDisapproval

```solidity
event RequestDisapproval(uint256 requestId)
```

Emitted when an extraction request is disapproved.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | Request identifier. |

## AlreadyCancelled

```solidity
error AlreadyCancelled()
```

===== ERROR ===== *

## InvalidConclusion

```solidity
error InvalidConclusion()
```

## InvalidRequestId

```solidity
error InvalidRequestId()
```

## UnavailableEstate

```solidity
error UnavailableEstate()
```

## dividendHub

```solidity
function dividendHub() external view returns (address dividendHub)
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| dividendHub | address | `DividendHub` contract address. |

## estateToken

```solidity
function estateToken() external view returns (address estateToken)
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| estateToken | address | `EstateToken` contract address. |

## feeReceiver

```solidity
function feeReceiver() external view returns (address feeReceiver)
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| feeReceiver | address | `FeeReceiver` contract address. |

## governanceHub

```solidity
function governanceHub() external view returns (address governanceHub)
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| governanceHub | address | `GovernanceHub` contract address. |

## requestNumber

```solidity
function requestNumber() external view returns (uint256 requestNumber)
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestNumber | uint256 | Number of requests. |

## getRequest

```solidity
function getRequest(uint256 _requestId) external view returns (struct IEstateLiquidatorRequest.EstateLiquidatorRequest request)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _requestId | uint256 | Request identifier. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| request | struct IEstateLiquidatorRequest.EstateLiquidatorRequest | Configuration and progress of the extraction request. |

## requestExtraction

```solidity
function requestExtraction(uint256 estateId, address buyer, uint256 value, address currency, uint256 feeRate, bytes32 uuid, uint40 admissionExpiry, struct IValidation.Validation validation) external payable returns (uint256 requestId)
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

{% hint style="info" %}
Validation data:
```
data = abi.encode(
    estateToken(),
    estateId,
    address(this),
    uuid,
    buyer,
    ProposalRule.ApprovalBeyondQuorum,
    quorumRate,
    EstateLiquidatorConstant.VOTE_DURATION,
    admissionExpiry
);
```
Note: `quorumRate` is 100% in the first year of estate after tokenization and 75% thereafter.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| estateId | uint256 | Estate identifier. |
| buyer | address | Buyer address. |
| value | uint256 | Liquidation value. |
| currency | address | Liquidation currency address. |
| feeRate | uint256 | Fraction of the liquidation value charged as fee. |
| uuid | bytes32 | Checksum of request context. |
| admissionExpiry | uint40 |  |
| validation | struct IValidation.Validation | Validation package from the validator. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | New request identifier. |

## conclude

```solidity
function conclude(uint256 requestId) external returns (bool isSuccessful)
```

Conclude a request according to the result of the proposal.

The class of estate token to be extract will be deprecated.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | Request identifier. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| isSuccessful | bool | Whether the extraction has succeeded. |

