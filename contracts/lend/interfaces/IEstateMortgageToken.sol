// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/land/interfaces/
import {IEstateTokenReceiver} from "../../land/interfaces/IEstateTokenReceiver.sol";

/// contracts/lend/structs/
import {IAssetCollateral} from "../structs/IAssetCollateral.sol";

/// contracts/lend/interfaces/
import {IAssetMortgageToken} from "./IAssetMortgageToken.sol";

/**
 *  @author Briky Team
 *
 *  @notice Interface for contract `IEstateMortgageToken`.
 *  @notice A `IEstateMortgageToken` contract facilitates peer-to-peer lending secured by estate tokens as collateral. Each
 *          provided mortgage is tokenized into an ERC-721 token, whose owner has the right to receive repayments from the
 *          borrower or foreclose on the collateral from the contract once overdue.
 * 
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 */
interface IEstateMortgageToken is
IAssetMortgageToken,
IEstateTokenReceiver {}
