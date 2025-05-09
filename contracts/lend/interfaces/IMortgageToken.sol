// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC2981Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC2981Upgradeable.sol";
import {IERC4906Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC4906Upgradeable.sol";
import {IERC1155ReceiverUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155ReceiverUpgradeable.sol";
import {IERC721MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/IERC721MetadataUpgradeable.sol";

import {ICommon} from "../../common/interfaces/ICommon.sol";

interface IMortgageToken is
ICommon,
IERC4906Upgradeable,
IERC721MetadataUpgradeable,
IERC1155ReceiverUpgradeable,
IERC2981Upgradeable {
    enum LoanState {
        Nil,
        Pending,
        Supplied,
        Repaid,
        Foreclosed,
        Cancelled
    }

    struct Loan {
        uint256 estateId;
        uint256 mortgageAmount;
        uint256 principal;
        uint256 repayment;
        address currency;
        uint40 due;
        LoanState state;
        address borrower;
        address lender;
    }

    event BaseURIUpdate(string newValue);

    event CommissionRateUpdate(uint256 newValue);
    event ExclusiveRateUpdate(uint256 newValue);
    event FeeRateUpdate(uint256 newValue);
    event RoyaltyRateUpdate(uint256 newValue);

    event NewToken(
        uint256 indexed tokenId,
        address indexed lender,
        uint40 due,
        uint256 fee,
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

    function admin() external view returns (address admin);
    function estateToken() external view returns (address estateToken);
    function feeReceiver() external view returns (address feeReceiver);

    function commissionRate() external view returns (uint256 commissionRate);
    function exclusiveRate() external view returns (uint256 exclusiveRate);
    function feeRate() external view returns (uint256 feeRate);
    function royaltyRate() external view returns (uint256 royaltyFeeRate);

    function loanNumber() external view returns (uint256 loanNumber);

    function getLoan(uint256 loanId) external view returns (Loan memory loan);
    function exists(uint256 loanId) external view returns (bool existence);

    function borrow(
        uint256 estateId,
        uint256 mortgageAmount,
        uint256 principal,
        uint256 repayment,
        address currency,
        uint40 duration
    ) external returns (uint256 loanId);
    function lend(uint256 loanId, uint256 estateId) external payable;
    function repay(uint256 loanId) external payable;
    function foreclose(uint256 loanId) external;
    function cancel(uint256 loanId) external;
}
