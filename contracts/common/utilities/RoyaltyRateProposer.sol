// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Formula} from "../../lib/Formula.sol";

import {CommonConstant} from "../constants/CommonConstant.sol";

import {IAdmin} from "../interfaces/IAdmin.sol";
import {IRoyaltyRateProposer} from "../interfaces/IRoyaltyRateProposer.sol";

abstract contract RoyaltyRateProposer is
IRoyaltyRateProposer {
    using Formula for uint256;

    function _royaltyReceiver() internal view virtual returns (address royaltyReceiver);

    function royaltyInfo(
        uint256 _tokenId,
        uint256 _salePrice
    ) external view returns (address, uint256) {
        return (
            _royaltyReceiver(),
            _salePrice.scale(this.getRoyaltyRate(_tokenId))
        );
    }
}
