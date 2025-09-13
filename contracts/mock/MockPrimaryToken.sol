// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { ERC20Upgradeable } from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import { IERC20Upgradeable } from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

import { PrimaryToken } from "../liquidity/PrimaryToken.sol";
import { Revert } from "../common/utilities/Revert.sol";

contract MockPrimaryToken is PrimaryToken {
    function burn(address _from, uint256 _amount) external {
        _burn(_from, _amount);
    }

    function mint(address _to, uint256 _amount) external {
        _mint(_to, _amount);
    }

    function call(address _to, bytes calldata _data) external {
        (bool success, bytes memory result) = _to.call(_data);
        if (!success) {
            Revert.revertFromReturnedData(result);
        }
    }

    function selfTransfer(address _to, uint256 _amount) external {
        _transfer(
            address(this),
            _to,
            _amount
        );
    }
}