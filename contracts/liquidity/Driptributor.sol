// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @openzeppelin/contracts-upgradeable/
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

/// contracts/common/interfaces/
import {IAdmin} from "../common/interfaces/IAdmin.sol";

/// contracts/common/utilities/
import {CurrencyHandler} from "../common/utilities/CurrencyHandler.sol";
import {Formula} from "../common/utilities/Formula.sol";
import {Pausable} from "../common/utilities/Pausable.sol";

/// contracts/liquidity/interfaces/
import {IStakeToken} from "./interfaces/IStakeToken.sol";

/// contracts/liquidity/storages/
import {DriptributorStorage} from "./storages/DriptributorStorage.sol";

/**
 *  @author Briky Team
 *
 *  @notice The `Driptributor` contract manages token distribution with vesting schedules, allowing receivers to
 *          withdraw vested tokens gradually or stake them directly into stake token contracts for enhanced benefits.
 *
 *  @dev    The contract creates distributions with specified total amounts, receivers, and vesting durations.
 *          Each distribution has a unique identifier and tracks the withdrawn amount and staking status.
 *          Receivers can withdraw vested tokens based on time progression or stake their entire remaining
 *          allocation across multiple stake token contracts.
 *  @dev    Distributions support flexible staking where receivers can choose how to allocate their tokens
 *          between different stake token contracts, with any remaining amount automatically assigned to
 *          the third stake token contract.
 *  @dev    The contract maintains a total allocation limit to ensure distributed amounts do not exceed
 *          the available token supply. Administrative operations are required to create new distributions.
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 */
contract Driptributor is
DriptributorStorage,
Pausable,
ReentrancyGuardUpgradeable {
    /** ===== LIBRARY ===== **/
    using Formula for uint256;


    /** ===== CONSTANT ===== **/
    string constant private VERSION = "v1.2.1";


    /** ===== FUNCTION ===== **/
    /* --- Standard --- */
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
     *  @notice Invoked for initialization after deployment, serving as the contract constructor.
     *
     *          Name                Description
     *  @param  _admin              Admin contract address.
     *  @param  _primaryToken       Primary token contract address.
     *  @param  _totalAllocation    Total allocation limit for token distributions.
     */
    function initialize(
        address _admin,
        address _primaryToken,
        uint256 _totalAllocation
    ) external
    initializer {
        /// Initializer
        __Pausable_init();
        __ReentrancyGuard_init();

        /// Dependency
        admin = _admin;
        primaryToken = _primaryToken;

        /// Configuration
        totalAllocation = _totalAllocation;
    }


    /* --- Administration --- */

    /**
     *  @notice Update stake token contract addresses.
     *
     *          Name            Description
     *  @param  _stakeToken1    New stake token #1 contract address.
     *  @param  _stakeToken2    New stake token #2 contract address.
     *  @param  _stakeToken3    New stake token #3 contract address.
     *  @param  _signatures     Array of admin signatures.
     * 
     *  @dev    Administrative configuration.
     */
    function updateStakeTokens(
        address _stakeToken1,
        address _stakeToken2,
        address _stakeToken3,
        bytes[] calldata _signatures
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "updateStakeTokens",
                _stakeToken1,
                _stakeToken2,
                _stakeToken3
            ),
            _signatures
        );

        if (_stakeToken1 == address(0) || _stakeToken2 == address(0) || _stakeToken3 == address(0)
            || stakeToken1 != address(0) || stakeToken2 != address(0) || stakeToken3 != address(0)) {
            revert InvalidUpdating();
        }

        stakeToken1 = _stakeToken1;
        stakeToken2 = _stakeToken2;
        stakeToken3 = _stakeToken3;
        emit StakeTokensUpdate(
            _stakeToken1,
            _stakeToken2,
            _stakeToken3
        );
    }

    /**
     *  @notice Distribute tokens to multiple receivers with vesting duration.
     *
     *          Name                Description
     *  @param  _receivers          Array of receiver addresses, respectively to each distribution.
     *  @param  _amounts            Array of distributed amounts, respectively to each distribution.
     *  @param  _vestingDuration    Array of vesting durations, respectively to each distribution.
     *  @param  _data               Array of notes, respectively to each distribution.
     *  @param  _signatures         Array of admin signatures.
     * 
     *  @dev    Administrative operation.
     */
    function distributeTokensWithDuration(
        address[] calldata _receivers,
        uint256[] calldata _amounts,
        uint40[] calldata _vestingDuration,
        string[] calldata _data,
        bytes[] calldata _signatures
    ) external
    nonReentrant {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "distributeTokensWithDuration",
                _receivers,
                _amounts,
                _vestingDuration,
                _data
            ),
            _signatures
        );
        if (_receivers.length != _amounts.length
            || _receivers.length != _vestingDuration.length
            || _receivers.length != _data.length) {
            revert InvalidInput();
        }

        for (uint256 i; i < _receivers.length; ++i) {
            if (distributedAmount + _amounts[i] > totalAllocation) {
                revert InsufficientFunds();
            }
            unchecked {
                distributedAmount += _amounts[i];
                uint256 distributionId = ++distributionNumber;
                distributions[distributionId] = Distribution(
                    _amounts[i],
                    0,
                    _receivers[i],
                    uint40(block.timestamp),
                    _vestingDuration[i],
                    false
                );

                emit NewDistribution(
                    distributionId,
                    _receivers[i],
                    uint40(block.timestamp),
                    _vestingDuration[i],
                    _amounts[i],
                    _data[i]
                );
            }
        }
    }

    /**
     *  @notice Distribute tokens to multiple receivers with vesting end timestamp.
     *
     *          Name            Description
     *  @param  _receivers      Array of receiver addresses, respectively to each distribution.
     *  @param  _amounts        Array of distributed amounts, respectively to each distribution.
     *  @param  _endAts         Array of vesting end timestamps, respectively to each distribution.
     *  @param  _data           Array of notes, respectively to each distribution.
     *  @param  _signatures     Array of admin signatures.
     * 
     *  @dev    Administrative operation.
     */
    function distributeTokensWithTimestamp(
        address[] calldata _receivers,
        uint256[] calldata _amounts,
        uint40[] calldata _endAts,
        string[] calldata _data,
        bytes[] calldata _signatures
    ) external
    nonReentrant {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "distributeTokensWithTimestamp",
                _receivers,
                _amounts,
                _endAts,
                _data
            ),
            _signatures
        );
        if (_receivers.length != _amounts.length
            || _receivers.length != _endAts.length
            || _receivers.length != _data.length) {
            revert InvalidInput();
        }

        for (uint256 i; i < _receivers.length; ++i) {
            if (distributedAmount + _amounts[i] > totalAllocation) {
                revert InsufficientFunds();
            }
            if (_endAts[i] <= block.timestamp) {
                revert InvalidTimestamp();
            }
            unchecked {
                distributedAmount += _amounts[i];
                uint256 distributionId = ++distributionNumber;
                distributions[distributionId] = Distribution(
                    _amounts[i],
                    0,
                    _receivers[i],
                    uint40(block.timestamp),
                    _endAts[i] - uint40(block.timestamp),
                    false
                );

                emit NewDistribution(
                    distributionId,
                    _receivers[i],
                    uint40(block.timestamp),
                    _endAts[i] - uint40(block.timestamp),
                    _amounts[i],
                    _data[i]
                );
            }
        }
    }


    /* --- Query --- */
    /**
     *          Name            Description
     *  @param  _distributionId Distribution identifier to query.
     *
     *  @return distribution    Distribution information including total amount, withdrawn amount, receiver address,
     *                          distribution timestamp, vesting duration, and staking status.
     */
    function getDistribution(
        uint256 _distributionId
    ) public view returns (Distribution memory) {
        if (_distributionId == 0 || _distributionId > distributionNumber) {
            revert InvalidDistributionId();
        }
        return distributions[_distributionId];
    }


    /* --- Command --- */
    /**
     *  @notice Withdraw vested tokens from multiple distributions.
     *
     *          Name                Description
     *  @param  _distributionIds    Array of distribution identifiers to withdraw from.
     *
     *  @return totalAmount         Total amount of tokens withdrawn from all distributions.
     *
     *  @dev    Only vested tokens based on time progression can be withdrawn.
     *  @dev    Distributions must not have been staked and must belong to the caller.
     *  @dev    Vesting is calculated based on the time elapsed since distribution start and vesting duration.
     */
    function withdraw(
        uint256[] calldata _distributionIds
    ) external
    whenNotPaused
    nonReentrant
    returns (uint256) {
        uint256 totalAmount;
        uint256 n = distributionNumber;
        for (uint256 i; i < _distributionIds.length; ++i) {
            if (_distributionIds[i] == 0 || _distributionIds[i] > n) {
                revert InvalidDistributionId();
            }

            Distribution storage distribution = distributions[_distributionIds[i]];
            if (distribution.receiver != msg.sender) {
                revert Unauthorized();
            }
            if (distribution.isStaked) {
                revert AlreadyStaked();
            }

            uint256 distributeAt = distribution.distributeAt;
            uint256 vestedAmount = distributeAt + distribution.vestingDuration <= block.timestamp
                ? distribution.totalAmount
                : distribution.totalAmount.scale(
                    block.timestamp - uint256(distributeAt),
                    distribution.vestingDuration
                );

            uint256 amount = vestedAmount - distribution.withdrawnAmount;
            distribution.withdrawnAmount = vestedAmount;
            totalAmount += amount;

            emit Withdrawal(_distributionIds[i], amount);
        }

        CurrencyHandler.sendERC20(primaryToken,msg.sender, totalAmount);

        return totalAmount;
    }

    /**
     *  @notice Stake tokens from multiple distributions across stake token contracts.
     *
     *          Name                Description
     *  @param  _distributionIds    Array of distribution identifiers to stake from.
     *  @param  _stake1             Amount to stake in stake token #1.
     *  @param  _stake2             Amount to stake in stake token #2.
     *
     *  @return stake3              Amount automatically staked in stake token #3 (remaining allocation).
     *
     *  @dev    The remaining allocation after stake1 and stake2 is automatically staked in stake token #3.
     *  @dev    Distributions must not have been previously staked and must belong to the caller.
     *  @dev    Total available amount is the sum of (totalAmount - withdrawnAmount) for all specified distributions.
     */
    function stake(
        uint256[] calldata _distributionIds,
        uint256 _stake1,
        uint256 _stake2
    ) external
    whenNotPaused
    nonReentrant
    returns (uint256) {
        if (stakeToken1 == address(0) || stakeToken2 == address(0) || stakeToken3 == address(0)) {
            revert NotAssignedStakeTokens();
        }

        uint256 remain;
        uint256 n = distributionNumber;
        for (uint256 i; i < _distributionIds.length; ++i) {
            if (_distributionIds[i] == 0 || _distributionIds[i] > n) {
                revert InvalidDistributionId();
            }

            Distribution storage distribution = distributions[_distributionIds[i]];
            if (distribution.receiver != msg.sender) {
                revert Unauthorized();
            }
            if (distribution.isStaked) {
                revert AlreadyStaked();
            }

            distribution.isStaked = true;

            remain += distribution.totalAmount - distribution.withdrawnAmount;
        }

        if (remain < _stake1 + _stake2) {
            revert InsufficientFunds();
        }

        unchecked {
            uint256 stake3 = remain - _stake1 - _stake2;

            address primaryTokenAddress = primaryToken;
            address stakeToken1Address = stakeToken1;
            address stakeToken2Address = stakeToken2;
            address stakeToken3Address = stakeToken3;

            CurrencyHandler.allowERC20(primaryTokenAddress, stakeToken1Address, _stake1);
            CurrencyHandler.allowERC20(primaryTokenAddress, stakeToken2Address, _stake2);
            CurrencyHandler.allowERC20(primaryTokenAddress, stakeToken3Address, stake3);

            IStakeToken(stakeToken1Address).stake(msg.sender, _stake1);
            IStakeToken(stakeToken2Address).stake(msg.sender, _stake2);
            IStakeToken(stakeToken3Address).stake(msg.sender, stake3);

            emit Stake(
                _distributionIds,
                _stake1,
                _stake2,
                stake3
            );

            return stake3;
        }
    }
}
