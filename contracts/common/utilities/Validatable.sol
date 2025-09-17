// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @openzeppelin/contracts-upgradeable/
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/// contracts/common/interfaces/
import {IAdmin} from "../interfaces/IAdmin.sol";

/// contracts/common/storages/
import {ValidatableStorage} from "../storages/ValidatableStorage.sol";

/// contracts/common/utilities/
import {Signature} from "./Signature.sol";

/**
 *  @author Briky Team
 *
 *  @notice A `Validatable` contract relies on a trusted validator to verify data that is difficult to process on-chain.
 *
 *  @dev    Implementation involves server-side support.
 */
abstract contract Validatable is
ValidatableStorage,
Initializable {
    /** ===== FUNCTION ===== **/
    /* --- Initialization --- */
    /**
     *  @notice Initialize `Validatable`.
     *
     *          Name        Description
     *  @param  _validator  Validator address.
     */
    function __Validatable_init(
        address _validator
    ) internal
    onlyInitializing {
        validator = _validator;
    }


    /* --- Administration --- */
    /**
     *  @notice Update the validator.
     *
     *          Name            Description
     *  @param  _validator      New validator address.
     *  @param  _signatures     Array of admin signatures.
     *
     *  @dev    Administrative operator.
     */
    function updateValidator(
        address _validator,
        bytes[] calldata _signatures
    ) external {
        IAdmin(this.admin()).verifyAdminSignatures(
            abi.encode(
                address(this),
                "updateValidator",
                _validator
            ),
            _signatures
        );

        validator = _validator;
        emit ValidatorUpdate(_validator);
    }


    /* --- Helper --- */
    /**
     *  @notice Validate a data.
     *
     *          Name            Description
     *  @param  _data           Validated data.
     *  @param  _validation     Validation package from the validator.
     *
     *  @dev    Revert on validation failure.
     */
    function _validate(
        bytes memory _data,
        Validation calldata _validation
    ) internal {
        if (_validation.expiry <= block.timestamp) {
            revert ValidationExpired();
        }

        if (isNonceUsed[_validation.nonce]) {
            revert InvalidNonce();
        }

        isNonceUsed[_validation.nonce] = true;

        if (!Signature.verify(
            validator,
            abi.encode(
                address(this),
                _data,
                _validation.nonce,
                _validation.expiry
            ),
            _validation.nonce,
            _validation.signature)
        ) {
            revert InvalidSignature();
        }
    }
}
