// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IFund} from "../../common/structs/IFund.sol";
import {IRate} from "../../common/structs/IRate.sol";
import {IValidatable} from "../../common/interfaces/IValidatable.sol";

import {IPrestigePadRequest} from "../structs/IPrestigePadRequest.sol";
import {IPrestigePadRound} from "../structs/IPrestigePadRound.sol";

import {IProjectLaunchpad} from "./IProjectLaunchpad.sol";

interface IPrestigePad is
IPrestigePadRequest,
IPrestigePadRound,
IFund,
IRate,
IValidatable,
IProjectLaunchpad {
    event FeeRateUpdate(uint256 newValue);

    event BaseUnitPriceRangeUpdate(
        uint256 baseMinUnitPrice,
        uint256 baseMaxUnitPrice
    );

    event Whitelist(address indexed account);
    event Unwhitelist(address indexed account);

    event OriginatorRegistration(
        bytes32 indexed zone,
        address indexed account,
        string uri
    );

    event NewRequest(
        uint256 indexed requestId,
        uint256 indexed projectId,
        address indexed originator,
        string uri,
        uint256 initialQuantity
    );

    event RequestRoundsUpdate(
        uint256 indexed requestId,
        uint256 removedRoundNumber,
        uint256 addedRoundNumber
    );

    event NewRound(
        uint256 indexed roundId,
        uint256 indexed projectId,
        string uri,
        uint256 totalQuantity,
        uint256 minSellingQuantity,
        uint256 maxSellingQuantity
    );

    error InvalidRemoving();
    error InvalidRequestId();
    error InvalidRoundId();
    error InvalidUnitPrice();
    error NotWhitelistedAccount(address account);
    error WhitelistedAccount(address acount);
}
