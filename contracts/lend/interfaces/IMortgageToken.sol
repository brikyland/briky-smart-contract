// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC721MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC721MetadataUpgradeable.sol";
import {IERC2981Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC2981Upgradeable.sol";
import {IERC4906Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC4906Upgradeable.sol";

import {ICommon} from "../../common/interfaces/ICommon.sol";

import {IRate} from "../../common/structs/IRate.sol";

import {IMortgage} from "../structs/IMortgage.sol";

interface IMortgageToken is
IMortgage,
ICommon,
IERC2981Upgradeable,
IERC4906Upgradeable,
IERC721MetadataUpgradeable {
    event BaseURIUpdate(string newValue);

    event FeeRateUpdate(IRate.Rate rate);

    event NewToken(
        uint256 indexed tokenId,
        address indexed lender,
        uint40 due,
        uint256 feeAmount
    );

    event NewMortgage(
        uint256 indexed mortgageId,
        uint256 indexed tokenId,
        address indexed borrower,
        uint256 amount,
        uint256 principal,
        uint256 repayment,
        address currency,
        uint40 duration
    );
    event MortgageCancellation(uint256 indexed mortgageId);
    event MortgageForeclosure(
        uint256 indexed mortgageId,
        address indexed receiver
    );
    event MortgageRepayment(uint256 indexed mortgageId);

    error InvalidCancelling();
    error InvalidTokenId();
    error InvalidForeclosing();
    error InvalidLending();
    error InvalidMortgageId();
    error InvalidPrincipal();
    error InvalidRepaying();
    error InvalidRepayment();
    error Overdue();

    function feeReceiver() external view returns (address feeReceiver);

    function totalSupply() external view returns (uint256 totalSupply);

    function getFeeRate() external view returns (IRate.Rate memory rate);

    function mortgageNumber() external view returns (uint256 mortgageNumber);

    function getMortgage(uint256 mortgageId) external view returns (Mortgage memory mortgage);

    function lend(uint256 mortgageId) external payable returns (uint256 value);
    function repay(uint256 mortgageId) external payable;
    function foreclose(uint256 mortgageId) external;
    function cancel(uint256 mortgageId) external;

    function safeLend(uint256 mortgageId, uint256 anchor) external payable returns (uint256 value);
    function safeRepay(uint256 mortgageId, uint256 anchor) external payable;
}
