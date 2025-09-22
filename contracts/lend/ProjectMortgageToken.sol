// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @openzeppelin/contracts-upgradeable/
import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC165Upgradeable.sol";
import {IERC2981Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC2981Upgradeable.sol";

/// contracts/launch/interfaces/
import {IProjectToken} from "../launch/interfaces/IProjectToken.sol";
import {IProjectTokenReceiver} from "../launch/interfaces/IProjectTokenReceiver.sol";

/// contracts/lend/interfaces/
import {IAssetMortgageToken} from "./interfaces/IAssetMortgageToken.sol";
import {IMortgageToken} from "./interfaces/IMortgageToken.sol";

/// contracts/launch/utilities/
import {ProjectTokenReceiver} from "../launch/utilities/ProjectTokenReceiver.sol";

/// contracts/lend/storages/
import {ProjectMortgageTokenStorage} from "./storages/ProjectMortgageTokenStorage.sol";

/// contracts/lend/utilities/
import {MortgageToken} from "./utilities/MortgageToken.sol";

/**
 *  @author Briky Team
 *
 *  @notice Interface for contract `IProjectMortgageToken`.
 *  @notice A `IProjectMortgageToken` contract facilitates peer-to-peer lending secured by project tokens as collateral. Each
 *          provided mortgage is tokenized into an ERC-721 token, whose owner has the right to receive repayments from the
 *          borrower or foreclose on the collateral from the contract once overdue.
 * 
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 */
contract ProjectMortgageToken is
ProjectMortgageTokenStorage,
MortgageToken,
ProjectTokenReceiver {
    /** ===== CONSTANT ===== **/
    string constant private VERSION = "v1.2.1";
    

    /** ===== FUNCTION ===== **/
    /* --- Initialization --- */
    /**
     *  @notice Initialize the contract after deployment, serving as the constructor.
     * 
     *          Name             Description
     *  @param  _admin           `Admin` contract address.
     *  @param  _projectToken    `ProjectToken` contract address.
     *  @param  _feeReceiver     `FeeReceiver` contract address.
     *  @param  _name            Token name.
     *  @param  _symbol          Token symbol.
     *  @param  _uri             Base URI.
     *  @param  _feeRate         Borrowing fee rate.
     */
    function initialize(
        address _admin,
        address _projectToken,
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

        projectToken = _projectToken;
    }


    /* --- Common --- */
    /**
     *          Name       Description
     *  @return version    Version of implementation.
     */
    function version() external pure returns (string memory) {
        return VERSION;
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
    returns (AssetCollateral memory) {
        return collaterals[_mortgageId];
    }


    /**
     *          Name            Description
     *  @param  _interfaceId    Interface identifier.
     *
     *  @return Whether this contract supports the interface.
     */
    function supportsInterface(
        bytes4 _interfaceId
    ) public view override(
        IERC165Upgradeable,
        MortgageToken
    ) returns (bool) {
        return _interfaceId == type(IAssetMortgageToken).interfaceId
            || _interfaceId == type(IProjectTokenReceiver).interfaceId
            || super.supportsInterface(_interfaceId);
    }


    /**
     *          Name            Description
     *  @param  _tokenId        Token identifier.
     *  @param  _price          Reference value.
     *
     *  @return receiver        Royalty receiver address.
     *  @return royalty         Royalty derived from the reference value.
     */
    function royaltyInfo(
        uint256 _tokenId,
        uint256 _price
    ) external view override returns (address, uint256) {
        _requireMinted(_tokenId);
        ( , uint256 royalty) = IProjectToken(projectToken).royaltyInfo(
            collaterals[_tokenId].tokenId,
            _price
        );
        return (feeReceiver, royalty);
    }


    /* --- Command --- */
    /**
     *          Name          Description
     *  @param  _projectId    Project identifier.
     *  @param  _amount       Collateral amount.
     *  @param  _principal    Principal value.
     *  @param  _repayment    Repayment value.
     *  @param  _currency     Currency address.
     *  @param  _duration     Borrowing duration.
     * 
     *  @return mortgageId    New mortgage identifier.
     * 
     *  @dev    Approval must be granted for this contract to transfer collateral before borrowing. A mortgage can only be
     *          lent while approval remains active.
     *  @dev    Collateral will be secured in the contract until the mortgage is either repaid, foreclosed, or cancelled.
     */
    function borrow(
        uint256 _projectId,
        uint256 _amount,
        uint256 _principal,
        uint256 _repayment,
        address _currency,
        uint40 _duration
    ) external
    whenNotPaused
    nonReentrant
    onlyAvailableCurrency(_currency)
    returns (uint256) {
        IProjectToken projectTokenContract = IProjectToken(projectToken);
        if (!projectTokenContract.isAvailable(_projectId)) {
            revert InvalidTokenId();
        }
        if (_amount == 0) {
            revert InvalidInput();
        }
        if (_amount > projectTokenContract.balanceOf(msg.sender, _projectId)) {
            revert InvalidCollateral();
        }
        
        uint256 mortgageId = _borrow(
            _principal,
            _repayment,
            _currency,
            _duration
        );

        collaterals[mortgageId] = AssetCollateral(
            _projectId,
            _amount
        );

        _transferCollateral(
            mortgageId,
            msg.sender,
            address(this)
        );

        emit NewCollateral(
            mortgageId,
            _projectId,
            _amount
        );

        return mortgageId;
    }


    /* --- Helper --- */
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
    ) internal override {
        IProjectToken(projectToken).safeTransferFrom(
            _from,
            _to,
            collaterals[_mortgageId].tokenId,
            collaterals[_mortgageId].amount,
            ""
        );
    }
}
