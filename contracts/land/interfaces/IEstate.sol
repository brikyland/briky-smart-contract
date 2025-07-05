// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IEstate {
    struct Estate {
        bytes32 zone;
        uint256 tokenizationId;
        address tokenizer;
        uint40 tokenizeAt;
        uint40 expireAt;
        bool isDeprecated;
    }
}
