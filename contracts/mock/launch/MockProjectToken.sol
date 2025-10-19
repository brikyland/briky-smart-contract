// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { ProjectToken } from "../../launch/ProjectToken.sol";
import { ProxyCaller } from "../utilities/ProxyCaller.sol";

contract MockProjectToken is ProjectToken, ProxyCaller {
    function updateFeeReceiver(address _feeReceiver) external {
        feeReceiver = _feeReceiver;
    }

    function mintTo(address to, uint256 projectId, uint256 amount) external {
        _mint(to, projectId, amount, "");
    }
}