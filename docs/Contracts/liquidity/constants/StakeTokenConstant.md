# StakeTokenConstant

Constant library for contract `StakeToken`.

## REWARD_FETCH_COOLDOWN

```solidity
uint256 REWARD_FETCH_COOLDOWN
```

Minimal time gap between two consecutive staking reward waves, approximately 1 day.

{% hint style="info" %}
5-minute offset is subtracted to mitigate potential timing errors.
{% endhint %}

