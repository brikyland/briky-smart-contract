// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC721MortgageToken} from "../interfaces/IERC721MortgageToken.sol";

abstract contract ERC721MortgageTokenStorage is IERC721MortgageToken {
    mapping(uint256 => address) public collaterals;

    mapping(address => bool) public isCollateral;

    uint256[50] private __gap;
}
