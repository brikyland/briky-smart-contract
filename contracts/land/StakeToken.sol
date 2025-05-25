// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import {Constant} from "../lib/Constant.sol";
import {FixedMath} from "../lib/FixedMath.sol";
import {Formula} from "../lib/Formula.sol";

import {IAdmin} from "../common/interfaces/IAdmin.sol";

import {IPrimaryToken} from "./interfaces/IPrimaryToken.sol";
import {IStakeToken} from "./interfaces/IStakeToken.sol";

import {StakeTokenStorage} from "./storages/StakeTokenStorage.sol";

contract StakeToken is
StakeTokenStorage,
PausableUpgradeable,
ReentrancyGuardUpgradeable {
    using FixedMath for uint256;
    using Formula for uint256;
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
        primaryToken = _primaryToken;

        name = _name;
        symbol = _symbol;

        interestAccumulation = FixedMath.ONE;
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

    function initializeRewarding(
        uint256 _initialLastRewardFetch,
        uint256 _withdrawalUnlockedAt,
        address _successor,
        bytes[] calldata _signatures
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "initializeRewarding",
                _initialLastRewardFetch,
                _withdrawalUnlockedAt,
                _successor
            ),
            _signatures
        );

        if (lastRewardFetch != 0) {
            revert AlreadyStartedRewarding();
        }

        lastRewardFetch = _initialLastRewardFetch;
        withdrawalUnlockedAt = _withdrawalUnlockedAt;
        successor = _successor;
    }

    function decimals() external view returns (uint8) {
        return IPrimaryToken(primaryToken).decimals();
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

            uint256 reward = IPrimaryToken(primaryToken).mintForStake();

            interestAccumulation = _newInterestAccumulation(
                interestAccumulation,
                reward,
                totalSupply
            );

            totalSupply += reward;
            lastRewardFetch = block.timestamp;

            emit RewardFetch(reward);
        }
    }

    function stake(address _account, uint256 _value) external nonReentrant whenNotPaused {
        IPrimaryToken(primaryToken).safeTransferFrom(msg.sender, address(this), _value);

        unchecked {
            totalSupply += _value;
        }
        weights[_account] = weights[_account]
            .add(_tokenToWeight(_value, interestAccumulation));

        emit Stake(_account, _value);
    }

    function unstake(uint256 _value) external nonReentrant whenNotPaused {
        if (block.timestamp < withdrawalUnlockedAt) {
            revert NotUnlockedWithdrawing();
        }

        if (_value > balanceOf(msg.sender)) {
            revert InsufficientFunds();
        }

        unchecked {
            totalSupply -= _value;
        }
        weights[msg.sender] = weights[msg.sender]
            .sub(_tokenToWeight(_value, interestAccumulation));

        IPrimaryToken(primaryToken).safeTransfer(msg.sender, _value);

        emit Unstake(msg.sender, _value);
    }

    function promote(uint256 _value) external nonReentrant whenNotPaused {
        IStakeToken successorContract = IStakeToken(successor);
        if (address(successorContract) == address(0)) {
            revert NoSuccessor();
        }

        if (_value > balanceOf(msg.sender)) {
            revert InsufficientFunds();
        }

        unchecked {
            totalSupply -= _value;
        }
        weights[msg.sender] = weights[msg.sender]
            .sub(_tokenToWeight(_value, interestAccumulation));

        successorContract.stake(msg.sender, _value);

        emit Promotion(msg.sender, _value);
    }

    function balanceOf(address _account) public view returns (uint256) {
        return _weightToToken(weights[_account], interestAccumulation);
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

    function exclusiveDiscount() external view returns (Rate memory rate) {
        IPrimaryToken primaryTokenContract = IPrimaryToken(primaryToken);
        Rate memory primaryDiscount = primaryTokenContract.exclusiveDiscount();
        return Rate(
            primaryDiscount.value.scale(totalSupply, primaryTokenContract.totalStake()),
            primaryDiscount.decimals
        );
    }

    function _transfer(address _from, address _to, uint256 _amount) private whenNotPaused {
        require(_from != address(0), "ERC20: transfer from the zero address");
        require(_to != address(0), "ERC20: transfer to the zero address");

        uint256 weight = _tokenToWeight(_amount, interestAccumulation);
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

    function _newInterestAccumulation(
        uint256 _interestAccumulation,
        uint256 _reward,
        uint256 _totalSupply
    ) private pure returns (uint256) {
        return _interestAccumulation.mul(FixedMath.ONE.add(_reward.div(_totalSupply)));
    }

    function _tokenToWeight(uint256 _token, uint256 _accumulateInterestRate) private pure returns (uint256) {
        return _token.toFixed().div(_accumulateInterestRate);
    }

    function _weightToToken(uint256 _weight, uint256 _accumulateInterestRate) private pure returns (uint256) {
        return _weight.mul(_accumulateInterestRate).toUint();
    }
}
