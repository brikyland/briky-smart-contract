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
 *  @notice The `Auction` contract manages token distribution through a public auction mechanism where participants
 *          deposit currency to receive primary tokens with vesting schedules and staking options.
 *
 *  @dev    The auction allows participants to deposit currency during the auction period to receive an allocation
 *          of primary tokens proportional to their contribution. After the auction ends, participants can withdraw
 *          their allocated tokens with a vesting schedule or stake them directly into stake token contracts.
 *  @dev    Token allocation is calculated based on the participant's deposit proportion of the total deposits.
 *          Vesting allows gradual token release over time, while staking provides immediate utility in the ecosystem.
 *  @dev    The auction integrates with the treasury system to contribute liquidity from participant deposits.
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
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
     *  @notice Initialize the contract after deployment, serving as the constructor.
     *
     *          Name            Description
     *  @param  _admin          Admin contract address.
     *  @param  _primaryToken   Primary token contract address.
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
     *  @notice Update stake token contracts.
     *
     *          Name            Description
     *  @param  _stakeToken1    New stake token #1 contract address.
     *  @param  _stakeToken2    New stake token #2 contract address.
     *  @param  _stakeToken3    New stake token #3 contract address.
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

        emit StakeTokensUpdate(
            _stakeToken1,
            _stakeToken2,
            _stakeToken3
        );
    }

    /**
     *  @notice Start the auction with specified end time and vesting duration.
     *
     *          Name                Description
     *  @param  _endAt              Auction end timestamp.
     *  @param  _vestingDuration    Duration over which tokens are vested after auction ends.
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

        totalToken = IERC20Upgradeable(primaryToken).balanceOf(address(this));

        endAt = _endAt;
        vestingDuration = _vestingDuration;
    }

    /* --- Command --- */
    /**
     *  @notice Deposit currency into the auction to receive token allocation.
     *
     *          Name        Description
     *  @param  _value      Amount of currency to deposit.
     *
     *  @dev    Deposits are only accepted during the auction period (before endAt).
     *  @dev    Deposited currency is contributed to the treasury as liquidity.
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
        CurrencyHandler.receiveERC20(currency, _value);

        address primaryTokenAddress = primaryToken;
        CurrencyHandler.allowERC20(currency, primaryTokenAddress, _value);
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

    /* --- Query --- */
    /**
     *  @notice Calculate the total token allocation for a participant based on their deposit proportion.
     *
     *          Name        Description
     *  @param  _account    Participant address.
     *
     *  @return amount      Total token allocation for the participant.
     */
    function allocationOf(
        address _account
    ) public view returns (uint256) {
        return totalDeposit == 0
            ? 0
            : deposits[_account].scale(totalToken, totalDeposit);
    }

    /**
     *  @notice Withdraw vested tokens from the participant's allocation.
     *
     *  @return amount      Amount of tokens withdrawn based on vesting schedule.
     *
     *  @dev    Withdrawal is only available after the auction ends.
     *  @dev    Tokens are released gradually based on the vesting duration.
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
        CurrencyHandler.sendERC20(primaryToken, msg.sender, amount);

        emit Withdrawal(
            msg.sender,
            amount
        );

        return amount;
    }

    /**
     *  @notice Stake allocated tokens directly into stake token contracts.
     *
     *          Name        Description
     *  @param  _stake1     Amount to stake in stake token #1.
     *  @param  _stake2     Amount to stake in stake token #2.
     *
     *  @return stake3      Amount automatically staked in stake token #3 (remaining allocation).
     *
     *  @dev    Staking is only available after the auction ends.
     *  @dev    The remaining allocation after stake1 and stake2 is automatically staked in stake token #3.
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
