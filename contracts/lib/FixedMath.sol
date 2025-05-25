// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {MulDiv} from "./MulDiv.sol";

library FixedMath {
    error DivisionByZero();

    uint256 internal constant ONE = 0x100000000000000000000000000000000;

    function toFixed(uint256 _x) internal pure returns (uint256) {
        return _x << 128;
    }

    function toUint(uint256 _x) internal pure returns (uint256) {
        return _x >> 128;
    }

    function add(uint256 _a, uint256 _b) internal pure returns (uint256) {
        return _a + _b;
    }

    function sub(uint256 _a, uint256 _b) internal pure returns (uint256) {
        return _a - _b;
    }

    function mul(uint256 _a, uint256 _b) internal pure returns (uint256) {
        return MulDiv.mulDiv(_a, _b, ONE);
    }

    function div(uint256 _a, uint256 _b) internal pure returns (uint256) {
        if (_b == 0) {
            revert DivisionByZero();
        }
        return MulDiv.mulDiv(_a, ONE, _b);
    }
}
