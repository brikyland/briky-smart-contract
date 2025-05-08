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
    address public stakeToken;
    address public treasury;

    uint256[50] private __gap;
}
