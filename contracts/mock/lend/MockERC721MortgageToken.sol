// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { ERC721MortgageToken } from "../../lend/ERC721MortgageToken.sol";
import { ProxyCaller } from "../utilities/ProxyCaller.sol";

contract MockERC721MortgageToken is ERC721MortgageToken, ProxyCaller {
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
        ERC721Collateral memory collateral
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