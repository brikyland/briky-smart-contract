// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/lend/interfaces/
import {IProjectMortgageToken} from "../interfaces/IProjectMortgageToken.sol";

/**
 *  @author Briky Team
 *
 *  @notice Storage contract for contract `ProjectMortgageToken`.
 */
abstract contract ProjectMortgageTokenStorage is
IProjectMortgageToken {
    /// @dev    collaterals[mortgageId]
    mapping(uint256 => AssetCollateral) internal collaterals;

    address public projectToken;

    uint256[50] private __gap;
}
