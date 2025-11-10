# EstateLiquidatorConstant

Constant library for contract `EstateLiquidator`.

## UNANIMOUS_GUARD_DURATION

```solidity
uint256 UNANIMOUS_GUARD_DURATION
```

Duration of the guard period right after tokenization, during which estate liquidation requires unanimous
       approval of all holders.

## UNANIMOUS_QUORUM_RATE

```solidity
uint256 UNANIMOUS_QUORUM_RATE
```

Quorum threshold set at 100% for estate liquidation proposals within the guard period.

{% hint style="info" %}
Percentage: 100%
{% endhint %}

## MAJORITY_QUORUM_RATE

```solidity
uint256 MAJORITY_QUORUM_RATE
```

Quorum threshold reduced to 75% for estate liquidation proposals after the guard period.

{% hint style="info" %}
Percentage: 75%
{% endhint %}

## VOTE_DURATION

```solidity
uint40 VOTE_DURATION
```

Extraction proposal vote duration.

## DIVIDEND_ISSUANCE_DATA

```solidity
string DIVIDEND_ISSUANCE_DATA
```

Note for dividend issuance from liquidation.

