// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ISnapshot} from "../structs/ISnapshot.sol";

contract Snapshotable is ISnapshot {
    function _snapshotAt(Uint256Snapshot[] storage snapshots, uint256 _at) internal view returns (uint256) {
        uint256 high = snapshots.length;
        if (high == 0) {
            return 0;
        }
        uint256 low = 0;
        uint256 pivot = type(uint256).max;
        while (low < high) {
            uint256 mid = (low + high) >> 1;
            if (snapshots[mid].timestamp <= _at) {
                pivot = mid;
                low = mid + 1;
            } else {
                high = mid;
            }
        }
        return pivot == type(uint256).max ? 0 : snapshots[pivot].value;
    }
}
