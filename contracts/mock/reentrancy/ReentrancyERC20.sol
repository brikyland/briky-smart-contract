// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

import {ReentrancyBase} from "./utilities/ReentrancyBase.sol";

import {IRate} from "../../common/structs/IRate.sol";

contract ReentrancyERC20 is
ERC20Upgradeable,
ReentrancyBase {
    bool public isTriggeredOnTransfer;
    bool public isTriggeredOnExclusiveDiscount;

    function initialize(bool _isTriggeredOnTransfer, bool _isTriggeredOnExclusiveDiscount) public initializer {
        __ERC20_init("ReentrancyERC20", "RE");

        isTriggeredOnTransfer = _isTriggeredOnTransfer;
        isTriggeredOnExclusiveDiscount = _isTriggeredOnExclusiveDiscount;
    }

    function transfer(address _to, uint256 _value) public override returns (bool) {
        if (isTriggeredOnTransfer) {
            return _reentrancy();
        }
        return super.transfer(_to, _value);
    }

    function transferFrom(address _from, address _to, uint256 _value) public override returns (bool) {
        if (isTriggeredOnTransfer) {
            return _reentrancy();
        }
        return super.transferFrom(_from, _to, _value);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function exclusiveDiscount() external returns (IRate.Rate memory) {
        if (isTriggeredOnExclusiveDiscount) {
            _reentrancy();
        }
        return IRate.Rate(0, 0);
    }
}
