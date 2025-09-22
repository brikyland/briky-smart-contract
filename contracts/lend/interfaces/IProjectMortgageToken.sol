// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/launch/interfaces/
import {IProjectTokenReceiver} from "../../launch/interfaces/IProjectTokenReceiver.sol";

/// contracts/lend/interfaces/
import {IAssetMortgageToken} from "./IAssetMortgageToken.sol";

/**
 *  @author Briky Team
 *
 *  @notice Interface for contract `IProjectMortgageToken`.
 *  @notice A `IProjectMortgageToken` contract facilitates peer-to-peer lending secured by project tokens as collateral. Each provided mortgage
 *          is tokenized into an ERC-721 token, whose owner has the right to receive repayments from the borrower or foreclose
 *          on the collateral from the contract once overdue.
 * 
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 */
interface IProjectMortgageToken is
IAssetMortgageToken,
IProjectTokenReceiver {}
