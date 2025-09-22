// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @openzeppelin/contracts-upgradeable/
import {ERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";

/// contracts/common/interfaces/
import {IRoyaltyRateProposer} from "../interfaces/IRoyaltyRateProposer.sol";

/// contracts/common/utilities/
import {Formula} from "./Formula.sol";

/**
 *  @author Briky Team
 *
 *  @notice A `RoyaltyRateProposer` contract is an ERC-2981 contract that always announces royalty payment as a predefined
 *          fraction of the price, according to a royalty rate on each asset.
 */
abstract contract RoyaltyRateProposer is
IRoyaltyRateProposer {
    /** ===== LIBRARY ===== **/
    using Formula for uint256;


    /** ===== FUNCTION ===== **/
    /**
     *          Name        Description
     *  @param  _tokenId    Token identifier.
     *  @param  _price      Reference value.
     *  @return receiver    Royalty receiver address.
     *  @return royalty     Royalty derived from the reference value.
     */
    function royaltyInfo(
        uint256 _tokenId,
        uint256 _price
    ) external view returns (
        address receiver,
        uint256 royalty
    ) {
        return (
            _royaltyReceiver(),
            _price.scale(this.getRoyaltyRate(_tokenId))
        );
    }


    /**
     *          Name                Description
     *  @return royaltyReceiver     Default royalty receiver address.
     */
    function _royaltyReceiver() internal view virtual returns (address royaltyReceiver);
}
