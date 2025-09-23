// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { EstateMortgageToken } from "../lend/EstateMortgageToken.sol";
import { Revert } from "../common/utilities/Revert.sol";
import { ProxyCaller } from "./common/ProxyCaller.sol";

contract MockEstateMortgageToken is EstateMortgageToken, ProxyCaller {
    function mint(address to, uint256 _mortgageId) external {
        _mint(to, _mortgageId);
    }

    function addMortgage(
        uint256 amount,
        uint256 principal,
        uint256 repayment,
        address currency,
        uint40 due,
        MortgageState state,
        address borrower,
        address lender,
        AssetCollateral memory collateral
    ) external {
        mortgages[++mortgageNumber] = Mortgage(
            amount,
            principal,
            repayment,
            currency,
            due,
            state,
            borrower,
            lender
        );

        collaterals[++mortgageNumber] = collateral;
    }
}