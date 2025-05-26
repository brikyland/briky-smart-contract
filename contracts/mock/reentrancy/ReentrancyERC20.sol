// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {Revert} from "../../lib/Revert.sol";

contract ReentrancyERC20 is ERC20Upgradeable {
    address public reentrancyTarget;
    bytes public reentrancyData;

    function initialize() public initializer {}

    function updateReentrancyPlan(address _reentrancyTarget, bytes memory _reentrancyData) external {
        reentrancyTarget = _reentrancyTarget;
        reentrancyData = _reentrancyData;
    }

    function transfer(address to, uint256 value) public override returns (bool) {
        (bool success, bytes memory res) = reentrancyTarget.call(reentrancyData);
        if (!success) {
            Revert.revertFromReturnedData(res);
        }
        return true;
    }

    function transferFrom(address from, address to, uint256 value) public override returns (bool) {
        (bool success, bytes memory res) = reentrancyTarget.call(reentrancyData);
        if (!success) {
            Revert.revertFromReturnedData(res);
        }
        return true;
    }

    function call(address _to, bytes calldata _data) external payable {
        (bool success, bytes memory res) = _to.call{value: msg.value}(_data);
        if (!success) {
            Revert.revertFromReturnedData(res);
        }
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
