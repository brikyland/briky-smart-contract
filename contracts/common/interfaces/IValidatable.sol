// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/common/structs/
import {IValidation} from "../structs/IValidation.sol";

/// contracts/common/interfaces/
import {ICommon} from "./ICommon.sol";

/**
 *  @author Briky Team
 *
 *  @notice Interface for contract `Validatable`.
 *  @notice A `Validatable` contract relies on a trusted validator to verify data that is difficult to process on-chain.
 *
 *  @dev    Implementation involves server-side support.
 */
interface IValidatable is
ICommon,
IValidation {
    /** ===== EVENT ===== **/
    /**
     *  @notice Emitted when the validator is updated.
     *
     *          Name        Description
     *  @param  newAddress  New validator address.
     */
    event ValidatorUpdate(
        address newAddress
    );


    /** ===== ERROR ===== **/
    error ValidationExpired();
    error InvalidNonce();
    error InvalidSignature();


    /** ===== FUNCTION ===== **/
    /* --- Query --- */
    /**
     *          Name        Description
     *  @return validator   Validator address.
     */
    function validator() external view returns (address validator);

    /**
     *          Name        Description
     *  @param  nonce       Number used once combined with the message to prevent replay attacks.
     *  @param  isUsed      Whether the nonce has already been used.
     */
    function isNonceUsed(
        uint256 nonce
    ) external view returns (bool isUsed);
}
