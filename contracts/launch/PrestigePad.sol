// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import {CurrencyHandler} from "../common/utilities/CurrencyHandler.sol";
import {Formula} from "../common/utilities/Formula.sol";

import {IAdmin} from "../common/interfaces/IAdmin.sol";
import {IPriceWatcher} from "../common/interfaces/IPriceWatcher.sol";

import {CommonConstant} from "../common/constants/CommonConstant.sol";

import {IReserveVault} from "../common/interfaces/IReserveVault.sol";

import {Administrable} from "../common/utilities/Administrable.sol";
import {Discountable} from "../common/utilities/Discountable.sol";
import {Pausable} from "../common/utilities/Pausable.sol";
import {Validatable} from "../common/utilities/Validatable.sol";

import {PrestigePadConstant} from "./constants/PrestigePadConstant.sol";

import {IPrestigePad} from "./interfaces/IPrestigePad.sol";
import {IProjectToken} from "./interfaces/IProjectToken.sol";
import {IProjectLaunchpad} from "./interfaces/IProjectLaunchpad.sol";
import {IProjectTokenReceiver} from "./interfaces/IProjectTokenReceiver.sol";

import {PrestigePadStorage} from "./storages/PrestigePadStorage.sol";

import {ProjectTokenReceiver} from "./utilities/ProjectTokenReceiver.sol";

