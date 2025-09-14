// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/launch/interfaces/
import {IProjectTokenReceiver} from "../../launch/interfaces/IProjectTokenReceiver.sol";

/// contracts/lend/structs/
import {IProjectCollateral} from "../structs/IProjectCollateral.sol";

/// contracts/lend/interfaces/
import {IMortgageToken} from "./IMortgageToken.sol";


/**
 *  @author Briky Team
 *
 *  @notice Interface for contract `IProjectMortgageToken`.
 * 
 *  @notice A `IProjectMortgageToken` contract is an ERC-721 contract that facilitates mortgage-based borrowing backed by project token collaterals and issues tokens representing mortgages.
 */
interface IProjectMortgageToken is
IProjectCollateral,
IProjectTokenReceiver ,
IMortgageToken {
    /** ===== EVENT ===== **/
    /**
     *  @notice Emitted when a new collateral is assigned to a mortgage.
     *
     *          Name          Description
     *  @param  mortgageId    Mortgage identifier.
     *  @param  projectId     Project identifier.
     *  @param  amount        Amount of project tokens pledged as collateral.
     */
    event NewCollateral(
        uint256 indexed mortgageId,
        uint256 indexed projectId,
        uint256 amount
    );


    /** ===== FUNCTION ===== **/
    /* --- Query --- */
    /**
     *          Name          Description
     *  @param  mortgageId    Mortgage identifier.
     *  @return collateral    Collateral information.
     */
    function getCollateral(
        uint256 mortgageId
    ) external view returns (ProjectCollateral memory collateral);


    /* --- Command --- */
    /**
     *  @notice List a new mortgage backed by collateral from project tokens.
     * 
     *          Name         Description
     *  @param  projectId    Project identifier.
     *  @param  amount       Amount of project tokens pledged as collateral.
     *  @param  principal    Principal value.
     *  @param  repayment    Repayment value.
     *  @param  currency     Loan currency address.
     *  @param  duration     Repayment duration.
     *  @return mortgageId   New mortgage identifier.
     * 
     *  @dev    Must set approval for the contract to transfer collateral tokens of the borrower before listing.
     */
    function borrow(
        uint256 projectId,
        uint256 amount,
        uint256 principal,
        uint256 repayment,
        address currency,
        uint40 duration
    ) external returns (uint256 mortgageId);
}
