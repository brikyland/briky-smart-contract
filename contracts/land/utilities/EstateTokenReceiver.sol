// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/land/interfaces/
import {IEstateTokenReceiver} from "../interfaces/IEstateTokenReceiver.sol";

/**
 *  @author Briky Team
 *
 *  @notice TODO: A `EstateTokenReceiver` contract is a `ERC1155Receiver` that rejects tokens not from the `EstateToken`.
 */
abstract contract EstateTokenReceiver is
IEstateTokenReceiver {
    /**
     *          Name         Description
     *  @param  _operator    Operator address.
     *  @param  _from        Sender address.
     *  @param  _id          Token identifier.
     *  @param  _value       Token amount.
     *  @param  _data        Additional data.
     * 
     *  @return bytes4(0) if the token is not from the `EstateToken`, otherwise the selector of the `onERC1155Received` function.
     */
    function onERC1155Received(
        address _operator,
        address _from,
        uint256 _id,
        uint256 _value,
        bytes calldata _data
    ) public virtual override returns (bytes4) {
        return msg.sender == this.estateToken() ? this.onERC1155Received.selector : bytes4(0);
    }

    /**
     *  @notice TODO: Reject tokens not from the `EstateToken`.
     *
     *          Name         Description
     *  @param  _operator    Operator address.
     *  @param  _from        Sender address.
     *  @param  _ids         List of token identifiers.
     *  @param  _values      List of amounts, respectively to each token.
     *  @param  _data        Additional data.
     * 
     *  @return bytes4(0) if the token is not from the `EstateToken`, otherwise the selector of the `onERC1155BatchReceived` function.
     */
    function onERC1155BatchReceived(
        address _operator,
        address _from,
        uint256[] calldata _ids,
        uint256[] calldata _values,
        bytes calldata _data
    ) public virtual override returns (bytes4) {
        return msg.sender == this.estateToken() ? this.onERC1155BatchReceived.selector : bytes4(0);
    }
}
