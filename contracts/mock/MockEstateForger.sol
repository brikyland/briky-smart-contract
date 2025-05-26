// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { EstateForger } from "../land/EstateForger.sol";
import { Revert } from "../lib/Revert.sol";

contract MockEstateForger is EstateForger {
    function call(address _to, bytes calldata _data) external {
        (bool success, bytes memory result) = _to.call(_data);
        if (!success) {
            Revert.revertFromReturnedData(result);
        }
    }
}