// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/common/interfaces/
import {ICommon} from "../../common/interfaces/ICommon.sol";
import {IExclusiveToken} from "../../common/interfaces/IExclusiveToken.sol";

/**
 *  @author Briky Team
 *
 *  @notice Interface for contract `PrimaryToken`.
 *  @notice TODO: The `PrimaryToken` contract is the primary ERC-20 token of the Briky ecosystem.
 *
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 */
interface IPrimaryToken is
ICommon,
IExclusiveToken {
    /** ===== EVENT ===== **/
    /* --- Configuration --- */
    /**
     *  @notice Emitted when stake token contract addresses are updated.
     *
     *          Name            Description
     *  @param  newAddress1     New stake token #1 contract address.
     *  @param  newAddress2     New stake token #2 contract address.
     *  @param  newAddress3     New stake token #3 contract address.
     */
    event StakeTokensUpdate(
        address newAddress1,
        address newAddress2,
        address newAddress3
    );

    /**
     *  @notice Emitted when treasury contract address is updated.
     *
     *          Name            Description
     *  @param  newAddress      New treasury contract address.
     */
    event TreasuryUpdate(
        address newAddress
    );

    /* --- Token Unlock --- */
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

    /* --- Stake Rewards --- */
    /**
     *  @notice Emitted when daily reward tokens are minted for stake token #1.
     *
     *          Name        Description
     *  @param  day         Current wave number.
     *  @param  amount      Amount of tokens minted as reward.
     */
    event DailyStake1Mint(
        uint256 day,
        uint256 amount
    );

    /**
     *  @notice Emitted when daily reward tokens are minted for stake token #2.
     *
     *          Name        Description
     *  @param  day         Current wave number.
     *  @param  amount      Amount of tokens minted as reward.
     */
    event DailyStake2Mint(
        uint256 day,
        uint256 amount
    );

    /**
     *  @notice Emitted when daily reward tokens are minted for stake token #3.
     *
     *          Name        Description
     *  @param  day         Current wave number.
     *  @param  amount      Amount of tokens minted as reward.
     */
    event DailyStake3Mint(
        uint256 day,
        uint256 amount
    );

    /* --- Liquidity Contribution --- */
    /**
     *  @notice Emitted when liquidity is contributed from Backer Round funding.
     *
     *          Name        Description
     *  @param  liquidity   Amount of liquidity contributed.
     */
    event LiquidityContributionFromBackerRound(
        uint256 liquidity
    );

    /**
     *  @notice Emitted when liquidity is contributed from External Treasury funding.
     *
     *          Name        Description
     *  @param  liquidity   Amount of liquidity contributed.
     */
    event LiquidityContributionFromExternalTreasury(
        uint256 liquidity
    );

    /**
     *  @notice Emitted when liquidity is contributed from Market Maker funding.
     *
     *          Name        Description
     *  @param  liquidity   Amount of liquidity contributed.
     */
    event LiquidityContributionFromMarketMaker(
        uint256 liquidity
    );

    /**
     *  @notice Emitted when liquidity is contributed from Private Sale #1 funding.
     *
     *          Name        Description
     *  @param  liquidity   Amount of liquidity contributed.
     */
    event LiquidityContributionFromPrivateSale1(
        uint256 liquidity
    );

    /**
     *  @notice Emitted when liquidity is contributed from Private Sale #2 funding.
     *
     *          Name        Description
     *  @param  liquidity   Amount of liquidity contributed.
     */
    event LiquidityContributionFromPrivateSale2(
        uint256 liquidity
    );

    /**
     *  @notice Emitted when liquidity is contributed from Public Sale funding.
     *
     *          Name        Description
     *  @param  liquidity   Amount of liquidity contributed.
     */
    event LiquidityContributionFromPublicSale(
        uint256 liquidity
    );

    /**
     *  @notice Emitted when liquidity is contributed from Seed Round funding.
     *
     *          Name        Description
     *  @param  liquidity   Amount of liquidity contributed.
     */
    event LiquidityContributionFromSeedRound(
        uint256 liquidity
    );

    /**
     *  @notice Emitted when liquidity is contributed from stake token #1 contract.
     *
     *          Name        Description
     *  @param  liquidity   Amount of liquidity contributed.
     */
    event LiquidityContributionFromStakeToken1(
        uint256 liquidity
    );

    /**
     *  @notice Emitted when liquidity is contributed from stake token #2 contract.
     *
     *          Name        Description
     *  @param  liquidity   Amount of liquidity contributed.
     */
    event LiquidityContributionFromStakeToken2(
        uint256 liquidity
    );

    /**
     *  @notice Emitted when liquidity is contributed from stake token #3 contract.
     *
     *          Name        Description
     *  @param  liquidity   Amount of liquidity contributed.
     */
    event LiquidityContributionFromStakeToken3(
        uint256 liquidity
    );

    /* --- Token Operations --- */
    /**
     *  @notice Emitted when tokens are liquidated for treasury liquidity.
     *
     *          Name        Description
     *  @param  account     Account that performed the liquidation.
     *  @param  amount      Amount of tokens liquidated.
     *  @param  liquidity   Amount of liquidity received from treasury.
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
    error SupplyCapReached();


    /** ===== FUNCTION ===== **/
    /* --- Dependency --- */
    /**
     *          Name        Description
     *  @return treasury    Treasury contract address.
     */
    function treasury() external view returns (address treasury);

    /**
     *          Name            Description
     *  @return stakeToken1     Stake token #1 contract address.
     */
    function stakeToken1() external view returns (address stakeToken1);

    /**
     *          Name            Description
     *  @return stakeToken2     Stake token #2 contract address.
     */
    function stakeToken2() external view returns (address stakeToken2);

    /**
     *          Name            Description
     *  @return stakeToken3     Stake token #3 contract address.
     */
    function stakeToken3() external view returns (address stakeToken3);

    /* --- Query --- */
    /**
     *          Name    Description
     *  @return waves   Current wave number for stake token #1.
     */
    function stakeToken1Waves() external view returns (uint256 waves);

    /**
     *          Name    Description
     *  @return waves   Current wave number for stake token #2.
     */
    function stakeToken2Waves() external view returns (uint256 waves);

    /**
     *          Name    Description
     *  @return waves   Current wave number for stake token #3.
     */
    function stakeToken3Waves() external view returns (uint256 waves);

    /**
     *          Name            Description
     *  @return contribution    Total liquidity contributed from Backer Round funding.
     */
    function backerRoundContribution() external view returns (uint256 contribution);

    /**
     *          Name            Description
     *  @return contribution    Total liquidity contributed from External Treasury funding.
     */
    function externalTreasuryContribution() external view returns (uint256 contribution);

    /**
     *          Name            Description
     *  @return contribution    Total liquidity contributed from Market Maker funding.
     */
    function marketMakerContribution() external view returns (uint256 contribution);

    /**
     *          Name            Description
     *  @return contribution    Total liquidity contributed from Private Sale #1 funding.
     */
    function privateSale1Contribution() external view returns (uint256 contribution);

    /**
     *          Name            Description
     *  @return contribution    Total liquidity contributed from Private Sale #2 funding.
     */
    function privateSale2Contribution() external view returns (uint256 contribution);

    /**
     *          Name            Description
     *  @return contribution    Total liquidity contributed from Public Sale funding.
     */
    function publicSaleContribution() external view returns (uint256 contribution);

    /**
     *          Name            Description
     *  @return contribution    Total liquidity contributed from Seed Round funding.
     */
    function seedRoundContribution() external view returns (uint256 contribution);

    /**
     *          Name            Description
     *  @return contribution    Total liquidity contributed from stake token #1 contract.
     */
    function stakeToken1Contribution() external view returns (uint256 contribution);

    /**
     *          Name            Description
     *  @return contribution    Total liquidity contributed from stake token #2 contract.
     */
    function stakeToken2Contribution() external view returns (uint256 contribution);

    /**
     *          Name            Description
     *  @return contribution    Total liquidity contributed from stake token #3 contract.
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
     *  @return liquidationUnlockedAt   Timestamp when token liquidation becomes available.
     */
    function liquidationUnlockedAt() external view returns (uint256 liquidationUnlockedAt);

    /**
     *          Name        Description
     *  @return totalStake  Total amount of tokens staked across all stake token contracts.
     */
    function totalStake() external view returns (uint256 totalStake);

    /**
     *          Name            Description
     *  @return isCompleted     Whether stake rewarding has reached its culminating wave for the calling stake token contract.
     */
    function isStakeRewardingCulminated() external view returns (bool isCompleted);

    /* --- Command --- */
    /**
     *  @notice Contribute liquidity funded from Backer Round to the treasury.
     *
     *          Name        Description
     *  @param  liquidity   Amount of liquidity to contribute.
     */
    function contributeLiquidityFromBackerRound(
        uint256 liquidity
    ) external;

    /**
     *  @notice Contribute liquidity funded from External Treasury to the treasury.
     *
     *          Name        Description
     *  @param  liquidity   Amount of liquidity to contribute.
     */
    function contributeLiquidityFromExternalTreasury(
        uint256 liquidity
    ) external;

    /**
     *  @notice Contribute liquidity funded from Market Maker to the treasury.
     *
     *          Name        Description
     *  @param  liquidity   Amount of liquidity to contribute.
     */
    function contributeLiquidityFromMarketMaker(
        uint256 liquidity
    ) external;

    /**
     *  @notice Contribute liquidity funded from Private Sale #1 to the treasury.
     *
     *          Name        Description
     *  @param  liquidity   Amount of liquidity to contribute.
     */
    function contributeLiquidityFromPrivateSale1(
        uint256 liquidity
    ) external;

    /**
     *  @notice Contribute liquidity funded from Private Sale #2 to the treasury.
     *
     *          Name        Description
     *  @param  liquidity   Amount of liquidity to contribute.
     */
    function contributeLiquidityFromPrivateSale2(
        uint256 liquidity
    ) external;

    /**
     *  @notice Contribute liquidity funded from Public Sale to the treasury.
     *
     *          Name        Description
     *  @param  liquidity   Amount of liquidity to contribute.
     */
    function contributeLiquidityFromPublicSale(
        uint256 liquidity
    ) external;

    /**
     *  @notice Contribute liquidity funded from Seed Round to the treasury.
     *
     *          Name        Description
     *  @param  liquidity   Amount of liquidity to contribute.
     */
    function contributeLiquidityFromSeedRound(
        uint256 liquidity
    ) external;

    /**
     *  @notice Contribute liquidity funded from a stake token contract to the treasury.
     *
     *          Name        Description
     *  @param  liquidity   Amount of liquidity to contribute.
     *  @param  _stakeToken Stake token contract address.
     */
    function contributeLiquidityFromStakeToken(
        uint256 liquidity,
        address _stakeToken
    ) external;

    /**
     *  @notice Mint reward tokens for stake token contracts based on their wave progression.
     *
     *  @return reward      Amount of tokens minted as reward.
     *
     *  @dev    Permission: Stake token contracts only.
     */
    function mintForStake() external returns (uint256 reward);

    /**
     *  @notice Exchange tokens for proportional liquidity from the treasury.
     *
     *          Name        Description
     *  @param  amount      Amount of tokens to liquidate.
     *
     *  @return liquidity   Liquidity amount received from treasury.
     */
    function liquidate(
        uint256 amount
    ) external returns (uint256 liquidity);
}
