// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { MortgageToken } from "../lend/MortgageToken.sol";
import { Revert } from "../lib/Revert.sol";

contract MockMortgageToken is MortgageToken {
    function mint(address to, uint256 _loanId) external {
        _mint(to, _loanId);
    }

    function call(address _to, bytes calldata _data) external {
        (bool success, bytes memory result) = _to.call(_data);
        if (!success) {
            Revert.revertFromReturnedData(result);
        }
    }

    function addLoan(uint256 estateId, uint256 mortgageAmount, uint256 principal, uint256 repayment, address currency, uint40 due, LoanState state, address borrower, address lender) external {
        loans[++loanNumber] = Loan(
            estateId,
            mortgageAmount,
            principal,
            repayment,
            currency,
            due,
            state,
            borrower,
            lender
        );
    }
}