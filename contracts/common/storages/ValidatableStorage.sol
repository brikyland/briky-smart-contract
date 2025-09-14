// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/common/interfaces/
import {IValidatable} from "../interfaces/IValidatable.sol";

/**
 *  @author Briky Team
 *
 *  @notice Storage contract for contract `Validatable`.
 */
abstract contract ValidatableStorage is 
IValidatable {
    /// @dev    isNonceUsed[nonce]
    mapping(uint256 => bool) public isNonceUsed;

    
    address public validator;

    uint256[50] private __gap;
}
