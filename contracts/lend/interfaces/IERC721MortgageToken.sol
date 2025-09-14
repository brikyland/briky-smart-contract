// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/lend/structs/
import {IERC721Collateral} from "../structs/IERC721Collateral.sol";

/// contracts/lend/interfaces/
import {IMortgageToken} from "./IMortgageToken.sol";

/**
 *  @author Briky Team
 *
 *  @notice Interface for contract `ERC721MortgageToken`.
 * 
 *  @notice A `ERC721MortgageToken` contract is an ERC-721 contract that facilitates mortgage-based borrowing backed by ERC-721 token collaterals and issues tokens representing mortgages.
 */
interface IERC721MortgageToken is
IERC721Collateral,
IMortgageToken {
    /** ===== EVENT ===== **/
    /* --- Configuration --- */
    /**
     *  @notice Emitted when a collection is registered.
     *
     *          Name          Description
     *  @param  collateral    Collection contract address.
     */
    event CollateralRegistration(
        address collateral
    );

    /**
     *  @notice Emitted when a collection is deregistered.
     *
     *          Name          Description
     *  @param  collateral    Collection contract address.
     */
    event CollateralDeregistration(
        address collateral
    );

    /**
     *  @notice Emitted when a new collateral is assigned to a mortgage.
     *
     *          Name          Description
     *  @param  mortgageId    Mortgage identifier.
     *  @param  token         Collateral contract address.
     *  @param  tokenId       Collateral token identifier.
     */
    event NewCollateral(
        uint256 indexed mortgageId,
        address indexed token,
        uint256 indexed tokenId
    );


    /* ===== ERROR ===== **/
    error NotRegisteredCollateral();
    error RegisteredCollateral();


    /* ===== FUNCTION ===== **/
    /* --- Query --- */
    /**
     *          Name            Description
     *  @param  token           Collection contract address.
     *  @return isCollateral    Whether the collection is registered.
     * 
     *  @dev    The collection must support interface `IERC721Upgradeable`.
     */
    function isCollateral(
        address token
    ) external view returns (bool isCollateral);

    /**
     *          Name            Description
     *  @param  mortgageId      Mortgage identifier.
     *  @return collateral      Collateral information.
     */
    function getCollateral(
        uint256 mortgageId
    ) external view returns (ERC721Collateral memory collateral);


    /* --- Command --- */
    /**
     *  @notice List a new mortgage backed by collateral from a registered ERC-721 collection.
     * 
     *          Name            Description
     *  @param  token           Collateral collection contract address.
     *  @param  tokenId         Collateral token identifier.
     *  @param  principal       Principal value.
     *  @param  repayment       Repayment value.
     *  @param  currency        Loan currency address.
     *  @param  duration        Repayment duration.
     *  @return mortgageId      New mortgage identifier.
     * 
     *  @dev    The collection must support interface `IERC721Upgradeable`.
     *  @dev    Must set approval for the contract to transfer collateral tokens of the borrower before listing.
     */
    function borrow(
        address token,
        uint256 tokenId,
        uint256 principal,
        uint256 repayment,
        address currency,
        uint40 duration
    ) external returns (uint256 mortgageId);
}
