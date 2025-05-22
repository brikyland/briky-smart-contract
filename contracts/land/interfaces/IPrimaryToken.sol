// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {IERC20MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import {IERC20PermitUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20PermitUpgradeable.sol";

import {ICommon} from "../../common/interfaces/ICommon.sol";

interface IPrimaryToken is
ICommon,
IERC20Upgradeable,
IERC20MetadataUpgradeable,
IERC20PermitUpgradeable {
    event StakeToken1Update(address newAddress);
    event StakeToken2Update(address newAddress);
    event StakeToken3Update(address newAddress);
    event TreasuryUpdate(address newAddress);

    event BackerRoundTokensUnlock();
    event CoreTeamTokensUnlock();
    event ExternalTreasuryTokensUnlock();
    event MarketMakerTokensUnlock();
    event PrivateSale1TokensUnlock();
    event PrivateSale2TokensUnlock();
    event PublicSaleTokensUnlock();
    event SeedRoundTokensUnlock();

    event DailyStake1Mint(uint256 amount);
    event DailyStake2Mint(uint256 amount);
    event DailyStake3Mint(uint256 amount);

    event LiquidityContributionFromBackerRound(uint256 liquidity);
    event LiquidityContributionFromExternalTreasury(uint256 liquidity);
    event LiquidityContributionFromMarketMaker(uint256 liquidity);
    event LiquidityContributionFromPrivateSale1(uint256 liquidity);
    event LiquidityContributionFromPrivateSale2(uint256 liquidity);
    event LiquidityContributionFromPublicSale(uint256 liquidity);
    event LiquidityContributionFromSeedRound(uint256 liquidity);

    event Liquidation(
        address indexed account,
        uint256 amount,
        uint256 liquidity
    );

    error AllStakeRewardMinted();
    error AlreadyUnlockedTokens();
    error BeingLocked();
    error SupplyCapReached();

    function admin() external view returns (address admin);
    function stakeToken() external view returns (address stakeToken);
    function treasury() external view returns (address treasury);

    function backerRoundContribution() external view returns (uint256 contribution);
    function externalTreasuryContribution() external view returns (uint256 contribution);
    function marketMakerContribution() external view returns (uint256 contribution);
    function privateSale1Contribution() external view returns (uint256 contribution);
    function privateSale2Contribution() external view returns (uint256 contribution);
    function publicSaleContribution() external view returns (uint256 contribution);
    function seedRoundContribution() external view returns (uint256 contribution);

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

    function mintForStake() external returns (uint256 reward);

    function liquidate(uint256 amount) external;
}
