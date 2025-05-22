// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IPrimaryToken} from "../interfaces/IPrimaryToken.sol";

abstract contract PrimaryTokenStorage is IPrimaryToken {
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
    // deprecated
    address public stakeToken;
    address public treasury;

    address public stakeToken1;
    address public stakeToken2;
    address public stakeToken3;

    uint256 public mintedStakeReward1;
    uint256 public mintedStakeReward2;
    uint256 public mintedStakeReward3;

    uint256[44] private __gap;
}
