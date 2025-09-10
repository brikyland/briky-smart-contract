// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IEstateMortgageToken} from "../interfaces/IEstateMortgageToken.sol";

abstract contract EstateMortgageTokenStorage is IEstateMortgageToken {
    mapping(uint256 => EstateCollateral) internal collaterals;

    address public estateToken;

    uint256[50] private __gap;
}
