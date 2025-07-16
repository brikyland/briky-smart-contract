// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ICommon} from "./ICommon.sol";

interface IDividendHub is ICommon {
    struct Dividend {
        uint256 tokenId;
        uint256 remainWeight;
        uint256 remainValue;
        address currency;
        uint40 at;
        address governor;
    }

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
    error InvalidGovernor();
    error InvalidTokenId();
    error InvalidWithdrawing();

    function dividendNumber() external view returns (uint256 dividendNumber);

    function getDividend(uint256 dividendId) external view returns (Dividend memory dividend);

    function hasWithdrawn(uint256 dividendId, address account) external view returns (bool hasWithdrawn);

    function issueDividend(
        address governor,
        uint256 tokenId,
        uint256 value,
        address currency
    ) external payable returns (uint256 dividendId);

    function withdraw(uint256[] calldata dividendIds) external;
}
