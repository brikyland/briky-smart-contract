// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import {Constant} from "../../lib/Constant.sol";
import {Signature} from "../../lib/Signature.sol";

import {IAdmin} from "../interfaces/IAdmin.sol";

import {ValidatableStorage} from "../storages/ValidatableStorage.sol";

abstract contract Validatable is
ValidatableStorage,
Initializable {
    function __Validatable_init(
        address _validator
    ) internal onlyInitializing {
        validator = _validator;
    }

    function updateValidator(
        address _validator,
        bytes[] calldata _signature
    ) external {
        IAdmin(this.admin()).verifyAdminSignatures(
            abi.encode(
                address(this),
                "updateValidator",
                _validator
            ),
            _signature
        );
        validator = _validator;
        emit ValidatorUpdate(_validator);
    }

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
            abi.encode(address(this), _data, _validation.nonce, _validation.expiry),
            _validation.nonce,
            _validation.signature)
        ) {
            revert InvalidSignature();
        }
    }
}
