// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { PrestigePad } from "../launch/PrestigePad.sol";
import { Revert } from "../lib/Revert.sol";
import { ProxyCaller } from "./common/ProxyCaller.sol";
import { IProjectToken } from "../launch/interfaces/IProjectToken.sol";

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