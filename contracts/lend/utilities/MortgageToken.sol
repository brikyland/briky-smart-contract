// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @openzeppelin/contracts-upgradeable/
import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC165Upgradeable.sol";
import {IERC721MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC721MetadataUpgradeable.sol";
import {IERC2981Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC2981Upgradeable.sol";
import {IERC4906Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC4906Upgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {ERC721PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721PausableUpgradeable.sol";

/// contracts/common/constants/
import {CommonConstant} from "../../common/constants/CommonConstant.sol";

/// contracts/common/interfaces/
import {IAdmin} from "../../common/interfaces/IAdmin.sol";

/// contracts/common/utilities/
import {Administrable} from "../../common/utilities/Administrable.sol";
import {CurrencyHandler} from "../../common/utilities/CurrencyHandler.sol";
import {Discountable} from "../../common/utilities/Discountable.sol";
import {Formula} from "../../common/utilities/Formula.sol";
import {Pausable} from "../../common/utilities/Pausable.sol";

/// contracts/lend/interfaces/
import {IMortgageToken} from "../interfaces/IMortgageToken.sol";

/// contracts/lend/storages/
import {MortgageTokenStorage} from "../storages/MortgageTokenStorage.sol";

/**
 *  @author Briky Team
 *
 *  @notice A `MortgageToken` contract facilitates peer-to-peer lending secured by crypto collateral. Each provided mortgage
 *          is tokenized into an ERC-721 token, whose owner has the right to receive repayments from the borrower or foreclose
 *          on the collateral from the contract once overdue.
 * 
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 */
abstract contract MortgageToken is
MortgageTokenStorage,
ERC721PausableUpgradeable,
Administrable,
Discountable,
Pausable,
ReentrancyGuardUpgradeable {
    /** ===== LIBRARY ===== **/
    using Formula for uint256;


    /** ===== MODIFIER ===== **/
    /**
     *  @notice Verify a mortgage identifier is valid.
     *
     *          Name           Description
     *  @param  _mortgageId    Mortgage identifier.
     */
    modifier validMortgage(
        uint256 _mortgageId
    ) {
        if (_mortgageId == 0 || _mortgageId > mortgageNumber) {
            revert InvalidMortgageId();
        }
        _;
    }


    /** ===== FUNCTION ===== **/
    /* --- Common --- */
    /**
     *  @notice Executed on a call to this contract with empty calldata.
     */
    receive() external payable {}


    /* --- Initialization --- */
    /**
     *  @notice Initialize `MortgageToken`.
     *
     *          Name            Description
     *  @param  _admin          `Admin` contract address.
     *  @param  _feeReceiver    `FeeReceiver` contract address.
     *  @param  _name           Token name.
     *  @param  _symbol         Token symbol.
     *  @param  _uri            Base URI.
     *  @param  _feeRate        Borrowing fee rate.
     */
    function __MortgageToken_init(
        address _admin,
        address _feeReceiver,
        string calldata _name,
        string calldata _symbol,
        string calldata _uri,
        uint256 _feeRate
    ) internal
    onlyInitializing {
        require(_feeRate <= CommonConstant.RATE_MAX_SUBUNIT);

        /// Initializer
        __ERC721_init(_name, _symbol);
        __ERC721Pausable_init();

        __ReentrancyGuard_init();

        /// Dependency.
        admin = _admin;
        feeReceiver = _feeReceiver;

        /// Configuration.
        baseURI = _uri;
        emit BaseURIUpdate(_uri);

        feeRate = _feeRate;
        emit FeeRateUpdate(Rate(_feeRate, CommonConstant.RATE_DECIMALS));
    }

    /* --- Administration --- */
    /**
     *  @notice Update the base URI.
     *
     *          Name            Description
     *  @param  _uri            New base URI.
     *  @param  _signatures     Array of admin signatures.
     * 
     *  @dev    Administrative operator.
     */
    function updateBaseURI(
        string calldata _uri,
        bytes[] calldata _signatures
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "updateBaseURI",
                _uri
            ),
            _signatures
        );
        baseURI = _uri;

        emit BaseURIUpdate(_uri);
        emit BatchMetadataUpdate(1, mortgageNumber);
    }

    /**
     *  @notice Update the borrowing fee rate.
     *
     *          Name            Description
     *  @param  _feeRate        New borrowing fee rate.
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
        emit FeeRateUpdate(Rate(_feeRate, CommonConstant.RATE_DECIMALS));
    }


    /* --- Query --- */
    /**
     *  @return Borrowing fee rate.
     */
    function getFeeRate() external view returns (Rate memory) {
        return Rate(feeRate, CommonConstant.RATE_DECIMALS);
    }

    /**
     *          Name            Description
     *  @param  _mortgageId     Mortgage identifier.
     * 
     *  @return Configuration and progress of the mortgage.
     */
    function getMortgage(
        uint256 _mortgageId
    ) external view
    validMortgage(_mortgageId)
    returns (Mortgage memory) {
        return mortgages[_mortgageId];
    }


    /**
     *          Name            Description
     *  @param  _tokenId        Token identifier.
     * 
     *  @return Token URI.
     */
    function tokenURI(
        uint256 _tokenId
    ) public view override(
        IERC721MetadataUpgradeable,
        ERC721Upgradeable
    ) returns (string memory) {
        return super.tokenURI(_tokenId);
    }


    /**
     *          Name            Description
     *  @param  _interfaceId    Interface identifier.
     * 
     *  @return Whether this contract supports the interface.
     */
    function supportsInterface(
        bytes4 _interfaceId
    ) public view virtual override(
        IERC165Upgradeable,
        ERC721Upgradeable
    ) returns (bool) {
        return _interfaceId == type(IMortgageToken).interfaceId 
            || _interfaceId == type(IERC2981Upgradeable).interfaceId
            || _interfaceId == type(IERC4906Upgradeable).interfaceId
            || super.supportsInterface(_interfaceId);
    }


    /* --- Command --- */
    /**
     *  @notice Cancel a mortgage.
     *  @notice Cancel only if the mortgage is in `Pending` state.
     * 
     *          Name            Description
     *  @param  _mortgageId     Mortgage identifier.
     * 
     *  @dev    Permission:
     *          - Borrower of the mortgage.
     *          - Managers: disqualify defected mortgages only.
     */
    function cancel(
        uint256 _mortgageId
    ) external virtual
    whenNotPaused
    validMortgage(_mortgageId) {
        Mortgage storage mortgage = mortgages[_mortgageId];
        if (msg.sender != mortgage.borrower && !IAdmin(admin).isManager(msg.sender)) {
            revert Unauthorized();
        }
        if (mortgage.state != MortgageState.Pending) {
            revert InvalidCancelling();
        }

        mortgage.state = MortgageState.Cancelled;

        emit MortgageCancellation(_mortgageId);
    }

    /**
     *  @notice Lend a mortgage.
     *  @notice Lend only if the mortgage is in `Pending` state.
     *  @notice Mint new token associated with the mortgage.
     *
     *          Name            Description
     *  @param  _mortgageId     Mortgage identifier.
     * 
     *  @return Maturity timestamp.
     */
    function lend(
        uint256 _mortgageId
    ) external payable virtual
    validMortgage(_mortgageId)
    returns (uint40) {
        return _lend(_mortgageId);
    }

    /**
     *  @notice Lend a mortgage.
     *  @notice Lend only if the mortgage is in `Pending` state.
     *  @notice Mint new token associated with the mortgage.
     *
     *          Name            Description
     *  @param  _mortgageId     Mortgage identifier.
     *  @param  _anchor         `principal` of the mortgage.
     * 
     *  @return Maturity timestamp.
     * 
     *  @dev    Anchor enforces consistency between this contract and the client-side.
     */
    function safeLend(
        uint256 _mortgageId,
        uint256 _anchor
    ) external payable virtual
    validMortgage(_mortgageId)
    returns (uint40) {
        if (_anchor != mortgages[_mortgageId].principal) {
            revert BadAnchor();
        }

        return _lend(_mortgageId);
    }

    /**
     *  @notice Repay a mortgage.
     *  @notice Repay only if the mortgage is in `Supplied` state and not overdue.
     *  @notice Burn the token associated with the mortgage.
     *
     *          Name            Description
     *  @param  _mortgageId     Mortgage identifier.
     * 
     *  @dev    Permission: Borrower of the mortgage.
     */
    function repay(
        uint256 _mortgageId
    ) external payable virtual
    validMortgage(_mortgageId) {
        _repay(_mortgageId);
    }


    /**
     *  @notice Repay a mortgage.
     *  @notice Repay only if the mortgage is in `Supplied` state and not overdue.
     *  @notice Burn the token associated with the mortgage.
     *
     *          Name            Description
     *  @param  _mortgageId     Mortgage identifier.
     *  @param  _anchor         `repayment` of the mortgage.
     * 
     *  @dev    Permission: Borrower of the mortgage.
     *  @dev    Anchor enforces consistency between this contract and the client-side.
     */
    function safeRepay(
        uint256 _mortgageId,
        uint256 _anchor
    ) external payable virtual
    validMortgage(_mortgageId) {
        if (_anchor != mortgages[_mortgageId].repayment) {
            revert BadAnchor();
        }

        _repay(_mortgageId);
    }

    /**
     *  @notice Foreclose on the collateral of a mortgage.
     *  @notice Foreclose only if the mortgage is overdue.
     *  @notice Burn the token associated with the mortgage.
     *
     *          Name            Description
     *  @param  _mortgageId     Mortgage identifier.
     * 
     *  @dev    The collateral is transferred to the mortgage token owner.
     */
    function foreclose(
        uint256 _mortgageId
    ) external virtual
    whenNotPaused
    nonReentrant
    validMortgage(_mortgageId) {
        Mortgage storage mortgage = mortgages[_mortgageId];
        if (mortgage.due > block.timestamp
            || mortgage.state != MortgageState.Supplied) {
            revert InvalidForeclosing();
        }

        address receiver = _ownerOf(_mortgageId);

        mortgage.state = MortgageState.Foreclosed;

        /// @dev    The corresponding token is burned when the mortgage is foreclosed.
        _burn(_mortgageId);

        _transferCollateral(
            _mortgageId,
            address(this),
            receiver
        );

        emit MortgageForeclosure(_mortgageId, receiver);
    }


    /* --- Internal --- */
    /**
     *  @return Prefix of all token URI.
     */
    function _baseURI() internal override view returns (string memory) {
        return baseURI;
    }

    /**
     *  @notice Mint a token.
     *
     *          Name            Description
     *  @param  _to             Receiver address.
     *  @param  _tokenId        Token identifier.
     */
    function _mint(address _to, uint256 _tokenId) internal override {
        totalSupply++;
        super._mint(_to, _tokenId);
    }

    /**
     *  @notice Burn a token.
     *
     *          Name            Description
     *  @param  _tokenId        Token identifier.
     */
    function _burn(uint256 _tokenId) internal override {
        totalSupply--;
        super._burn(_tokenId);
    }

    /**
     *  @notice List a new mortgage.
     *
     *          Name            Description
     *  @param  _principal      Principal value.
     *  @param  _repayment      Repayment value.
     *  @param  _currency       Currency address.
     *  @param  _duration       Borrowing duration.
     * 
     *  @return New mortgage identifier.
     * 
     *  @dev    Approval must be granted for this contract to transfer collateral before borrowing. A mortgage can only be
     *          lent while approval remains active.
     */
    function _borrow(
        uint256 _principal,
        uint256 _repayment,
        address _currency,
        uint40 _duration
    ) internal returns (uint256) {
        if (_principal == 0) {
            revert InvalidPrincipal();
        }
        if (_repayment < _principal) {
            revert InvalidRepayment();
        }

        uint256 fee = _applyDiscount(
            _principal.scale(feeRate, CommonConstant.RATE_MAX_SUBUNIT),
            _currency
        );
        uint256 mortgageId = ++mortgageNumber;
        mortgages[mortgageId] = Mortgage(
            _principal,
            _repayment,
            fee,
            _currency,
            _duration,
            MortgageState.Pending,
            msg.sender,
            address(0)
        );

        emit NewMortgage(
            mortgageId,
            msg.sender,
            _principal,
            _repayment,
            fee,
            _currency,
            _duration
        );

        return mortgageId;
    }


    /**
     *  @notice Lend a mortgage.
     *  @notice Mint the token associated with the mortgage.
     *
     *          Name            Description
     *  @param  _mortgageId     Mortgage identifier.
     * 
     *  @return Repayment due timestamp.
     */
    function _lend(
        uint256 _mortgageId
    ) internal
    whenNotPaused
    nonReentrant
    returns (uint40) {
        Mortgage storage mortgage = mortgages[_mortgageId];

        if (msg.sender == mortgage.borrower || mortgage.state != MortgageState.Pending) {
            revert InvalidLending();
        }

        address currency = mortgage.currency;
        uint256 principal = mortgage.principal;

        CurrencyHandler.receiveCurrency(
            currency,
            principal
        );
        CurrencyHandler.sendCurrency(
            currency,
            mortgage.borrower,
            principal - mortgage.fee
        );

        _chargeFee(_mortgageId);

        uint40 due = mortgage.due + uint40(block.timestamp);
        /// @dev    After being lent, `due` is set to the maturity timestamp.
        mortgage.due = due;
        mortgage.lender = msg.sender;
        mortgage.state = MortgageState.Supplied;

        /// @dev    New token is minted when the mortgage is lent.
        _mint(msg.sender, _mortgageId);

        emit NewToken(
            _mortgageId,
            msg.sender,
            due
        );

        return due;
    }

    /**
     *  @notice Repay a mortgage.
     *  @notice Burn the token associated with the mortgage.
     *
     *          Name            Description
     *  @param  _mortgageId     Mortgage identifier.
     * 
     *  @dev    Permission: Borrower of the mortgage.
     */
    function _repay(
        uint256 _mortgageId
    ) internal
    whenNotPaused
    nonReentrant {
        Mortgage storage mortgage = mortgages[_mortgageId];
        if (msg.sender != mortgage.borrower) {
            revert Unauthorized();
        }

        if (mortgage.state != MortgageState.Supplied) {
            revert InvalidRepaying();
        }

        if (mortgage.due <= block.timestamp) {
            revert Overdue();
        }

        mortgage.state = MortgageState.Repaid;

        address owner = ownerOf(_mortgageId);

        /// @dev    The corresponding token is burned when the mortgage is repaid.
        _burn(_mortgageId);

        CurrencyHandler.forwardCurrency(
            mortgage.currency,
            owner,
            mortgage.repayment
        );

        _transferCollateral(
            _mortgageId,
            address(this),
            msg.sender
        );

        emit MortgageRepayment(_mortgageId);
    }

    /**
     *  @notice Charge borrowing fee.
     *
     *          Name            Description
     *  @param  _mortgageId     Mortgage identifier.
     */
    function _chargeFee(uint256 _mortgageId) internal virtual {
        CurrencyHandler.sendCurrency(
            mortgages[_mortgageId].currency,
            feeReceiver,
            mortgages[_mortgageId].fee
        );
    }

    /**
     *  @notice Transfer the collateral of a mortgage.
     *
     *          Name            Description
     *  @param  _mortgageId     Mortgage identifier.
     *  @param  _from           Sender address.
     *  @param  _to             Receiver address.
     */
    function _transferCollateral(
        uint256 _mortgageId,
        address _from,
        address _to
    ) internal virtual;
}
