// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC165Upgradeable.sol";
import {IERC2981Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC2981Upgradeable.sol";
import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";

import {CommonConstant} from "../../common/constants/CommonConstant.sol";

import {ICommon} from "../../common/interfaces/ICommon.sol";

import {RoyaltyRateProposer} from "../../common/utilities/RoyaltyRateProposer.sol";

contract RoyaltyCollection is ERC721Upgradeable, RoyaltyRateProposer {
    address public admin;
    address public royaltyReceiver;
    uint256 public royaltyRate;
    uint256 public tokenNumber;

    string constant private VERSION = "v1.2.1";

    function initialize(
        address _admin,
        address _feeReceiver,
        uint256 _royaltyRate,
        string calldata _name,
        string calldata _symbol
    ) external initializer {
        __ERC721_init(_name, _symbol);

        admin = _admin;
        royaltyReceiver = _feeReceiver;
        royaltyRate = _royaltyRate;
    }

    function version() external pure returns (string memory) {
        return VERSION;
    }

    function updateRoyaltyRate(uint256 _rate) external {
        royaltyRate = _rate;
    }

    function updateRoyaltyReceiver(address _receiver) external {
        royaltyReceiver = _receiver;
    }

    function mint(address _account, uint256 _tokenId) external {
        _mint(_account, _tokenId);
    }

    function burn(uint256 _tokenId) external {
        _burn(_tokenId);
    }

    function supportsInterface(bytes4 _interfaceId) public view override(
        IERC165Upgradeable,
        ERC721Upgradeable
    ) returns (bool) {
        return _interfaceId == type(IERC2981Upgradeable).interfaceId
            || super.supportsInterface(_interfaceId);
    }

    function getRoyaltyRate(uint256) public view override returns (Rate memory rate) {
        return Rate(royaltyRate, CommonConstant.RATE_DECIMALS);
    }

    function _royaltyReceiver() internal view virtual override returns (address) {
        return royaltyReceiver;
    }

    function _beforeTokenTransfer(
        address _from,
        address _to,
        uint256 _firstTokenId,
        uint256 _batchSize
    ) internal override(ERC721Upgradeable) {
        if (_from == address(0)) {
            tokenNumber += _batchSize;
        }

        return super._beforeTokenTransfer(_from, _to, _firstTokenId, _batchSize);
    }
}
