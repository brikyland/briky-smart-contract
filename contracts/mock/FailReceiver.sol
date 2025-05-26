// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";

import { Revert } from "../lib/Revert.sol";

contract FailReceiver is ERC1155HolderUpgradeable, ERC721HolderUpgradeable {
    receive() external payable {
        revert("Fail");
    }

    function call(address _to, bytes calldata _data) external payable {
        (bool success, bytes memory res) = _to.call{value: msg.value}(_data);
        if (!success) {
            Revert.revertFromReturnedData(res);
        }
    }
}
