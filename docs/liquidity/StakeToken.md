# Solidity API

## StakeToken

@author Briky Team

 @notice Interface for contract `StakeToken`.
 @notice A `StakeToken` contract is an ERC-20 token representing a staking pool of `PrimaryToken` that accrues periodic
         rewards. For each staked primary token, an equivalent amount of derived stake token is minted as a placeholder
         balance, which increases as rewards are earned. Transferring stake tokens also transfers the underlying staked
         value of primary token. After culmination of the pool, unstaking allows stakers to redeem the exact amount of
         primary tokens.
 @notice There are 3 staking pools with different configurations:
         -   Staking pool #1: Culminates in wave  750, 2,000,000 tokens each wave.
         -   Staking pool #2: Culminates in wave 1500, 3,000,000 tokens each wave.
         -   Staking pool #3: Culminates in wave 2250, 4,000,000 tokens each wave.
 @notice Each rewarding wave has 1-day cooldown and the reward is distributed among stakers in proportion to their balances.
 @notice After all three staking pool have culminated, the staking pool #3 may still fetch new wave with the reward capped
         at the lesser between its standard wave reward and the remaining mintable tokens to reach the maximum supply cap.
 @notice Before a staking pool culminates, unstaking is prohibited, but stakers may promote their position into the
         successor staking pool. After culmination, unstaking is permitted while new staking incurs a fee that is
         contributed to the treasury liquidity.
 @notice Exclusive Discount: `15% + primaryDiscount * (globalStake - totalSupply) / (2 * globalStake)`.
         Note:   `primaryDiscount` is the exclusive discount of the primary token.
                 `globalStake` is the total tokens staked in 3 pools.
 @notice Staking fee after culmination: `value / totalSupply * treasuryLiquidity * feeRate`.
         Note:   `value` is the staking value that derives fee.
                 `treasuryLiquidity` is the liquidity reserved in the treasury.
                 `feeRate` is an admin-adjustable subunitary value.

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
function initialize(address _admin, address _primaryToken, string _name, string _symbol, uint256 _feeRate) external
```

@notice Initialize the contract after deployment, serving as the constructor.

         Name            Description
 @param  _admin          `Admin` contract address.
 @param  _primaryToken   `PrimaryToken` contract address.
 @param  _name           Token name.
 @param  _symbol         Token symbol.
 @param  _feeRate        Staking fee rate.

### initializeRewarding

```solidity
function initializeRewarding(uint256 _initialLastRewardFetch, address _successor, bytes[] _signatures) external
```

@notice Initialize rewarding.

         Name                        Description
 @param  _initialLastRewardFetch     Last reward fetch timestamp.
 @param  _successor                  Successor `StakeToken` contract address.
 @param  _signatures                 Array of admin signatures.

 @dev    Administrative operator.

### updateFeeRate

```solidity
function updateFeeRate(uint256 _feeRate, bytes[] _signatures) external
```

@notice Update the staking fee rate.

         Name            Description
 @param  _feeRate        New staking fee rate.
 @param  _signatures     Array of admin signatures.

 @dev    Administrative operator.

### getFeeRate

```solidity
function getFeeRate() external view returns (struct IRate.Rate)
```

@return Staking fee rate.

### totalSupply

```solidity
function totalSupply() public view returns (uint256)
```

@return Total supply of the token.

### balanceOf

```solidity
function balanceOf(address _account) public view returns (uint256)
```

Name            Description
 @param  _account        EVM address.

 @return Stake of the account.

### exclusiveDiscount

```solidity
function exclusiveDiscount() external view returns (struct IRate.Rate)
```

@notice Exclusive Discount: `15% + primaryDiscount * (globalStake - totalSupply) / (2 * globalStake)`.
         Note:   `primaryDiscount` is the exclusive discount of the primary token.
                 `globalStake` is the total tokens staked in 3 pools.

 @return Discount rate for exclusive token.

### fetchReward

```solidity
function fetchReward() public
```

@notice Fetch reward tokens from the primary token contract based on the wave progression.

 @dev    Reward fetching may be subject to cooldown periods and wave limitations.

### stake

```solidity
function stake(address _account, uint256 _value) external
```

@notice Stake primary tokens into this contract to receive stake tokens with interest accumulation.
 @notice Staking fee after culmination: `value / totalSupply * treasuryLiquidity * feeRate`.
         Note:   `value` is the staking value that derives fee.
                 `treasuryLiquidity` is the liquidity reserved in the treasury.
                 `feeRate` is an admin-adjustable subunitary value.

         Name        Description
 @param  _account    Staker address.
 @param  _value      Staked value.

 @dev    The contract secures primary tokens and mints the exact amount of stake tokens to the staker.

### unstake

```solidity
function unstake(uint256 _value) external
```

@notice Unstake tokens back to primary tokens with accumulated interest.
 @notice Unstake only after culmination.

         Name        Description
 @param  _value      Unstaked value.

 @dev    The contract returns primary tokens and burns the exact amount of stake tokens to the unstaker.

### promote

```solidity
function promote(uint256 _value) external
```

@notice Promote staked tokens to a successor stake token contract for enhanced benefits.
 @notice Promote only if the successor address is assigned and before culmination.

         Name        Description
 @param  _value      Promoted value.

### _transfer

```solidity
function _transfer(address _from, address _to, uint256 _amount) internal
```

@notice Transfer stake as tokens.

         Name        Description
 @param  _from       Sender address.
 @param  _to         Receiver address.
 @param  _amount     Transferred amount.

### _beforeTokenTransfer

```solidity
function _beforeTokenTransfer(address _from, address _to, uint256 _amount) internal
```

@notice Hook to be called before any token transfer.

         Name        Description
 @param  _from       Sender address.
 @param  _to         Receiver address.
 @param  _amount     Transferred amount.

### _stakingFee

```solidity
function _stakingFee(uint256 _liquidity, uint256 _value, uint256 _totalSupply, uint256 _feeRate) internal pure returns (uint256)
```

Name            Description
 @param  _liquidity      Current liquidity of the treasury.
 @param  _value          Staked value.
 @param  _totalSupply    Total supply of the primary token.
 @param  _feeRate        Staking fee rate.

 @return fee             Staking fee.

### _newInterestAccumulation

```solidity
function _newInterestAccumulation(uint256 _interestAccumulation, uint256 _reward, uint256 _totalSupply) internal pure returns (uint256)
```

Name                    Description
 @param  _interestAccumulation   Current interest accumulation rate.
 @param  _reward                 Fetched staking reward.
 @param  _totalSupply            Current total stake.

 @return Updated interest accumulation rate.

### _balanceToWeight

```solidity
function _balanceToWeight(uint256 _balance, uint256 _interestAccumulation) internal pure returns (uint256)
```

Name                    Description
 @param  _balance                Token balance.
 @param  _interestAccumulation   Current interest accumulation rate.

 @return Converted weight value.

### _weightToBalance

```solidity
function _weightToBalance(uint256 _weight, uint256 _interestAccumulation) internal pure returns (uint256)
```

Name                    Description
 @param  _weight                 Weight value.
 @param  _interestAccumulation   Current interest accumulation rate.

 @return Converted token balance.

