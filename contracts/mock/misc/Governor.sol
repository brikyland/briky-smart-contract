// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC165Upgradeable.sol";
import {IERC1155Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC1155Upgradeable.sol";
import {ERC1155Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import {ERC1155SupplyUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";

import {Formula} from "../../common/utilities/Formula.sol";

import {IAdmin} from "../../common/interfaces/IAdmin.sol";
import {IGovernor} from "../../common/interfaces/IGovernor.sol";

contract Governor is
IGovernor,
ERC1155Upgradeable,
ERC1155SupplyUpgradeable {
    mapping(uint256 => mapping(address => Snapshot[])) public balanceSnapshots;
    mapping(uint256 => bytes32) public zones;
    mapping(uint256 => address) public custodians;
    address public admin;

    struct Snapshot {
        uint256 value;
        uint256 timestamp;
    }

    error InvalidTokenId();

    using Formula for uint256;

    string constant private VERSION = "v1.2.1";

    receive() external payable {}

    function initialize(address _admin) external initializer {
        __ERC1155_init("");

        admin = _admin;
    }

    function setZone(uint256 _tokenId, bytes32 _zone) external {
        zones[_tokenId] = _zone;
    }

    function setCustodian(uint256 _tokenId, address _custodian) external {
        custodians[_tokenId] = _custodian;
    }
    
    function mint(uint256 _tokenId, uint256 _amount) external {
        _mint(msg.sender, _tokenId, _amount, "");
    }

    function burn(uint256 _tokenId, uint256 _amount) external {
        _burn(msg.sender, _tokenId, _amount);
    }

    function zoneOf(uint256 _tokenId) external view returns (bytes32) {
        return zones[_tokenId];
    }

    function isAvailable(uint256 _tokenId) external view returns (bool) {
        return exists(_tokenId);
    }

    function getRepresentative(uint256 _tokenId) external view returns (address) {
        return custodians[_tokenId];
    }
    
    function balanceOf(address _account, uint256 _tokenId)
    public view override(
        ERC1155Upgradeable,
        IERC1155Upgradeable
    ) returns (uint256) {
        return super.balanceOf(_account, _tokenId);
    }

    function balanceOfAt(address _account, uint256 _tokenId, uint256 _at) public view returns (uint256) {
        if (!exists(_tokenId)) {
            revert InvalidTokenId();
        }
        Snapshot[] storage snapshots = balanceSnapshots[_tokenId][_account];
        uint256 high = snapshots.length;
        if (high == 0 || _at < snapshots[0].timestamp) {
            return 0;
        }
        uint256 low = 0;
        uint256 pivot;
        while (low < high) {
            uint256 mid = (low + high) >> 1;
            if (snapshots[mid].timestamp <= _at) {
                pivot = mid;
                low = mid + 1;
            } else {
                high = mid;
            }
        }
        return snapshots[pivot].value;
    }

    function totalSupply(uint256 _tokenId)
    public view override(ERC1155SupplyUpgradeable) returns (uint256) {
        return super.totalSupply(_tokenId);
    }

    function totalEquityAt(uint256 _tokenId, uint256) external view returns (uint256) {
        if (!exists(_tokenId)) {
            revert InvalidTokenId();
        }
        return totalSupply(_tokenId);
    }

    function equityOfAt(address _account, uint256 _tokenId, uint256 _at) external view returns (uint256) {
        if (!exists(_tokenId)) {
            revert InvalidTokenId();
        }

        return balanceOfAt(_account, _tokenId, _at);
    }

    function supportsInterface(bytes4 _interfaceId) public view override(
        IERC165Upgradeable,
        ERC1155Upgradeable        
    ) returns (bool) {
        return _interfaceId == type(IGovernor).interfaceId
            || ERC1155Upgradeable.supportsInterface(_interfaceId)
            || super.supportsInterface(_interfaceId);
    }

    function _beforeTokenTransfer(
        address _operator,
        address _from,
        address _to,
        uint256[] memory _tokenIds,
        uint256[] memory _amounts,
        bytes memory _data
    ) internal override(
        ERC1155Upgradeable,
        ERC1155SupplyUpgradeable
    ) {
        super._beforeTokenTransfer(_operator, _from, _to, _tokenIds, _amounts, _data);
    }

    function _afterTokenTransfer(
        address _operator,
        address _from,
        address _to,
        uint256[] memory _tokenIds,
        uint256[] memory _amounts,
        bytes memory _data
    ) internal override {
        super._afterTokenTransfer(_operator, _from, _to, _tokenIds, _amounts, _data);
        uint256 timestamp = block.timestamp;
        for (uint256 i; i < _tokenIds.length; ++i) {
            uint256 estateId = _tokenIds[i];
            if (_from != address(0)) {
                balanceSnapshots[estateId][_from].push(Snapshot(balanceOf(_from, estateId), timestamp));
            }
            if (_to != address(0)) {
                balanceSnapshots[estateId][_to].push(Snapshot(balanceOf(_to, estateId), timestamp));
            }
        }
    }
}
