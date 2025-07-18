// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ICommon} from "../../common/interfaces/ICommon.sol";
import {IExclusiveToken} from "../../common/interfaces/IExclusiveToken.sol";

interface IPrimaryToken is
ICommon,
IExclusiveToken {
    event StakeTokensUpdate(
        address newAddress1,
        address newAddress2,
        address newAddress3
    );
    event TreasuryUpdate(address newAddress);

    event BackerRoundTokensUnlock();
    event CoreTeamTokensUnlock();
    event ExternalTreasuryTokensUnlock();
    event MarketMakerTokensUnlock();
    event PrivateSale1TokensUnlock();
    event PrivateSale2TokensUnlock();
    event PublicSaleTokensUnlock();
    event SeedRoundTokensUnlock();

    event DailyStake1Mint(uint256 day, uint256 amount);
    event DailyStake2Mint(uint256 day, uint256 amount);
    event DailyStake3Mint(uint256 day, uint256 amount);

    event LiquidityContributionFromBackerRound(uint256 liquidity);
    event LiquidityContributionFromExternalTreasury(uint256 liquidity);
    event LiquidityContributionFromMarketMaker(uint256 liquidity);
    event LiquidityContributionFromPrivateSale1(uint256 liquidity);
    event LiquidityContributionFromPrivateSale2(uint256 liquidity);
    event LiquidityContributionFromPublicSale(uint256 liquidity);
    event LiquidityContributionFromSeedRound(uint256 liquidity);
    event LiquidityContributionFromStakeToken1(uint256 liquidity);
    event LiquidityContributionFromStakeToken2(uint256 liquidity);
    event LiquidityContributionFromStakeToken3(uint256 liquidity);

    event Liquidation(
        address indexed account,
        uint256 amount,
        uint256 liquidity
    );

    error AllStakeRewardMinted();
    error AlreadyUnlockedTokens();
    error BeingLocked();
    error SupplyCapReached();

    function treasury() external view returns (address treasury);

    function stakeToken1() external view returns (address stakeToken1);
    function stakeToken2() external view returns (address stakeToken2);
    function stakeToken3() external view returns (address stakeToken3);

    function stakeToken1Waves() external view returns (uint256 waves);
    function stakeToken2Waves() external view returns (uint256 waves);
    function stakeToken3Waves() external view returns (uint256 waves);

    function backerRoundContribution() external view returns (uint256 contribution);
    function externalTreasuryContribution() external view returns (uint256 contribution);
    function marketMakerContribution() external view returns (uint256 contribution);
    function privateSale1Contribution() external view returns (uint256 contribution);
    function privateSale2Contribution() external view returns (uint256 contribution);
    function publicSaleContribution() external view returns (uint256 contribution);
    function seedRoundContribution() external view returns (uint256 contribution);
    function stakeToken1Contribution() external view returns (uint256 contribution);
    function stakeToken2Contribution() external view returns (uint256 contribution);
    function stakeToken3Contribution() external view returns (uint256 contribution);

    function backerRoundUnlocked() external view returns (bool isUnlocked);
    function coreTeamTokensUnlocked() external view returns (bool isUnlocked);
    function externalTreasuryTokensUnlocked() external view returns (bool isUnlocked);
    function marketMakerTokensUnlocked() external view returns (bool isUnlocked);
    function privateSale1Unlocked() external view returns (bool isUnlocked);
    function privateSale2Unlocked() external view returns (bool isUnlocked);
    function publicSaleUnlocked() external view returns (bool isUnlocked);
    function seedRoundUnlocked() external view returns (bool isUnlocked);

    function liquidationUnlockedAt() external view returns (uint256 liquidationUnlockedAt);

    function contributeLiquidityFromBackerRound(uint256 liquidity) external;
    function contributeLiquidityFromExternalTreasury(uint256 liquidity) external;
    function contributeLiquidityFromMarketMaker(uint256 liquidity) external;
    function contributeLiquidityFromPrivateSale1(uint256 liquidity) external;
    function contributeLiquidityFromPrivateSale2(uint256 liquidity) external;
    function contributeLiquidityFromPublicSale(uint256 liquidity) external;
    function contributeLiquidityFromSeedRound(uint256 liquidity) external;
    function contributeLiquidityFromStakeToken(uint256 liquidity, address _stakeToken) external;

    function isStakeRewardingCulminated() external view returns (bool isCompleted);
    function totalStake() external view returns (uint256 totalStake);

    function mintForStake() external returns (uint256 reward);

    function liquidate(uint256 amount) external returns (uint256 liquidity);
}
