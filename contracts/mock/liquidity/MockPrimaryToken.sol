// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { ERC20Upgradeable } from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import { IERC20Upgradeable } from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

import { PrimaryToken } from "../../liquidity/PrimaryToken.sol";
import { ProxyCaller } from "../misc/utilities/ProxyCaller.sol";

/// @custom:oz-upgrades-unsafe-allow missing-initializer
contract MockPrimaryToken is PrimaryToken, ProxyCaller {
    function burn(address _from, uint256 _amount) external {
        _burn(_from, _amount);
    }

    function mint(address _to, uint256 _amount) external {
        _mint(_to, _amount);
    }

    function selfTransfer(address _to, uint256 _amount) external {
        _transfer(
            address(this),
            _to,
            _amount
        );
    }
}