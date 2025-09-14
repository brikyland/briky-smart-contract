// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @openzeppelin/contracts-upgradeable/
import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC165Upgradeable.sol";
import {IERC2981Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC2981Upgradeable.sol";

/// contracts/common/interfaces/
import {CurrencyHandler} from "../common/utilities/CurrencyHandler.sol";

/// contracts/land/interfaces/
import {IEstateToken} from "../land/interfaces/IEstateToken.sol";
import {IEstateTokenReceiver} from "../land/interfaces/IEstateTokenReceiver.sol";

/// contracts/land/utilities/
import {CommissionDispatchable} from "../land/utilities/CommissionDispatchable.sol";
import {EstateTokenReceiver} from "../land/utilities/EstateTokenReceiver.sol";

/// contracts/lend/interfaces/
import {IEstateMortgageToken} from "./interfaces/IEstateMortgageToken.sol";
import {IMortgageToken} from "./interfaces/IMortgageToken.sol";

/// contracts/lend/utilities/
import {MortgageToken} from "./utilities/MortgageToken.sol";

/// contracts/lend/storages/
import {EstateMortgageTokenStorage} from "./storages/EstateMortgageTokenStorage.sol";


/**
 *  @author Briky Team
 * 
 *  @notice Implementation of contract `EstateMortgageToken`.
 *
 *  @notice A `EstateMortgageToken` contract is an ERC-721 contract that facilitates mortgage-based borrowing backed by estate token collaterals and issues tokens representing mortgages.
 */
contract EstateMortgageToken is
EstateMortgageTokenStorage,
MortgageToken,
EstateTokenReceiver,
CommissionDispatchable {
    /** ===== CONSTANT ===== **/
    string constant private VERSION = "v1.2.1";


    /** ===== FUNCTION ===== **/
    /* --- Initialization --- */
    /**
     *  @notice Invoked for initialization after deployment, serving as the contract constructor.
     * 
     *          Name           Description
     *  @param  _admin         `Admin` contract address.
     *  @param  _estateToken   `EstateToken` contract address.
     *  @param  _feeReceiver   `FeeReceiver` contract address.
     *  @param  _name          Token name.
     *  @param  _symbol        Token symbol.
     *  @param  _uri           Token base URI.
     *  @param  _feeRate       Fee rate.
     */
    function initialize(
        address _admin,
        address _estateToken,
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

        __CommissionDispatchable_init(IEstateToken(_estateToken).commissionToken());

        estateToken = _estateToken;
    }


    /* --- Standard --- */
    /**
     *          Name       Description
     *  @return version    Version of implementation.
     */
    function version() external pure returns (string memory) {
        return VERSION;
    }


    /* --- Query --- */
    /**
     *          Name           Description
     *  @param  _mortgageId    Mortgage identifier.
     * 
     *  @return Collateral information.
     */
    function getCollateral(
        uint256 _mortgageId
    ) external view
    validMortgage(_mortgageId)
    returns (EstateCollateral memory) {
        return collaterals[_mortgageId];
    }


    /* --- Command --- */
    /**
     *  @notice List a new mortgage backed by collateral from estate tokens.
     *
     *          Name          Description
     *  @param  _estateId     Estate identifier.
     *  @param  _amount       Amount of estate tokens pledged as collateral.
     *  @param  _principal    Principal value.
     *  @param  _repayment    Repayment value.
     *  @param  _currency     Loan currency address.
     *  @param  _duration     Repayment duration.
     * 
     *  @return mortgageId    New mortgage identifier.
     */
    function borrow(
        uint256 _estateId,
        uint256 _amount,
        uint256 _principal,
        uint256 _repayment,
        address _currency,
        uint40 _duration
    ) external 
    whenNotPaused
    nonReentrant
    onlyAvailableCurrency(_currency)
    returns (uint256) {
        IEstateToken estateTokenContract = IEstateToken(estateToken);
        if (!estateTokenContract.isAvailable(_estateId)) {
            revert InvalidTokenId();
        }
        if (_amount == 0) {
            revert InvalidInput();
        }
        if (_amount > estateTokenContract.balanceOf(msg.sender, _estateId)) {
            revert InvalidCollateral();
        }

        uint256 mortgageId = _borrow(
            _principal,
            _repayment,
            _currency,
            _duration
        );
        
        collaterals[mortgageId] = EstateCollateral(
            _estateId,
            _amount
        );

        _transferCollateral(
            mortgageId,
            msg.sender,
            address(this)
        );

        emit NewCollateral(
            mortgageId,
            _estateId,
            _amount
        );

        return mortgageId;
    }


    /* --- Override --- */
    /**
     *          Name            Description
     *  @param  _interfaceId    Interface identifier.
     * 
     *  @return Whether the contract supports the interface.
     */
    function supportsInterface(
        bytes4 _interfaceId
    ) public view override(
        IERC165Upgradeable,
        MortgageToken
    ) returns (bool) {
        return _interfaceId == type(IEstateMortgageToken).interfaceId
            || _interfaceId == type(IMortgageToken).interfaceId
            || _interfaceId == type(IEstateTokenReceiver).interfaceId
            || _interfaceId == type(IERC2981Upgradeable).interfaceId
            || super.supportsInterface(_interfaceId);
    }

    /**
     *          Name            Description
     *  @param  _tokenId        Token identifier.
     *  @param  _price          Price.
     * 
     *  @return address         Royalty receiver address.
     *  @return uint256         Royalty amount.
     */
    function royaltyInfo(
        uint256 _tokenId,
        uint256 _price
    ) external view override returns (address, uint256) {
        _requireMinted(_tokenId);
        ( , uint256 royalty) = IEstateToken(estateToken).royaltyInfo(collaterals[_tokenId].estateId, _price);
        return (feeReceiver, royalty);
    }


    /* --- Helper --- */
    /**
     *  @notice Transfer collateral of a mortgage.
     *
     *          Name           Description
     *  @param  _mortgageId    Mortgage identifier.
     *  @param  _from          Sender address.
     *  @param  _to            Receiver address.
     */
    function _transferCollateral(
        uint256 _mortgageId,
        address _from,
        address _to
    ) internal override {
        IEstateToken(estateToken).safeTransferFrom(
            _from,
            _to,
            collaterals[_mortgageId].estateId,
            collaterals[_mortgageId].amount,
            ""
        );
    }

    /**
     *  @notice Charge fee.
     *
     *          Name           Description
     *  @param  _mortgageId    Mortgage identifier.
     */
    function _chargeFee(
        uint256 _mortgageId
    ) internal override {
        address currency = mortgages[_mortgageId].currency;
        uint256 fee = mortgages[_mortgageId].fee;
        uint256 commission = _dispatchCommission(
            collaterals[_mortgageId].estateId,
            fee,
            currency
        );
        CurrencyHandler.sendCurrency(
            currency,
            feeReceiver,
            fee - commission
        );
    }
}
