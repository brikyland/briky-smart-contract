// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC1155ReceiverUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC1155ReceiverUpgradeable.sol";

import {ICommon} from "../../common/interfaces/ICommon.sol";

interface IEstateTokenizer is
ICommon,
IERC1155ReceiverUpgradeable {
    function estateToken() external view returns (address estateToken);

    function allocationOfAt(
        uint256 tokenizationId,
        address account,
        uint256 at
    ) external view returns (uint256 allocation);
}
