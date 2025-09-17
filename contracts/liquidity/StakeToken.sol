// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @openzeppelin/contracts-upgradeable/
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC20Upgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {ERC20PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import {ERC20PermitUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol";

/// contracts/common/constants/
import {CommonConstant} from "../common/constants/CommonConstant.sol";

/// contracts/common/interfaces/
import {IAdmin} from "../common/interfaces/IAdmin.sol";

/// contracts/common/utilities/
import {CurrencyHandler} from "../common/utilities/CurrencyHandler.sol";
import {FixedMath} from "../common/utilities/FixedMath.sol";
import {Formula} from "../common/utilities/Formula.sol";
import {Pausable} from "../common/utilities/Pausable.sol";

/// contracts/liquidity/constants/
import {PrimaryTokenConstant} from "./constants/PrimaryTokenConstant.sol";
import {StakeTokenConstant} from "./constants/StakeTokenConstant.sol";

/// contracts/liquidity/interfaces/
import {IPrimaryToken} from "./interfaces/IPrimaryToken.sol";
import {IStakeToken} from "./interfaces/IStakeToken.sol";
import {ITreasury} from "./interfaces/ITreasury.sol";

/// contracts/liquidity/storages/
import {StakeTokenStorage} from "./storages/StakeTokenStorage.sol";

/**
 *  @author Briky Team
 *
 *  @notice The `StakeToken` contract is an exclusive ERC-20 token that allows holders to stake primary tokens
 *          to earn rewards and participate in the ecosystem with enhanced benefits and discounts.
 *
 *  @dev    The contract manages staking of primary tokens with interest accumulation and reward distribution.
 *          Staked tokens earn rewards through periodic reward fetching from the primary token contract based
 *          on wave progression. Each stake token has different reward rates and culminating conditions.
 *  @dev    The token supports promotion functionality allowing holders to migrate their stake to successor
 *          stake token contracts for enhanced benefits. Unstaking is only available after reward distribution
 *          has been completed for the specific stake token.
 *  @dev    Staking fees may apply after reward distribution culmination to contribute liquidity to the treasury.
 *          The exclusive discount rate is calculated based on the stake proportion relative to global stakes.
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 */
contract StakeToken is
StakeTokenStorage,
ERC20PausableUpgradeable,
ERC20PermitUpgradeable,
Pausable,
ReentrancyGuardUpgradeable {
    /** ===== LIBRARY ===== **/
    using FixedMath for uint256;
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
     *          Name            Description
     *  @param  _admin          `Admin` contract address.
     *  @param  _primaryToken   `PrimaryToken` contract address.
     *  @param  _name           Token name.
     *  @param  _symbol         Token symbol.
     *  @param  _feeRate        Initial fee rate.
     */
    function initialize(
        address _admin,
        address _primaryToken,
        string calldata _name,
        string calldata _symbol,
        uint256 _feeRate
    ) external
    initializer {
        /// Initializer
        __ERC20_init(_name, _symbol);
        __ERC20Pausable_init();
        __ERC20Permit_init(_name);

        __ReentrancyGuard_init();

        /// Dependency
        admin = _admin;
        primaryToken = _primaryToken;

        /// Configuration
        interestAccumulation = FixedMath.ONE;

        feeRate = _feeRate;
        emit FeeRateUpdate(Rate(_feeRate, CommonConstant.RATE_DECIMALS));
    }


    /* --- Administration --- */

    /**
     *  @notice Initialize rewarding.
     *
     *          Name                        Description
     *  @param  _initialLastRewardFetch     Initial last reward fetch timestamp.
     *  @param  _successor                  Successor contract address.
     *  @param  _signatures                 Array of admin signatures.
     * 
     *  @dev    Administrative operator.
     */
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

    /**
     *  @notice Update the staking fee rate.
     *
     *          Name            Description
     *  @param  _feeRate        New staking fee rate.
     *  @param  _signatures     Array of admin signatures.
     * 
     *  @dev    Administrative operator.
     */
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
        if (_feeRate > CommonConstant.RATE_MAX_FRACTION) {
            revert InvalidRate();
        }
        feeRate = _feeRate;
        emit FeeRateUpdate(Rate(_feeRate, CommonConstant.RATE_DECIMALS));
    }


    /* --- Query --- */
    /**
     *          Name    Description
     *  @return rate    Current fee rate.
     */
    function getFeeRate() external view returns (Rate memory) {
        return Rate(feeRate, CommonConstant.RATE_DECIMALS);
    }


    /* --- Command --- */
    /**
     *  @notice Fetch reward tokens from the primary token contract based on wave progression.
     *
     *  @dev    Rewards are distributed to stakeholders based on their proportional stake weight.
     *  @dev    Reward fetching may be subject to cooldown periods and wave limitations.
     */
    function fetchReward() public
    whenNotPaused
    nonReentrant {
        unchecked {
            if (lastRewardFetch == 0) {
                revert NotStartedRewarding();
            }
            if (lastRewardFetch + StakeTokenConstant.REWARD_FETCH_COOLDOWN > block.timestamp) {
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

    /**
     *  @notice Stake primary tokens into this contract to receive stake tokens with interest accumulation.
     *
     *          Name        Description
     *  @param  _account    Account address that will receive the stake tokens.
     *  @param  _value      Amount of primary tokens to stake.
     *
     *  @dev    Staking fees may apply after reward distribution culmination.
     *  @dev    Staked tokens earn interest through reward distribution waves.
     */
    function stake(
        address _account,
        uint256 _value
    ) external
    whenNotPaused
    nonReentrant {
        address primaryTokenAddress = primaryToken;
        if (IPrimaryToken(primaryTokenAddress).isStakeRewardingCulminated()) {
            ITreasury treasuryContract = ITreasury(IPrimaryToken(primaryToken).treasury());
            uint256 fee = _stakingFee(
                treasuryContract.liquidity(),
                _value,
                IPrimaryToken(primaryTokenAddress).totalSupply(),
                feeRate
            );

            address currency = treasuryContract.currency();
            CurrencyHandler.receiveERC20(currency, fee);
            CurrencyHandler.allowERC20(currency, primaryTokenAddress, fee);
            IPrimaryToken(primaryTokenAddress).contributeLiquidityFromStakeToken(fee, address(this));
        }

        CurrencyHandler.receiveERC20(primaryTokenAddress, _value);

        unchecked {
            totalStake += _value;
        }
        weights[_account] = weights[_account]
            .add(_tokenToWeight(_value, interestAccumulation));

        emit Stake(_account, _value);
    }

    /**
     *  @notice Unstake tokens back to primary tokens with accumulated interest.
     *
     *          Name        Description
     *  @param  _value      Amount of stake tokens to unstake.
     *
     *  @dev    Unstaking is only available after reward distribution has been completed.
     *  @dev    The returned amount includes accumulated interest from rewards.
     */
    function unstake(
        uint256 _value
    ) external
    whenNotPaused
    nonReentrant {
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

    /**
     *  @notice Promote staked tokens to a successor stake token contract for enhanced benefits.
     *
     *          Name        Description
     *  @param  _value      Amount of tokens to promote to successor contract.
     *
     *  @dev    Promotion is only available before reward distribution culmination.
     *  @dev    A successor contract must be assigned for promotion to be possible.
     */
    function promote(
        uint256 _value
    ) external
    whenNotPaused
    nonReentrant {
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

    /**
     *          Name        Description
     *  @return totalStake  Total supply of stake tokens.
     */
    function totalSupply()
    public view override(IERC20Upgradeable, ERC20Upgradeable) returns (uint256) {
        return totalStake;
    }

    /**
     *          Name        Description
     *  @param  _account    Account address to query balance for.
     *  @return balance     Token balance of the account including accumulated interest.
     */
    function balanceOf(
        address _account
    ) public view override (IERC20Upgradeable, ERC20Upgradeable) returns (uint256) {
        return _weightToToken(weights[_account], interestAccumulation);
    }

    /**
     *          Name    Description
     *  @return rate    Exclusive discount rate based on stake proportion relative to global stakes.
     */
    function exclusiveDiscount() external view returns (Rate memory rate) {
        IPrimaryToken primaryTokenContract = IPrimaryToken(primaryToken);
        uint256 globalStake = primaryTokenContract.totalStake();

        Rate memory primaryDiscount = primaryTokenContract.exclusiveDiscount();
        return Rate(
            primaryDiscount.value
                .scale(globalStake - totalStake, globalStake << 1)
                .add(PrimaryTokenConstant.BASE_DISCOUNT),
            primaryDiscount.decimals
        );
    }

    
    /* --- Helper --- */
    /**
     *  @notice Transfer tokens between accounts with weight-based calculation.
     *
     *          Name        Description
     *  @param  _from       Source account address.
     *  @param  _to         Destination account address.
     *  @param  _amount     Amount of tokens to transfer.
     */
    function _transfer(
        address _from,
        address _to,
        uint256 _amount
    ) internal override {
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

    /**
     *  @notice Hook called before token transfers with pausable functionality.
     *
     *          Name        Description
     *  @param  _from       Source account address.
     *  @param  _to         Destination account address.
     *  @param  _amount     Amount of tokens being transferred.
     */
    function _beforeTokenTransfer(
        address _from,
        address _to,
        uint256 _amount
    ) internal override(ERC20Upgradeable, ERC20PausableUpgradeable) {
        super._beforeTokenTransfer(_from, _to, _amount);
    }

    /**
     *  @notice Calculate staking fee based on liquidity proportion and fee rate.
     *
     *          Name            Description
     *  @param  _liquidity      Current treasury liquidity.
     *  @param  _value          Staking value.
     *  @param  _totalSupply    Total primary token supply.
     *  @param  _feeRate        Fee rate.
     *
     *  @return fee             Calculated staking fee.
     */
    function _stakingFee(
        uint256 _liquidity,
        uint256 _value,
        uint256 _totalSupply,
        uint256 _feeRate
    ) internal pure returns (uint256) {
        return _liquidity
            .scale(_value, _totalSupply)
            .scale(_feeRate, CommonConstant.RATE_MAX_FRACTION);
    }

    /**
     *  @notice Calculate new interest accumulation after reward distribution.
     *
     *          Name                        Description
     *  @param  _interestAccumulation       Current interest accumulation rate.
     *  @param  _reward                     Reward amount distributed.
     *  @param  _totalSupply                Total supply before reward distribution.
     *
     *  @return newAccumulation             Updated interest accumulation rate.
     */
    function _newInterestAccumulation(
        uint256 _interestAccumulation,
        uint256 _reward,
        uint256 _totalSupply
    ) internal pure returns (uint256) {
        return _interestAccumulation.mul(FixedMath.ONE.add(_reward.div(_totalSupply)));
    }

    /**
     *  @notice Convert token amount to weight using current interest accumulation rate.
     *
     *          Name                        Description
     *  @param  _token                      Token amount to convert.
     *  @param  _accumulateInterestRate     Current interest accumulation rate.
     *
     *  @return weight                      Converted weight value.
     */
    function _tokenToWeight(
        uint256 _token,
        uint256 _accumulateInterestRate
    ) internal pure returns (uint256) {
        return _token.toFixed().div(_accumulateInterestRate);
    }

    /**
     *  @notice Convert weight to token amount using current interest accumulation rate.
     *
     *          Name                        Description
     *  @param  _weight                     Weight value to convert.
     *  @param  _accumulateInterestRate     Current interest accumulation rate.
     *
     *  @return token                       Converted token amount.
     */
    function _weightToToken(
        uint256 _weight,
        uint256 _accumulateInterestRate
    ) internal pure returns (uint256) {
        return _weight.mul(_accumulateInterestRate).toUint();
    }
}
