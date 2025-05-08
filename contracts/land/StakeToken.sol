// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import {Constant} from "../lib/Constant.sol";
import {FixedMath} from "../lib/FixedMath.sol";
import {Formula} from "../lib/Formula.sol";
import {MulDiv} from "../lib/MulDiv.sol";

import {IAdmin} from "../common/interfaces/IAdmin.sol";

import {IPrimaryToken} from "./interfaces/IPrimaryToken.sol";

import {StakeTokenStorage} from "./storages/StakeTokenStorage.sol";

contract StakeToken is
StakeTokenStorage,
PausableUpgradeable,
ReentrancyGuardUpgradeable {
    using FixedMath for uint256;
    using SafeERC20Upgradeable for IPrimaryToken;

    string internal constant VERSION = "v1.1.1";

    receive() external payable {}

    function initialize(
        address _admin,
        address _primaryToken,
        string calldata _name,
        string calldata _symbol
    ) external initializer {
        __Pausable_init();
        __ReentrancyGuard_init();

        admin = _admin;
        name = _name;
        symbol = _symbol;
        primaryToken = _primaryToken;

        day = 1;
        interestAccumulation = FixedMath.toFixed(1);
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

    function startRewarding(uint256 _initialLastRewardFetch, bytes[] calldata _signatures) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "startRewarding",
                _initialLastRewardFetch
            ),
            _signatures
        );
        if (lastRewardFetch != 0) {
            revert AlreadyStartedRewarding();
        }
        lastRewardFetch = _initialLastRewardFetch;
    }

    function decimals() external view returns (uint8) {
        return IPrimaryToken(primaryToken).decimals();
    }

    function unstakingFeePercentage() public view returns (uint256) {
        return day > Constant.STAKE_TOKEN_UNSTAKING_FEE_ZEROING_DAYS
            ? 0
            : MulDiv.mulDiv(
                Constant.STAKE_TOKEN_UNSTAKING_FEE_ZEROING_DAYS - day + 1,
                Constant.STAKE_TOKEN_UNSTAKING_FEE_INITIAL_PERCENTAGE,
                Constant.STAKE_TOKEN_UNSTAKING_FEE_ZEROING_DAYS
            );
    }

    function fetchReward() public nonReentrant whenNotPaused {
        unchecked {
            if (lastRewardFetch == 0) {
                revert NotStartedRewarding();
            }
            if (lastRewardFetch + Constant.STAKE_TOKEN_DAY_LENGTH > block.timestamp) {
                revert OnCoolDown();
            }
            if (totalSupply == 0) {
                revert NoStakeholder();
            }

            uint256 dailyReward = IPrimaryToken(primaryToken).mintForStake();

            uint256 reward = dailyReward + returningFee;

            interestAccumulation = Formula.newInterestAccumulation(
                interestAccumulation,
                reward,
                totalSupply
            );

            totalSupply += reward;

            returningFee = 0;
            lastRewardFetch = block.timestamp;
            day++;

            emit RewardFetch(day, dailyReward, returningFee);
        }
    }

    function stake(address _account, uint256 _value) external nonReentrant whenNotPaused {
        IPrimaryToken(primaryToken).safeTransferFrom(msg.sender, address(this), _value);

        unchecked {
            weights[_account] = weights[_account]
                .add(Formula.tokenToWeight(_value, interestAccumulation));
            totalSupply += _value;
        }

        emit Stake(_account, _value);
    }

    function unstake(uint256 _value) external nonReentrant whenNotPaused returns (uint256) {
        if (_value > balanceOf(msg.sender)) {
            revert BalanceExceeded();
        }

        uint256 fee = MulDiv.mulDiv(
            _value,
            unstakingFeePercentage(),
            Constant.COMMON_PERCENTAGE_DENOMINATOR
        );

        unchecked {
            returningFee += fee;
            weights[msg.sender] = weights[msg.sender]
                .sub(Formula.tokenToWeight(_value, interestAccumulation));
            totalSupply -= _value;
        }

        IPrimaryToken(primaryToken).safeTransfer(msg.sender, _value - fee);

        emit Unstake(msg.sender, _value, fee);

        return _value - fee;
    }

    function balanceOf(address _account) public view returns (uint256) {
        return Formula.weightToToken(weights[_account], interestAccumulation);
    }

    function _transfer(address _from, address _to, uint256 _amount) private whenNotPaused {
        require(_from != address(0), "ERC20: transfer from the zero address");
        require(_to != address(0), "ERC20: transfer to the zero address");

        uint256 weight = Formula.tokenToWeight(_amount, interestAccumulation);
        require(weight <= weights[_from], "ERC20: transfer amount exceeds balance");
        unchecked {
            weights[_from] = weights[_from].sub(weight);
            weights[_to] = weights[_to].add(weight);
        }

        emit Transfer(_from, _to, _amount);
    }

    function _approve(address _owner, address _spender, uint256 _amount) private {
        require(_owner != address(0), "ERC20: approve from the zero address");
        require(_spender != address(0), "ERC20: approve to the zero address");

        allowance[_owner][_spender] = _amount;
        emit Approval(_owner, _spender, _amount);
    }

    function _spendAllowance(address _owner, address _spender, uint256 _amount) private {
        uint256 currentAllowance = allowance[_owner][_spender];
        if (currentAllowance != type(uint256).max) {
            require(currentAllowance >= _amount, "ERC20: insufficient allowance");
            unchecked {
                _approve(_owner, _spender, currentAllowance - _amount);
            }
        }
    }

    function transfer(address _to, uint256 _amount) external returns (bool) {
        _transfer(msg.sender, _to, _amount);
        return true;
    }

    function transferFrom(address _from, address _to, uint256 _amount) external returns (bool) {
        _spendAllowance(_from, msg.sender, _amount);
        _transfer(_from, _to, _amount);
        return true;
    }

    function approve(address _spender, uint256 _amount) external returns (bool) {
        _approve(msg.sender, _spender, _amount);
        return true;
    }

    function increaseAllowance(address _spender, uint256 _value) external returns (bool) {
        _approve(msg.sender, _spender, allowance[msg.sender][_spender] + _value);
        return true;
    }

    function decreaseAllowance(address _spender, uint256 _value) external returns (bool) {
        uint256 currentAllowance = allowance[msg.sender][_spender];
        require(currentAllowance >= _value, "ERC20: decreased allowance below zero");
        unchecked {
            _approve(msg.sender, _spender, currentAllowance - _value);
        }
        return true;
    }
}
