// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/common/interfaces/
import {ICommon} from "../../common/interfaces/ICommon.sol";
import {IExclusiveToken} from "../../common/interfaces/IExclusiveToken.sol";

/**
 *  @author Briky Team
 *
 *  @notice Interface for contract `PrimaryToken`.
 *  @notice The `PrimaryToken` is an ERC-20 token circulating as the exclusive currency of the system.
 *  @notice The maximum supply is 20,000,000,000 tokens.
 *  @notice Tokens are distributed through 5 rounds:
 *          -   Backer Round:         100,000,000 tokens
 *          -   Seed Round:            50,000,000 tokens
 *          -   Private Sale #1:       30,000,000 tokens
 *          -   Private Sale #2:       50,000,000 tokens
 *          -   Public Sale:          500,000,000 tokens
 *  @notice Tokens are reserved in 3 funds:
 *          -   Core Team:          1,000,000,000 tokens
 *          -   Market Marker:      2,270,000,000 tokens
 *          -   External Treasury:  1,000,000,000 tokens
 *  @notice Tokens are periodically rewarded in 3 staking pools:
 *          -   Staking pool #1:    Culminates in wave  750, 2,000,000 tokens each wave.
 *          -   Staking pool #2:    Culminates in wave 1500, 3,000,000 tokens each wave.
 *          -   Staking pool #3:    Culminates in wave 2250, 4,000,000 tokens each wave.
 *  @notice After all three staking pool have culminated, the staking pool #3 may still fetch new wave with the reward capped
 *          at the lesser between its standard wave reward and the remaining mintable tokens to reach the maximum supply cap.
 *  @notice Token liquidation is backed by a stablecoin treasury. Holders may burn tokens to redeem value once liquidation is
 *          unlocked.
 *  @notice Exclusive Discount: `15% * (1 + globalStake/totalSupply)`.
 *          Note:   `globalStake` is the total tokens staked in 3 pools.
 */
