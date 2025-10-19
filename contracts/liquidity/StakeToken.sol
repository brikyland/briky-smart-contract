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
 *  @notice Interface for contract `StakeToken`.
 *  @notice A `StakeToken` contract is an ERC-20 token representing a staking pool of `PrimaryToken` that accrues periodic
 *          rewards. For each staked primary token, an equivalent amount of derived stake token is minted as a placeholder
 *          balance, which increases as rewards are earned. Transferring stake tokens also transfers the underlying staked
 *          value of primary token. After culmination of the pool, unstaking allows stakers to redeem the exact amount of
 *          primary tokens.
 *  @notice There are 3 staking pools with different configurations:
 *          -   Staking pool #1: Culminates in wave  750, 2,000,000 tokens each wave.
 *          -   Staking pool #2: Culminates in wave 1500, 3,000,000 tokens each wave.
 *          -   Staking pool #3: Culminates in wave 2250, 4,000,000 tokens each wave.
 *  @notice Each rewarding wave has 1-day cooldown and the reward is distributed among stakers in proportion to their balances.
 *  @notice After all three staking pool have culminated, the staking pool #3 may still fetch new wave with the reward capped
 *          at the lesser between its standard wave reward and the remaining mintable tokens to reach the maximum supply cap.
 *  @notice Before a staking pool culminates, unstaking is prohibited, but stakers may promote their position into the
 *          successor staking pool. After culmination, unstaking is permitted while new staking incurs a fee that is
 *          contributed to the treasury liquidity.
 *  @notice Exclusive Discount: `15% + primaryDiscount * (globalStake - totalSupply) / (2 * globalStake)`.
 *          Note:   `primaryDiscount` is the exclusive discount of the primary token.
 *                  `globalStake` is the total tokens staked in 3 pools.
 *  @notice Staking fee after culmination: `value / totalSupply * treasuryLiquidity * feeRate`.
 *          Note:   `value` is the staking value that derives fee.
 *                  `treasuryLiquidity` is the liquidity reserved in the treasury.
 *                  `feeRate` is an admin-adjustable subunitary value.
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
     *          Name            Description
     *  @param  _admin          `Admin` contract address.
     *  @param  _primaryToken   `PrimaryToken` contract address.
     *  @param  _name           Token name.
     *  @param  _symbol         Token symbol.
     *  @param  _feeRate        Staking fee rate.
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
        emit FeeRateUpdate(Rate(
            _feeRate,
            CommonConstant.RATE_DECIMALS
        ));
    }


    /* --- Administration --- */
    /**
     *  @notice Initialize rewarding.
     *
     *          Name                        Description
     *  @param  _initialLastRewardFetch     Last reward fetch timestamp.
     *  @param  _successor                  Successor `StakeToken` contract address.
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

        if (_feeRate > CommonConstant.RATE_MAX_SUBUNIT) {
            revert InvalidRate();
        }
        feeRate = _feeRate;
        emit FeeRateUpdate(Rate(
            _feeRate,
            CommonConstant.RATE_DECIMALS
        ));
    }


    /* --- Query --- */
    /**
     *  @return Staking fee rate.
     */
    function getFeeRate() external view returns (Rate memory) {
        return Rate(feeRate, CommonConstant.RATE_DECIMALS);
    }

    /**
     *  @return Total supply of the token.
     */
    function totalSupply()
    public view override(
        IERC20Upgradeable,
        ERC20Upgradeable
    ) returns (uint256) {
        return totalStake;
    }

    /**
     *          Name            Description
     *  @param  _account        EVM address.
     *
     *  @return Stake of the account.
     */
    function balanceOf(
        address _account
    ) public view override(
        IERC20Upgradeable,
        ERC20Upgradeable
    ) returns (uint256) {
        return _weightToBalance(weights[_account], interestAccumulation);
    }

    /**
     *  @notice Exclusive Discount: `15% + primaryDiscount * (globalStake - totalSupply) / (2 * globalStake)`.
     *          Note:   `primaryDiscount` is the exclusive discount of the primary token.
     *                  `globalStake` is the total tokens staked in 3 pools.
     *
     *  @return Discount rate for exclusive token.
     */
    function exclusiveDiscount() external view returns (Rate memory) {
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


    /* --- Command --- */
    /**
     *  @notice Fetch reward tokens from the primary token contract based on the wave progression.
     *
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
                revert NoStake();
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
     *  @notice Staking fee after culmination: `value / totalSupply * treasuryLiquidity * feeRate`.
     *          Note:   `value` is the staking value that derives fee.
     *                  `treasuryLiquidity` is the liquidity reserved in the treasury.
     *                  `feeRate` is an admin-adjustable subunitary value.
     *
     *          Name        Description
     *  @param  _account    Staker address.
     *  @param  _value      Staked value.
     *
     *  @dev    The contract secures primary tokens and mints the exact amount of stake tokens to the staker.
     */
    function stake(
        address _account,
        uint256 _value
    ) external
    whenNotPaused
    nonReentrant {
        address primaryTokenAddress = primaryToken;
        /// @dev    Staking after culmination incurs a fee that is contributed to the treasury liquidity.
        uint256 fee = 0;
        if (IPrimaryToken(primaryTokenAddress).isStakeRewardingCulminated(address(this))) {
            ITreasury treasuryContract = ITreasury(IPrimaryToken(primaryToken).treasury());
            fee = _stakingFee(
                treasuryContract.liquidity(),
                _value,
                IPrimaryToken(primaryTokenAddress).totalSupply(),
                feeRate
            );

            address currency = treasuryContract.currency();
            CurrencyHandler.receiveERC20(
                currency,
                fee
            );
            CurrencyHandler.allowERC20(
                currency,
                primaryTokenAddress,
                fee
            );
            IPrimaryToken(primaryTokenAddress).contributeLiquidityFromStakeToken(fee);
        }

        /// @dev    Secure `PrimaryToken`.
        CurrencyHandler.receiveERC20(
            primaryTokenAddress,
            _value
        );

        /// @dev    Mint equivalent `StakeToken`.
        unchecked {
            totalStake += _value;
        }
        weights[_account] = weights[_account]
            .add(_balanceToWeight(_value, interestAccumulation));

        emit Stake(
            _account,
            _value,
            fee
        );
    }

    /**
     *  @notice Unstake tokens back to primary tokens with accumulated interest.
     *  @notice Unstake only after culmination.
     *
     *          Name        Description
     *  @param  _value      Unstaked value.
     *
     *  @dev    The contract returns primary tokens and burns the exact amount of stake tokens to the unstaker.
     */
    function unstake(
        uint256 _value
    ) external
    whenNotPaused
    nonReentrant {
        address primaryTokenAddress = primaryToken;
        if (!IPrimaryToken(primaryTokenAddress).isStakeRewardingCulminated(address(this))) {
            revert NotCulminated();
        }

        if (_value > balanceOf(msg.sender)) {
            revert InsufficientFunds();
        }

        /// @dev    Burn `StakeToken`.
        unchecked {
            totalStake -= _value;
        }
        weights[msg.sender] = weights[msg.sender]
            .sub(_balanceToWeight(_value, interestAccumulation));

        /// @dev    Returns equivalent `PrimaryToken`.
        CurrencyHandler.sendERC20(
            primaryTokenAddress,
            msg.sender,
            _value
        );

        emit Unstake(
            msg.sender,
            _value
        );
    }

    /**
     *  @notice Promote staked tokens to a successor stake token contract for enhanced benefits.
     *  @notice Promote only if the successor address is assigned and before culmination.
     *
     *          Name        Description
     *  @param  _value      Promoted value.
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
        if (IPrimaryToken(primaryTokenAddress).isStakeRewardingCulminated(address(this))) {
            revert InvalidPromoting();
        }

        if (_value > balanceOf(msg.sender)) {
            revert InsufficientFunds();
        }

        /// @dev    Burn tokens of this pool.
        unchecked {
            totalStake -= _value;
        }
        weights[msg.sender] = weights[msg.sender]
            .sub(_balanceToWeight(_value, interestAccumulation));

        /// @dev    Stake into the successor pool.
        CurrencyHandler.allowERC20(
            primaryTokenAddress,
            successorAddress,
            _value);
        IStakeToken(successorAddress).stake(
            msg.sender,
            _value
        );

        emit Promotion(
            msg.sender,
            _value
        );
    }

    
    /* --- Helper --- */
    /**
     *  @notice Transfer stake as tokens.
     *
     *          Name        Description
     *  @param  _from       Sender address.
     *  @param  _to         Receiver address.
     *  @param  _amount     Transferred amount.
     */
    function _transfer(
        address _from,
        address _to,
        uint256 _amount
    ) internal override {
        require(_from != address(0), "ERC20: transfer from the zero address");
        require(_to != address(0), "ERC20: transfer to the zero address");

        uint256 weight = _balanceToWeight(_amount, interestAccumulation);
        require(weight <= weights[_from], "ERC20: transfer amount exceeds balance");

        weights[_from] = weights[_from].sub(weight);
        weights[_to] = weights[_to].add(weight);

        emit Transfer(_from, _to, _amount);
    }

    /**
     *  @notice Hook to be called before any token transfer.
     *
     *          Name        Description
     *  @param  _from       Sender address.
     *  @param  _to         Receiver address.
     *  @param  _amount     Transferred amount.
     */
    function _beforeTokenTransfer(
        address _from,
        address _to,
        uint256 _amount
    ) internal override(
        ERC20Upgradeable,
        ERC20PausableUpgradeable
    ) {
        super._beforeTokenTransfer(_from, _to, _amount);
    }

    /**
     *          Name            Description
     *  @param  _liquidity      Current liquidity of the treasury.
     *  @param  _value          Staked value.
     *  @param  _totalSupply    Total supply of the primary token.
     *  @param  _feeRate        Staking fee rate.
     *
     *  @return fee             Staking fee.
     */
    function _stakingFee(
        uint256 _liquidity,
        uint256 _value,
        uint256 _totalSupply,
        uint256 _feeRate
    ) internal pure returns (uint256) {
        return _liquidity
            .scale(_value, _totalSupply)
            .scale(_feeRate, CommonConstant.RATE_MAX_SUBUNIT);
    }

    /*
     *  @dev Implements dynamic staking balances by representing the balance of each account as the product of individual
     *       weight and a global interest accumulation rate. Transfers update the weights of both sender and receiver directly.
     *       Whenever new rewards are fetched, the rate increases, proportionally raising the balance of every account.
     */

    /**
     *          Name                    Description
     *  @param  _interestAccumulation   Current interest accumulation rate.
     *  @param  _reward                 Fetched staking reward.
     *  @param  _totalSupply            Current total stake.
     *
     *  @return Updated interest accumulation rate.
     */
    function _newInterestAccumulation(
        uint256 _interestAccumulation,
        uint256 _reward,
        uint256 _totalSupply
    ) internal pure returns (uint256) {
        return _interestAccumulation.mul(FixedMath.ONE.add(_reward.div(_totalSupply)));
    }

    /**
     *          Name                    Description
     *  @param  _balance                Token balance.
     *  @param  _interestAccumulation   Current interest accumulation rate.
     *
     *  @return Converted weight value.
     */
    function _balanceToWeight(
        uint256 _balance,
        uint256 _interestAccumulation
    ) internal pure returns (uint256) {
        return _balance.toFixed().div(_interestAccumulation);
    }

    /**
     *          Name                    Description
     *  @param  _weight                 Weight value.
     *  @param  _interestAccumulation   Current interest accumulation rate.
     *
     *  @return Converted token balance.
     */
    function _weightToBalance(
        uint256 _weight,
        uint256 _interestAccumulation
    ) internal pure returns (uint256) {
        return _weight.mul(_interestAccumulation).toUint();
    }
}
