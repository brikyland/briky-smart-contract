// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC2981Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC2981Upgradeable.sol";

import {IRate} from "../../common/structs/IRate.sol";

interface IERC721MortgageToken is IRate {
    event CollateralWhitelist(address collateral);
    event CollateralUnwhitelist(address collateral);

    error WhitelistedCollateral();
    error NotWhitelistedCollateral();

    error InvalidCollateral();
    error NotTokenOwner();

    function borrow(
        address collateral,
        uint256 tokenId,
        uint256 principal,
        uint256 repayment,
        address currency,
        uint40 duration
    ) external returns (uint256 mortgageId);
}