interface IPrimaryToken is
ICommon,
IExclusiveToken {
    /** ===== EVENT ===== **/
    /* --- Allocation Unlock --- */
    /**
     *  @notice Emitted when Backer Round tokens are unlocked to a distributor.
     */
    event BackerRoundTokensUnlock();

    /**
     *  @notice Emitted when Core Team tokens are unlocked to a distributor.
     */
    event CoreTeamTokensUnlock();

    /**
     *  @notice Emitted when External Treasury tokens are unlocked to a distributor.
     */
    event ExternalTreasuryTokensUnlock();

    /**
     *  @notice Emitted when Market Maker tokens are unlocked to a distributor.
     */
    event MarketMakerTokensUnlock();

    /**
     *  @notice Emitted when Private Sale #1 tokens are unlocked to a distributor.
     */
    event PrivateSale1TokensUnlock();

    /**
     *  @notice Emitted when Private Sale #2 tokens are unlocked to a distributor.
     */
    event PrivateSale2TokensUnlock();

    /**
     *  @notice Emitted when Public Sale tokens are unlocked to a distributor.
     */
    event PublicSaleTokensUnlock();

    /**
     *  @notice Emitted when Seed Round tokens are unlocked to a distributor.
     */
    event SeedRoundTokensUnlock();


    /* --- Staking Reward--- */
    /**
     *  @notice Emitted when a wave of reward tokens are minted for staking pool #1.
     *
     *          Name    Description
     *  @param  wave    Current wave number.
     *  @param  reward  Staking reward.
     */
    event Stake1WaveReward(
        uint256 wave,
        uint256 reward
    );

    /**
     *  @notice Emitted when a wave of reward tokens are minted for staking pool #2.
     *
     *          Name    Description
     *  @param  wave    Current wave number.
     *  @param  reward  Staking reward.
     */
    event Stake2WaveReward(
        uint256 wave,
        uint256 reward
    );

    /**
     *  @notice Emitted when a wave of reward tokens are minted for staking pool #3.
     *
     *          Name    Description
     *  @param  wave    Current wave number.
     *  @param  reward  Staking reward.
     */
    event Stake3WaveReward(
        uint256 wave,
        uint256 reward
    );


    /* --- Liquidity Contribution --- */
    /**
     *  @notice Emitted when liquidity is contributed from Backer Round operating.
     *
     *          Name        Description
     *  @param  liquidity   Contributed liquidity.
     */
    event LiquidityContributionFromBackerRound(
        uint256 liquidity
    );

    /**
     *  @notice Emitted when liquidity is contributed from External Treasury operating.
     *
     *          Name        Description
     *  @param  liquidity   Contributed liquidity.
     */
    event LiquidityContributionFromExternalTreasury(
        uint256 liquidity
    );

    /**
     *  @notice Emitted when liquidity is contributed from Market Maker operating.
     *
     *          Name        Description
     *  @param  liquidity   Contributed liquidity.
     */
    event LiquidityContributionFromMarketMaker(
        uint256 liquidity
    );

    /**
     *  @notice Emitted when liquidity is contributed from Private Sale #1 operating.
     *
     *          Name        Description
     *  @param  liquidity   Contributed liquidity.
     */
    event LiquidityContributionFromPrivateSale1(
        uint256 liquidity
    );

    /**
     *  @notice Emitted when liquidity is contributed from Private Sale #2 operating.
     *
     *          Name        Description
     *  @param  liquidity   Contributed liquidity.
     */
    event LiquidityContributionFromPrivateSale2(
        uint256 liquidity
    );

    /**
     *  @notice Emitted when liquidity is contributed from Public Sale operating.
     *
     *          Name        Description
     *  @param  liquidity   Contributed liquidity.
     */
    event LiquidityContributionFromPublicSale(
        uint256 liquidity
    );

    /**
     *  @notice Emitted when liquidity is contributed from Seed Round operating.
     *
     *          Name        Description
     *  @param  liquidity   Contributed liquidity.
     */
    event LiquidityContributionFromSeedRound(
        uint256 liquidity
    );

    /**
     *  @notice Emitted when liquidity is contributed from staking pool #1 contract.
     *
     *          Name        Description
     *  @param  liquidity   Contributed liquidity.
     */
    event LiquidityContributionFromStakeToken1(
        uint256 liquidity
    );

    /**
     *  @notice Emitted when liquidity is contributed from staking pool #2 contract.
     *
     *          Name        Description
     *  @param  liquidity   Contributed liquidity.
     */
    event LiquidityContributionFromStakeToken2(
        uint256 liquidity
    );

    /**
     *  @notice Emitted when liquidity is contributed from staking pool #3 contract.
     *
     *          Name        Description
     *  @param  liquidity   Contributed liquidity.
     */
    event LiquidityContributionFromStakeToken3(
        uint256 liquidity
    );


    /* --- Token Operations --- */
    /**
     *  @notice Emitted when tokens are liquidated.
     *
     *          Name        Description
     *  @param  account     EVM address.
     *  @param  amount      Liquidated token amount.
     *  @param  liquidity   Liquidation value.
     */
    event Liquidation(
        address indexed account,
        uint256 amount,
        uint256 liquidity
    );


    /** ===== ERROR ===== **/
    error AllStakeRewardMinted();
    error AlreadyUnlockedTokens();
    error BeingLocked();
    error InvalidStakeToken();
    error NotUnlocked();
    error SupplyCapReached();


    /** ===== FUNCTION ===== **/
    /* --- Dependency --- */
    /**
     *          Name            Description
     *  @return treasury        `Treasury` contract address.
     */
    function treasury() external view returns (address treasury);

    /**
     *          Name            Description
     *  @return stakeToken1     `StakeToken` contract address #1.
     */
    function stakeToken1() external view returns (address stakeToken1);

    /**
     *          Name            Description
     *  @return stakeToken2     `StakeToken` contract address #2.
     */
    function stakeToken2() external view returns (address stakeToken2);

    /**
     *          Name            Description
     *  @return stakeToken3     `StakeToken` contract address #3.
     */
    function stakeToken3() external view returns (address stakeToken3);


    /* --- Query --- */
    /**
     *          Name        Description
     *  @return totalStake  Total token amount staked in all staking pools.
     */
    function totalStake() external view returns (uint256 totalStake);

    /**
     *          Name        Description
     *  @return wave        Current wave number for staking pool #1.
     */
    function stakeToken1Waves() external view returns (uint256 wave);

    /**
     *          Name        Description
     *  @return wave        Current wave number for staking pool #2.
     */
    function stakeToken2Waves() external view returns (uint256 wave);

    /**
     *          Name        Description
     *  @return wave        Current wave number for staking pool #3.
     */
    function stakeToken3Waves() external view returns (uint256 wave);


    /**
     *          Name            Description
     *  @return contribution    Total liquidity contributed from operating of Backer Round .
     */
    function backerRoundContribution() external view returns (uint256 contribution);

    /**
     *          Name            Description
     *  @return contribution    Total liquidity contributed from operating of External Treasury.
     */
    function externalTreasuryContribution() external view returns (uint256 contribution);

    /**
     *          Name            Description
     *  @return contribution    Total liquidity contributed from operating of Market Maker.
     */
    function marketMakerContribution() external view returns (uint256 contribution);

    /**
     *          Name            Description
     *  @return contribution    Total liquidity contributed from operating of Private Sale #1.
     */
    function privateSale1Contribution() external view returns (uint256 contribution);

    /**
     *          Name            Description
     *  @return contribution    Total liquidity contributed from operating of Private Sale #2.
     */
    function privateSale2Contribution() external view returns (uint256 contribution);

    /**
     *          Name            Description
     *  @return contribution    Total liquidity contributed from operating of Public Sale.
     */
    function publicSaleContribution() external view returns (uint256 contribution);

    /**
     *          Name            Description
     *  @return contribution    Total liquidity contributed from operating of Seed Round.
     */
    function seedRoundContribution() external view returns (uint256 contribution);

    /**
     *          Name            Description
     *  @return contribution    Total liquidity contributed from operating of staking pool #1.
     */
    function stakeToken1Contribution() external view returns (uint256 contribution);

    /**
     *          Name            Description
     *  @return contribution    Total liquidity contributed from operating of staking pool #2.
     */
    function stakeToken2Contribution() external view returns (uint256 contribution);

    /**
     *          Name            Description
     *  @return contribution    Total liquidity contributed from operating of staking pool #3.
     */
    function stakeToken3Contribution() external view returns (uint256 contribution);


    /**
     *          Name        Description
     *  @return isUnlocked  Whether Backer Round tokens have been unlocked.
     */
    function backerRoundUnlocked() external view returns (bool isUnlocked);

    /**
     *          Name        Description
     *  @return isUnlocked  Whether Core Team tokens have been unlocked.
     */
    function coreTeamTokensUnlocked() external view returns (bool isUnlocked);

    /**
     *          Name        Description
     *  @return isUnlocked  Whether External Treasury tokens have been unlocked.
     */
    function externalTreasuryTokensUnlocked() external view returns (bool isUnlocked);

    /**
     *          Name        Description
     *  @return isUnlocked  Whether Market Maker tokens have been unlocked.
     */
    function marketMakerTokensUnlocked() external view returns (bool isUnlocked);

    /**
     *          Name        Description
     *  @return isUnlocked  Whether Private Sale #1 tokens have been unlocked.
     */
    function privateSale1Unlocked() external view returns (bool isUnlocked);

    /**
     *          Name        Description
     *  @return isUnlocked  Whether Private Sale #2 tokens have been unlocked.
     */
    function privateSale2Unlocked() external view returns (bool isUnlocked);

    /**
     *          Name        Description
     *  @return isUnlocked  Whether Public Sale tokens have been unlocked.
     */
    function publicSaleUnlocked() external view returns (bool isUnlocked);

    /**
     *          Name        Description
     *  @return isUnlocked  Whether Seed Round tokens have been unlocked.
     */
    function seedRoundUnlocked() external view returns (bool isUnlocked);


    /**
     *          Name                    Description
     *  @return liquidationUnlockedAt   Liquidation unlock timestamp.
     */
    function liquidationUnlockedAt() external view returns (uint256 liquidationUnlockedAt);


    /**
     *          Name            Description
     *  @param  stakeToken      Staking pool contract address.
     *  @return isCompleted     Whether the staking pool has culminated.
     */
    function isStakeRewardingCulminated(
        address stakeToken
    ) external view returns (bool isCompleted);


    /* --- Command --- */
    /**
     *  @notice Contribute liquidity funded from Backer Round to the treasury.
     *
     *          Name        Description
     *  @param  liquidity   Contributed liquidity
     */
    function contributeLiquidityFromBackerRound(
        uint256 liquidity
    ) external;

    /**
     *  @notice Contribute liquidity funded from External Treasury to the treasury.
     *
     *          Name        Description
     *  @param  liquidity   Contributed liquidity
     */
    function contributeLiquidityFromExternalTreasury(
        uint256 liquidity
    ) external;

    /**
     *  @notice Contribute liquidity funded from Market Maker to the treasury.
     *
     *          Name        Description
     *  @param  liquidity   Contributed liquidity
     */
    function contributeLiquidityFromMarketMaker(
        uint256 liquidity
    ) external;

    /**
     *  @notice Contribute liquidity funded from Private Sale #1 to the treasury.
     *
     *          Name        Description
     *  @param  liquidity   Contributed liquidity
     */
    function contributeLiquidityFromPrivateSale1(
        uint256 liquidity
    ) external;

    /**
     *  @notice Contribute liquidity funded from Private Sale #2 to the treasury.
     *
     *          Name        Description
     *  @param  liquidity   Contributed liquidity
     */
    function contributeLiquidityFromPrivateSale2(
        uint256 liquidity
    ) external;

    /**
     *  @notice Contribute liquidity funded from Public Sale to the treasury.
     *
     *          Name        Description
     *  @param  liquidity   Contributed liquidity
     */
    function contributeLiquidityFromPublicSale(
        uint256 liquidity
    ) external;

    /**
     *  @notice Contribute liquidity funded from Seed Round to the treasury.
     *
     *          Name        Description
     *  @param  liquidity   Contributed liquidity
     */
    function contributeLiquidityFromSeedRound(
        uint256 liquidity
    ) external;

    /**
     *  @notice Contribute liquidity funded from a staking pool to the treasury.
     *
     *          Name        Description
     *  @param  liquidity   Contributed liquidity
     *
     *  @dev    Permission: Staking pools.
     */
    function contributeLiquidityFromStakeToken(
        uint256 liquidity
    ) external;


    /**
     *  @notice Mint reward tokens for the sending staking pool based on its wave progression.
     *  @notice After all three staking pool have culminated, the staking pool #3 may still fetch new wave with the reward capped
     *          at the lesser between its standard wave reward and the remaining mintable tokens to reach the maximum supply cap.
     *
     *          Name    Description
     *  @return reward  Staking reward.
     *
     *  @dev    Permission: Staking pools.
     */
    function mintForStake() external returns (uint256 reward);


    /**
     *  @notice Liquidate tokens for proportional liquidity from the treasury.
     *  @notice Liquidate only after liquidation unlock timestamp.
     *
     *          Name        Description
     *  @param  amount      Liquidated token amount.
     *  @return liquidity   Liquidated value.
     */
    function liquidate(
        uint256 amount
    ) external returns (uint256 liquidity);
}
