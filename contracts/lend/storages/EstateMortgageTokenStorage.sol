// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/lend/interfaces/
import {IEstateMortgageToken} from "../interfaces/IEstateMortgageToken.sol";

/**
 *  @author Briky Team
 *
 *  @notice Storage contract for contract `EstateMortgageToken`.
 */
abstract contract EstateMortgageTokenStorage is
IEstateMortgageToken {
    /// @dev    collaterals[mortgageId]
    mapping(uint256 => AssetCollateral) internal collaterals;

    address public estateToken;

    uint256[50] private __gap;
}
