// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { ERC20Upgradeable } from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import { IERC20Upgradeable } from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

import { PrimaryToken } from "../land/PrimaryToken.sol";
import { Revert } from "../lib/Revert.sol";

contract MockPrimaryToken is PrimaryToken {
    function burn(address from, uint256 amount) external {
        _burn(from, amount);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function call(address _to, bytes calldata _data) external {
        (bool success, bytes memory result) = _to.call(_data);
        if (!success) {
            Revert.revertFromReturnedData(result);
        }
    }
}