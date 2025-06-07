// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC1155MetadataURIUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/IERC1155MetadataURIUpgradeable.sol";

import {IEstateTokenizer} from "../../land/interfaces/IEstateTokenizer.sol";
import {IRoyaltyRateProposer} from "../../common/interfaces/IRoyaltyRateProposer.sol";

interface ILaunchPad is
IEstateTokenizer,
IRoyaltyRateProposer,
IERC1155MetadataURIUpgradeable {
    enum ProjectState {
        Nil,
        Raising,
        Tokenized,
        Rewarded,
        Cancelled
    }

    struct Round {
        uint256 totalAmount;
        uint256 expectedFund;
        uint256 fund;
        uint256 minPush;
        address currency;
        uint40 due;
    }

    struct Project {
        bytes32 zone;
        address requester;
        uint8 decimals;
        uint40 expireAt;
        uint40 completeAt;
        ProjectState state;
        uint256 roundNumber;
    }

    event FeeRateUpdate(uint256 newValue);
    event RoyaltyRateUpdate(uint256 newValue);
}
