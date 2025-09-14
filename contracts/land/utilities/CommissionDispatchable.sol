// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import {CurrencyHandler} from "../../common/utilities/CurrencyHandler.sol";

import {ICommissionToken} from "../interfaces/ICommissionToken.sol";

import {CommissionDispatchableStorage} from "../storages/CommissionDispatchableStorage.sol";

abstract contract CommissionDispatchable is
CommissionDispatchableStorage,
Initializable {
    function __CommissionDispatchable_init(address _commissionToken) internal onlyInitializing {
        commissionToken = _commissionToken;
    }

    function _dispatchCommission(
        uint256 _estateId,
        uint256 _value,
        address _currency
    ) internal returns (uint256 commission) {
        address receiver;
        (receiver, commission) = ICommissionToken(commissionToken).commissionInfo(_estateId, _value);

        CurrencyHandler.sendCurrency(_currency, receiver, commission);

        emit CommissionDispatch(
            receiver,
            commission,
            _currency
        );

        return commission;
    }
}
