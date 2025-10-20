// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @openzeppelin/contracts-upgradeable/
import {IERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC721Upgradeable.sol";
import {IERC2981Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC2981Upgradeable.sol";
import {ERC165CheckerUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import {ERC721Holder} from "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";

/// contracts/common/interfaces/
import {IAdmin} from "../common/interfaces/IAdmin.sol";

/// contracts/lend/utilities/
import {MortgageToken} from "./utilities/MortgageToken.sol";

/// contracts/lend/storages/
import {ERC721MortgageTokenStorage} from "./storages/ERC721MortgageTokenStorage.sol";

/**
 *  @author Briky Team
 * 
 *  @notice A `ERC721MortgageToken` contract facilitates peer-to-peer lending secured by ERC-721 tokens as collateral. Each
 *          provided mortgage is tokenized into an ERC-721 token, whose owner has the right to receive repayments from the
 *          borrower or foreclose on the collateral from the contract once overdue.
 * 
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 */
contract ERC721MortgageToken is
ERC721MortgageTokenStorage,
ERC721Holder,
MortgageToken {
    /** ===== LIBRARY ===== **/
    using ERC165CheckerUpgradeable for address;

    
    /** ===== CONSTANT ===== **/
    string constant private VERSION = "v1.2.1";


    /** ===== FUNCTION ===== **/
    /* --- Initialization --- */
    /**
     *  @notice Initialize the contract after deployment, serving as the constructor.
     * 
     *          Name            Description
     *  @param  _admin          `Admin` contract address.
     *  @param  _feeReceiver    `FeeReceiver` contract address.
     *  @param  _name           Token name.
     *  @param  _symbol         Token symbol.
     *  @param  _uri            Base URI.
     *  @param  _feeRate        Borrowing fee rate.
     */
    function initialize(
        address _admin,
        address _feeReceiver,
        string calldata _name,
        string calldata _symbol,
        string calldata _uri,
        uint256 _feeRate
    ) external
    initializer {
        __MortgageToken_init(
            _admin,
            _feeReceiver,
            _name,
            _symbol,
            _uri,
            _feeRate
        );
    }


    /* --- Common --- */
    /**
     *          Name       Description
     *  @return version    Version of implementation.
     */
    function version() external pure returns (string memory) {
        return VERSION;
    }


    /* --- Administration --- */
    /**
     *  @notice Register or deregister collections as collaterals.
     *
     *          Name             Description
     *  @param  _tokens          Array of collection addresses to register or deregister.
     *  @param  _isCollateral    Whether the operation is register or deregister.
     *  @param  _signatures      Array of admin signatures.
     * 
     *  @dev    Administrative operator.
     *  @dev    Collections must support interface `IERC721Upgradeable`.
     */
    function registerCollaterals(
        address[] calldata _tokens,
        bool _isCollateral,
        bytes[] calldata _signatures
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "registerCollaterals",
                _tokens,
                _isCollateral
            ),
            _signatures
        );

        if (_isCollateral) {
            for (uint256 i; i < _tokens.length; ++i) {
                if (_tokens[i] == address(this) ||
                    !_tokens[i].supportsInterface(type(IERC721Upgradeable).interfaceId)) {
                    revert InvalidCollateral();
                }
                if (isCollateral[_tokens[i]]) {
                    revert RegisteredCollateral();
                }
                isCollateral[_tokens[i]] = true;
                emit CollateralRegistration(_tokens[i]);
            } 
        } else {
            for (uint256 i; i < _tokens.length; ++i) {
                if (!isCollateral[_tokens[i]]) {
                    revert NotRegisteredCollateral();
                }
                isCollateral[_tokens[i]] = false;
                emit CollateralDeregistration(_tokens[i]);
            } 
        }
    }


    /* --- Query --- */
    /**
     *          Name           Description
     *  @param  _mortgageId    Mortgage identifier.
     * 
     *  @return Collateral information.
     */
    function getCollateral(
        uint256 _mortgageId
    ) external view
    validMortgage(_mortgageId)
    returns (ERC721Collateral memory) {
        return collaterals[_mortgageId];
    }


    /**
     *          Name        Description
     *  @param  _tokenId    Token identifier.
     *  @param  _price      Reference value.
     * 
     *  @return receiver    Royalty receiver address.
     *  @return royalty     Royalty derived from the reference value.
     */
    function royaltyInfo(
        uint256 _tokenId,
        uint256 _price
    ) external view override returns (address, uint256) {
        _requireMinted(_tokenId);
        ERC721Collateral memory collateral = collaterals[_tokenId];
        if (collateral.collection.supportsInterface(type(IERC2981Upgradeable).interfaceId)) {
            ( , uint256 royalty) = IERC2981Upgradeable(collateral.collection).royaltyInfo(
                collateral.tokenId,
                _price
            );
            return (feeReceiver, royalty);
        }
        return (address(0), 0);
    }


    /* --- Command --- */
    /**
     *  @notice List a new mortgage offer with an ERC-721 token as collateral.
     *
     *          Name          Description
     *  @param  _token        Collateral contract address.
     *  @param  _tokenId      Collateral token identifier.
     *  @param  _principal    Principal value.
     *  @param  _repayment    Repayment value.
     *  @param  _currency     Currency address.
     *  @param  _duration     Borrowing duration.
     * 
     *  @return mortgageId    New mortgage identifier.
     * 
     *  @dev    The collection must support interface `IERC721Upgradeable`.
     *  @dev    Approval must be granted for this contract to transfer collateral before borrowing. A mortgage can only be
     *          lent while approval remains active.
     *  @dev    Collateral will be secured in the contract until the mortgage is either repaid, foreclosed, or cancelled.
     */
    function borrow(
        address _token,
        uint256 _tokenId,
        uint256 _principal,
        uint256 _repayment,
        address _currency,
        uint40 _duration
    ) external 
    whenNotPaused
    nonReentrant
    onlyAvailableCurrency(_currency)
    returns (uint256) {
        if (!isCollateral[_token] || IERC721Upgradeable(_token).ownerOf(_tokenId) != msg.sender) {
            revert InvalidCollateral();
        }

        uint256 mortgageId = _borrow(
            _principal,
            _repayment,
            _currency,
            _duration
        );

        collaterals[mortgageId] = ERC721Collateral(
            _token,
            _tokenId
        );

        _transferCollateral(
            mortgageId,
            msg.sender,
            address(this)
        );

        emit NewCollateral(
            mortgageId,
            _token,
            _tokenId
        );

        return mortgageId;
    }


    /* --- Helper --- */
    /**
     *  @notice Transfer the collateral of a mortgage.
     *
     *          Name           Description
     *  @param  _mortgageId    Mortgage identifier.
     *  @param  _from          Sender address.
     *  @param  _to            Receiver address.
     */
    function _transferCollateral(
        uint256 _mortgageId,
        address _from,
        address _to
    ) internal override {
        IERC721Upgradeable(collaterals[_mortgageId].collection).safeTransferFrom(
            _from,
            _to,
            collaterals[_mortgageId].tokenId,
            ""
        );
    }
}
