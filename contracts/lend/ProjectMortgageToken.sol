// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @openzeppelin/contracts-upgradeable/
import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC165Upgradeable.sol";
import {IERC2981Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC2981Upgradeable.sol";

/// contracts/launch/interfaces/
import {IProjectToken} from "../launch/interfaces/IProjectToken.sol";
import {IProjectTokenReceiver} from "../launch/interfaces/IProjectTokenReceiver.sol";

/// contracts/lend/interfaces/
import {IProjectMortgageToken} from "./interfaces/IProjectMortgageToken.sol";
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
 *  @notice Implementation of contract `ProjectMortgageToken`.
 *
 *  @notice A `ProjectMortgageToken` contract is an ERC-721 contract that facilitates mortgage-based borrowing backed by project token collaterals and issues tokens representing mortgages.
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
     *  @notice Invoked for initialization after deployment, serving as the contract constructor.
     * 
     *          Name             Description
     *  @param  _admin           `Admin` contract address.
     *  @param  _projectToken    `ProjectToken` contract address.
     *  @param  _feeReceiver     `FeeReceiver` contract address.
     *  @param  _name            Token name.
     *  @param  _symbol          Token symbol.
     *  @param  _uri             Token base URI.
     *  @param  _feeRate         Fee rate.
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


    /* --- Standard --- */
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
    returns (ProjectCollateral memory) {
        return collaterals[_mortgageId];
    }


    /* --- Command --- */
    /**
     *          Name          Description
     *  @param  _projectId    Project identifier.
     *  @param  _amount       Amount of project tokens pledged as collateral.
     *  @param  _principal    Principal value.
     *  @param  _repayment    Repayment value.
     *  @param  _currency     Loan currency address.
     *  @param  _duration     Repayment duration.
     *  @return mortgageId    New mortgage identifier.
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

        collaterals[mortgageId] = ProjectCollateral(
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


    /* --- Override --- */
    /**
     *          Name            Description
     *  @param  _interfaceId    Interface identifier.
     * 
     *  @return Whether the contract supports the interface.
     */
    function supportsInterface(
        bytes4 _interfaceId
    ) public view override(
        IERC165Upgradeable,
        MortgageToken
    ) returns (bool) {
        return _interfaceId == type(IProjectMortgageToken).interfaceId
            || _interfaceId == type(IMortgageToken).interfaceId
            || _interfaceId == type(IProjectTokenReceiver).interfaceId
            || _interfaceId == type(IERC2981Upgradeable).interfaceId
            || super.supportsInterface(_interfaceId);
    }

    /**
     *          Name            Description
     *  @param  _tokenId        Token identifier.
     *  @param  _price          Price.
     * 
     *  @return Royalty receiver address.
     *  @return Royalty amount.
     */
    function royaltyInfo(
        uint256 _tokenId,
        uint256 _price
    ) external view override returns (address, uint256) {
        _requireMinted(_tokenId);
        ( , uint256 royalty) = IProjectToken(projectToken).royaltyInfo(collaterals[_tokenId].projectId, _price);
        return (feeReceiver, royalty);
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
        IProjectToken(projectToken).safeTransferFrom(
            _from,
            _to,
            collaterals[_mortgageId].projectId,
            collaterals[_mortgageId].amount,
            ""
        );
    }
}
