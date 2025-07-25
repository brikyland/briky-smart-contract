// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ICommon} from "../../common/interfaces/ICommon.sol";

import {IEstateTokenReceiver} from "./IEstateTokenReceiver.sol";

interface IEstateTokenizer is
ICommon,
IEstateTokenReceiver {
    event EstateTokenWithdrawal(
        uint256 indexed tokenizationId,
        address indexed withdrawer,
        uint256 amount
    );

    function isTokenized(uint256 tokenizationId) external view returns (bool isTokenized);

    function allocationOfAt(
        uint256 tokenizationId,
        address account,
        uint256 at
    ) external view returns (uint256 allocation);

    function withdrawEstateToken(uint256 tokenizationId) external returns (uint256 amount);
}