contract PrestigePad is
PrestigePadStorage,
ProjectTokenReceiver,
Administrable,
Discountable,
Pausable,
Validatable,
ReentrancyGuardUpgradeable {
    using Formula for uint256;

    string constant private VERSION = "v1.2.1";

    modifier validLaunch(uint256 _launchId) {
        if (_launchId == 0 || _launchId > launchNumber) {
            revert InvalidLaunchId();
        }
        _;
    }

    modifier validRound(uint256 _roundId) {
        if (_roundId == 0 || _roundId > roundNumber) {
            revert InvalidRoundId();
        }
        _;
    }

    modifier onlyInitiator(uint256 _launchId) {
        if (msg.sender != launches[_launchId].initiator) {
            revert Unauthorized();
        }
        _;
    }

    receive() external payable {}

    function initialize(
        address _admin,
        address _projectToken,
        address _priceWatcher,
        address _feeReceiver,
        address _reserveVault,
        address _validator,
        uint256 _baseMinUnitPrice,
        uint256 _baseMaxUnitPrice
    ) external initializer {
        __Pausable_init();
        __ReentrancyGuard_init();

        __Validatable_init(_validator);

        admin = _admin;
        projectToken = _projectToken;
        priceWatcher = _priceWatcher;
        feeReceiver = _feeReceiver;
        reserveVault = _reserveVault;

        baseMinUnitPrice = _baseMinUnitPrice;
        baseMaxUnitPrice = _baseMaxUnitPrice;
        emit BaseUnitPriceRangeUpdate(_baseMinUnitPrice, _baseMaxUnitPrice);
    }

    function version() external pure returns (string memory) {
        return VERSION;
    }

    function updateBaseUnitPriceRange(
        uint256 _baseMinUnitPrice,
        uint256 _baseMaxUnitPrice,
        bytes[] calldata _signatures
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "updateBaseUnitPriceRange",
                _baseMinUnitPrice,
                _baseMaxUnitPrice
            ),
            _signatures
        );

        if (_baseMinUnitPrice > _baseMaxUnitPrice) {
            revert InvalidInput();
        }
        baseMinUnitPrice = _baseMinUnitPrice;
        baseMaxUnitPrice = _baseMaxUnitPrice;
        emit BaseUnitPriceRangeUpdate(
            _baseMinUnitPrice,
            _baseMaxUnitPrice
        );
    }

    function getLaunch(uint256 _launchId)
    external view validLaunch(_launchId) returns (PrestigePadLaunch memory) {
        return launches[_launchId];
    }

    function getRound(uint256 _roundId)
    external view validRound(_roundId) returns (PrestigePadRound memory) {
        return rounds[_roundId];
    }

    function initiateLaunch(
        address _initiator,
        bytes32 _zone,
        string calldata _projectURI,
        string calldata _launchURI,
        uint256 _initialQuantity,
        uint256 _feeRate,
        Validation calldata _validation
    ) external nonReentrant onlyExecutive whenNotPaused returns (uint256) {
        _validate(
            abi.encode(
                _projectURI,
                _launchURI
            ),
            _validation
        );

        if (!IAdmin(admin).isActiveIn(_zone, msg.sender)) {
            revert Unauthorized();
        }

        if (!IProjectToken(projectToken).isInitiatorIn(_zone, _initiator)) {
            revert NotRegisteredInitiator();
        }

        uint256 launchId = ++launchNumber;
        PrestigePadLaunch storage launch = launches[launchId];
        launch.uri = _launchURI;
        launch.initiator = _initiator;

        Rate memory rate = Rate(_feeRate, CommonConstant.RATE_DECIMALS);
        launch.feeRate = rate;

        IProjectToken projectTokenContract = IProjectToken(projectToken);
        uint256 projectId = projectTokenContract.launchProject(
            _zone,
            launchId,
            _initiator,
            _projectURI
        );
        launch.projectId = projectId;

        uint256 roundId = ++roundNumber;
        launch.roundIds.push(roundId);

        PrestigePadRound storage round = rounds[roundId];
        round.quota.totalQuantity = _initialQuantity;
        round.agenda.raiseStartsAt = round.agenda.confirmAt = uint40(block.timestamp);

        if (_initialQuantity != 0) {
            uint256 initialAmount = _initialQuantity * 10 ** projectTokenContract.decimals();
            projectTokenContract.mint(projectId, initialAmount);
            projectTokenContract.safeTransferFrom(
                address(this),
                _initiator,
                projectId,
                initialAmount,
                ""
            );
        }

        emit NewLaunch(
            launchId,
            projectId,
            _initiator,
            _launchURI,
            _initialQuantity,
            rate
        );

        return launchId;
    }

    function updateLaunchURI(
        uint256 _launchId,
        string calldata _uri,
        Validation calldata _validation
    ) external validLaunch(_launchId) onlyInitiator(_launchId) whenNotPaused {
        _validate(abi.encode(_uri), _validation);

        if (launches[_launchId].isFinalized) {
            revert AlreadyFinalized();
        }

        launches[_launchId].uri = _uri;
        emit LaunchURIUpdate(_launchId, _uri);
    }

    function updateRound(
        uint256 _launchId,
        uint256 _index,
        PrestigePadRoundInput calldata _round
    ) external validLaunch(_launchId) onlyInitiator(_launchId) whenNotPaused returns (uint256) {
        PrestigePadLaunch storage launch = launches[_launchId];
        if (launch.isFinalized) {
            revert AlreadyFinalized();
        }

        if (_index >= launch.roundIds.length) {
            revert InvalidInput();
        }

        if (rounds[launch.roundIds[_index]].agenda.raiseStartsAt != 0) {
            revert AlreadyInitiated();
        }

        uint256 roundId = _newRound(_launchId, _round);
        launch.roundIds[_index] = roundId;

        emit LaunchRoundUpdate(
            _launchId,
            roundId,
            _index,
            _round
        );

        return roundId;
    }

    function updateRounds(
        uint256 _launchId,
        uint256 _removedRoundNumber,
        PrestigePadRoundInput[] calldata _addedRounds
    ) external validLaunch(_launchId) onlyInitiator(_launchId) whenNotPaused returns (uint256) {
        PrestigePadLaunch storage launch = launches[_launchId];
        if (launch.isFinalized) {
            revert AlreadyFinalized();
        }

        uint256[] storage roundIds = launch.roundIds;
        uint256 index = roundIds.length;
        if (_removedRoundNumber >= index) {
            revert InvalidRemoving();
        }
        index -= _removedRoundNumber;

        uint256 currentIndex = launch.currentIndex;
        if (index <= currentIndex) {
            revert InvalidRemoving();
        }

        for (uint256 i; i < _removedRoundNumber; ++i) {
            roundIds.pop();
        }

        for (uint256 i; i < _addedRounds.length; ++i) {
            uint256 roundId = _newRound(_launchId, _addedRounds[i]);
            roundIds.push(roundId);

            emit LaunchRoundUpdate(
                _launchId,
                roundId,
                index++,
                _addedRounds[i]
            );
        }

        return index;
    }

    function raiseNextRound(
        uint256 _launchId,
        uint256 _cashbackThreshold,
        uint256 _cashbackBaseRate,
        address[] calldata _cashbackCurrencies,
        uint256[] calldata _cashbackDenominations,
        uint40 _raiseStartsAt,
        uint40 _raiseDuration
    ) external nonReentrant validLaunch(_launchId) onlyInitiator(_launchId) whenNotPaused returns (uint256) {
        if (_cashbackBaseRate > CommonConstant.RATE_MAX_FRACTION
            || _cashbackCurrencies.length != _cashbackDenominations.length
            || _raiseStartsAt < block.timestamp
            || _raiseDuration < PrestigePadConstant.RAISE_MINIMUM_DURATION) {
            revert InvalidInput();
        }

        PrestigePadLaunch storage launch = launches[_launchId];
        if (launch.isFinalized) {
            revert AlreadyFinalized();
        }

        uint256 currentIndex = launch.currentIndex;
        if (rounds[launch.roundIds[currentIndex]].agenda.confirmAt == 0) {
            revert InvalidInitiating();
        }

        launch.currentIndex = ++currentIndex;
        if (currentIndex == launch.roundIds.length) {
            revert NoRoundToInitiate();
        }

        uint256 roundId = launch.roundIds[currentIndex];
        PrestigePadRound storage round = rounds[roundId];
        if (_cashbackThreshold > round.quota.totalQuantity) {
            revert InvalidInput();
        }

        uint256 unitPrice = round.quote.unitPrice;
        address currency = round.quote.currency;
        uint256 feeDenomination = _applyDiscount(
            unitPrice.scale(launch.feeRate),
            currency
        );
        round.quote.feeDenomination = feeDenomination;

        uint256 cashbackFundId;
        if (_cashbackBaseRate == 0 && _cashbackCurrencies.length == 0) {
            if (_cashbackThreshold != 0) {
                revert InvalidInput();
            }
        } else {
            if (_cashbackThreshold == 0) {
                revert InvalidInput();
            }
            cashbackFundId = IReserveVault(reserveVault).openFund(
                currency,
                feeDenomination.scale(_cashbackBaseRate, CommonConstant.RATE_MAX_FRACTION),
                _cashbackCurrencies,
                _cashbackDenominations
            );
        }
        round.quote.cashbackThreshold = _cashbackThreshold;
        round.quote.cashbackFundId = cashbackFundId;

        round.agenda.raiseStartsAt = _raiseStartsAt;
        round.agenda.raiseEndsAt = _raiseStartsAt + _raiseDuration;

        emit LaunchNextRoundInitiation(
            _launchId,
            roundId,
            cashbackFundId,
            _raiseStartsAt,
            _raiseDuration
        );

        return currentIndex;
    }

    function cancelCurrentRound(uint256 _launchId)
    external validLaunch(_launchId) onlyInitiator(_launchId) whenNotPaused returns (uint256, uint256) {
        PrestigePadLaunch storage launch = launches[_launchId];
        if (launch.isFinalized) {
            revert AlreadyFinalized();
        }

        uint256 currentIndex = launch.currentIndex;
        PrestigePadRound storage round = rounds[launch.roundIds[currentIndex]];
        if (round.agenda.confirmAt != 0) {
            revert AlreadyConfirmed();
        }

        uint256 roundId = ++roundNumber;
        PrestigePadRound storage newRound = rounds[roundId];
        newRound.uri = round.uri;
        newRound.quota.totalQuantity = round.quota.totalQuantity;
        newRound.quota.minRaisingQuantity = round.quota.minRaisingQuantity;
        newRound.quota.maxRaisingQuantity = round.quota.maxRaisingQuantity;
        newRound.quote.unitPrice = round.quote.unitPrice;
        newRound.quote.currency = round.quote.currency;

        round.quota.totalQuantity = 0;

        launch.currentIndex = currentIndex - 1;

        launch.roundIds[currentIndex] = roundId;

        emit LaunchCurrentRoundCancellation(_launchId, roundId);

        return (currentIndex, roundId);
    }

    function confirmCurrentRound(uint256 _launchId)
    external payable nonReentrant validLaunch(_launchId) onlyInitiator(_launchId) whenNotPaused returns (uint256) {
        PrestigePadLaunch storage launch = launches[_launchId];
        if (launch.isFinalized) {
            revert AlreadyFinalized();
        }

        uint256 currentIndex = launch.currentIndex;
        uint256 roundId = launch.roundIds[currentIndex];
        PrestigePadRound storage round = rounds[roundId];
        if (block.timestamp < round.agenda.raiseStartsAt) {
            revert InvalidConfirming();
        }

        if (round.agenda.confirmAt != 0) {
            revert AlreadyConfirmed();
        }

        uint256 raiseEndsAt = round.agenda.raiseEndsAt;
        if (raiseEndsAt + PrestigePadConstant.RAISE_CONFIRMATION_TIME_LIMIT <= block.timestamp) {
            revert Timeout();
        }

        uint256 soldQuantity = round.quota.raisedQuantity;
        if (soldQuantity < round.quota.minRaisingQuantity) {
            revert NotEnoughSoldQuantity();
        }

        if (raiseEndsAt > block.timestamp) {
            round.agenda.raiseEndsAt = uint40(block.timestamp);
        }
        round.agenda.confirmAt = uint40(block.timestamp);

        IProjectToken projectTokenContract = IProjectToken(projectToken);
        uint256 unit = 10 ** projectTokenContract.decimals();
        projectTokenContract.mint(
            launch.projectId,
            round.quota.totalQuantity * unit
        );

        address initiator = launch.initiator;
        projectTokenContract.safeTransferFrom(
            address(this),
            initiator,
            launch.projectId,
            (round.quota.totalQuantity - soldQuantity) * unit,
            ""
        );

        address currency = round.quote.currency;
        uint256 value = soldQuantity * round.quote.unitPrice;
        uint256 fee = soldQuantity * round.quote.feeDenomination;
        CurrencyHandler.sendCurrency(currency, initiator, value - fee);

        uint256 cashbackBaseAmount = _provideCashbackFund(round.quote.cashbackFundId);
        
        CurrencyHandler.sendCurrency(
            currency,
            feeReceiver,
            fee - cashbackBaseAmount
        );

        emit LaunchCurrentRoundConfirmation(
            _launchId,
            roundId,
            soldQuantity,
            value,
            fee,
            cashbackBaseAmount
        );

        return currentIndex;
    }

    function finalize(uint256 _launchId) external validLaunch(_launchId) onlyInitiator(_launchId) whenNotPaused {
        PrestigePadLaunch storage launch = launches[_launchId];
        if (launch.isFinalized) {
            revert AlreadyFinalized();
        }

        uint256 currentIndex = launch.currentIndex;
        if (currentIndex != launch.roundIds.length - 1
            || rounds[launch.roundIds[currentIndex]].agenda.confirmAt == 0) {
            revert InvalidFinalizing();
        }

        launches[_launchId].isFinalized = true;
        emit LaunchFinalization(_launchId);
    }

    function contributeCurrentRound(uint256 _launchId, uint256 _quantity)
    external payable validLaunch(_launchId) returns (uint256) {
        return _contributeCurrentRound(_launchId, _quantity);
    }

    function safeContributeCurrentRound(
        uint256 _launchId,
        uint256 _quantity,
        bytes32 _anchor
    ) external payable validLaunch(_launchId) returns (uint256) {
        if (_anchor != keccak256(bytes(launches[_launchId].uri))) {
            revert BadAnchor();
        }

        return _contributeCurrentRound(_launchId, _quantity);
    }

    function withdrawContribution(uint256 _roundId)
    external nonReentrant validRound(_roundId) whenNotPaused returns (uint256) {
        PrestigePadRound storage round = rounds[_roundId];
        if (round.agenda.confirmAt != 0) {
            revert AlreadyConfirmed();
        }

        if (round.quota.totalQuantity != 0) {
            uint256 raiseEndsAt = round.agenda.raiseEndsAt;
            if (raiseEndsAt > block.timestamp) {
                revert StillRaising();
            }
            if (raiseEndsAt + PrestigePadConstant.RAISE_CONFIRMATION_TIME_LIMIT > block.timestamp
                && round.quota.raisedQuantity >= round.quota.minRaisingQuantity) {
                revert InvalidWithdrawing();
            }
        }

        uint256 quantity = contributions[_roundId][msg.sender];
        if (quantity == 0) {
            revert NothingToWithdraw();
        }
        address currency = round.quote.currency;
        uint256 value = quantity * round.quote.unitPrice;

        contributions[_roundId][msg.sender] = 0;

        CurrencyHandler.sendCurrency(currency, msg.sender, value);

        emit ContributionWithdrawal(
            _roundId,
            msg.sender,
            quantity,
            value
        );

        return value;
    }

    function withdrawProjectToken(uint256 _launchId, uint256 _index)
    external nonReentrant validLaunch(_launchId) whenNotPaused returns (uint256) {
        PrestigePadLaunch storage launch = launches[_launchId];
        if (_index > launch.currentIndex) {
            revert InvalidInput();
        }

        uint256 roundId = launch.roundIds[_index];
        PrestigePadRound storage round = rounds[roundId];
        if (round.agenda.confirmAt == 0) {
            revert NotConfirmed();
        }

        if (withdrawAt[roundId][msg.sender] > 0) {
            revert AlreadyWithdrawn();
        }

        withdrawAt[roundId][msg.sender] = block.timestamp;

        IProjectToken projectTokenContract = IProjectToken(projectToken);
        uint256 unit = 10 ** projectTokenContract.decimals();

        uint256 quantity = contributions[roundId][msg.sender];
        uint256 amount = quantity * unit;

        projectTokenContract.safeTransferFrom(
            address(this),
            msg.sender,
            launch.projectId,
            amount,
            ""
        );

        uint256 cashbackFundId = round.quote.cashbackFundId;
        if (cashbackFundId != 0) {
            if (quantity >= round.quote.cashbackThreshold) {
                IReserveVault(reserveVault).withdrawFund(cashbackFundId, msg.sender, quantity);
            }
        }

        emit ProjectTokenWithdrawal(
            _launchId,
            roundId,
            msg.sender,
            amount
        );

        return amount;
    }

    function isFinalized(uint256 _launchId) external view returns (bool) {
        return launches[_launchId].isFinalized;
    }

    function allocationOfAt(
        address _account,
        uint256 _launchId,
        uint256 _at
    ) external view validLaunch(_launchId) returns (uint256) {
        if (_at > block.timestamp) {
            revert InvalidTimestamp();
        }
        uint256 allocation = 0;
        PrestigePadLaunch storage launch = launches[_launchId];
        uint256 currentIndex = launch.currentIndex;
        for (uint256 i = 0; i < currentIndex; ++i) {
            uint256 roundId = launch.roundIds[i];
            uint256 withdrawAt = withdrawAt[roundId][_account];
            if (_at >= rounds[roundId].agenda.confirmAt && (withdrawAt == 0 || _at < withdrawAt)) {
                allocation += contributions[roundId][_account];
            }
        }
        if (rounds[launch.roundIds[currentIndex]].agenda.confirmAt != 0) {
            uint256 roundId = launch.roundIds[currentIndex];
            uint256 withdrawAt = withdrawAt[roundId][_account];
            if (_at >= rounds[roundId].agenda.confirmAt && (withdrawAt == 0 || _at < withdrawAt)) {
                allocation += contributions[roundId][_account];
            }
        }

        return allocation * 10 ** IProjectToken(projectToken).decimals();
    }

    function _newRound(
        uint256 _launchId,
        PrestigePadRoundInput calldata _round
    ) internal returns (uint256) {
        _validate(abi.encode(_round.uri), _round.validation);

        if (!IPriceWatcher(priceWatcher).isPriceInRange(
            _round.quote.currency,
            _round.quote.unitPrice,
            baseMinUnitPrice,
            baseMaxUnitPrice
        )) {
            revert InvalidUnitPrice();
        }

        if (_round.quota.minRaisingQuantity > _round.quota.maxRaisingQuantity
            || _round.quota.maxRaisingQuantity > _round.quota.totalQuantity) {
            revert InvalidInput();
        }

        uint256 roundId = ++roundNumber;

        PrestigePadRound storage round = rounds[roundId];
        round.uri = _round.uri;
        round.quota.totalQuantity = _round.quota.totalQuantity;
        round.quota.minRaisingQuantity = _round.quota.minRaisingQuantity;
        round.quota.maxRaisingQuantity = _round.quota.maxRaisingQuantity;
        round.quote.unitPrice = _round.quote.unitPrice;
        round.quote.currency = _round.quote.currency;

        emit NewRound(
            roundId,
            _launchId,
            _round.uri,
            _round.quota,
            _round.quote
        );

        return roundId;
    }

    function _contributeCurrentRound(uint256 _launchId, uint256 _quantity)
    internal nonReentrant whenNotPaused returns (uint256) {
        PrestigePadLaunch storage launch = launches[_launchId];
        if (launch.isFinalized) {
            revert AlreadyFinalized();
        }

        uint256 currentIndex = launch.currentIndex;
        uint256 roundId = launch.roundIds[currentIndex];
        PrestigePadRound storage round = rounds[roundId];
        if (round.agenda.confirmAt != 0) {
            revert AlreadyConfirmed();
        }
        if (round.agenda.raiseStartsAt > block.timestamp
            || round.agenda.raiseEndsAt <= block.timestamp) {
            revert InvalidContributing();
        }

        uint256 newSoldQuantity = round.quota.raisedQuantity + _quantity;
        if (newSoldQuantity > round.quota.maxRaisingQuantity) {
            revert MaxRaisingQuantityExceeded();
        }
        round.quota.raisedQuantity = newSoldQuantity;

        uint256 value = _quantity * round.quote.unitPrice;
        CurrencyHandler.receiveCurrency(round.quote.currency, value);

        uint256 oldContribution = contributions[roundId][msg.sender];
        uint256 newContribution = oldContribution + _quantity;
        contributions[roundId][msg.sender] = newContribution;

        uint256 cashbackFundId = round.quote.cashbackFundId;
        if (cashbackFundId != 0) {
            uint256 cashbackThreshold = round.quote.cashbackThreshold;

            if (oldContribution >= cashbackThreshold) {
                IReserveVault(reserveVault).expandFund(
                    cashbackFundId,
                    _quantity
                );
            } else if (newContribution >= cashbackThreshold) {
                IReserveVault(reserveVault).expandFund(
                    cashbackFundId,
                    newContribution
                );
            }
        }

        emit Contribution(
            _launchId,
            roundId,
            msg.sender,
            _quantity,
            value
        );

        return value;
    }

    function _provideCashbackFund(uint256 _cashbackFundId) internal returns (uint256) {
        uint256 cashbackBaseAmount;
        if (_cashbackFundId != 0) {
            address reserveVaultAddress = reserveVault;
            Fund memory fund = IReserveVault(reserveVaultAddress).getFund(_cashbackFundId);

            uint256 totalNative;
            if (fund.quantity != 0) {
                for (uint256 i; i < fund.extraCurrencies.length; ++i) {
                    if (fund.extraCurrencies[i] == address(0)) {
                        totalNative += fund.extraDenominations[i] * fund.quantity;
                    } else {
                        CurrencyHandler.receiveERC20(fund.extraCurrencies[i], fund.extraDenominations[i] * fund.quantity);
                        CurrencyHandler.allowERC20(fund.extraCurrencies[i], reserveVaultAddress, fund.extraDenominations[i] * fund.quantity);
                    }
                }

                CurrencyHandler.receiveNative(totalNative);

                if (fund.mainDenomination != 0) {
                    if (fund.mainCurrency == address(0)) {
                        totalNative += fund.mainDenomination * fund.quantity;
                    } else {
                        CurrencyHandler.allowERC20(fund.mainCurrency, reserveVaultAddress, fund.mainDenomination * fund.quantity);
                    }
                }
            }

            IReserveVault(reserveVaultAddress).provideFund{value: totalNative}(_cashbackFundId);
        } else {
            CurrencyHandler.receiveNative(0);
        }
        return cashbackBaseAmount;
    }

    function supportsInterface(
        bytes4 _interfaceId
    ) public view virtual override returns (bool) {
        return _interfaceId == type(IPrestigePad).interfaceId
            || _interfaceId == type(IProjectLaunchpad).interfaceId
            || _interfaceId == type(IProjectTokenReceiver).interfaceId;
    }

}
