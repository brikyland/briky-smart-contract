// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/IERC165Upgradeable.sol";

interface IEstateTokenizer is
IERC165Upgradeable {
    function allocationOf(uint256 tokenizationId, address account) external view returns (uint256 allocation);
}
