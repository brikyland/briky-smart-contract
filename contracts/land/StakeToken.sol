// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC20Upgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {ERC20PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import {ERC20PermitUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol";

import {CurrencyHandler} from "../lib/CurrencyHandler.sol";
import {FixedMath} from "../lib/FixedMath.sol";
import {Formula} from "../lib/Formula.sol";

import {CommonConstant} from "../common/constants/CommonConstant.sol";

import {IAdmin} from "../common/interfaces/IAdmin.sol";

import {Pausable} from "../common/utilities/Pausable.sol";

import {StakeTokenConstant} from "./constants/StakeTokenConstant.sol";

import {IPrimaryToken} from "./interfaces/IPrimaryToken.sol";
import {IStakeToken} from "./interfaces/IStakeToken.sol";
import {ITreasury} from "./interfaces/ITreasury.sol";

import {StakeTokenStorage} from "./storages/StakeTokenStorage.sol";
import {PrimaryTokenConstant} from "./constants/PrimaryTokenConstant.sol";

contract StakeToken is
StakeTokenStorage,
ERC20PausableUpgradeable,
ERC20PermitUpgradeable,
Pausable,
ReentrancyGuardUpgradeable {
    using FixedMath for uint256;
    using Formula for uint256;

    string constant private VERSION = "v1.1.1";

    receive() external payable {}

    function initialize(
        address _admin,
        address _primaryToken,
        string calldata _name,
        string calldata _symbol
    ) external initializer {
        __ERC20_init(_name, _symbol);
        __ERC20Pausable_init();
        __ERC20Permit_init(_name);

        __ReentrancyGuard_init();

        admin = _admin;
        primaryToken = _primaryToken;

        interestAccumulation = FixedMath.ONE;
    }

    function version() external pure returns (string memory) {
        return VERSION;
    }

    function initializeRewarding(
        uint256 _initialLastRewardFetch,
        address _successor,
        bytes[] calldata _signatures
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "initializeRewarding",
                _initialLastRewardFetch,
                _successor
            ),
            _signatures
        );

        if (lastRewardFetch != 0) {
            revert AlreadyStartedRewarding();
        }

        lastRewardFetch = _initialLastRewardFetch;
        successor = _successor;
    }

    function updateFeeRate(
        uint256 _feeRate,
        bytes[] calldata _signatures
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "updateFeeRate",
                _feeRate
            ),
            _signatures
        );
        if (_feeRate > CommonConstant.COMMON_RATE_MAX_FRACTION) {
            revert InvalidRate();
        }
        feeRate = _feeRate;
        emit FeeRateUpdate(_feeRate);
    }

    function getFeeRate() external view returns (Rate memory) {
        return Rate(feeRate, CommonConstant.COMMON_RATE_DECIMALS);
    }

    function fetchReward() public nonReentrant whenNotPaused {
        unchecked {
            if (lastRewardFetch == 0) {
                revert NotStartedRewarding();
            }
            if (lastRewardFetch + StakeTokenConstant.STAKE_TOKEN_REWARD_FETCH_COOLDOWN > block.timestamp) {
                revert OnCoolDown();
            }
            if (totalStake == 0) {
                revert NoStakeholder();
            }

            uint256 reward = IPrimaryToken(primaryToken).mintForStake();

            interestAccumulation = _newInterestAccumulation(
                interestAccumulation,
                reward,
                totalStake
            );

            totalStake += reward;
            lastRewardFetch = block.timestamp;

            emit RewardFetch(reward);
        }
    }

    function stake(address _account, uint256 _value) external nonReentrant whenNotPaused {
        address primaryTokenAddress = primaryToken;
        if (IPrimaryToken(primaryTokenAddress).isStakeRewardingCulminated()) {
            ITreasury treasuryContract = ITreasury(IPrimaryToken(primaryToken).treasury());
            uint256 feeAmount = _stakingFee(
                treasuryContract.liquidity(),
                _value,
                IPrimaryToken(primaryTokenAddress).totalSupply(),
                feeRate
            );

            address currency = treasuryContract.currency();
            CurrencyHandler.receiveERC20(currency, feeAmount);
            CurrencyHandler.allowERC20(currency, primaryTokenAddress, feeAmount);
            IPrimaryToken(primaryTokenAddress).contributeLiquidityFromStakeToken(feeAmount, address(this));
        }

        CurrencyHandler.receiveERC20(primaryTokenAddress, _value);

        unchecked {
            totalStake += _value;
        }
        weights[_account] = weights[_account]
            .add(_tokenToWeight(_value, interestAccumulation));

        emit Stake(_account, _value);
    }

    function unstake(uint256 _value) external nonReentrant whenNotPaused {
        address primaryTokenAddress = primaryToken;
        if (!IPrimaryToken(primaryTokenAddress).isStakeRewardingCulminated()) {
            revert NotCompletedRewarding();
        }

        if (_value > balanceOf(msg.sender)) {
            revert InsufficientFunds();
        }

        unchecked {
            totalStake -= _value;
        }
        weights[msg.sender] = weights[msg.sender]
            .sub(_tokenToWeight(_value, interestAccumulation));

        CurrencyHandler.sendERC20(primaryTokenAddress, msg.sender, _value);

        emit Unstake(msg.sender, _value);
    }

    function promote(uint256 _value) external nonReentrant whenNotPaused {
        address successorAddress = successor;
        if (successorAddress == address(0)) {
            revert NoSuccessor();
        }

        address primaryTokenAddress = primaryToken;
        if (IPrimaryToken(primaryTokenAddress).isStakeRewardingCulminated()) {
            revert InvalidPromoting();
        }

        if (_value > balanceOf(msg.sender)) {
            revert InsufficientFunds();
        }

        unchecked {
            totalStake -= _value;
        }
        weights[msg.sender] = weights[msg.sender]
            .sub(_tokenToWeight(_value, interestAccumulation));

        CurrencyHandler.allowERC20(primaryTokenAddress, successorAddress, _value);
        IStakeToken(successorAddress).stake(msg.sender, _value);

        emit Promotion(msg.sender, _value);
    }

    function totalSupply()
    public view override(IERC20Upgradeable, ERC20Upgradeable) returns (uint256) {
        return totalStake;
    }

    function balanceOf(address _account)
    public view override (IERC20Upgradeable, ERC20Upgradeable) returns (uint256) {
        return _weightToToken(weights[_account], interestAccumulation);
    }

    function exclusiveDiscount() external view returns (Rate memory rate) {
        IPrimaryToken primaryTokenContract = IPrimaryToken(primaryToken);
        uint256 globalStake = primaryTokenContract.totalStake();

        Rate memory primaryDiscount = primaryTokenContract.exclusiveDiscount();
        return Rate(
            primaryDiscount.value
                .scale(globalStake - totalStake, globalStake << 1)
                .add(PrimaryTokenConstant.PRIMARY_TOKEN_BASE_DISCOUNT),
            primaryDiscount.decimals
        );
    }

    function _transfer(address _from, address _to, uint256 _amount) internal override {
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

    function _beforeTokenTransfer(address _from, address _to, uint256 _amount)
    internal override(ERC20Upgradeable, ERC20PausableUpgradeable) {
        super._beforeTokenTransfer(_from, _to, _amount);
    }

    function _stakingFee(
        uint256 _liquidity,
        uint256 _value,
        uint256 _totalSupply,
        uint256 _feeRate
    ) internal pure returns (uint256) {
        return _liquidity
            .scale(_value, _totalSupply)
            .scale(_feeRate, CommonConstant.COMMON_RATE_MAX_FRACTION);
    }

    function _newInterestAccumulation(
        uint256 _interestAccumulation,
        uint256 _reward,
        uint256 _totalSupply
    ) internal pure returns (uint256) {
        return _interestAccumulation.mul(FixedMath.ONE.add(_reward.div(_totalSupply)));
    }

    function _tokenToWeight(uint256 _token, uint256 _accumulateInterestRate) internal pure returns (uint256) {
        return _token.toFixed().div(_accumulateInterestRate);
    }

    function _weightToToken(uint256 _weight, uint256 _accumulateInterestRate) internal pure returns (uint256) {
        return _weight.mul(_accumulateInterestRate).toUint();
    }
}
