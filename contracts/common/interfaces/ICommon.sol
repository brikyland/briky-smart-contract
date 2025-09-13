// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 *  @author Briky Team
 *
 *  @notice Interface for standard contract administered by the `Admin` contract.
 */
interface ICommon {
    /** ===== ERROR ===== **/
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


    /** ===== FUNCTION ===== **/
    /* --- Dependency --- */
    /**
     *          Name        Description
     *  @return admin       `Admin` contract address.
     */
    function admin() external view returns (address admin);


    /* --- Query --- */
    /**
     *          Name        Description
     *  @return version     Version of implementation.
     */
    function version() external pure returns (string memory version);
}
