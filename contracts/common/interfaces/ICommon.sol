// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ICommon {
    error AuthorizedAccount();
    error BadAnchor();
    error FailedVerification();
    error InsufficientFunds();
    error InvalidCurrency();
    error InvalidGovernor();
    error InvalidInput();
    error InvalidTimestamp();
    error InvalidUpdating();
    error InvalidZone();
    error NotAuthorizedAccount();
    error Unauthorized();

    function version() external pure returns (string memory version);

    function admin() external view returns (address admin);
}
