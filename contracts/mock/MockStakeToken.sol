// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { StakeToken } from "../land/StakeToken.sol";
import { Revert } from "../lib/Revert.sol";

contract MockStakeToken is StakeToken {
    function call(address _to, bytes calldata _data) external {
        (bool success, bytes memory result) = _to.call(_data);
        if (!success) {
            Revert.revertFromReturnedData(result);
        }
    }

    function callView(address _to, bytes calldata _data) external view returns (bytes memory) {
        (bool success, bytes memory result) = _to.staticcall(_data);
        if (!success) {
            Revert.revertFromReturnedData(result);
        }
        return result;
    }
}