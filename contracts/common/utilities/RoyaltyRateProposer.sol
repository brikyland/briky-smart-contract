// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC165Upgradeable.sol";
import {IERC2981Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC2981Upgradeable.sol";
import {ERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";

import {Formula} from "../../lib/Formula.sol";

import {IRoyaltyRateProposer} from "../interfaces/IRoyaltyRateProposer.sol";

abstract contract RoyaltyRateProposer is
IRoyaltyRateProposer,
ERC165Upgradeable {
    using Formula for uint256;

    function _royaltyReceiver() internal view virtual returns (address royaltyReceiver);
    function getRoyaltyRate() public view virtual returns (Rate memory rate);

    function royaltyInfo(uint256, uint256 _salePrice) external view returns (address, uint256) {
        return (_royaltyReceiver(), _salePrice.scale(getRoyaltyRate()));
    }

    function supportsInterface(bytes4 _interfaceId)
    public view virtual override(IERC165Upgradeable, ERC165Upgradeable) returns (bool) {
        return _interfaceId == type(IERC2981Upgradeable).interfaceId
            || _interfaceId == type(IRoyaltyRateProposer).interfaceId
            || super.supportsInterface(_interfaceId);
    }
}
