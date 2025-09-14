// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/common/interfaces/
import {ICommon} from "../../common/interfaces/ICommon.sol";

/**
 *  @author Briky Team
 *
 *  @notice Interface for contract `Treasury`.
 *  @notice The `Treasury` contract serves as the central liquidity pool and operation fund manager for the
 *          ecosystem, handling currency deposits, liquidity provision, and fund withdrawals.
 *
 *  @dev    The contract manages two main pools: liquidity for token liquidation and operation fund for
 *          administrative expenses. When liquidity is provided, a portion is allocated to the operation
 *          fund based on a predefined rate, while the remainder becomes available liquidity.
 *  @dev    Liquidity withdrawal is restricted to the primary token contract for token liquidation operations.
 *          Operation fund withdrawals require administrative signatures and are used for ecosystem operations.
 *  @dev    The treasury integrates with various ecosystem components including primary token liquidation,
 *          staking fee contributions, and auction deposits to maintain ecosystem liquidity.
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 */
interface ITreasury is ICommon {
    /** ===== EVENT ===== **/
    /* --- Configuration --- */
    /**
     *  @notice Emitted when primary token contract address is updated.
     *
     *          Name        Description
     *  @param  newAddress  New primary token contract address.
     */
    event PrimaryTokenUpdate(
        address newAddress
    );

    /* --- Treasury Operations --- */
    /**
     *  @notice Emitted when operation fund is withdrawn to an operator.
     *
     *          Name        Description
     *  @param  value       Amount withdrawn from operation fund.
     *  @param  operator    Operator address that received the funds.
     */
    event OperationFundWithdrawal(
        uint256 value,
        address operator
    );

    /**
     *  @notice Emitted when liquidity is provided to the treasury.
     *
     *          Name        Description
     *  @param  provider    Address that provided the liquidity.
     *  @param  value       Total amount of currency provided.
     *  @param  fee         Amount allocated to operation fund.
     */
    event LiquidityProvision(
        address indexed provider,
        uint256 value,
        uint256 fee
    );

    /**
     *  @notice Emitted when liquidity is withdrawn from the treasury.
     *
     *          Name        Description
     *  @param  withdrawer  Address that received the withdrawn liquidity.
     *  @param  value       Amount of liquidity withdrawn.
     */
    event LiquidityWithdrawal(
        address indexed withdrawer,
        uint256 value
    );


    /** ===== FUNCTION ===== **/
    /* --- Dependency --- */
    /**
     *          Name        Description
     *  @return currency    Currency contract address used by the treasury.
     */
    function currency() external view returns (address currency);

    /**
     *          Name            Description
     *  @return primaryToken    Primary token contract address.
     */
    function primaryToken() external view returns (address primaryToken);

    /* --- Query --- */
    /**
     *          Name    Description
     *  @return fund    Current amount in the operation fund.
     */
    function operationFund() external view returns (uint256 fund);

    /**
     *          Name        Description
     *  @return liquidity   Current amount of available liquidity.
     */
    function liquidity() external view returns (uint256 liquidity);


    /* --- Command --- */
    /**
     *  @notice Provide liquidity to the treasury with automatic operation fund allocation.
     *
     *          Name        Description
     *  @param  value       Amount of currency to provide as liquidity.
     *
     *  @dev    A portion of the provided value is allocated to the operation fund based on a predefined rate.
     *  @dev    The remaining amount becomes available liquidity for ecosystem operations.
     */
    function provideLiquidity(
        uint256 value
    ) external;

    /**
     *  @notice Withdraw liquidity from the treasury.
     *
     *          Name        Description
     *  @param  receiver    Address that will receive the withdrawn liquidity.
     *  @param  value       Amount of liquidity to withdraw.
     *
     *  @dev    Permission: Primary token contract only.
     *  @dev    Used primarily for token liquidation operations.
     */
    function withdrawLiquidity(
        address receiver,
        uint256 value
    ) external;
}
