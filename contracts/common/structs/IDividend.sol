// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IDividend {
    struct Dividend {
        uint256 tokenId;
        uint256 remainWeight;
        uint256 remainValue;
        address currency;
        uint40 at;
        address governor;
    }
}
