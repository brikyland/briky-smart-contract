// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @openzeppelin/contracts-upgradeable/
import {IERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC721Upgradeable.sol";
import {IERC2981Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC2981Upgradeable.sol";
import {ERC165CheckerUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";

/// contracts/common/interfaces/
import {IAdmin} from "../common/interfaces/IAdmin.sol";

/// contracts/lend/utilities/
import {MortgageToken} from "./utilities/MortgageToken.sol";

/// contracts/lend/storages/
import {ERC721MortgageTokenStorage} from "./storages/ERC721MortgageTokenStorage.sol";

/**
 *  @author Briky Team
 * 
 *
 *  @notice A `ERC721MortgageToken` contract is an ERC-721 contract that facilitates mortgage-based borrowing backed by ERC-721 token collaterals and issues tokens representing mortgages.
 */
contract ERC721MortgageToken is
ERC721MortgageTokenStorage,
MortgageToken {
    /** ===== LIBRARY ===== **/
    using ERC165CheckerUpgradeable for address;

    
    /** ===== CONSTANT ===== **/
    string constant private VERSION = "v1.2.1";


    /** ===== FUNCTION ===== **/
    /* --- Initialization --- */
    /**
     *  @notice Invoked for initialization after deployment, serving as the contract constructor.
     * 
     *          Name            Description
     *  @param  _admin          `Admin` contract address.
     *  @param  _feeReceiver    `FeeReceiver` contract address.
     *  @param  _name           Token name.
     *  @param  _symbol         Token symbol.
     *  @param  _uri            Token base URI.
     *  @param  _feeRate        Fee rate.
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
     *  @notice Register or deregister tokens as collaterals.
     *
     *          Name             Description
     *  @param  _tokens          Array of token addresses to register or deregister.
     *  @param  _isCollateral    Whether the operation is register or deregister.
     *  @param  _signatures      Array of admin signatures.
     * 
     *  @dev    Administrative configuration.
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
                isCollateral[_tokens[i]] = true;
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


    /* --- Command --- */
    /**
     *  @notice List a new mortgage backed by collateral from a registered ERC-721 collection.
     *
     *          Name          Description
     *  @param  _token        Collateral collection contract address.
     *  @param  _tokenId      Collateral token identifier.
     *  @param  _principal    Principal value.
     *  @param  _repayment    Repayment value.
     *  @param  _currency     Loan currency address.
     *  @param  _duration     Repayment duration.
     * 
     *  @return mortgageId    New mortgage identifier.
     * 
     *  @dev    The collection must support interface `IERC721Upgradeable`.
     *  @dev    Must set approval for this contract to transfer collateral tokens of the borrower before listing.
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


    /* --- Override --- */
    /**
     *          Name        Description
     *  @param  _tokenId    Token identifier.
     *  @param  _price      Price.
     * 
     *  @return Royalty receiver address.
     *  @return Royalty amount.
     */
    function royaltyInfo(
        uint256 _tokenId,
        uint256 _price
    ) external view override returns (address, uint256) {
        _requireMinted(_tokenId);
        ERC721Collateral memory collateral = collaterals[_tokenId];
        if (collateral.token.supportsInterface(type(IERC2981Upgradeable).interfaceId)) {
            ( , uint256 royalty) = IERC2981Upgradeable(collateral.token).royaltyInfo(
                collateral.tokenId,
                _price
            );
            return (feeReceiver, royalty);
        }
        return (address(0), 0);
    }


    /* --- Helper --- */
    /**
     *  @notice Transfer collateral of a mortgage.
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
        IERC721Upgradeable(collaterals[_mortgageId].token).safeTransferFrom(
            _from,
            _to,
            collaterals[_mortgageId].tokenId,
            ""
        );
    }
}
