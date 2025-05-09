// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import {Constant} from "../lib/Constant.sol";
import {MulDiv} from "../lib/MulDiv.sol";

import {IAdmin} from "../common/interfaces/IAdmin.sol";

import {IPrimaryToken} from "./interfaces/IPrimaryToken.sol";
import {IStakeToken} from "./interfaces/IStakeToken.sol";
import {ITreasury} from "./interfaces/ITreasury.sol";

import {AuctionStorage} from "./storages/AuctionStorage.sol";

contract Auction is
AuctionStorage,
PausableUpgradeable,
ReentrancyGuardUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    string constant private VERSION = "v1.1.1";

    receive() external payable {}

    function initialize(
        address _admin,
        address _primaryToken,
        address _stakeToken
    ) external initializer {
        __Pausable_init();
        __ReentrancyGuard_init();

        admin = _admin;
        primaryToken = _primaryToken;
        stakeToken = _stakeToken;
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

    function evaluatedAllocationOf(address _account) public view returns (uint256) {
        return totalDeposit == 0
            ? 0
            : MulDiv.mulDiv(
                deposits[_account],
                totalToken,
                totalDeposit
            );
    }

    function withdraw() external nonReentrant whenNotPaused {
        if (endAt == 0) {
            revert NotStarted();
        }
        if (endAt > block.timestamp) {
            revert NotEnded();
        }

        uint256 tokenAmount = evaluatedAllocationOf(msg.sender);
        uint256 vestedAmount = endAt + vestingDuration <= block.timestamp
            ? tokenAmount
            : MulDiv.mulDiv(
                tokenAmount,
                block.timestamp - endAt,
                vestingDuration
            );

        uint256 withdrawableAmount = vestedAmount - withdrawnAmount[msg.sender];
        IERC20Upgradeable(primaryToken).safeTransfer(msg.sender, withdrawableAmount);

        emit Withdrawal(msg.sender, withdrawableAmount);
    }

    function stake() external nonReentrant whenNotPaused {
        if (endAt == 0) {
            revert NotStarted();
        }
        if (endAt > block.timestamp) {
            revert NotEnded();
        }

        uint256 tokenAmount = evaluatedAllocationOf(msg.sender);
        uint256 amount = tokenAmount - withdrawnAmount[msg.sender];
        withdrawnAmount[msg.sender] = tokenAmount;

        IERC20Upgradeable(primaryToken).safeIncreaseAllowance(stakeToken, amount);
        IStakeToken(stakeToken).stake(msg.sender, amount);

        emit Stake(msg.sender, amount);
    }
}
