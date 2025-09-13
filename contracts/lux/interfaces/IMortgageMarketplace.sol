// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// contracts/common/interfaces/
import {ICommon} from "../../common/interfaces/ICommon.sol";

/// contracts/lend/structs/
import {IMortgage} from "../../lend/structs/IMortgage.sol";


/**
 *  @author Briky Team
 *
 *  @notice Interface for contract `MortgageMarketplace`.
 *  @notice The `MortgageMarketplace` contract hosts a marketplace for mortgage tokens.
 */
interface IMortgageMarketplace is
IMortgage {}
