// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/common/interfaces/
import {ICommon} from "../../common/interfaces/ICommon.sol";

/// contracts/land/interfaces/
import {IEstateTokenReceiver} from "./IEstateTokenReceiver.sol";


/**
 *  @author Briky Team
 *
 *  @notice Interface for contract `EstateTokenizer`.
 * 
 *  @notice TODO:
 */
interface IEstateTokenizer is
ICommon,
IEstateTokenReceiver {
    /** ===== EVENT ===== **/
    /**
     *  @notice TODO: Emitted when the deposition of a request is withdrawn.
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
     *  @param  tokenizationId  Tokenization request identifier.
     *
     *  @return isTokenized     Whether the request is tokenized.
     */
    function isTokenized(
        uint256 tokenizationId
    ) external view returns (bool isTokenized);

    /**
     *  @notice TODO: Check the allocation of a request at a specific timestamp.
     *
     *          Name            Description
     *  @param  account         Account address.
     *  @param  tokenizationId  Tokenization request identifier.
     *  @param  at              Reference timestamp.
     *
     *  @return allocation      Allocation of the account at the reference timestamp.
     */
    function allocationOfAt(
        address account,
        uint256 tokenizationId,
        uint256 at
    ) external view returns (uint256 allocation);


    /* --- Command --- */
    /**
     *  @notice TODO: Withdraw the estate tokens from a confirmed request.
     *
     *          Name            Description
     *  @param  tokenizationId  Tokenization request identifier.
     *
     *  @return amount          Estate tokens amount.
     */
    function withdrawEstateToken(
        uint256 tokenizationId
    ) external returns (uint256 amount);
}
