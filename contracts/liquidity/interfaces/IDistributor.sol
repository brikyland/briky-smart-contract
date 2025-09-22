// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/common/interfaces/
import {ICommon} from "../../common/interfaces/ICommon.sol";

/**
 *  @author Briky Team
 *
 *  @notice Interface for contract `Distributor`.
 *  @notice The `Distributor` contract facilitates direct distributions of `PrimaryToken`.
 */
interface IDistributor is ICommon {
    /** ===== EVENT ===== **/
    /* --- Distribution --- */
    /**
     *  @notice Emitted when tokens are distributed to a receiver.
     *
     *          Name        Description
     *  @param  receiver    Receiver address.
     *  @param  amount      Distributed amount.
     */
    event TokenDistribution(
        address indexed receiver,
        uint256 amount
    );


    /** ===== FUNCTION ===== **/
    /* --- Dependency --- */
    /**
     *          Name        Description
     *  @return stakeToken  `PrimaryToken` contract address.
     */
    function primaryToken() external view returns (address stakeToken);

    /**
     *          Name        Description
     *  @return treasury    `Treasury` contract address.
     */
    function treasury() external view returns (address treasury);


    /* --- Query --- */
    /**
     *          Name            Description
     *  @param  account         EVM address.
     *  @return totalAmount     Total tokens distributed to the account.
     */
    function distributedTokens(
        address account
    ) external view returns (uint256 totalAmount);
}
