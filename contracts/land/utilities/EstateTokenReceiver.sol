// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IEstateTokenReceiver} from "../interfaces/IEstateTokenReceiver.sol";

abstract contract EstateTokenReceiver is
IEstateTokenReceiver {
    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes calldata
    ) public virtual override returns (bytes4) {
        return msg.sender == this.estateToken() ? this.onERC1155Received.selector : bytes4(0);
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata,
        uint256[] calldata,
        bytes calldata
    ) public virtual override returns (bytes4) {
        return msg.sender == this.estateToken() ? this.onERC1155BatchReceived.selector : bytes4(0);
    }
}
