// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/common/interfaces/
import {ICommon} from "../../common/interfaces/ICommon.sol";

/**
 *  @author Briky Team
 *
 *  @notice Interface for contract `Auction`.
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
interface IAuction is ICommon {
    /** ===== EVENT ===== **/
    /* --- Configuration --- */
    /**
     *  @notice Emitted when stake token contract addresses are updated.
     *
     *          Name            Description
     *  @param  newAddress1     New stake token #1 contract address.
     *  @param  newAddress2     New stake token #2 contract address.
     *  @param  newAddress3     New stake token #3 contract address.
     */
    event StakeTokensUpdate(
        address newAddress1,
        address newAddress2,
        address newAddress3
    );

    /* --- Auction Operations --- */
    /**
     *  @notice Emitted when a participant deposits currency into the auction.
     *
     *          Name        Description
     *  @param  account     Participant address.
     *  @param  value       Amount of currency deposited.
     */
    event Deposit(
        address indexed account,
        uint256 value
    );

    /**
     *  @notice Emitted when a participant stakes their allocated tokens.
     *
     *          Name        Description
     *  @param  account     Participant address.
     *  @param  stake1      Amount staked in stake token #1.
     *  @param  stake2      Amount staked in stake token #2.
     *  @param  stake3      Amount staked in stake token #3.
     */
    event Stake(
        address indexed account,
        uint256 stake1,
        uint256 stake2,
        uint256 stake3
    );

    /**
     *  @notice Emitted when a participant withdraws their vested tokens.
     *
     *          Name        Description
     *  @param  account     Participant address.
     *  @param  amount      Amount of tokens withdrawn.
     */
    event Withdrawal(
        address indexed account,
        uint256 amount
    );


    /** ===== ERROR ===== **/
    error AlreadyEnded();
    error AlreadyStarted();
    error NotAssignedStakeTokens();
    error NotEnded();
    error NotStarted();


    /** ===== FUNCTION ===== **/
    /* --- Dependency --- */
    /**
     *          Name            Description
     *  @return primaryToken    Primary token contract address.
     */
    function primaryToken() external view returns (address primaryToken);

    /**
     *          Name            Description
     *  @return stakeToken1     Stake token #1 contract address.
     */
    function stakeToken1() external view returns (address stakeToken1);

    /**
     *          Name            Description
     *  @return stakeToken2     Stake token #2 contract address.
     */
    function stakeToken2() external view returns (address stakeToken2);

    /**
     *          Name            Description
     *  @return stakeToken3     Stake token #3 contract address.
     */
    function stakeToken3() external view returns (address stakeToken3);

    /* --- Query --- */
    /**
     *          Name    Description
     *  @return endAt   Auction end timestamp.
     */
    function endAt() external view returns (uint256 endAt);

    /**
     *          Name            Description
     *  @return totalDeposit    Total amount of currency deposited by all participants.
     */
    function totalDeposit() external view returns (uint256 totalDeposit);

    /**
     *          Name        Description
     *  @return totalToken  Total amount of primary tokens available for distribution.
     */
    function totalToken() external view returns (uint256 totalToken);

    /**
     *          Name                Description
     *  @return vestingDuration     Duration over which tokens are vested after auction ends.
     */
    function vestingDuration() external view returns (uint256 vestingDuration);

    /**
     *          Name        Description
     *  @param  account     Participant address.
     *
     *  @return deposit     Amount of currency deposited by the participant.
     */
    function deposits(
        address account
    ) external view returns (uint256 deposit);

    /**
     *          Name        Description
     *  @param  account     Participant address.
     *
     *  @return amount      Amount of tokens already withdrawn by the participant.
     */
    function withdrawnAmount(
        address account
    ) external view returns (uint256 amount);

    /**
     *          Name        Description
     *  @param  account     Participant address.
     *
     *  @return amount      Total token allocation for the participant based on their deposit proportion.
     */
    function allocationOf(
        address account
    ) external view returns (uint256 amount);


    /* --- Command --- */
    /**
     *  @notice Deposit currency into the auction to receive token allocation.
     *
     *          Name        Description
     *  @param  value       Amount of currency to deposit.
     *
     *  @dev    Deposits are only accepted during the auction period (before endAt).
     *  @dev    Deposited currency is contributed to the treasury as liquidity.
     */
    function deposit(
        uint256 value
    ) external;

    /**
     *  @notice Stake allocated tokens directly into stake token contracts.
     *
     *          Name        Description
     *  @param  stake1      Amount to stake in stake token #1.
     *  @param  stake2      Amount to stake in stake token #2.
     *
     *  @return stake3      Amount automatically staked in stake token #3 (remaining allocation).
     *
     *  @dev    Staking is only available after the auction ends.
     *  @dev    The remaining allocation after stake1 and stake2 is automatically staked in stake token #3.
     */
    function stake(
        uint256 stake1,
        uint256 stake2
    ) external returns (uint256 stake3);

    /**
     *  @notice Withdraw vested tokens from the participant's allocation.
     *
     *  @return amount      Amount of tokens withdrawn based on vesting schedule.
     *
     *  @dev    Withdrawal is only available after the auction ends.
     *  @dev    Tokens are released gradually based on the vesting duration.
     */
    function withdraw() external returns (uint256 amount);
}
