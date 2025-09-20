// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/lend/interfaces/
import {IERC721MortgageToken} from "../interfaces/IERC721MortgageToken.sol";

/**
 *  @author Briky Team
 *
 *  @notice Storage contract for contract `ERC721MortgageToken`.
 */
abstract contract ERC721MortgageTokenStorage is
IERC721MortgageToken {
    /// @dev    collaterals[mortgageId]
    mapping(uint256 => ERC721Collateral) internal collaterals;


    /// @dev    isCollateral[collection]
    mapping(address => bool) public isCollateral;

    uint256[50] private __gap;
}
