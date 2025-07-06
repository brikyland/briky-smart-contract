// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC721MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC721MetadataUpgradeable.sol";
import {IERC1155ReceiverUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC1155ReceiverUpgradeable.sol";
import {IERC4906Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC4906Upgradeable.sol";

import {IRoyaltyRateProposer} from "../../common/interfaces/IRoyaltyRateProposer.sol";

import {IEstateTokenReceiver} from "../../land/interfaces/IEstateTokenReceiver.sol";

import {IMortgage} from "./IMortgage.sol";

interface IMortgageToken is
IMortgage,
IEstateTokenReceiver,
IRoyaltyRateProposer,
IERC4906Upgradeable,
IERC721MetadataUpgradeable {
    event BaseURIUpdate(string newValue);

    event FeeRateUpdate(uint256 newValue);
    event RoyaltyRateUpdate(uint256 newValue);

    event NewToken(
        uint256 indexed tokenId,
        address indexed lender,
        uint40 due,
        uint256 feeAmount,
        address commissionReceiver,
        uint256 commissionAmount
    );

    event NewLoan(
        uint256 indexed loanId,
        uint256 indexed estateId,
        address indexed borrower,
        uint256 mortgageAmount,
        uint256 principal,
        uint256 repayment,
        address currency,
        uint40 duration
    );
    event LoanCancellation(uint256 indexed loanId);
    event LoanForeclosure(
        uint256 indexed loanId,
        address indexed receiver
    );
    event LoanRepayment(uint256 indexed loanId);

    error InvalidCancelling();
    error InvalidEstateId();
    error InvalidForeclosing();
    error InvalidMortgageAmount();
    error InvalidLending();
    error InvalidLoanId();
    error InvalidPrincipal();
    error InvalidRepaying();
    error InvalidRepayment();
    error Overdue();

    function feeReceiver() external view returns (address feeReceiver);

    function getFeeRate() external view returns (Rate memory rate);

    function loanNumber() external view returns (uint256 loanNumber);

    function getLoan(uint256 loanId) external view returns (Loan memory loan);

    function borrow(
        uint256 estateId,
        uint256 mortgageAmount,
        uint256 principal,
        uint256 repayment,
        address currency,
        uint40 duration
    ) external returns (uint256 loanId);
    function lend(uint256 loanId) external payable returns (uint256 value);
    function repay(uint256 loanId) external payable;
    function foreclose(uint256 loanId) external;
    function cancel(uint256 loanId) external;

    function safeLend(uint256 loanId, uint256 anchor) external payable returns (uint256 value);
    function safeRepay(uint256 loanId, uint256 anchor) external payable;
}
