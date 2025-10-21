// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { MortgageToken } from "../../lend/utilities/MortgageToken.sol";
import { ProxyCaller } from "../misc/utilities/ProxyCaller.sol";
import { CommonConstant } from "../../common/constants/CommonConstant.sol";
import { Formula } from "../../common/utilities/Formula.sol";

/// @custom:oz-upgrades-unsafe-allow missing-initializer
contract MockMortgageToken is MortgageToken, ProxyCaller {
    using Formula for uint256;

    string constant private VERSION = "v1.2.1";

    function version() external pure returns (string memory) {
        return VERSION;
    }

    function initialize(
        address _admin,
        address _feeReceiver,
        string calldata _name,
        string calldata _symbol,
        string calldata _uri,
        uint256 _feeRate
    ) external
    initializer {
        __MortgageToken_init(
            _admin,
            _feeReceiver,
            _name,
            _symbol,
            _uri,
            _feeRate
        );
    }

    function royaltyInfo(
        uint256,
        uint256 _price
    ) external view returns (address, uint256) {
        Rate memory mockRoyaltyRate = Rate(0.1 ether, CommonConstant.RATE_DECIMALS);
        return (feeReceiver, _price.scale(mockRoyaltyRate));
    }

    function addMortgage(
        uint256 principal,
        uint256 repayment,
        uint256 fee,
        address currency,
        uint40 due,
        MortgageState state,
        address borrower,
        address lender
    ) external {
        mortgages[++mortgageNumber] = Mortgage(
            principal,
            repayment,
            fee,
            currency,
            due,
            state,
            borrower,
            lender
        );
    }

    function mint(address to, uint256 _mortgageId) external {
        _mint(to, _mortgageId);
    }

    function repay(
        uint256 _mortgageId
    ) external override payable {
        mortgages[_mortgageId].state = MortgageState.Repaid;
    }

    function foreclose(
        uint256 _mortgageId
    ) external override {
        mortgages[_mortgageId].state = MortgageState.Foreclosed;
    }

    function _transferCollateral(
        uint256 _mortgageId,
        address _from,
        address _to
    ) internal override {
        // Do nothing
    }

    function updateFeeReceiver(
        address _feeReceiver
    ) external {
        feeReceiver = _feeReceiver;
    }
}
