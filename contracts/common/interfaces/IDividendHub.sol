// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/common/structs/
import {IDividend} from "../structs/IDividend.sol";

/// contracts/common/interfaces/
import {ICommon} from "./ICommon.sol";

/**
 *  @author Briky Team
 *
 *  @notice Interface for contract `DividendHub`.
 *  @notice The `DividendHub` contract collects incomes associated to assets from governor contracts and distribute them
 *          among asset holders.
 *
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 */
interface IDividendHub is
IDividend,
ICommon {
    /** ===== EVENT ===== **/
    /**
     *  @notice Emitted when a new dividend package is issued.
     *
     *          Name            Description
     *  @param  governor        Governor contract address.
     *  @param  tokenId         Asset identifier from the governor contract.
     *  @param  issuer          Issuer address.
     *  @param  totalWeight     Current total weight of all holders of the asset.
     *  @param  value           Total dividend value.
     *  @param  currency        Dividend currency address.
     *  @param  note            Issuance note.
     */
    event NewDividend(
        address indexed governor,
        uint256 indexed tokenId,
        address indexed issuer,
        uint256 totalWeight,
        uint256 value,
        address currency,
        string note
    );


    /**
     *  @notice Emitted when value is withdrawn from a dividend package by an entitled receiver.
     *
     *          Name            Description
     *  @param  dividendId      Dividend identifier.
     *  @param  withdrawer      Withdrawer address.
     *  @param  value           Withdrawn value.
     */
    event Withdrawal(
        uint256 indexed dividendId,
        address indexed withdrawer,
        uint256 value
    );


    /** ===== ERROR ===== **/
    error AlreadyWithdrawn();
    error InvalidDividendId();
    error InvalidTokenId();
    error InvalidWithdrawing();


    /** ===== FUNCTION ===== **/
    /* --- Query --- */
    /**
     *          Name            Description
     *  @return dividendNumber  Number of dividends.
     */
    function dividendNumber() external view returns (uint256 dividendNumber);


    /**
     *          Name            Description
     *  @param  dividendId      Dividend identifier.
     *  @return dividend        Configuration and progress of the dividend package.
     */
    function getDividend(
        uint256 dividendId
    ) external view returns (Dividend memory dividend);


    /**
     *          Name            Description
     *  @param  dividendId      Dividend identifier.
     *  @param  withdrawer      Withdrawer address.
     *  @return withdrawAt      Withdrawal timestamp.
     */
    function withdrawAt(
        uint256 dividendId,
        address withdrawer
    ) external view returns (uint256 withdrawAt);


    /* --- Command --- */
    /**
     *  @notice Issue a new dividend package for an asset from a governor contract.
     *
     *          Name            Description
     *  @param  governor        Governor contract address.
     *  @param  tokenId         Asset identifier from the governor contract.
     *  @param  value           Total dividend value.
     *  @param  currency        Dividend currency address.
     *  @param  note            Issuance note.
     *  @return dividendId      New dividend identifier.
     *
     */
    function issueDividend(
        address governor,
        uint256 tokenId,
        uint256 value,
        address currency,
        string calldata note
    ) external payable returns (uint256 dividendId);

    /**
     *  @notice Withdraw entitled portions of the message sender from multiple dividend packages.
     *
     *          Name            Description
     *  @param  dividendIds     Array of dividend identifiers to withdraw.
     */
    function withdraw(
        uint256[] calldata dividendIds
    ) external;
}
