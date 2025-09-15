// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/land/interfaces/
import {IEstateTokenReceiver} from "../../land/interfaces/IEstateTokenReceiver.sol";

/// contracts/lend/structs/
import {IEstateCollateral} from "../structs/IEstateCollateral.sol";

/// contracts/lend/interfaces/
import {IMortgageToken} from "./IMortgageToken.sol";

/**
 *  @author Briky Team
 *
 *  @notice Interface for contract `IEstateMortgageToken`.
 * 
 *  @notice A `IEstateMortgageToken` contract is an ERC-721 contract that facilitates mortgage-based borrowing backed by estate token collaterals and issues tokens representing mortgages.
 */
interface IEstateMortgageToken is
IEstateCollateral,
IEstateTokenReceiver,
IMortgageToken {
    /** ===== EVENT ===== **/
    /**
     *  @notice Emitted when a new collateral is assigned to a mortgage.
     *
     *          Name          Description
     *  @param  mortgageId    Mortgage identifier.
     *  @param  estateId      Estate identifier.
     *  @param  amount        Amount of estate tokens pledged as collateral.
     */
    event NewCollateral(
        uint256 indexed mortgageId,
        uint256 indexed estateId,
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
    ) external view returns (EstateCollateral memory collateral);


    /* --- Command --- */
    /**
     *  @notice List a new mortgage backed by collateral from estate tokens.
     * 
     *          Name          Description
     *  @param  estateId      Estate identifier.
     *  @param  amount        Amount of estate tokens pledged as collateral.
     *  @param  principal     Principal value.
     *  @param  repayment     Repayment value.
     *  @param  currency      Loan currency address.
     *  @param  duration      Repayment duration.
     *  @return mortgageId    New mortgage identifier.
     * 
     *  @dev    Must set approval for this contract to transfer collateral tokens of the borrower before listing.
     */
    function borrow(
        uint256 estateId,
        uint256 amount,
        uint256 principal,
        uint256 repayment,
        address currency,
        uint40 duration
    ) external returns (uint256 mortgageId);
}
