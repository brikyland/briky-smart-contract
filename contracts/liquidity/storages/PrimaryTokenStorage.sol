// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/liquidity/interfaces/
import {IPrimaryToken} from "../../liquidity/interfaces/IPrimaryToken.sol";

/**
 *  @author Briky Team
 *
 *  @notice Storage contract for contract `PrimaryToken`.
 */
abstract contract PrimaryTokenStorage is
IPrimaryToken {
    uint256 public backerRoundContribution;
    uint256 public externalTreasuryContribution;
    uint256 public marketMakerContribution;
    uint256 public privateSale1Contribution;
    uint256 public privateSale2Contribution;
    uint256 public publicSaleContribution;
    uint256 public seedRoundContribution;

    uint256 public liquidationUnlockedAt;

    bool public backerRoundUnlocked;
    bool public coreTeamTokensUnlocked;
    bool public externalTreasuryTokensUnlocked;
    bool public marketMakerTokensUnlocked;
    bool public privateSale1Unlocked;
    bool public privateSale2Unlocked;
    bool public publicSaleUnlocked;
    bool public seedRoundUnlocked;

    address public admin;

    /// @dev    DEPRECATED!
    address private stakeToken;

    address public treasury;

    /** ===== UPGRADE ===== **/
    uint256 public stakeToken1Waves;
    uint256 public stakeToken2Waves;
    uint256 public stakeToken3Waves;

    uint256 public stakeToken1Contribution;
    uint256 public stakeToken2Contribution;
    uint256 public stakeToken3Contribution;

    address public stakeToken1;
    address public stakeToken2;
    address public stakeToken3;

    uint256[41] private __gap;
}
