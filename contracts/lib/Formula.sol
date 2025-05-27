// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ICommon} from "../common/interfaces/ICommon.sol";

import {Constant} from "./Constant.sol";
import {MulDiv} from "./MulDiv.sol";

library Formula {
    function scale(uint256 _value, uint256 _numerator, uint256 _denominator) internal pure returns (uint256) {
        return MulDiv.mulDiv(
            _value,
            _numerator,
            _denominator
        );
    }

    function scale(uint256 _value, ICommon.Rate memory _rate) internal pure returns (uint256) {
        return MulDiv.mulDiv(
            _value,
            _rate.value,
            10 ** _rate.decimals
        );
    }

    function applyDiscount(uint256 _value, ICommon.Rate memory _discount) internal pure returns (uint256) {
        return _value - scale(_value, _discount);
    }
}
