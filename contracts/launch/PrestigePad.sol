// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @openzeppelin/contracts-upgradeable/
import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC165Upgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {ERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";

/// contracts/common/constants/
import {CommonConstant} from "../common/constants/CommonConstant.sol";

/// contracts/common/interfaces/
import {IAdmin} from "../common/interfaces/IAdmin.sol";
import {IPriceWatcher} from "../common/interfaces/IPriceWatcher.sol";
import {IReserveVault} from "../common/interfaces/IReserveVault.sol";

/// contracts/common/utilities/
import {Administrable} from "../common/utilities/Administrable.sol";
import {CurrencyHandler} from "../common/utilities/CurrencyHandler.sol";
import {Discountable} from "../common/utilities/Discountable.sol";
import {Formula} from "../common/utilities/Formula.sol";
import {Pausable} from "../common/utilities/Pausable.sol";
import {Validatable} from "../common/utilities/Validatable.sol";

/// contracts/launch/constants/
import {PrestigePadConstant} from "./constants/PrestigePadConstant.sol";

/// contracts/launch/interfaces/
import {IPrestigePad} from "./interfaces/IPrestigePad.sol";
import {IProjectToken} from "./interfaces/IProjectToken.sol";
import {IProjectLaunchpad} from "./interfaces/IProjectLaunchpad.sol";
import {IProjectTokenReceiver} from "./interfaces/IProjectTokenReceiver.sol";

/// contracts/launch/storages/
import {PrestigePadStorage} from "./storages/PrestigePadStorage.sol";

/// contracts/launch/utilities/
import {ProjectTokenReceiver} from "./utilities/ProjectTokenReceiver.sol";

/**
 *  @author Briky Team
 *
 *  @notice The `PrestigePad` contract facilitates the launch of real estate project through crowdfunding. Authorized
 *          initiators
 *
 *  @dev    Implementation involves server-side support.
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 *  @dev    Quantities are expressed in absolute units. Scale these values by `10 ** IAssetToken(projectToken).decimals()` to
 *          obtain the correct amounts under the `IAssetToken` convention.
 */
contract PrestigePad is
PrestigePadStorage,
ERC165Upgradeable,
ProjectTokenReceiver,
Administrable,
Discountable,
Pausable,
Validatable,
ReentrancyGuardUpgradeable {
    /** ===== LIBRARY ===== **/
    using Formula for uint256;


    /** ===== CONSTANT ===== **/
    string constant private VERSION = "v1.2.1";


    /** ===== MODIFIER ===== **/
    /**
     *  @notice Verify a valid launch identifier.
     *
     *          Name        Description
     *  @param  _launchId   Launch identifier.
     */
    modifier validLaunch(
        uint256 _launchId
    ) {
        if (_launchId == 0 || _launchId > launchNumber) {
            revert InvalidLaunchId();
        }
        _;
    }

    /**
     *  @notice Verify a valid round identifier.
     *
     *          Name        Description
     *  @param  _roundId    Round identifier.
     */
    modifier validRound(
        uint256 _roundId
    ) {
        if (_roundId == 0 || _roundId > roundNumber) {
            revert InvalidRoundId();
        }
        _;
    }

    /**
     *  @notice Verify the message sender is the initiator of a launch.
     *
     *          Name        Description
     *  @param  _launchId   Launch identifier.
     */
    modifier onlyInitiator(
        uint256 _launchId
    ) {
        if (msg.sender != launches[_launchId].initiator) {
            revert Unauthorized();
        }
        _;
    }


    /** ===== FUNCTION ===== **/
    /* --- Common --- */
    /**
     *  @notice Executed on a call to this contract with empty calldata.
     */
    receive() external payable {}

    /**
     *  @return Version of implementation.
     */
    function version() external pure returns (string memory) {
        return VERSION;
    }


    /* --- Initialization --- */
    /**
     *  @notice Initialize the contract after deployment, serving as the constructor.
     *
     *          Name                Description
     *  @param  _admin              `Admin` contract address.
     *  @param  _projectToken       `ProjectToken` contract address.
     *  @param  _priceWatcher       `PriceWatcher` contract address.
     *  @param  _feeReceiver        `FeeReceiver` contract address.
     *  @param  _reserveVault       `ReserveVault` contract address.
     *  @param  _validator          Validator address.
     *  @param  _baseMinUnitPrice   Minimum unit price denominated in USD.
     *  @param  _baseMaxUnitPrice   Maximum unit price denominated in USD.
     */
    function initialize(
        address _admin,
        address _projectToken,
        address _priceWatcher,
        address _feeReceiver,
        address _reserveVault,
        address _validator,
        uint256 _baseMinUnitPrice,
        uint256 _baseMaxUnitPrice
    ) external
    initializer {
        /// Initializer
        __Pausable_init();
        __Validatable_init(_validator);
        __ReentrancyGuard_init();

        /// Dependency
        admin = _admin;
        projectToken = _projectToken;
        priceWatcher = _priceWatcher;
        feeReceiver = _feeReceiver;
        reserveVault = _reserveVault;

        /// Configuration
        baseMinUnitPrice = _baseMinUnitPrice;
        baseMaxUnitPrice = _baseMaxUnitPrice;
        emit BaseUnitPriceRangeUpdate(
            _baseMinUnitPrice,
            _baseMaxUnitPrice
        );
    }


    /* --- Administration --- */
    /**
     *  @notice Update the acceptable range of unit price denominated in USD.
     *
     *          Name                Description
     *  @param  _baseMinUnitPrice   New minimum unit price denominated in USD.
     *  @param  _baseMaxUnitPrice   New maximum unit price denominated in USD.
     *  @param  _signatures         Array of admin signatures.
     * 
     *  @dev    Administrative operator.
     */
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


    /* --- Query --- */
    /**
     *          Name            Description
     *  @param  _launchId       Launch identifier.
     *
     *  @return Configuration and rounds of the launch.
     */
    function getLaunch(
        uint256 _launchId
    ) external view
    validLaunch(_launchId)
    returns (PrestigePadLaunch memory) {
        return launches[_launchId];
    }

    /**
     *          Name            Description
     *  @param  _roundId        Round identifier.
     *
     *  @return Configuration and progress of the round.
     *
     *  @dev    Phases of a round:
     *          - Unscheduled: agenda.raiseStartsAt = 0
     *          - Scheduled: block.timestamp < agenda.raiseStartsAt
     *          - Raise: agenda.raiseStartsAt <= block.timestamp < agenda.raiseEndsAt
     *          - Awaiting Confirmation: agenda.raiseEndsAt
     *                                      <= block.timestamp
     *                                      < agenda.raiseEndsAt + PrestigePadConstant.RAISE_CONFIRMATION_TIME_LIMIT
     *          - Confirmed: agenda.confirmedAt > 0
     *          - Cancelled: quota.totalSupply = 0
     */
    function getRound(
        uint256 _roundId
    ) external view
    validRound(_roundId)
    returns (PrestigePadRound memory) {
        return rounds[_roundId];
    }

    /**
     *          Name            Description
     *  @param  _launchId       Launch identifier.
     *
     *  @return Whether the launch has been finalized.
     */
    function isFinalized(
        uint256 _launchId
    ) external view returns (bool) {
        return launches[_launchId].isFinalized;
    }

    /**
     *          Name            Description
     *  @param  _account        Account address.
     *  @param  _launchId       Launch identifier.
     *  @param  _at             Reference timestamp.
     *
     *  @return Allocation of the account at the reference timestamp.
     */
    function allocationOfAt(
        address _account,
        uint256 _launchId,
        uint256 _at
    ) external view
    validLaunch(_launchId)
    returns (uint256) {
        if (_at > block.timestamp) {
            revert InvalidTimestamp();
        }
        uint256 allocation = 0;
        PrestigePadLaunch storage launch = launches[_launchId];
        uint256 currentIndex = launch.currentIndex;
        /// @dev    Unwithdrawn tokens from previous rounds.
        for (uint256 i = 0; i <= currentIndex; ++i) {
            uint256 roundId = launch.roundIds[i];
            uint256 confirmAt = rounds[roundId].agenda.confirmAt;
            if (_at >= confirmAt && confirmAt != 0) {
                uint256 withdrawAt = withdrawAt[roundId][_account];
                if (withdrawAt == 0 || _at < withdrawAt) {
                    allocation += contributions[roundId][_account];
                }
            } else break;
        }

        return allocation * 10 ** IProjectToken(projectToken).decimals();
    }

    /**
     *          Name            Description
     *  @param  _interfaceId    Interface identifier.
     *
     *  @return Whether the interface is supported.
     */
    function supportsInterface(
        bytes4 _interfaceId
    ) public view virtual override(
        IERC165Upgradeable,
        ERC165Upgradeable
    ) returns (bool) {
        return _interfaceId == type(IProjectLaunchpad).interfaceId
            || _interfaceId == type(IProjectTokenReceiver).interfaceId
            || super.supportsInterface(_interfaceId);
    }


    /* --- Command --- */
    /**
     *  @notice Initiate a new launch for an estate project.
     *
     *          Name                Description
     *  @param  _initiator          Initiator address.
     *  @param  _zone               Zone code.
     *  @param  _projectURI         URI of project metadata.
     *  @param  _launchURI          URI of launch metadata.
     *  @param  _initialQuantity    Initial quantity of tokens to be minted for the initiator.
     *  @param  _feeRate            Fraction of raised value charged as fee, applied for all rounds.
     *  @param  _validation         Validation package from the validator.
     *
     *  @return New launch identifier.
     *
     *  @dev    Permission: Executives active in the zone of the estate.
     */
    function initiateLaunch(
        address _initiator,
        bytes32 _zone,
        string calldata _projectURI,
        string calldata _launchURI,
        uint256 _initialQuantity,
        uint256 _feeRate,
        Validation calldata _validation
    ) external
    whenNotPaused
    nonReentrant
    onlyExecutive
    returns (uint256) {
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
        /// @dev    Launch new project.
        uint256 projectId = projectTokenContract.launchProject(
            _zone,
            launchId,
            _initiator,
            _projectURI
        );
        launch.projectId = projectId;

        /// @dev    The first round of the launch is for the initial quantity.
        uint256 roundId = ++roundNumber;
        launch.roundIds.push(roundId);

        PrestigePadRound storage round = rounds[roundId];
        round.quota.totalQuantity = _initialQuantity;
        round.agenda.raiseStartsAt = round.agenda.confirmAt = uint40(block.timestamp);

        if (_initialQuantity != 0) {
            uint256 initialAmount = _initialQuantity * 10 ** projectTokenContract.decimals();
            projectTokenContract.mint(projectId, initialAmount);
            /// @dev    Transfer the initial quantity to the initiator.
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


    /**
     *  @notice Update the URI of information of a launch.
     *  @notice Update only if the launch is not finalized.
     *
     *          Name                    Description
     *  @param  _launchId               Launch identifier.
     *  @param  _uri                    URI of launch metadata.
     *  @param  _validation             Validation package from the validator.
     *
     *  @dev    Permission: Initiator of the launch.
     */
    function updateLaunchURI(
        uint256 _launchId,
        string calldata _uri,
        Validation calldata _validation
    ) external
    whenNotPaused
    validLaunch(_launchId)
    onlyInitiator(_launchId) {
        _validate(
            abi.encode(
            _launchId,
                _uri
            ),
            _validation
        );

        if (launches[_launchId].isFinalized) {
            revert AlreadyFinalized();
        }

        launches[_launchId].uri = _uri;
        emit LaunchURIUpdate(
            _launchId,
            _uri
        );
    }

    /**
     *  @notice Update a round in a launch.
     *  @notice Update only before the round is scheduled.
     *
     *          Name            Description
     *  @param  _launchId       Launch identifier.
     *  @param  _index          Index of the round in the launch.
     *  @param  _round          New round configuration.
     *
     *  @return New round identifier.
     *
     *  @dev    Permission: Initiator of the launch.
     */
    function updateRound(
        uint256 _launchId,
        uint256 _index,
        PrestigePadRoundInput calldata _round
    ) external
    whenNotPaused
    validLaunch(_launchId)
    onlyInitiator(_launchId)
    returns (uint256) {
        PrestigePadLaunch storage launch = launches[_launchId];
        if (launch.isFinalized) {
            revert AlreadyFinalized();
        }

        if (_index >= launch.roundIds.length) {
            revert InvalidInput();
        }

        if (rounds[launch.roundIds[_index]].agenda.raiseStartsAt != 0) {
            revert InvalidUpdating();
        }

        /// @dev    Replace the round identifier at the index with a new round.
        uint256 roundId = _newRound(_launchId, _round);
        launch.roundIds[_index] = roundId;

        emit LaunchRoundUpdate(
            _launchId,
            roundId,
            _index
        );

        return roundId;
    }

    /**
     *  @notice Update multiple rounds in a launch by removing multiple rounds from the end and appending new ones.
     *  @notice Update only with rounds that are not scheduled.
     *
     *          Name                    Description
     *  @param  _launchId               Launch identifier.
     *  @param  _removedRoundNumber     Number of rounds to remove from the end.
     *  @param  _addedRounds            Array of new rounds.
     *
     *  @return Index of the last added round.
     *
     *  @dev    Permission: Initiator of the launch.
     */
    function updateRounds(
        uint256 _launchId,
        uint256 _removedRoundNumber,
        PrestigePadRoundInput[] calldata _addedRounds
    ) external
    whenNotPaused
    validLaunch(_launchId)
    onlyInitiator(_launchId)
    returns (uint256) {
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

        /// @dev    Remove rounds from the last backward.
        for (uint256 i; i < _removedRoundNumber; ++i) {
            roundIds.pop();
        }

        emit LaunchRoundsRemoval(
            _launchId,
            _removedRoundNumber,
            index
        );

        /// @dev    Append new rounds.
        for (uint256 i; i < _addedRounds.length; ++i) {
            /// @dev    Replace the round identifier at the index with a new one.
            uint256 roundId = _newRound(_launchId, _addedRounds[i]);
            roundIds.push(roundId);

            emit LaunchRoundAppendage(
                _launchId,
                roundId
            );
        }

        return index;
    }

    /**
     *  @notice Schedule the next round of a launch with cashback configuration.
     *  @notice Schedule only if the previous round has been confirmed.
     *
     *          Name                        Description
     *  @param  _launchId                   Launch identifier.
     *  @param  _cashbackThreshold          Minimum contributed quantity of an address to receive cashback.
     *  @param  _cashbackBaseRate           Fraction of contribution to cashback.
     *  @param  _cashbackCurrencies         Array of extra currency addresses to cashback.
     *  @param  _cashbackDenominations      Array of extra currency denominations to cashback, respective to each extra currency.
     *  @param  _raiseStartsAt              Raise start timestamp.
     *  @param  _raiseDuration              Raise duration.
     *
     *  @return Index of the scheduled round.
     *
     *  @dev    Permission: Initiator of the launch.
     */
    function scheduleNextRound(
        uint256 _launchId,
        uint256 _cashbackThreshold,
        uint256 _cashbackBaseRate,
        address[] calldata _cashbackCurrencies,
        uint256[] calldata _cashbackDenominations,
        uint40 _raiseStartsAt,
        uint40 _raiseDuration
    ) external
    whenNotPaused
    nonReentrant
    validLaunch(_launchId)
    onlyInitiator(_launchId)
    returns (uint256) {
        if (_cashbackBaseRate > CommonConstant.RATE_MAX_SUBUNIT
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
            revert InvalidScheduling();
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
            /// @dev    Open a cashback fund.
            cashbackFundId = IReserveVault(reserveVault).openFund(
                currency,
                feeDenomination
                    .scale(_cashbackBaseRate, CommonConstant.RATE_MAX_SUBUNIT),
                _cashbackCurrencies,
                _cashbackDenominations
            );
        }
        round.quote.cashbackThreshold = _cashbackThreshold;
        round.quote.cashbackFundId = cashbackFundId;

        round.agenda.raiseStartsAt = _raiseStartsAt;
        round.agenda.raiseEndsAt = _raiseStartsAt + _raiseDuration;

        emit LaunchNextRoundSchedule(
            _launchId,
            roundId,
            cashbackFundId,
            _raiseStartsAt,
            _raiseDuration
        );

        return currentIndex;
    }

    /**ones
     *  @notice Cancel the current round of a launch.
     *  @notice Cancel only before the current round is confirmed.
     *
     *          Name                        Description
     *  @param  _launchId                   Launch identifier.
     *
     *  @return Index of the cancelled round.
     *  @return New round identifier at the index.
     *
     *  @dev    Permission: Initiator of the launch.
     */
    function cancelCurrentRound(
        uint256 _launchId
    ) external
    whenNotPaused
    validLaunch(_launchId)
    onlyInitiator(_launchId)
    returns (uint256, uint256) {
        PrestigePadLaunch storage launch = launches[_launchId];
        if (launch.isFinalized) {
            revert AlreadyFinalized();
        }

        uint256 currentIndex = launch.currentIndex;
        PrestigePadRound storage round = rounds[launch.roundIds[currentIndex]];
        if (round.agenda.confirmAt != 0) {
            revert AlreadyConfirmed();
        }

        /// @dev    Duplicate the configuration of the cancelled round into a new one.
        uint256 roundId = ++roundNumber;
        PrestigePadRound storage newRound = rounds[roundId];
        newRound.uri = round.uri;
        newRound.quota.totalQuantity = round.quota.totalQuantity;
        newRound.quota.minRaisingQuantity = round.quota.minRaisingQuantity;
        newRound.quota.maxRaisingQuantity = round.quota.maxRaisingQuantity;
        newRound.quote.unitPrice = round.quote.unitPrice;
        newRound.quote.currency = round.quote.currency;

        /// @dev    Cancelled round: quota.totalQuantity = 0.
        round.quota.totalQuantity = 0;

        launch.currentIndex = currentIndex - 1;

        launch.roundIds[currentIndex] = roundId;

        emit LaunchCurrentRoundCancellation(
            _launchId,
            roundId
        );

        return (currentIndex, roundId);
    }

    /**
     *  @notice Confirm the current round of a launch and mint tokens to contributors.
     *  @notice Confirm only if the round has raised at least minimum quantity (even if the sale period has not yet ended) and
     *          before the confirmation time limit has expired.
     *  @notice The message sender must provide sufficient extra-currency amounts for the cashback fund.
     *
     *          Name                        Description
     *  @param  _launchId                   Launch identifier.
     *  @param  _anchor                     Keccak256 hash of `uri` of the launch.
     *
     *  @return Index of the confirmed round.
     *
     *  @dev    Permission: Initiator of the launch.
     *  @dev    Anchor enforces consistency between this contract and the client-side.
     */
    function safeConfirmCurrentRound(
        uint256 _launchId,
        bytes32 _anchor
    ) external payable
    whenNotPaused
    nonReentrant
    validLaunch(_launchId)
    onlyInitiator(_launchId)
    returns (uint256) {
        PrestigePadLaunch storage launch = launches[_launchId];
        if (_anchor != keccak256(bytes(launch.uri))) {
            revert BadAnchor();
        }

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

        /// @dev    If confirming before the anticipated due, `raiseEndsAt` must be overwrite with the current timestamp.
        if (raiseEndsAt > block.timestamp) {
            round.agenda.raiseEndsAt = uint40(block.timestamp);
        }
        /// @dev    Confirmed round:  agenda.confirmAt > 0
        round.agenda.confirmAt = uint40(block.timestamp);

        IProjectToken projectTokenContract = IProjectToken(projectToken);
        /// @dev    Scale with token decimals.
        uint256 unit = 10 ** projectTokenContract.decimals();
        projectTokenContract.mint(
            launch.projectId,
            round.quota.totalQuantity * unit
        );

        /// @dev    Transfer remain tokens to the initiator.
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
        /// @dev    Transfer total contribution minus fee to the requester.
        CurrencyHandler.sendCurrency(
            currency,
            initiator,
            value - fee
        );

        /// @dev    Provide the cashback fund sufficiently.
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

    /**
     *  @notice Finalize a launch to finish capital raising.
     *  @notice Finalize only when all rounds are confirmed.
     *
     *          Name                        Description
     *  @param  _launchId                   Launch identifier.
     *  @param  _anchor                     Keccak256 hash of `uri` of the launch.
     *
     *  @dev    Permission: Initiator of the launch.
     *  @dev    The launch can only be finalized after all rounds are confirmed, and no further rounds can be created.
     *  @dev    Anchor enforces consistency between this contract and the client-side.
     */
    function safeFinalize(
        uint256 _launchId,
        bytes32 _anchor
    ) external
    whenNotPaused
    validLaunch(_launchId)
    onlyInitiator(_launchId) {
        PrestigePadLaunch storage launch = launches[_launchId];
        if (_anchor != keccak256(bytes(launch.uri))) {
            revert BadAnchor();
        }

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


    /**
     *  @notice Contribute to the current round of a launch.
     *  @notice Contribute only during raise period.
     *
     *          Name        Description
     *  @param  _launchId   Launch identifier.
     *  @param  _quantity   Contributed quantity.
     *
     *  @return Contributed value.
     */
    function contributeCurrentRound(
        uint256 _launchId,
        uint256 _quantity
    ) external payable
    whenNotPaused
    validLaunch(_launchId)
    returns (uint256) {
        return _contributeCurrentRound(_launchId, _quantity);
    }

    /**
     *  @notice Contribute to the current round of a launch with anchor verification.
     *  @notice Contribute only during raise period.
     *
     *          Name        Description
     *  @param  _launchId   Launch identifier.
     *  @param  _quantity   Contributed quantity.
     *  @param  _anchor     Keccak256 hash of `uri` of the launch.
     *
     *  @return Contributed value.
     *
     *  @dev    Anchor enforces consistency between this contract and the client-side.
     */
    function safeContributeCurrentRound(
        uint256 _launchId,
        uint256 _quantity,
        bytes32 _anchor
    ) external payable
    whenNotPaused
    validLaunch(_launchId)
    returns (uint256) {
        if (_anchor != keccak256(bytes(launches[_launchId].uri))) {
            revert BadAnchor();
        }

        return _contributeCurrentRound(_launchId, _quantity);
    }

    /**
     *  @notice Withdraw contribution of the message sender from a round which can no longer be confirmed.
     *  @notice Withdraw only when the round is cancelled or the raise ends without enough raised quantity or the confirmation
     *          time limit has expired.
     *
     *          Name        Description
     *  @param  _roundId    Round identifier.
     *
     *  @return Withdrawn value.
     */
    function withdrawContribution(
        uint256 _roundId
    ) external
    whenNotPaused
    nonReentrant
    validRound(_roundId)
    returns (uint256) {
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

        CurrencyHandler.sendCurrency(
            currency,
            msg.sender,
            value
        );

        emit ContributionWithdrawal(
            _roundId,
            msg.sender,
            quantity,
            value
        );

        return value;
    }

    /**
     *  @notice Withdraw the allocation of the message sender from a round of a launch.
     *  @notice Withdraw only after the round is confirmed.
     *  @notice Also receive corresponding cashback.
     *
     *          Name            Description
     *  @param  _launchId       Launch identifier.
     *  @param  _index          Index of the round in the launch.
     *
     *  @return Withdrawn amount.
     */
    function withdrawProjectToken(
        uint256 _launchId,
        uint256 _index
    ) external
    whenNotPaused
    nonReentrant
    validLaunch(_launchId)
    returns (uint256) {
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


    /* --- Helper --- */
    /**
     *  @notice Create a new round.
     *
     *          Name        Description
     *  @param  _launchId   Launch identifier.
     *  @param  _round      Round input.
     *
     *  @return New round identifier.
     */
    function _newRound(
        uint256 _launchId,
        PrestigePadRoundInput calldata _round
    ) internal returns (uint256) {
        _validate(
            abi.encode(
                _launchId,
                _round.uri
            ),
            _round.validation
        );

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

    /**
     *  @notice Contribute to the current round of a launch.
     *
     *          Name        Description
     *  @param  _launchId   Launch identifier.
     *  @param  _quantity   Contributed quantity.
     *
     *  @return Contributed value.
     */
    function _contributeCurrentRound(
        uint256 _launchId,
        uint256 _quantity
    ) internal
    nonReentrant
    returns (uint256) {
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
        CurrencyHandler.receiveCurrency(
            round.quote.currency,
            value
        );

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

    /**
     *  @notice Provide cashback fund in the main currency, using a sufficient portion of the tokenization fee and in other
     *          extras, using amounts forwarded from the message sender.
     *
     *          Name                Description
     *  @param  _cashbackFundId     Cashback fund identifier.
     *
     *  @return Main currency cashback value.
     */
    function _provideCashbackFund(
        uint256 _cashbackFundId
    ) internal returns (uint256) {
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
                        CurrencyHandler.receiveERC20(
                            fund.extraCurrencies[i],
                            fund.extraDenominations[i] * fund.quantity
                        );
                        CurrencyHandler.allowERC20(
                            fund.extraCurrencies[i],
                            reserveVaultAddress,
                            fund.extraDenominations[i] * fund.quantity
                        );
                    }
                }

                CurrencyHandler.receiveNative(totalNative);

                if (fund.mainDenomination != 0) {
                    cashbackBaseAmount = fund.mainDenomination * fund.quantity;
                    if (fund.mainCurrency == address(0)) {
                        totalNative += cashbackBaseAmount;
                    } else {
                        CurrencyHandler.allowERC20(fund.mainCurrency, reserveVaultAddress, cashbackBaseAmount);
                    }
                }
            }

            IReserveVault(reserveVaultAddress).provideFund{value: totalNative}(_cashbackFundId);
        } else {
            CurrencyHandler.receiveNative(0);
        }
        return cashbackBaseAmount;
    }
}
