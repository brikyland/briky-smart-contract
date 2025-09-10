// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IProjectTokenReceiver} from "../../launch/interfaces/IProjectTokenReceiver.sol";

import {IProjectCollateral} from "../structs/IProjectCollateral.sol";

import {IMortgageToken} from "./IMortgageToken.sol";

interface IProjectMortgageToken is
IProjectCollateral,
IProjectTokenReceiver ,
IMortgageToken {
    function getCollateral(uint256 mortgageId) external view returns (ProjectCollateral memory collateral);

    function borrow(
        uint256 projectId,
        uint256 amount,
        uint256 principal,
        uint256 repayment,
        address currency,
        uint40 duration
    ) external returns (uint256 mortgageId);
}
