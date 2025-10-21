// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC165Upgradeable.sol";

import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract PriceFeed is 
AggregatorV3Interface,
Initializable,
IERC165Upgradeable {
    int256 private answer;
    uint80 private roundId;
    uint256 private startedAt;
    uint256 private updatedAt;
    uint80 private answeredInRound;

    uint8 public decimals;

    function initialize(
        int256 _answer,
        uint8 _decimals
    ) public initializer {
        answer = _answer;
        decimals = _decimals;
        roundId = 1;
        startedAt = block.timestamp;
        updatedAt = block.timestamp;
        answeredInRound = 1;
    }

    function description() external pure override returns (string memory) {
        return "Mock Price Feed";
    }

    function version() external pure override returns (uint256) {
        return 1;
    }

    function getRoundData(uint80 _roundId)
    external
    view
    override
    returns (
        uint80,
        int256 _answer,
        uint256 _startedAt,
        uint256 _updatedAt,
        uint80 _answeredInRound
    ) {
        return (
            _roundId,
            answer,
            startedAt,
            updatedAt,
            answeredInRound
        );
    }

    function latestRoundData()
    external
    view
    override
    returns (
        uint80 _roundId,
        int256 _answer,
        uint256 _startedAt,
        uint256 _updatedAt,
        uint80 _answeredInRound
    ) {
        return (
            roundId,
            answer,
            startedAt,
            updatedAt,
            answeredInRound
        );
    }

    function updateAnswer(int256 _newAnswer) external {
        answer = _newAnswer;
        updatedAt = block.timestamp;
    }

    function updateDecimals(uint8 _newDecimals) external {
        decimals = _newDecimals;
    }

    function updateData(int256 _newAnswer, uint8 _newDecimals) external {
        answer = _newAnswer;
        decimals = _newDecimals;
    }

    function supportsInterface(bytes4 _interfaceId) public pure override(
        IERC165Upgradeable
    ) returns (bool) {
        return _interfaceId == type(AggregatorV3Interface).interfaceId
            || _interfaceId == type(IERC165Upgradeable).interfaceId;
    }
} 
