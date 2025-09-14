// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/lux/interfaces/
import {IMortgageMarketplace} from "../../lux/interfaces/IMortgageMarketplace.sol";

/**
 *  @author Briky Team
 *
 *  @notice Storage contract for contract `MortgageMarketplace`.
 */
abstract contract MortgageMarketplaceStorage is
IMortgageMarketplace {
    uint256[50] private __gap;
}
