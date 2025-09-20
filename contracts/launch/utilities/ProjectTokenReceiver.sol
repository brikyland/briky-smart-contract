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
     *          Name        Description
     *  @param  _operator   Operator address.
     *  @param  _from       Sender address.
     *  @param  _id         Token identifier.
     *  @param  _value      Token amount.
     *  @param  _data       Additional data.
     *
     *  @return Selector of the `onERC1155Received` function if the message sender is the project token contract.
     */
    function onERC1155Received(
        address _operator,
        address _from,
        uint256 _id,
        uint256 _value,
        bytes calldata _data
    ) public virtual override returns (bytes4) {
        return msg.sender == this.projectToken() ? this.onERC1155Received.selector : bytes4(0);
    }

    /**
     *          Name        Description
     *  @param  _operator   Operator address.
     *  @param  _from       Sender address.
     *  @param  _ids        List of token identifiers.
     *  @param  _values     List of token amounts, respective to each token identifier.
     *  @param  _data       Additional data.
     *
     *  @return Selector of the `onERC1155Received` function if the message sender is the project token contract.
     */
    function onERC1155BatchReceived(
        address _operator,
        address _from,
        uint256[] calldata _ids,
        uint256[] calldata _values,
        bytes calldata _data
    ) public virtual override returns (bytes4) {
        return msg.sender == this.projectToken() ? this.onERC1155BatchReceived.selector : bytes4(0);
    }
}
