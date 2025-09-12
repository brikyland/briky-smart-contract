// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 *  @author Briky Team
 *
 *  @notice Interface for struct `DataFeed`.
 */
interface IDataFeed {
    /** ===== STRUCT ===== **/
    /**
     *  @notice Connection configuration of a Data Feed.
     *  @dev    Document for Data Feed: https://docs.chain.link/data-feeds
     */
    struct DataFeed {
        /// @notice Data Feed contract address.
        address feed;

        /// @notice Acceptable latency.
        uint40 heartbeat;
    }
}
