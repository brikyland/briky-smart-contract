// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { Revert } from "./Revert.sol";

contract ProxyCaller {
    function call(address _to, bytes calldata _data) external payable {
        (bool success, bytes memory result) = _to.call{value: msg.value}(_data);
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