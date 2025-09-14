// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/liquidity/interfaces/
import {ITreasury} from "../../liquidity/interfaces/ITreasury.sol";

/**
 *  @author Briky Team
 *
 *  @notice Storage contract for contract `Treasury`.
 */
abstract contract TreasuryStorage is
ITreasury {
    uint256 public liquidity;
    uint256 public operationFund;

    address public admin;
    address public currency;
    address public primaryToken;

    uint256[50] private __gap;
}
