// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/common/structs/
import {ISnapshot} from "../structs/ISnapshot.sol";

/**
 *  @author Briky Team
 *
 *  @notice Utility library to query a mutable value at a specified timestamp from its time-ordered snapshot list.
 */
library SnapshotHandler {
    /** ===== FUNCTION ===== **/
    /**
     *          Name            Description
     *  @param  _snapshots      Array of time-ordered snapshots of the mutable value.
     *  @param  _at             Reference timestamp.
     *
     *  @return Value at the reference timestamp.
     */
    function getValueAt(
        ISnapshot.Uint256Snapshot[] storage _snapshots,
        uint256 _at
    ) internal view returns (uint256) {
        uint256 high = _snapshots.length;
        if (high == 0) {
            return 0;
        }
        uint256 low = 0;

        /// @dev    Binary search
        uint256 pivot = type(uint256).max;
        while (low < high) {
            uint256 mid = (low + high) >> 1;
            if (_snapshots[mid].timestamp <= _at) {
                pivot = mid;
                low = mid + 1;
            } else {
                high = mid;
            }
        }

        return pivot == type(uint256).max ? 0 : _snapshots[pivot].value;
    }
}
