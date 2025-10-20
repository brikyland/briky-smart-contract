// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { EstateToken } from "../../land/EstateToken.sol";
import { ProxyCaller } from "../misc/utilities/ProxyCaller.sol";

/// @custom:oz-upgrades-unsafe-allow missing-initializer
contract MockEstateToken is EstateToken, ProxyCaller {
    function updateFeeReceiver(address _feeReceiver) external {
        feeReceiver = _feeReceiver;
    }

    function mint(address to, uint256 estateId, uint256 amount) external {
        _mint(to, estateId, amount, "");
    }
}