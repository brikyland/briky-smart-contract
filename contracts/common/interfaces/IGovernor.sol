// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC165Upgradeable.sol";

interface IGovernor is IERC165Upgradeable {
    function isAvailable(uint256 _tokenId) external view returns (bool isAvailable);

    function isVotePowerAvailable(uint256 _tokenId) external view returns (bool isVotePowerAvailable);

    function zoneOf(uint256 _tokenId) external view returns (bytes32 zone);

    function totalVoteAt(
        uint256 _tokenId,
        uint256 _at
    ) external view returns (uint256 totalVotePower);

    function voteOfAt(
        address _account,
        uint256 _tokenId,
        uint256 _at
    ) external view returns (uint256 votePower);
}
