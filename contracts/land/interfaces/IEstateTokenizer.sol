// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/IERC165Upgradeable.sol";

interface IEstateTokenizer is
IERC165Upgradeable {
    function allocationOfAt(
        uint256 tokenizationId,
        address account,
        uint256 at
    ) external view returns (uint256 allocation);
}
