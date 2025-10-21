// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";

contract Collection is ERC721Upgradeable {
    uint256 public tokenNumber;

    function initialize(
        string calldata _name,
        string calldata _symbol
    ) external initializer {
        __ERC721_init(_name, _symbol);
    }

    function mint(address _account, uint256 _tokenId) external {
        _mint(_account, _tokenId);
    }

    function _beforeTokenTransfer(
        address _from,
        address _to,
        uint256 _firstTokenId,
        uint256 _batchSize
    ) internal override {
        if (_from == address(0)) {
            tokenNumber += _batchSize;
        }

        super._beforeTokenTransfer(_from, _to, _firstTokenId, _batchSize);
    }
} 