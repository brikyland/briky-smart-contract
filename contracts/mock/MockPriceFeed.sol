// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract MockPriceFeed is AggregatorV3Interface, Initializable {
    uint256 private _answer;
    uint8 private _decimals;
    uint80 private _roundId;
    uint256 private _startedAt;
    uint256 private _updatedAt;
    uint80 private _answeredInRound;

    function initialize(
        uint256 answer,
        uint8 decimals_
    ) public initializer {
        _answer = answer;
        _decimals = decimals_;
        _roundId = 1;
        _startedAt = block.timestamp;
        _updatedAt = block.timestamp;
        _answeredInRound = 1;
    }

    function decimals() external view override returns (uint8) {
        return _decimals;
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
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (
            _roundId,
            int256(_answer),
            _startedAt,
            _updatedAt,
            _answeredInRound
        );
    }

    function latestRoundData()
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (
            _roundId,
            int256(_answer),
            _startedAt,
            _updatedAt,
            _answeredInRound
        );
    }

    // Admin functions to update values
    function updateAnswer(uint256 newAnswer) external {
        _answer = newAnswer;
        _updatedAt = block.timestamp;
    }

    function updateDecimals(uint8 newDecimals) external {
        _decimals = newDecimals;
    }
} 