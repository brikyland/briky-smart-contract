// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { PrestigePad } from "../../launch/PrestigePad.sol";
import { ProxyCaller } from "../misc/utilities/ProxyCaller.sol";
import { IProjectToken } from "../../launch/interfaces/IProjectToken.sol";

/// @custom:oz-upgrades-unsafe-allow missing-initializer
contract MockPrestigePad is PrestigePad, ProxyCaller {
    function transfer(address to, uint256 projectId, uint256 amount) public {
        IProjectToken(projectToken).safeTransferFrom(
            address(this),
            to,
            projectId,
            amount,
            ""
        );
    }
}