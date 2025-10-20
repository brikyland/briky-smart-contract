// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { ProjectToken } from "../../launch/ProjectToken.sol";
import { ProxyCaller } from "../misc/utilities/ProxyCaller.sol";

/// @custom:oz-upgrades-unsafe-allow missing-initializer
contract MockProjectToken is ProjectToken, ProxyCaller {
    function updateFeeReceiver(address _feeReceiver) external {
        feeReceiver = _feeReceiver;
    }

    function mintTo(address to, uint256 projectId, uint256 amount) external {
        _mint(to, projectId, amount, "");
    }
}