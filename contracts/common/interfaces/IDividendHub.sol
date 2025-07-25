// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IDividend} from "../structs/IDividend.sol";

import {ICommon} from "./ICommon.sol";

interface IDividendHub is
IDividend,
ICommon {
    event NewDividend(
        address indexed governor,
        uint256 indexed tokenId,
        address indexed issuer,
        uint256 totalWeight,
        uint256 value,
        address currency
    );

    event Withdrawal(
        uint256 indexed dividendId,
        address indexed withdrawer,
        uint256 value
    );

    error AlreadyWithdrawn();
    error InvalidDividendId();
    error InvalidTokenId();
    error InvalidWithdrawing();

    function dividendNumber() external view returns (uint256 dividendNumber);

    function getDividend(uint256 dividendId) external view returns (Dividend memory dividend);

    function withdrawAt(uint256 dividendId, address account) external view returns (uint256 withdrawAt);

    function issueDividend(
        address governor,
        uint256 tokenId,
        uint256 value,
        address currency
    ) external payable returns (uint256 dividendId);

    function withdraw(uint256[] calldata dividendIds) external;
}
