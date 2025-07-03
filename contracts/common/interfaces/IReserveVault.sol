// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ICommon} from "./ICommon.sol";
import {IFund} from "./IFund.sol";

interface IReserveVault is
ICommon,
IFund {
    event InitiatorAuthorization(address indexed account);
    event InitiatorDeauthorization(address indexed account);

    event FundInitiation(
        uint256 indexed fundId,
        address indexed initiator,
        address mainCurrency,
        uint256 mainDenomination,
        address[] currencies,
        uint256[] denominations
    );
    event FundProvision(uint256 indexed fundId);
    event FundWithdrawal(
        uint256 indexed fundId,
        address indexed receiver,
        uint256 quantity
    );

    error AlreadyProvided();
    error InvalidFundId();

    function fundNumber() external view returns (uint256 fundNumber);

    function isInitiator(address account) external view returns (bool isInitiator);

    function getFund(uint256 fundId) external view returns (Fund memory fund);
    function isFundSufficient(uint256 fundId) external view returns (bool isSufficient);

    function initiateFund(
        address mainCurrency,
        uint256 mainDenomination,
        address[] calldata currencies,
        uint256[] calldata denominations
    ) external returns (uint256 fundId);
    function provideFund(uint256 fundId) external payable;
    function withdrawFund(
        uint256 fundId,
        address receiver,
        uint256 quantity
    ) external;

    function safeProvideFund(uint256 fundId, uint256 anchor) external payable;
    function safeWithdrawFund(
        uint256 fundId,
        address receiver,
        uint256 quantity,
        uint256 anchor
    ) external;
}
