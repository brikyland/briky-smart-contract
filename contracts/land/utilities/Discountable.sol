// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Formula} from "../../lib/Formula.sol";

import {IAdmin} from "../../common/interfaces/IAdmin.sol";
import {ICommon} from "../../common/interfaces/ICommon.sol";

import {IExclusiveToken} from "../../land/interfaces/IExclusiveToken.sol";

abstract contract Discountable is ICommon {
    using Formula for uint256;


    function _applyDiscount(uint256 _feeAmount, address _currency) internal view returns (uint256) {
        return IAdmin(ICommon(this).admin()).isExclusiveCurrency(_currency)
            ? _feeAmount.applyDiscount(IExclusiveToken(_currency).exclusiveDiscount())
            : _feeAmount;
    }
}
