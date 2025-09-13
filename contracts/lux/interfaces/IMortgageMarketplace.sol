// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ICommon} from "../../common/interfaces/ICommon.sol";

import {IMortgage} from "../../lend/structs/IMortgage.sol";

interface IMortgageMarketplace is
IMortgage {
    error UnavailableMortgage();
}
