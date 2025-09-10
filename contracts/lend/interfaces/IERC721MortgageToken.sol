// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC721Collateral} from "../structs/IERC721Collateral.sol";

import {IMortgageToken} from "./IMortgageToken.sol";

interface IERC721MortgageToken is
IERC721Collateral,
IMortgageToken {
    event CollateralRegistration(address collateral);
    event CollateralDeregistration(address collateral);

    event Collateral(
        address indexed token,
        uint256 indexed tokenId
    );

    error NotRegisteredCollateral();
    error RegisteredCollateral();

    function isCollateral(address token) external view returns (bool isCollateral);

    function getCollateral(uint256 mortgageId) external view returns (ERC721Collateral memory collateral);

    function borrow(
        address token,
        uint256 tokenId,
        uint256 principal,
        uint256 repayment,
        address currency,
        uint40 duration
    ) external returns (uint256 mortgageId);
}
