// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/launch/interfaces/
import {IProjectTokenReceiver} from "../../launch/interfaces/IProjectTokenReceiver.sol";

/**
 *  @author Briky Team
 *
 *  @notice A `ProjectTokenReceiver` contract always accepts ERC-1155 income tokens from the `ProjectToken` contract.
 */
abstract contract ProjectTokenReceiver is
IProjectTokenReceiver {
    /**
     *  @return Selector of the `onERC1155Received` function if the message sender is the project token contract.
     */
    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes calldata
    ) public virtual override returns (bytes4) {
        return msg.sender == this.projectToken() ? this.onERC1155Received.selector : bytes4(0);
    }

    /**
     *  @return Selector of the `onERC1155Received` function if the message sender is the project token contract.
     */
    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata,
        uint256[] calldata,
        bytes calldata
    ) public virtual override returns (bytes4) {
        return msg.sender == this.projectToken() ? this.onERC1155BatchReceived.selector : bytes4(0);
    }
}
