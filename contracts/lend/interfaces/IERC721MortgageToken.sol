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
 *  @notice A `ERC721MortgageToken` contract facilitates peer-to-peer lending secured by ERC-721 tokens as collateral. Each provided mortgage
 *          is tokenized into an ERC-721 token, whose owner has the right to receive repayments from the borrower or foreclose
 *          on the collateral from the contract once overdue.
 * 
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 * */
interface IERC721MortgageToken is
IERC721Collateral,
IMortgageToken {
    /** ===== EVENT ===== **/
    /* --- Configuration --- */
    /**
     *  @notice Emitted when a collection is registered as a collateral contract.
     *
     *          Name        Description
     *  @param  collateral  Registered contract address.
     */
    event CollateralRegistration(
        address collateral
    );

    /**
     *  @notice Emitted when a collection is deregistered as a collateral contract.
     *
     *          Name        Description
     *  @param  collateral  Deregistered contract address.
     */
    event CollateralDeregistration(
        address collateral
    );


    /* --- Collateral --- */
    /**
     *  @notice Emitted when a new ERC-721 collateral is secured.
     *
     *          Name        Description
     *  @param  mortgageId  Mortgage identifier.
     *  @param  token       Collateral collection contract address.
     *  @param  tokenId     Collateral token identifier.
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
     *  @param  token           Contract address.
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
     *  @notice List a new mortgage offer with an ERC-721 token as collateral.
     * 
     *          Name            Description
     *  @param  token           Collateral contract address.
     *  @param  tokenId         Collateral token identifier.
     *  @param  principal       Principal value.
     *  @param  repayment       Repayment value.
     *  @param  currency        Currency address.
     *  @param  duration        Borrowing duration.
     *  @return mortgageId      New mortgage identifier.
     * 
     *  @dev    Approval must be granted for this contract to secure the collateral before borrowing.
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
