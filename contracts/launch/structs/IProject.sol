// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IProject {
    struct Project {
        bytes32 zone;
        uint256 estateId;
        uint256 launchId;
        address launchpad;
        uint40 tokenizeAt;
        uint40 deprecateAt;
        address initiator;
    }
}
