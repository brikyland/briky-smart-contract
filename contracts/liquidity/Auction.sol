// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC20Upgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import {CurrencyHandler} from "../lib/CurrencyHandler.sol";
import {Formula} from "../lib/Formula.sol";

import {IAdmin} from "../common/interfaces/IAdmin.sol";

import {Pausable} from "../common/utilities/Pausable.sol";

import {IPrimaryToken} from "../liquidity/interfaces/IPrimaryToken.sol";
import {IStakeToken} from "../liquidity/interfaces/IStakeToken.sol";
import {ITreasury} from "../liquidity/interfaces/ITreasury.sol";

import {AuctionStorage} from "../liquidity/storages/AuctionStorage.sol";

contract Auction is
AuctionStorage,
Pausable,
ReentrancyGuardUpgradeable {
    using Formula for uint256;

    string constant private VERSION = "v1.2.1";

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

        if (endAt != 0) {
            revert AlreadyStarted();
        }

        if (_endAt <= block.timestamp) {
            revert InvalidTimestamp();
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
            revert AlreadyEnded();
        }

        address currency = ITreasury(IPrimaryToken(primaryToken).treasury()).currency();
        CurrencyHandler.receiveERC20(currency, _value);

        address primaryTokenAddress = primaryToken;
        CurrencyHandler.allowERC20(currency, primaryTokenAddress, _value);
        IPrimaryToken(primaryTokenAddress).contributeLiquidityFromPublicSale(_value);

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

    function withdraw() external nonReentrant whenNotPaused returns (uint256) {
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

        uint256 amount = vestedAmount - withdrawnAmount[msg.sender];
        withdrawnAmount[msg.sender] = vestedAmount;
        CurrencyHandler.sendERC20(primaryToken, msg.sender, amount);

        emit Withdrawal(msg.sender, amount);

        return amount;
    }

    function stake(uint256 _stake1, uint256 _stake2) external nonReentrant whenNotPaused returns (uint256) {
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
            msg.sender,
            _stake1,
            _stake2,
            stake3
        );

        return stake3;
    }
}
