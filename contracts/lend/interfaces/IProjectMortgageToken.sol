// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IProjectTokenReceiver} from "../../launch/interfaces/IProjectTokenReceiver.sol";

interface IProjectMortgageToken is IProjectTokenReceiver {
    error InvalidAmount();

    function borrow(
        uint256 tokenId,
        uint256 amount,
        uint256 principal,
        uint256 repayment,
        address currency,
        uint40 duration
    ) external returns (uint256 mortgageId);
}
