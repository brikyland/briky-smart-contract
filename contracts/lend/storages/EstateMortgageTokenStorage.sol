// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IEstateMortgageToken} from "../interfaces/IEstateMortgageToken.sol";

abstract contract EstateMortgageTokenStorage is IEstateMortgageToken {
    address public estateToken;

    uint256[50] private __gap;
}
