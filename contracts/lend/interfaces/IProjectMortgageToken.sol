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
 *  @notice A `IProjectMortgageToken` contract facilitates peer-to-peer lending secured by project tokens as collateral. Each provided mortgage
 *          is tokenized into an ERC-721 token, whose owner has the right to receive repayments from the borrower or foreclose
 *          on the collateral from the contract once overdue.
 * 
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 */
interface IProjectMortgageToken is
IProjectCollateral,
IProjectTokenReceiver ,
IMortgageToken {
    /** ===== EVENT ===== **/
    /**
     *  @notice Emitted when a new mortgage collateral is secured.
     *
     *          Name          Description
     *  @param  mortgageId    Mortgage identifier.
     *  @param  projectId     Project identifier.
     *  @param  amount        Collateral amount.
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
     *  @notice List a new mortgage offer with project tokens as collateral.
     * 
     *          Name         Description
     *  @param  projectId    Project identifier.
     *  @param  amount       Collateral amount.
     *  @param  principal    Principal value.
     *  @param  repayment    Repayment value.
     *  @param  currency     Currency address.
     *  @param  duration     Borrowing duration.
     *  @return mortgageId   New mortgage identifier.
     * 
     *  @dev    Approval must be granted for this contract to transfer collateral before borrowing. A mortgage can only be
     *          lent while approval remains active.
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
