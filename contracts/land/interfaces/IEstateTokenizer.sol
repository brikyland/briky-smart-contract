// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/common/interfaces/
import {ICommon} from "../../common/interfaces/ICommon.sol";

/// contracts/land/interfaces/
import {IEstateTokenReceiver} from "./IEstateTokenReceiver.sol";


/**
 *  @author Briky Team
 *
 *  @notice Interface for tokenizer contracts of `EstateToken`.
 * 
 *  @notice An `IEstateTokenizer` contract instructs `EstateToken` to securitize a real estate into a new class of tokens and
 *          receive them for subsequent distribution to holders.
 */
interface IEstateTokenizer is
ICommon,
IEstateTokenReceiver {
    /** ===== EVENT ===== **/
    /**
     *  @notice Emitted when a holder withdraw allocation from a tokenization.
     *
     *          Name            Description
     *  @param  tokenizationId  Tokenization identifier.
     *  @param  withdrawer      Withdrawer address.
     *  @param  amount          Withdrawn amount.
     */
    event EstateTokenWithdrawal(
        uint256 indexed tokenizationId,
        address indexed withdrawer,
        uint256 amount
    );


    /** ===== ERROR ===== **/
    error AlreadyTokenized();
    error NotRegisteredCustodian();
    error NotTokenized();


    /** ===== FUNCTION ===== **/
    /* --- Query --- */
    /**
     *          Name            Description
     *  @param  tokenizationId  Tokenization identifier.
     *  @return isTokenized     Whether the tokenization has succeeded.
     */
    function isTokenized(
        uint256 tokenizationId
    ) external view returns (bool isTokenized);

    /**
     *          Name            Description
     *  @param  account         Account address.
     *  @param  tokenizationId  Tokenization identifier.
     *  @param  at              Reference timestamp.
     *  @return allocation      Allocation of the account at the reference timestamp.
     */
    function allocationOfAt(
        address account,
        uint256 tokenizationId,
        uint256 at
    ) external view returns (uint256 allocation);


    /* --- Command --- */
    /**
     *  @notice Withdraw the allocation of the message sender from a tokenization.
     *
     *          Name            Description
     *  @param  tokenizationId  Tokenization identifier.
     *  @return amount          Withdrawn amount.
     */
    function withdrawEstateToken(
        uint256 tokenizationId
    ) external returns (uint256 amount);
}
