// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/land/interfaces/
import {IEstateTokenReceiver} from "../interfaces/IEstateTokenReceiver.sol";

/**
 *  @author Briky Team
 *
 *  @notice A `EstateTokenReceiver` contract accepts ERC-1155 income tokens from the `EstateToken` contract.
 */
abstract contract EstateTokenReceiver is
IEstateTokenReceiver {
    /**
     *  @return Selector of the `onERC1155Received` function if the message sender is the estate token contract.
     */
    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes calldata
    ) public virtual override returns (bytes4) {
        return msg.sender == this.estateToken()
            ? this.onERC1155Received.selector
            : bytes4(0);
    }

    /**
     *  @return Selector of the `onERC1155Received` function if the message sender is the estate token contract.
     */
    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata,
        uint256[] calldata,
        bytes calldata
    ) public virtual override returns (bytes4) {
        return msg.sender == this.estateToken()
            ? this.onERC1155BatchReceived.selector
            : bytes4(0);
    }
}
