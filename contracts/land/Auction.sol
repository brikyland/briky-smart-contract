// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC20Upgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import {Formula} from "../lib/Formula.sol";

import {IAdmin} from "../common/interfaces/IAdmin.sol";

import {IPrimaryToken} from "./interfaces/IPrimaryToken.sol";
import {IStakeToken} from "./interfaces/IStakeToken.sol";
import {ITreasury} from "./interfaces/ITreasury.sol";

import {AuctionStorage} from "./storages/AuctionStorage.sol";

contract Auction is
AuctionStorage,
PausableUpgradeable,
ReentrancyGuardUpgradeable {
    using Formula for uint256;
    using SafeERC20Upgradeable for IERC20Upgradeable;

    string constant private VERSION = "v1.1.1";

    receive() external payable {}

    function initialize(
        address _admin,
        address _primaryToken
    ) external initializer {
        __Pausable_init();
        __ReentrancyGuard_init();

        admin = _admin;
        primaryToken = _primaryToken;
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

    function startAuction(
        uint256 _endAt,
        uint256 _vestingDuration,
        bytes[] calldata _signatures
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "startAuction",
                _endAt,
                _vestingDuration
            ),
            _signatures
        );

        if (_endAt == 0) {
            revert InvalidInput();
        }
        if (endAt != 0) {
            revert Started();
        }

        totalToken = IERC20Upgradeable(primaryToken).balanceOf(address(this));

        endAt = _endAt;
        vestingDuration = _vestingDuration;
    }

    function deposit(uint256 _value) external nonReentrant whenNotPaused {
        if (endAt == 0) {
            revert NotStarted();
        }
        if (endAt <= block.timestamp) {
            revert Ended();
        }

        IERC20Upgradeable currencyContract = IERC20Upgradeable(ITreasury(IPrimaryToken(primaryToken).treasury()).currency());
        currencyContract.safeTransferFrom(msg.sender, address(this), _value);

        currencyContract.safeIncreaseAllowance(primaryToken, _value);
        IPrimaryToken(primaryToken).contributeLiquidityFromPublicSale(_value);

        unchecked {
            totalDeposit += _value;
            deposits[msg.sender] += _value;
        }

        emit Deposit(msg.sender, _value);
    }

    function allocationOf(address _account) public view returns (uint256) {
        return totalDeposit == 0
            ? 0
            : deposits[_account].scale(totalToken, totalDeposit);
    }

    function withdraw() external nonReentrant whenNotPaused {
        if (endAt == 0) {
            revert NotStarted();
        }
        if (endAt > block.timestamp) {
            revert NotEnded();
        }

        uint256 allocation = allocationOf(msg.sender);
        uint256 vestedAmount = endAt + vestingDuration <= block.timestamp
            ? allocation
            : allocation.scale(block.timestamp - endAt, vestingDuration);

        uint256 withdrawableAmount = vestedAmount - withdrawnAmount[msg.sender];
        IERC20Upgradeable(primaryToken).safeTransfer(msg.sender, withdrawableAmount);

        emit Withdrawal(msg.sender, withdrawableAmount);
    }

    function stake(uint256 _stake1, uint256 _stake2) external nonReentrant whenNotPaused {
        if (stakeToken1 == address(0) || stakeToken2 == address(0) || stakeToken3 == address(0)) {
            revert NotAssignedStakeTokens();
        }

        if (endAt == 0) {
            revert NotStarted();
        }
        if (endAt > block.timestamp) {
            revert NotEnded();
        }

        uint256 allocation = allocationOf(msg.sender);
        uint256 remain = allocation - withdrawnAmount[msg.sender];
        withdrawnAmount[msg.sender] = allocation;

        if (remain < _stake1 + _stake2) {
            revert InsufficientFunds();
        }

        uint256 stake3 = remain - _stake1 - _stake2;

        IERC20Upgradeable primaryTokenContract = IERC20Upgradeable(primaryToken);
        IStakeToken stakeToken1Contract = IStakeToken(stakeToken1);
        IStakeToken stakeToken2Contract = IStakeToken(stakeToken2);
        IStakeToken stakeToken3Contract = IStakeToken(stakeToken3);

        primaryTokenContract.safeIncreaseAllowance(address(stakeToken1Contract), _stake1);
        primaryTokenContract.safeIncreaseAllowance(address(stakeToken2Contract), _stake2);
        primaryTokenContract.safeIncreaseAllowance(address(stakeToken3Contract), stake3);

        stakeToken1Contract.stake(msg.sender, _stake1);
        stakeToken2Contract.stake(msg.sender, _stake2);
        stakeToken3Contract.stake(msg.sender, stake3);

        emit Stake(
            msg.sender,
            _stake1,
            _stake2,
            stake3
        );
    }
}
