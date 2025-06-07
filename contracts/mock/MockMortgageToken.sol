// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { MortgageToken } from "../lend/MortgageToken.sol";
import { Revert } from "../lib/Revert.sol";

contract MockMortgageToken is MortgageToken {
    function mint(address to, uint256 _loanId) external {
        _mint(to, _loanId);
    }

    function call(address _to, bytes calldata _data) external {
        (bool success, bytes memory result) = _to.call(_data);
        if (!success) {
            Revert.revertFromReturnedData(result);
        }
    }
}