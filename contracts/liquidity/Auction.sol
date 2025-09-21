// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @openzeppelin/contracts-upgradeable/
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC20Upgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

/// contracts/common/interfaces/
import {IAdmin} from "../common/interfaces/IAdmin.sol";

/// contracts/common/utilities/
import {CurrencyHandler} from "../common/utilities/CurrencyHandler.sol";
import {Formula} from "../common/utilities/Formula.sol";
import {Pausable} from "../common/utilities/Pausable.sol";

/// contracts/liquidity/interfaces/
import {IPrimaryToken} from "../liquidity/interfaces/IPrimaryToken.sol";
import {IStakeToken} from "../liquidity/interfaces/IStakeToken.sol";
import {ITreasury} from "../liquidity/interfaces/ITreasury.sol";

/// contracts/liquidity/storages/
import {AuctionStorage} from "../liquidity/storages/AuctionStorage.sol";

/**
 *  @author Briky Team
 *
 *  @notice The `Auction` contract facilitates public distribution of `PrimaryToken`. Accounts can deposit to acquire tokens,
 *          which are distributed proportionally to their deposit and can be withdrawn with a continuous vesting mechanism. All
 *          the deposit will be contributed to the liquidity of the `Treasury`.
 *  @notice Token allocations vest evenly on a per-second basis after the auction ends
 *  @notice When the staking pools are opened, accounts that have unwithdrawn allocation can stake all their remain tokens.
 *  @notice Auction currency is the stablecoin currency of the treasury.
 */
contract Auction is
AuctionStorage,
Pausable,
ReentrancyGuardUpgradeable {
    /** ===== LIBRARY ===== **/
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
     */
    function initialize(
        address _admin,
        address _primaryToken
    ) external
    initializer {
        /// Initializer
        __Pausable_init();
        __ReentrancyGuard_init();

        /// Dependency
        admin = _admin;
        primaryToken = _primaryToken;
    }


    /* --- Administration --- */
    /**
     *  @notice Update staking pools contract.
     *
     *          Name            Description
     *  @param  _stakeToken1    `StakeToken` contract address #1.
     *  @param  _stakeToken2    `StakeToken` contract address #2.
     *  @param  _stakeToken3    `StakeToken` contract address #3.
     *  @param  _signatures     Array of admin signatures.
     *
     *  @dev    Administrative operator.
     */
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
    }

    /**
     *  @notice Start the auction with specific end timestamp and vesting duration.
     *
     *          Name                Description
     *  @param  _endAt              Auction end timestamp.
     *  @param  _vestingDuration    Vesting duration.
     *  @param  _signatures         Array of admin signatures.
     *
     *  @dev    Administrative operator.
     */
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

        /// @dev    Must unlock tokens from `PrimaryToken` before starting auction.
        totalToken = IERC20Upgradeable(primaryToken).balanceOf(address(this));

        endAt = _endAt;
        vestingDuration = _vestingDuration;
    }


    /* --- Query --- */
    /**
     *          Name        Description
     *  @param  _account    EVM address.
     *
     *  @return Tokens allocated in proportion to deposit of the account relative to all others.
     */
    function allocationOf(
        address _account
    ) public view returns (uint256) {
        return totalDeposit == 0
            ? 0
            : deposits[_account].scale(totalToken, totalDeposit);
    }


    /* --- Command --- */
    /**
     *  @notice Deposit value into the auction.
     *  @notice Deposit only before the auction ends.
     *
     *          Name        Description
     *  @param  _value      Deposited value.
     */
    function deposit(
        uint256 _value
    ) external
    whenNotPaused
    nonReentrant {
        if (endAt == 0) {
            revert NotStarted();
        }
        if (endAt <= block.timestamp) {
            revert AlreadyEnded();
        }

        address currency = ITreasury(IPrimaryToken(primaryToken).treasury()).currency();
        CurrencyHandler.receiveERC20(
            currency,
            _value
        );

        /// @dev    Contribute liquidity to the treasury.
        address primaryTokenAddress = primaryToken;
        CurrencyHandler.allowERC20(
            currency,
            primaryTokenAddress,
            _value
        );
        IPrimaryToken(primaryTokenAddress).contributeLiquidityFromPublicSale(_value);

        unchecked {
            totalDeposit += _value;
            deposits[msg.sender] += _value;
        }

        emit Deposit(
            msg.sender,
            _value
        );
    }

    /**
     *  @notice Withdraw vested tokens.
     *  @notice Withdraw only after auction ends.
     *
     *  @return Withdrawn amount.
     */
    function withdraw() external
    whenNotPaused
    nonReentrant
    returns (uint256) {
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
        CurrencyHandler.sendERC20(
            primaryToken,
            msg.sender,
            amount
        );

        emit Withdrawal(
            msg.sender,
            amount
        );

        return amount;
    }

    /**
     *  @notice Stake unwithdrawn tokens to staking pools.
     *  @notice Stake only when staking pools are opened and assigned.
     *
     *          Name        Description
     *  @param  _stake1     Staked amount for staking pool #1.
     *  @param  _stake2     Staked amount for staking pool #2.
     *
     *  @return Staked amount for staking pool #3, which also is the remain tokens.
     */
    function stake(
        uint256 _stake1,
        uint256 _stake2
    ) external
    whenNotPaused
    nonReentrant
    returns (uint256) {
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
