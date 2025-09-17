// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/common/interfaces/
import {IAdmin} from "../interfaces/IAdmin.sol";
import {ICommon} from "../interfaces/ICommon.sol";
import {IExclusiveToken} from "../interfaces/IExclusiveToken.sol";

/// contracts/common/utilities/
import {Formula} from "./Formula.sol";

/**
 *  @author Briky Team
 *
 *  @notice A `Discountable` contract applies discounting to payments made in exclusive tokens.
 *
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 */
abstract contract Discountable is
ICommon {
    /** ===== LIBRARY ===== **/
    using Formula for uint256;


    /** ===== FUNCTION ===== **/
    /* --- Helper --- */
    /**
     *          Name                Description
     *  @param  _value              Original value.
     *  @param  _currency           Currency address.
     *  @return _discountedValue    Value after subtracting exclusive discount if applicable.
     */
    function _applyDiscount(
        uint256 _value,
        address _currency
    ) internal view returns (uint256 _discountedValue) {
        ///  @notice Only exclusive tokens registered in the `Admin` contract can grant exclusive discount.
        return IAdmin(this.admin()).isExclusiveCurrency(_currency)
            ? _value.remain(IExclusiveToken(_currency).exclusiveDiscount())
            : _value;
    }
}
