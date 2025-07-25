// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC165Upgradeable.sol";
import {IERC2981Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC2981Upgradeable.sol";
import {ERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";

import {Formula} from "../../lib/Formula.sol";

import {CommonConstant} from "../constants/CommonConstant.sol";

import {IAdmin} from "../interfaces/IAdmin.sol";
import {IRoyaltyRateProposer} from "../interfaces/IRoyaltyRateProposer.sol";

import {RoyaltyRateProposerStorage} from "../storages/RoyaltyRateProposerStorage.sol";

abstract contract RoyaltyRateProposer is
RoyaltyRateProposerStorage,
ERC165Upgradeable {
    using Formula for uint256;

    function _royaltyReceiver() internal view virtual returns (address royaltyReceiver);

    function __RoyaltyRateProposer_init(uint256 _royaltyRate) internal onlyInitializing {
        require(_royaltyRate <= CommonConstant.RATE_MAX_FRACTION);
        royaltyRate = _royaltyRate;
        emit RoyaltyRateUpdate(_royaltyRate);
    }

    function updateRoyaltyRate(
        uint256 _royaltyRate,
        bytes[] calldata _signatures
    ) external {
        IAdmin(this.admin()).verifyAdminSignatures(
            abi.encode(
                address(this),
                "updateRoyaltyRate",
                _royaltyRate
            ),
            _signatures
        );
        if (_royaltyRate > CommonConstant.RATE_MAX_FRACTION) {
            revert InvalidRate();
        }
        royaltyRate = _royaltyRate;
        emit RoyaltyRateUpdate(_royaltyRate);
    }

    function getRoyaltyRate() public view virtual returns (Rate memory) {
        return Rate(royaltyRate, CommonConstant.RATE_DECIMALS);
    }

    function royaltyInfo(uint256, uint256 _salePrice) external view returns (address, uint256) {
        return (_royaltyReceiver(), _salePrice.scale(royaltyRate, CommonConstant.RATE_MAX_FRACTION));
    }

    function supportsInterface(bytes4 _interfaceId)
    public view virtual override(IERC165Upgradeable, ERC165Upgradeable) returns (bool) {
        return _interfaceId == type(IERC2981Upgradeable).interfaceId
            || _interfaceId == type(IRoyaltyRateProposer).interfaceId
            || super.supportsInterface(_interfaceId);
    }
}
