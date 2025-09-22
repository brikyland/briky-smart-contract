// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @openzeppelin/contracts-upgradeable/
import {IERC721MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC721MetadataUpgradeable.sol";
import {IERC2981Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC2981Upgradeable.sol";
import {IERC4906Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC4906Upgradeable.sol";

/// contracts/common/interfaces/
import {ICommon} from "../../common/interfaces/ICommon.sol";

/// contracts/common/structs/
import {IRate} from "../../common/structs/IRate.sol";

/// contracts/lend/structs/
import {IMortgage} from "../structs/IMortgage.sol";

/**
 *  @author Briky Team
 *
 *  @notice Interface for contract `MortgageToken`.
 *  @notice A `MortgageToken` contract facilitates peer-to-peer lending secured by crypto collateral. Each mortgage being lent
 *          is tokenized into an ERC-721 token, whose owner has the right to receive repayments from the borrower or foreclose
 *          on the collateral from the contract once overdue.
 * 
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 */
interface IMortgageToken is
IMortgage,
IRate,
ICommon,
IERC721MetadataUpgradeable,
IERC2981Upgradeable,
IERC4906Upgradeable {
    /** ===== EVENT ===== **/
    /* --- Configuration --- */
    /**
     *  @notice Emitted when the base URI is updated.
     *
     *          Name        Description
     *  @param  newValue    New base URI.
     */
    event BaseURIUpdate(
        string newValue
    );

    /**
     *  @notice Emitted when the borrowing fee rate is updated.
     *
     *          Name        Description
     *  @param  newRate     New borrowing fee rate.
     */
    event FeeRateUpdate(
        Rate newRate
    );


    /* --- Mortgage --- */
    /**
     *  @notice Emitted when a new mortgage token is minted.
     *
     *          Name        Description
     *  @param  tokenId     Mortgage identifier.
     *  @param  lender      Lender address.
     *  @param  due         Maturity timestamp.
     */
    event NewToken(
        uint256 indexed tokenId,
        address indexed lender,
        uint40 due
    );

    /**
     *  @notice Emitted when a new mortgage is listed.
     *
     *          Name        Description
     *  @param  mortgageId  Mortgage identifier.
     *  @param  borrower    Borrower address.
     *  @param  principal   Principal value.
     *  @param  repayment   Repayment value.
     *  @param  fee         Borrowing fee.
     *  @param  currency    Currency address.
     *  @param  duration    Borrowing duration.
     */
    event NewMortgage(
        uint256 indexed mortgageId,
        address indexed borrower,
        uint256 principal,
        uint256 repayment,
        uint256 fee,
        address currency,
        uint40 duration
    );

    /**
     *  @notice Emitted when a mortgage is cancelled.
     *
     *          Name        Description
     *  @param  mortgageId  Mortgage identifier.
     */
    event MortgageCancellation(
        uint256 indexed mortgageId
    );
    
    /**
     *  @notice Emitted when a mortgage is foreclosed.
     *
     *          Name        Description
     *  @param  mortgageId  Mortgage identifier.
     *  @param  receiver    Collateral receiver address.
     */
    event MortgageForeclosure(
        uint256 indexed mortgageId,
        address indexed receiver
    );

    /**
     *  @notice Emitted when a mortgage is repaid.
     *
     *          Name        Description
     *  @param  mortgageId  Mortgage identifier.
     */
    event MortgageRepayment(
        uint256 indexed mortgageId
    );


    /* ===== ERROR ===== **/
    error InvalidCancelling();
    error InvalidCollateral();
    error InvalidTokenId();
    error InvalidForeclosing();
    error InvalidLending();
    error InvalidMortgageId();
    error InvalidPrincipal();
    error InvalidRepaying();
    error InvalidRepayment();
    error Overdue();


    /* ===== FUNCTION ===== **/
    /* --- Dependency --- */
    /**
     *          Name            Description
     *  @return feeReceiver     `FeeReceiver` contract address.
     */
    function feeReceiver() external view returns (address feeReceiver);


    /* --- Query --- */
    /**
     *          Name            Description
     *  @return totalSupply     Total supply of the token.
     */
    function totalSupply() external view returns (uint256 totalSupply);


    /**
     *          Name    Description
     *  @return rate    Borrowing fee rate.
     */
    function getFeeRate() external view returns (IRate.Rate memory rate);


    /**
     *          Name              Description
     *  @return mortgageNumber    Number of mortgages.
     */
    function mortgageNumber() external view returns (uint256 mortgageNumber);

    /**
     *          Name              Description
     *  @param  mortgageId        Mortgage identifier.
     *  @return mortgage          Configuration and progress of the mortgage.
     */
    function getMortgage(
        uint256 mortgageId
    ) external view returns (Mortgage memory mortgage);


    /* --- Command --- */
    /**
     *  @notice Cancel a mortgage.
     *  @notice Cancel only if the mortgage is in `Pending` state.
     * 
     *          Name        Description
     *  @param  mortgageId  Mortgage identifier.
     * 
     *  @dev    Permission:
     *          - Borrower of the mortgage.
     *          - Managers: disqualify defected mortgages only.
     */
    function cancel(
        uint256 mortgageId
    ) external;

    /**
     *  @notice Lend a mortgage.
     *  @notice Lend only if the mortgage is in `Pending` state.
     *  @notice Mint the token associated with the mortgage.
     *
     *          Name        Description
     *  @param  mortgageId  Mortgage identifier.
     *  @return due         Maturity timestamp.
     */
    function lend(
        uint256 mortgageId
    ) external payable returns (uint40 due);


    /**
     *  @notice Repay a mortgage.
     *  @notice Repay only if the mortgage is in `Supplied` state and not overdue.
     *  @notice Burn the token associated with the mortgage.
     *
     *          Name        Description
     *  @param  mortgageId  Mortgage identifier.
     * 
     *  @dev    Permission: Borrower of the mortgage.
     */
    function repay(
        uint256 mortgageId
    ) external payable;

    /**
     *  @notice Foreclose on the collateral of a mortgage.
     *  @notice Foreclose only if the mortgage is overdue.
     *  @notice Burn the token associated with the mortgage.
     *
     *          Name        Description
     *  @param  mortgageId  Mortgage identifier.
     * 
     *  @dev    The collateral is transferred to the mortgage token owner and the token is burned.
     */
    function foreclose(
        uint256 mortgageId
    ) external;


    /* --- Safe Command --- */
    /**
     *  @notice Lend a mortgage.
     *  @notice Lend only if the mortgage is in `Pending` state.
     *  @notice Mint the token associated with the mortgage.
     *
     *          Name        Description
     *  @param  mortgageId  Mortgage identifier.
     *  @param  anchor      `principal` of the mortgage.
     *  @return due         Maturity timestamp.
     *
     *  @dev    Anchor enforces consistency between this contract and the client-side.
     */
    function safeLend(
        uint256 mortgageId,
        uint256 anchor
    ) external payable returns (uint40 due);

    /**
     *  @notice Repay a mortgage.
     *  @notice Repay only if the mortgage is in `Supplied` state and not overdue.
     *  @notice Burn the token associated with the mortgage.
     *
     *          Name        Description
     *  @param  mortgageId  Mortgage identifier.
     *  @param  anchor      `repayment` of the mortgage.
     *
     *  @dev    Permission: Borrower of the mortgage.
     *  @dev    Anchor enforces consistency between this contract and the client-side.
     */
    function safeRepay(
        uint256 mortgageId,
        uint256 anchor
    ) external payable;
}
