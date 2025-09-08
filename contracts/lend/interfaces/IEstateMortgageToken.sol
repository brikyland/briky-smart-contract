// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IEstateTokenReceiver} from "../../land/interfaces/IEstateTokenReceiver.sol";

interface IEstateMortgageToken is IEstateTokenReceiver {
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
