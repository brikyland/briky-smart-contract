// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// "@openzeppelin/contracts-upgradeable/
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/// contracts/common/utilities/
import {CurrencyHandler} from "../../common/utilities/CurrencyHandler.sol";

/// contracts/land/interfaces/
import {ICommissionToken} from "../interfaces/ICommissionToken.sol";

/// contracts/land/storages/
import {CommissionDispatchableStorage} from "../storages/CommissionDispatchableStorage.sol";

/**
 *  @author Briky Team
 *
 *  @notice A `CommissionDispatchable` contract allows sharing a portion of incomes as affiliate commission, according to the
 *          commission token.
 */
abstract contract CommissionDispatchable is
CommissionDispatchableStorage,
Initializable {
    /** ===== FUNCTION ===== **/
    /* --- Initializer --- */
    /**
     *  @notice Initialize `CommissionDispatchable`.
     *
     *          Name                Description
     *  @param  _commissionToken    `CommissionToken` contract address.
     */
    function __CommissionDispatchable_init(
        address _commissionToken
    ) internal
    onlyInitializing {
        commissionToken = _commissionToken;
    }


    /* --- Helper --- */
    /**
     *  @notice Dispatch commission to the receiver corresponding to the commission token of an estate.
     *
     *          Name        Description
     *  @param  _estateId   Estate token identifier.
     *  @param  _value      Commission derived from the value.
     *  @param  _currency   Currency address.
     */
    function _dispatchCommission(
        uint256 _estateId,
        uint256 _value,
        address _currency
    ) internal returns (uint256 commission) {
        address receiver;
        (receiver, commission) = ICommissionToken(commissionToken).commissionInfo(_estateId, _value);

        CurrencyHandler.sendCurrency(
            _currency,
            receiver,
            commission
        );

        emit CommissionDispatch(
            receiver,
            commission,
            _currency
        );

        return commission;
    }
}
