// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import {MulDiv} from "../lib/MulDiv.sol";

import {IAdmin} from "../common/interfaces/IAdmin.sol";

import {IStakeToken} from "./interfaces/IStakeToken.sol";

import {DriptributorStorage} from "./storages/DriptributorStorage.sol";

contract Driptributor is
DriptributorStorage,
PausableUpgradeable,
ReentrancyGuardUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    string constant private VERSION = "v1.1.1";

    receive() external payable {}

    function initialize(
        address _admin,
        address _primaryToken,
        address _stakeToken,
        uint256 _totalAmount
    ) external initializer {
        __Pausable_init();
        __ReentrancyGuard_init();

        admin = _admin;
        primaryToken = _primaryToken;
        stakeToken = _stakeToken;
        totalAmount = _totalAmount;
    }

    function version() external pure returns (string memory) {
        return VERSION;
    }

    function pause(bytes[] calldata _signatures) external whenNotPaused {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(address(this), "pause"),
            _signatures
        );
        _pause();
    }

    function unpause(bytes[] calldata _signatures) external whenPaused {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(address(this), "unpause"),
            _signatures
        );
        _unpause();
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
        bytes[] calldata _signatures
    ) external nonReentrant {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "allocateTokensWithDuration",
                _receivers,
                _amounts,
                _vestingDuration
            ),
            _signatures
        );
        if (_receivers.length != _amounts.length
            || _receivers.length != _vestingDuration.length) {
            revert InvalidInput();
        }

        for (uint256 i = 0; i < _receivers.length; ++i) {
            if (_amounts[i] > totalAmount - distributedAmount) {
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
                    _amounts[i]
                );
            }
        }
    }

    function distributeTokensWithTimestamp(
        address[] calldata _receivers,
        uint256[] calldata _amounts,
        uint40[] calldata _endAts,
        bytes[] calldata _signatures
    ) external nonReentrant {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "allocateTokensWithDuration",
                _receivers,
                _amounts,
                _endAts
            ),
            _signatures
        );
        if (_receivers.length != _amounts.length
            || _receivers.length != _endAts.length) {
            revert InvalidInput();
        }

        for (uint256 i = 0; i < _receivers.length; ++i) {
            if (_amounts[i] + distributedAmount > totalAmount) {
                revert InsufficientFunds();
            }
            if (_endAts[i] <= block.timestamp) {
                revert InvalidInput();
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
                    _amounts[i]
                );
            }
        }
    }

    function withdraw(uint256[] calldata _distributionIds) external nonReentrant whenNotPaused {
        IERC20Upgradeable primaryTokenContract = IERC20Upgradeable(primaryToken);
        for (uint256 i = 0; i < _distributionIds.length; ++i) {
            Distribution memory distribution = getDistribution(_distributionIds[i]);
            if (distribution.receiver != msg.sender) {
                revert Unauthorized();
            }
            if (distribution.isStaked) {
                revert AlreadyStaked();
            }

            uint256 vestedAmount = distribution.distributeAt + distribution.vestingDuration <= block.timestamp
                ? distribution.totalAmount
                : MulDiv.mulDiv(
                    distribution.totalAmount,
                    block.timestamp - uint256(distribution.distributeAt),
                    distribution.vestingDuration
                );

            uint256 withdrawableAmount = vestedAmount - distribution.withdrawnAmount;
            distributions[_distributionIds[i]].withdrawnAmount = vestedAmount;
            primaryTokenContract.safeTransfer(distribution.receiver, withdrawableAmount);

            emit Withdrawal(_distributionIds[i], withdrawableAmount);
        }
    }

    function stake(uint256[] calldata _distributionIds) external nonReentrant whenNotPaused {
        IERC20Upgradeable primaryTokenContract = IERC20Upgradeable(primaryToken);
        IStakeToken stakeTokenContract = IStakeToken(stakeToken);
        for (uint256 i = 0; i < _distributionIds.length; ++i) {
            if (_distributionIds[i] == 0 || _distributionIds[i] > distributionNumber) {
                revert InvalidDistributionId();
            }
            Distribution memory distribution = distributions[_distributionIds[i]];
            if (distribution.receiver != msg.sender) {
                revert Unauthorized();
            }
            if (distribution.isStaked) {
                revert AlreadyStaked();
            }

            distribution.isStaked = true;
            uint256 amount = distribution.totalAmount - distribution.withdrawnAmount;
            primaryTokenContract.safeIncreaseAllowance(stakeToken, amount);
            stakeTokenContract.stake(distribution.receiver, amount);

            emit Stake(_distributionIds[i], amount);
        }
    }
}
