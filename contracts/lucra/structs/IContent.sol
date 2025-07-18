// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IContent {
    struct Content {
        string uri;
        uint40 startAt;
        uint40 endAt;
    }
}
