// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IProjectMortgageToken} from "../interfaces/IProjectMortgageToken.sol";

abstract contract ProjectMortgageTokenStorage is IProjectMortgageToken {
    mapping(uint256 => ProjectCollateral) internal collaterals;

    address public projectToken;

    uint256[50] private __gap;
}
