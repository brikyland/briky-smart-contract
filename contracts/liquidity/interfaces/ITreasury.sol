// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/common/interfaces/
import {ICommon} from "../../common/interfaces/ICommon.sol";

/**
 *  @author Briky Team
 *
 *  @notice The `Treasury` contract serves as a stablecoin reserve pool that backs the intrinsic value of `PrimaryToken` and
 *          facilitates token liquidation.
 *  @notice 20% of provided liquidity is allocated into the operation fund for sponsoring administrative expenses.
 * 
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 */
interface ITreasury is ICommon {
    /** ===== EVENT ===== **/
    /* --- Provision --- */
    /**
     *  @notice Emitted when liquidity is provided to the treasury.
     *
     *          Name                    Description
     *  @param  provider                Provider address.
     *  @param  value                   Provided value.
     *  @param  operationContribution   Contribution for the operation fund.
     */
    event LiquidityProvision(
        address indexed provider,
        uint256 value,
        uint256 operationContribution
    );


    /* --- Withdrawal --- */
    /**
     *  @notice Emitted when liquidity is withdrawn from the treasury.
     *
     *          Name        Description
     *  @param  receiver    Receiver address.
     *  @param  value       Withdrawn value.
     */
    event LiquidityWithdrawal(
        address indexed receiver,
        uint256 value
    );

    /**
     *  @notice Emitted when the operation fund is withdrawn to an operator.
     *
     *          Name        Description
     *  @param  operator    Operator address.
     *  @param  value       Withdrawn value.
     */
    event OperationFundWithdrawal(
        address operator,
        uint256 value
    );


    /** ===== FUNCTION ===== **/
    /* --- Dependency --- */
    /**
     *  @notice ERC-20 stablecoin.
     *
     *          Name            Description
     *  @return currency        Liquidity currency address.
     */
    function currency() external view returns (address currency);

    /**
     *          Name            Description
     *  @return primaryToken    `PrimaryToken` contract address.
     */
    function primaryToken() external view returns (address primaryToken);


    /* --- Query --- */
    /**
     *          Name        Description
     *  @return fund        Reserved operation fund.
     */
    function operationFund() external view returns (uint256 fund);

    /**
     *          Name        Description
     *  @return liquidity   Reserved liquidity.
     */
    function liquidity() external view returns (uint256 liquidity);


    /* --- Command --- */
    /**
     *  @notice Provide liquidity to the treasury.
     *
     *          Name        Description
     *  @param  value       Provided value.
     */
    function provideLiquidity(
        uint256 value
    ) external;

    /**
     *  @notice Withdraw liquidity from the treasury.
     *
     *          Name        Description
     *  @param  receiver    Receiver address.
     *  @param  value       Withdrawn value.
     *
     *  @dev    Permission: PrimaryToken.
     */
    function withdrawLiquidity(
        address receiver,
        uint256 value
    ) external;
}
