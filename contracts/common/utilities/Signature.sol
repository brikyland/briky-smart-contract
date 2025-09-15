// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @openzeppelin/contracts-upgradeable/
import {ECDSAUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";

/**
 *  @author Briky Team
 *
 *  @notice Utility library for EIP-191 signature verification with nonce.
 */
library Signature {
    /** ===== FUNCTION ===== **/
    /**
     *  @notice Verify a signature is signed by a specific address with anticipated message and nonce.
     *
     *          Name        Description
     *  @param  _signer     Expected signer address.
     *  @param  _message    Anticipated message bytes.
     *  @param  _nonce      Number used once combined with the message to prevent replay attacks.
     *  @param  _signature  65-byte ECDSA signature.
     *
     *  @return Whether `_signature` is signed by `_signer` for data `_message` and `_nonce`.
     */
    function verify(
        address _signer,
        bytes memory _message,
        uint256 _nonce,
        bytes memory _signature
    ) internal pure returns (bool) {
        return ECDSAUpgradeable.recover(
            ECDSAUpgradeable.toEthSignedMessageHash(
                keccak256(abi.encodePacked(
                    _message,
                    _nonce
                ))
            ),
            _signature
        ) == _signer;
    }
}
