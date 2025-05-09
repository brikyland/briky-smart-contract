// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {FixedMath} from "./FixedMath.sol";

library Formula {
    using FixedMath for uint256;

    function newInterestAccumulation(
        uint256 _interestAccumulation,
        uint256 _reward,
        uint256 _totalSupply
    ) internal pure returns (uint256) {
        return _interestAccumulation.mul(FixedMath.ONE.add(_reward.div(_totalSupply)));
    }

    function tokenToWeight(uint256 _token, uint256 _accumulateInterestRate) internal pure returns (uint256) {
        return _token.toFixed().div(_accumulateInterestRate);
    }

    function weightToToken(uint256 _weight, uint256 _accumulateInterestRate) internal pure returns (uint256) {
        return _weight.mul(_accumulateInterestRate).toUint();
    }
}
