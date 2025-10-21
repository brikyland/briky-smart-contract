// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Pausable} from "../../common/utilities/Pausable.sol";

contract MockPausable is Pausable {
    address public admin;

    string constant private VERSION = "v1.2.1";

    function initialize(address _admin) external initializer {
        __Pausable_init();
        
        admin = _admin;
    }

    function version() external pure override returns (string memory) {
        return VERSION;
    }
}
