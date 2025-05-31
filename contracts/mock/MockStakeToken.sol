// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { StakeToken } from "../land/StakeToken.sol";
import { Revert } from "../lib/Revert.sol";

contract MockStakeToken is StakeToken {
    // function mint(address _to, uint256 _amount) external {
    //     totalSupply += _amount;
    //     weights[_to] = weights[_to]

    //     emit Stake(_to, _amount);
    // }

    function call(address _to, bytes calldata _data) external {
        (bool success, bytes memory result) = _to.call(_data);
        if (!success) {
            Revert.revertFromReturnedData(result);
        }
    }

    function callView(address _to, bytes calldata _data) external view returns (bytes memory) {
        (bool success, bytes memory result) = _to.staticcall(_data);
        if (!success) {
            Revert.revertFromReturnedData(result);
        }
        return result;
    }

    function getInterestAccumulation() external view returns (uint256) {
        return interestAccumulation;
    }

    function getWeight(address _staker) external view returns (uint256) {
        return weights[_staker];
    }
}