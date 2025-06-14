// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ICommon {
    struct Rate {
        uint256 value;
        uint8 decimals;
    }

    struct Snapshot {
        uint256 value;
        uint256 timestamp;
    }

    error BadAnchor();
    error FailedVerification();
    error InsufficientFunds();
    error InvalidCurrency();
    error InvalidInput();
    error InvalidRate();
    error InvalidUpdating();
    error Unauthorized();

    function version() external pure returns (string memory version);

    function admin() external view returns (address admin);
}
