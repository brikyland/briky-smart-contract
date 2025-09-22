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
 *  @notice Interface for contract `Driptributor`.
 *  @notice The `Driptributor` contract facilitates distribution of `PrimaryToken` through a continuous vesting mechanism.
 *  @notice Token allocations vest evenly on a per-second basis after distribution.
 *  @notice When the staking pools are opened, accounts that have unwithdrawn allocation can stake all their remain tokens.
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
     *  @param  _primaryToken       `PrimaryToken` contract address.
     *  @param  _totalAllocation    Total tokens to distribute.
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
     *  @notice Update staking pools contract.
     *
     *          Name            Description
     *  @param  _stakeToken1    `StakeToken` contract address #1.
     *  @param  _stakeToken2    `StakeToken` contract address #2.
     *  @param  _stakeToken3    `StakeToken` contract address #3.
     *  @param  _signatures     Array of admin signatures.
     *
     *  @dev    Administrative operator.
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
    }

    /**
     *  @notice Distribute tokens to multiple receivers with vesting duration.
     *
     *          Name                Description
     *  @param  _receivers          Array of receiver addresses, respective to each distribution.
     *  @param  _amounts            Array of distributed amounts, respective to each distribution.
     *  @param  _durations          Array of vesting durations, respective to each distribution.
     *  @param  _notes              Array of distribution notes, respective to each distribution.
     *  @param  _signatures         Array of admin signatures.
     * 
     *  @dev    Administrative operator.
     */
    function distributeTokensWithDuration(
        address[] calldata _receivers,
        uint256[] calldata _amounts,
        uint40[] calldata _durations,
        string[] calldata _notes,
        bytes[] calldata _signatures
    ) external
    nonReentrant {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "distributeTokensWithDuration",
                _receivers,
                _amounts,
                _durations,
                _notes
            ),
            _signatures
        );
        if (_receivers.length != _amounts.length
            || _receivers.length != _durations.length
            || _receivers.length != _notes.length) {
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
                    _durations[i],
                    false
                );

                emit NewDistribution(
                    distributionId,
                    _receivers[i],
                    uint40(block.timestamp),
                    _durations[i],
                    _amounts[i],
                    _notes[i]
                );
            }
        }
    }

    /**
     *  @notice Distribute tokens to multiple receivers with vesting end timestamp.
     *
     *          Name            Description
     *  @param  _receivers      Array of receiver addresses, respective to each distribution.
     *  @param  _amounts        Array of distributed amounts, respective to each distribution.
     *  @param  _endAts         Array of vesting end timestamps, respective to each distribution.
     *  @param  _notes          Array of distribution notes, respective to each distribution.
     *  @param  _signatures     Array of admin signatures.
     * 
     *  @dev    Administrative operator.
     */
    function distributeTokensWithTimestamp(
        address[] calldata _receivers,
        uint256[] calldata _amounts,
        uint40[] calldata _endAts,
        string[] calldata _notes,
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
                _notes
            ),
            _signatures
        );
        if (_receivers.length != _amounts.length
            || _receivers.length != _endAts.length
            || _receivers.length != _notes.length) {
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
                    _notes[i]
                );
            }
        }
    }


    /* --- Query --- */
    /**
     *          Name                Description
     *  @param  _distributionId     Distribution identifier.

     *  @return Distribution information.
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
     *  @param  _distributionIds    Array of distribution identifiers.
     *
     *  @return Total withdrawn amounts.
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

        CurrencyHandler.sendERC20(
            primaryToken,
            msg.sender,
            totalAmount
        );

        return totalAmount;
    }

    /**
     *  @notice Stake unwithdrawn tokens from multiple distributions to staking pools.
     *  @notice Stake only when staking pools are opened and assigned.
     *
     *          Name                Description
     *  @param  _distributionIds    Array of distribution identifiers.
     *  @param  _stake1             Staked amount for staking pool #1.
     *  @param  _stake2             Staked amount for staking pool #2.
     *
     *  @return Staked amount for staking pool #3, which also is the remain tokens.
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
