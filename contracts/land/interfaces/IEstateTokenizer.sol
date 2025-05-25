// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/IERC165Upgradeable.sol";

import {ICommon} from "../../common/interfaces/ICommon.sol";

interface IEstateTokenizer is
ICommon,
IERC165Upgradeable {
    function allocationOfAt(
        uint256 tokenizationId,
        address account,
        uint256 at
    ) external view returns (uint256 allocation);
}
