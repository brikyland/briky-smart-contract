// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

import {IExclusiveToken} from "../../common/interfaces/IExclusiveToken.sol";

import {Revert} from "../../common/utilities/Revert.sol";
import {ProxyCaller} from "../common/ProxyCaller.sol";

import {IRate} from "../../common/structs/IRate.sol";

contract ReentrancyExclusiveERC20 is ERC20Upgradeable, ProxyCaller {
    address public reentrancyTarget;
    bytes public reentrancyData;

    function initialize() public initializer {}

    function updateReentrancyPlan(address _reentrancyTarget, bytes memory _reentrancyData) external {
        reentrancyTarget = _reentrancyTarget;
        reentrancyData = _reentrancyData;
    }

    function transfer(address _to, uint256 _value) public override returns (bool) {
        return _reentrancy();
    }

    function transferFrom(address _from, address _to, uint256 _value) public override returns (bool) {
        return _reentrancy();
    }

    function _reentrancy() internal returns (bool) {
        if (reentrancyTarget != address(0)) {
            (bool success, bytes memory res) = reentrancyTarget.call{value: msg.value}(reentrancyData);
            if (!success) {
                Revert.revertFromReturnedData(res);
            }
            return success;
        }
        return true;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function exclusiveDiscount() external returns (IRate.Rate memory) {
        _reentrancy();
        return IRate.Rate(0, 0);
    }
}
