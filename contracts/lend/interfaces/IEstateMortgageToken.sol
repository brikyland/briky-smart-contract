// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IEstateTokenReceiver} from "../../land/interfaces/IEstateTokenReceiver.sol";

import {IEstateCollateral} from "../structs/IEstateCollateral.sol";

import {IMortgageToken} from "./IMortgageToken.sol";

interface IEstateMortgageToken is
IEstateCollateral,
IEstateTokenReceiver,
IMortgageToken {
    function getCollateral(uint256 mortgageId) external view returns (EstateCollateral memory collateral);

    function borrow(
        uint256 estateId,
        uint256 amount,
        uint256 principal,
        uint256 repayment,
        address currency,
        uint40 duration
    ) external returns (uint256 mortgageId);
}
