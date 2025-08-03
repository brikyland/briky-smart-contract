// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IFund} from "../structs/IFund.sol";

import {ICommon} from "./ICommon.sol";

interface IReserveVault is
IFund,
ICommon {
    event ProviderAuthorization(address indexed account);
    event ProviderDeauthorization(address indexed account);

    event NewFund(
        uint256 indexed fundId,
        address indexed provider,
        address mainCurrency,
        uint256 mainDenomination,
        address[] extraCurrencies,
        uint256[] extraDenominations
    );

    event FundExpansion(uint256 indexed fundId, uint256 quantity);
    event FundProvision(uint256 indexed fundId);
    event FundWithdrawal(
        uint256 indexed fundId,
        address indexed receiver,
        uint256 quantity
    );

    error AlreadyProvided();
    error InvalidDenomination();
    error InvalidExpanding();
    error InvalidFundId();

    function fundNumber() external view returns (uint256 fundNumber);

    function isProvider(address account) external view returns (bool isProvider);

    function getFund(uint256 fundId) external view returns (Fund memory fund);
    function isFundSufficient(uint256 fundId) external view returns (bool isSufficient);

    function openFund(
        address mainCurrency,
        uint256 mainDenomination,
        address[] calldata extraCurrencies,
        uint256[] calldata extraDenominations
    ) external returns (uint256 fundId);

    function expandFund(
        uint256 fundId,
        uint256 quantity
    ) external;
    function provideFund(uint256 fundId) external payable;
    function withdrawFund(
        uint256 fundId,
        address receiver,
        uint256 quantity
    ) external;
}
