// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Validatable} from "../../common/utilities/Validatable.sol";

contract MockValidatable is Validatable {
    address public admin;

    string constant public VERSION = "v1.2.1";

    function initialize(
        address _admin,
        address _validator
    ) external initializer {
        __Validatable_init(_validator);

        admin = _admin;
    }

    function testValidatableInitWhenNotInitilizing(address _validator) external {
        __Validatable_init(_validator);
    }

    function testValidation(
        string calldata _content,
        Validation calldata _validation
    ) external {
        _validate(abi.encode(_content), _validation);
    }

    function version() external pure override returns (string memory) {
        return VERSION;
    }
}
