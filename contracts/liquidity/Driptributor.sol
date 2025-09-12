// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import {CurrencyHandler} from "../common/utilities/CurrencyHandler.sol";
import {Formula} from "../common/utilities/Formula.sol";

import {IAdmin} from "../common/interfaces/IAdmin.sol";

import {Pausable} from "../common/utilities/Pausable.sol";

import {IStakeToken} from "../liquidity/interfaces/IStakeToken.sol";

import {DriptributorStorage} from "../liquidity/storages/DriptributorStorage.sol";

contract Driptributor is
DriptributorStorage,
Pausable,
ReentrancyGuardUpgradeable {
    using Formula for uint256;

    string constant private VERSION = "v1.2.1";

    receive() external payable {}

    function initialize(
        address _admin,
        address _primaryToken,
        uint256 _totalAllocation
    ) external initializer {
        __Pausable_init();
        __ReentrancyGuard_init();

        admin = _admin;
        primaryToken = _primaryToken;

        totalAllocation = _totalAllocation;
    }

    function version() external pure returns (string memory) {
        return VERSION;
    }

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

    function getDistribution(uint256 _distributionId) public view returns (Distribution memory) {
        if (_distributionId == 0 || _distributionId > distributionNumber) {
            revert InvalidDistributionId();
        }
        return distributions[_distributionId];
    }

    function distributeTokensWithDuration(
        address[] calldata _receivers,
        uint256[] calldata _amounts,
        uint40[] calldata _vestingDuration,
        string[] calldata _data,
        bytes[] calldata _signatures
    ) external nonReentrant {
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

    function distributeTokensWithTimestamp(
        address[] calldata _receivers,
        uint256[] calldata _amounts,
        uint40[] calldata _endAts,
        string[] calldata _data,
        bytes[] calldata _signatures
    ) external nonReentrant {
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

    function withdraw(uint256[] calldata _distributionIds)
    external nonReentrant whenNotPaused returns (uint256) {
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

    function stake(
        uint256[] calldata _distributionIds,
        uint256 _stake1,
        uint256 _stake2
    ) external nonReentrant whenNotPaused returns (uint256) {
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
