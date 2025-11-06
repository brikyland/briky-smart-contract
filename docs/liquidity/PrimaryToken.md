# Solidity API

## PrimaryToken

@author Briky Team

 @notice Interface for contract `PrimaryToken`.
 @notice The `PrimaryToken` is an ERC-20 token circulating as the exclusive currency of the system.
 @notice The maximum supply is 20,000,000,000 tokens.
 @notice Tokens are distributed through 5 rounds:
         -   Backer Round:         100,000,000 tokens
         -   Seed Round:            50,000,000 tokens
         -   Private Sale #1:       30,000,000 tokens
         -   Private Sale #2:       50,000,000 tokens
         -   Public Sale:          500,000,000 tokens
 @notice Tokens are reserved in 3 funds:
         -   Core Team:          1,000,000,000 tokens
         -   Market Marker:      2,270,000,000 tokens
         -   External Treasury:  1,000,000,000 tokens
 @notice Tokens are periodically rewarded in 3 staking pools:
         -   Staking pool #1:    Culminates in wave  750, 2,000,000 tokens each wave.
         -   Staking pool #2:    Culminates in wave 1500, 3,000,000 tokens each wave.
         -   Staking pool #3:    Culminates in wave 2250, 4,000,000 tokens each wave.
 @notice After all three staking pool have culminated, the staking pool #3 may still fetch new wave with the reward capped
         at the lesser between its standard wave reward and the remaining mintable tokens to reach the maximum supply cap.
 @notice Token liquidation is backed by a stablecoin treasury. Holders may burn tokens to redeem value once liquidation is
         unlocked.
 @notice Exclusive Discount: `15% * (1 + globalStake/totalSupply)`.
         Note:   `globalStake` is the total tokens staked in 3 pools.

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
function initialize(address _admin, string _name, string _symbol, uint256 _liquidationUnlockedAt) external
```

@notice Initialize the contract after deployment, serving as the constructor.

         Name                        Description
 @param  _admin                      `Admin` contract address.
 @param  _name                       Token name.
 @param  _symbol                     Token symbol.
 @param  _liquidationUnlockedAt      Liquidation unlock timestamp.

### updateTreasury

```solidity
function updateTreasury(address _treasury, bytes[] _signatures) external
```

@notice Update the treasury contract.

         Name            Description
 @param  _treasury       `Treasury` contract address.
 @param  _signatures     Array of admin signatures.

 @dev    Administrative operator.

### updateStakeTokens

```solidity
function updateStakeTokens(address _stakeToken1, address _stakeToken2, address _stakeToken3, bytes[] _signatures) external
```

@notice Update staking pools contract.

         Name            Description
 @param  _stakeToken1    `StakeToken` contract address #1.
 @param  _stakeToken2    `StakeToken` contract address #2.
 @param  _stakeToken3    `StakeToken` contract address #3.
 @param  _signatures     Array of admin signatures.

 @dev    Administrative operator.

### unlockForBackerRound

```solidity
function unlockForBackerRound(address _distributor, bytes[] _signatures) external
```

@notice Unlock token allocation of the Backer Round to a distributor.

         Name            Description
 @param  _distributor    Distributor address.
 @param  _signatures     Array of admin signatures.

 @dev    Administrative operator.

### unlockForSeedRound

```solidity
function unlockForSeedRound(address _distributor, bytes[] _signatures) external
```

@notice Unlock token allocation of the Seed Round to a distributor.

         Name            Description
 @param  _distributor    Distributor address.
 @param  _signatures     Array of admin signatures.

 @dev    Administrative operator.

### unlockForPrivateSale1

```solidity
function unlockForPrivateSale1(address _distributor, bytes[] _signatures) external
```

@notice Unlock token allocation of the Private Sale #1 to a distributor.

         Name            Description
 @param  _distributor    Distributor address.
 @param  _signatures     Array of admin signatures.

 @dev    Administrative operator.

### unlockForPrivateSale2

```solidity
function unlockForPrivateSale2(address _distributor, bytes[] _signatures) external
```

@notice Unlock token allocation of the Private Sale #2 to a distributor.

         Name            Description
 @param  _distributor    Distributor address.
 @param  _signatures     Array of admin signatures.

 @dev    Administrative operator.

### unlockForPublicSale

```solidity
function unlockForPublicSale(address _distributor, bytes[] _signatures) external
```

@notice Unlock token allocation of the Public Sale to a distributor.

         Name            Description
 @param  _distributor    Distributor address.
 @param  _signatures     Array of admin signatures.

 @dev    Administrative operator.

### unlockForCoreTeam

```solidity
function unlockForCoreTeam(address _distributor, bytes[] _signatures) external
```

@notice Unlock token allocation of the Core Team to a distributor.

         Name            Description
 @param  _distributor    Distributor address.
 @param  _signatures     Array of admin signatures.

 @dev    Administrative operator.

### unlockForMarketMaker

```solidity
function unlockForMarketMaker(address _distributor, bytes[] _signatures) external
```

@notice Unlock token allocation of the Market Maker to a distributor.

         Name            Description
 @param  _distributor    Distributor address.
 @param  _signatures     Array of admin signatures.

 @dev    Administrative operator.

### unlockForExternalTreasury

```solidity
function unlockForExternalTreasury(address _distributor, bytes[] _signatures) external
```

@notice Unlock token allocation of the External Treasury to a distributor.

         Name            Description
 @param  _distributor    Distributor address.
 @param  _signatures     Array of admin signatures.

 @dev    Administrative operator.

### totalStake

```solidity
function totalStake() public view returns (uint256)
```

@return Total token amount staked in all staking pools.

### isStakeRewardingCulminated

```solidity
function isStakeRewardingCulminated(address _stakeToken) external view returns (bool)
```

Name            Description
 @param  _stakeToken     Staking pool contract address.

 @return Whether the staking pool has culminated.

### contributeLiquidityFromBackerRound

```solidity
function contributeLiquidityFromBackerRound(uint256 _liquidity) external
```

@notice Contribute liquidity funded from Backer Round to the treasury.

         Name          Description
 @param  _liquidity    Contributed liquidity.

### contributeLiquidityFromSeedRound

```solidity
function contributeLiquidityFromSeedRound(uint256 _liquidity) external
```

@notice Contribute liquidity funded from Seed Round to the treasury.

         Name          Description
 @param  _liquidity    Contributed liquidity.

### contributeLiquidityFromPrivateSale1

```solidity
function contributeLiquidityFromPrivateSale1(uint256 _liquidity) external
```

@notice Contribute liquidity funded from Private Sale #1 to the treasury.

         Name          Description
 @param  _liquidity    Contributed liquidity.

### contributeLiquidityFromPrivateSale2

```solidity
function contributeLiquidityFromPrivateSale2(uint256 _liquidity) external
```

@notice Contribute liquidity funded from Private Sale #2 to the treasury.

         Name          Description
 @param  _liquidity    Contributed liquidity.

### contributeLiquidityFromPublicSale

```solidity
function contributeLiquidityFromPublicSale(uint256 _liquidity) external
```

@notice Contribute liquidity funded from Public Sale to the treasury.

         Name          Description
 @param  _liquidity    Contributed liquidity.

### contributeLiquidityFromMarketMaker

```solidity
function contributeLiquidityFromMarketMaker(uint256 _liquidity) external
```

@notice Contribute liquidity funded from Market Maker to the treasury.

         Name          Description
 @param  _liquidity    Contributed liquidity.

### contributeLiquidityFromExternalTreasury

```solidity
function contributeLiquidityFromExternalTreasury(uint256 _liquidity) external
```

@notice Contribute liquidity funded from External Treasury to the treasury.

         Name          Description
 @param  _liquidity    Contributed liquidity.

### contributeLiquidityFromStakeToken

```solidity
function contributeLiquidityFromStakeToken(uint256 _liquidity) external
```

@notice Contribute liquidity funded from a staking pool to the treasury.

         Name          Description
 @param  _liquidity    Contributed liquidity.

 @dev    Permission: Staking pools.

### mintForStake

```solidity
function mintForStake() external returns (uint256)
```

@notice Mint reward tokens for the sending staking pool based on its wave progression.
 @notice After all three staking pool have culminated, the staking pool #3 may still fetch new wave with the reward capped
         at the lesser between its standard wave reward and the remaining mintable tokens to reach the maximum supply cap.

 @return Staking reward.

 @dev    Permission: Staking pools.

### liquidate

```solidity
function liquidate(uint256 _amount) external returns (uint256)
```

@notice Liquidate tokens for proportional liquidity from the treasury.
 @notice Liquidate only after liquidation unlock timestamp.

         Name        Description
 @param  _amount     Liquidated token amount.

 @return Liquidated value.

### exclusiveDiscount

```solidity
function exclusiveDiscount() external view returns (struct IRate.Rate)
```

@notice Exclusive Discount: `15% * (1 + globalStake/totalSupply)`.
         Note:   `globalStake` is the total tokens staked in 3 pools.

 @return Discount rate for exclusive token.

### _contributeLiquidity

```solidity
function _contributeLiquidity(uint256 _liquidity) internal
```

@notice Contribute liquidity to the treasury.

         Name            Description
 @param  _liquidity      Contributed liquidity.

### _mint

```solidity
function _mint(address _account, uint256 _amount) internal
```

@notice Mint new tokens to an account.

         Name            Description
 @param  _account        Receiver address.
 @param  _amount         Minted amount.

### _beforeTokenTransfer

```solidity
function _beforeTokenTransfer(address _from, address _to, uint256 _amount) internal
```

@notice Hook to be called before any token transfer.

         Name            Description
 @param  _from           Sender address.
 @param  _to             Receiver address.
 @param  _amount         Transferred amount.

