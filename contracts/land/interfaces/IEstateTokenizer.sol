// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ICommon} from "../../common/interfaces/ICommon.sol";

import {IEstateTokenReceiver} from "./IEstateTokenReceiver.sol";

interface IEstateTokenizer is
ICommon,
IEstateTokenReceiver {
    function allocationOfAt(
        uint256 tokenizationId,
        address account,
        uint256 at
    ) external view returns (uint256 allocation);
}
