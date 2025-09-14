// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/lend/interfaces/
import {IMortgageToken} from "../interfaces/IMortgageToken.sol";

/**
 *  @author Briky Team
 *
 *  @notice Storage contract for contract `MortgageToken`.
 */
abstract contract MortgageTokenStorage is
IMortgageToken {
    /// @dev    mortgages[mortgageId]
    mapping(uint256 => Mortgage) internal mortgages;
    
    string internal baseURI;

    uint256 public totalSupply;
    uint256 public mortgageNumber;

    uint256 internal feeRate;

    address public admin;
    address public feeReceiver;

    uint256[50] private __gap;
}
