// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {IRate} from "../../common/structs/IRate.sol";

contract Currency is ERC20Upgradeable {
    IRate.Rate public exclusiveDiscount;

    function initialize(
        string calldata _name,
        string calldata _symbol
    ) external initializer {
        __ERC20_init(_name, _symbol);
    }

    function mint(address _account, uint256 _amount) external {
        _mint(_account, _amount);
    }

    function burn(address _from, uint256 _amount) external {
        _burn(_from, _amount);
    }

    function setExclusiveDiscount(uint256 value, uint8 decimals) external {
        exclusiveDiscount = IRate.Rate(value, decimals);
    }
}
