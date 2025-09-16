// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/**
 *  @author Briky Team
 *
 *  @notice Interface for struct `DataFeed`.
 */
interface IDataFeed {
    /** ===== ERROR ===== **/
    error InvalidDataFeed();


    /** ===== STRUCT ===== **/
    /**
     *  @notice Connection configuration of a Data Feed.
     *  @dev    Document for Data Feed: https://docs.chain.link/data-feeds
     */
    struct DataFeed {
        /// @notice Data Feed contract address.
        /// @notice This contract must support interface `AggregatorV3Interface`.
        address feed;

        /// @notice Acceptable latency.
        uint40 heartbeat;
    }
}
