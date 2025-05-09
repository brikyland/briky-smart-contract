// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC165Upgradeable.sol";
import {IERC2981Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC2981Upgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {IERC1155Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";
import {ERC1155Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import {ERC1155PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155PausableUpgradeable.sol";
import {ERC1155SupplyUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import {ERC1155URIStorageUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155URIStorageUpgradeable.sol";
import {IERC1155MetadataURIUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/IERC1155MetadataURIUpgradeable.sol";
import {ERC1155ReceiverUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155ReceiverUpgradeable.sol";
import {ERC1155HolderUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {ERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";

import {Constant} from "../lib/Constant.sol";
import {MulDiv} from "../lib/MulDiv.sol";

import {IAdmin} from "../common/interfaces/IAdmin.sol";

import {ICommissionToken} from "./interfaces/ICommissionToken.sol";
import {IEstateToken} from "./interfaces/IEstateToken.sol";
import {IEstateTokenizer} from "./interfaces/IEstateTokenizer.sol";

import {EstateTokenStorage} from "./storages/EstateTokenStorage.sol";

contract EstateToken is
EstateTokenStorage,
ERC1155PausableUpgradeable,
ERC1155SupplyUpgradeable,
ERC1155URIStorageUpgradeable,
ERC1155HolderUpgradeable,
ReentrancyGuardUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    string constant private VERSION = "v1.1.1";

    receive() external payable {}

    modifier onlyManager() {
        if (!IAdmin(admin).isManager(msg.sender)) {
            revert Unauthorized();
        }
        _;
    }

    modifier onlyTokenizer() {
        if (!isTokenizer[msg.sender]) {
            revert Unauthorized();
        }
        _;
    }

    function initialize(
        address _admin,
        address _feeReceiver,
        string calldata _uri,
        uint256 _royaltyRate
    ) external initializer {
        require(_royaltyRate <= Constant.COMMON_PERCENTAGE_DENOMINATOR);
        __ERC1155Pausable_init();
        __ERC1155Supply_init();
        __ERC1155URIStorage_init();
        __ERC1155Holder_init();

        __ReentrancyGuard_init();

        admin = _admin;
        feeReceiver = _feeReceiver;

        _setBaseURI(_uri);

        royaltyRate = _royaltyRate;

        emit RoyaltyRateUpdate(_royaltyRate);
    }

    function version() external pure returns (string memory) {
        return VERSION;
    }

    function pause(bytes[] calldata _signatures) external whenNotPaused {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(address(this), "pause"),
            _signatures
        );
        _pause();
    }

    function unpause(bytes[] calldata _signatures) external whenPaused {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(address(this), "unpause"),
            _signatures
        );
        _unpause();
    }

    function updateCommissionToken(
        address _commissionToken,
        bytes[] calldata _signatures
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "updateCommissionToken",
                _commissionToken
            ),
            _signatures
        );
        if (commissionToken != address(0)) {
            revert InvalidUpdating();
        }
        commissionToken = _commissionToken;
        emit CommissionTokenUpdate(_commissionToken);
    }

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
        _setBaseURI(_uri);
        emit BaseURIUpdate(_uri);
    }

    function updateRoyaltyRate(
        uint256 _royaltyRate,
        bytes[] calldata _signatures
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "updateRoyaltyRate",
                _royaltyRate
            ),
            _signatures
        );
        if (_royaltyRate > Constant.COMMON_PERCENTAGE_DENOMINATOR) {
            revert InvalidPercentage();
        }
        royaltyRate = _royaltyRate;
        emit RoyaltyRateUpdate(_royaltyRate);
    }

    function authorizeTokenizers(
        address[] calldata _accounts,
        bool _isTokenizer,
        bytes[] calldata _signatures
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "authorizeTokenizers",
                _accounts,
                _isTokenizer
            ),
            _signatures
        );

        if (_isTokenizer) {
            for (uint256 i = 0; i < _accounts.length; ++i) {
                if (isTokenizer[_accounts[i]]) {
                    revert AuthorizedAccount(_accounts[i]);
                }
                if (!IEstateTokenizer(_accounts[i]).supportsInterface(type(IEstateTokenizer).interfaceId)) {
                    revert InvalidTokenizer(_accounts[i]);
                }
                isTokenizer[_accounts[i]] = true;
            }
        } else {
            for (uint256 i = 0; i < _accounts.length; ++i) {
                if (!isTokenizer[_accounts[i]]) {
                    revert NotAuthorizedAccount(_accounts[i]);
                }
                isTokenizer[_accounts[i]] = false;
            }
        }
    }

    function getEstate(uint256 _estateId) external view returns (Estate memory) {
        if (!exists(_estateId)) {
            revert InvalidEstateId();
        }
        return estates[_estateId];
    }

    function tokenizeEstate(
        uint256 _totalSupply,
        bytes32 _zone,
        uint256 _tokenizationId,
        string calldata _uri,
        uint40 _expireAt,
        uint8 _decimals,
        address _commissionReceiver
    ) external onlyTokenizer returns (uint256) {
        if (_expireAt <= uint40(block.timestamp)) {
            revert InvalidInput();
        }

        uint256 estateId = ++estateNumber;
        estates[estateId] = Estate(
            _zone,
            _tokenizationId,
            msg.sender,
            uint40(block.timestamp),
            _expireAt,
            _decimals,
            false
        );
        _mint(msg.sender, estateId, _totalSupply, "");
        _setURI(estateId, _uri);

        if (_commissionReceiver != address(0)) {
            ICommissionToken(commissionToken).mint(
                _commissionReceiver,
                estateId
            );
        }

        emit NewToken(
            estateId,
            _zone,
            _tokenizationId,
            msg.sender,
            uint40(block.timestamp),
            _expireAt,
            _decimals
        );

        return estateId;
    }

    function isAvailable(uint256 _estateId) public view returns (bool) {
        return exists(_estateId)
            && !estates[_estateId].isDeprecated
            && estates[_estateId].expireAt > block.timestamp;
    }

    function deprecateEstate(uint256 _estateId) external onlyManager {
        if (!IAdmin(admin).isManager(msg.sender)) revert Unauthorized();
        if (!exists(_estateId)) revert InvalidEstateId();
        if (estates[_estateId].isDeprecated) revert Deprecated();
        estates[_estateId].isDeprecated = true;
        emit EstateDeprecation(_estateId);
    }

    function extendEstateExpiration(uint256 _estateId, uint40 _expireAt) external onlyManager {
        if (!exists(_estateId)) revert InvalidEstateId();
        if (estates[_estateId].isDeprecated) revert Deprecated();
        if (_expireAt <= block.timestamp) revert InvalidInput();
        estates[_estateId].expireAt = _expireAt;
        emit EstateExpirationExtension(_estateId, _expireAt);
    }

    function updateEstateURI(uint256 _estateId, string calldata _uri) external onlyManager {
        if (!isAvailable(_estateId)) revert InvalidEstateId();
        _setURI(_estateId, _uri);
    }

    function balanceOf(address _account, uint256 _tokenId)
    public view override (ERC1155Upgradeable, IERC1155Upgradeable) returns (uint256) {
        return estates[_tokenId].isDeprecated || estates[_tokenId].expireAt <= block.timestamp
            ? 0
            : super.balanceOf(_account, _tokenId);
    }

    function balanceOfAt(address _account, uint256 _tokenId, uint256 _at) external view returns (uint256) {
        Snapshot[] storage snapshots = balanceSnapshots[_tokenId][_account];
        uint256 high = snapshots.length;
        if (high == 0 || _at < snapshots[0].timestamp) {
            return IEstateTokenizer(estates[_tokenId].tokenizer).allocationOf(
                estates[_tokenId].tokenizationId,
                _account
            );
        }
        uint256 low = 0;
        uint256 pivot;
        while (low < high) {
            uint256 mid = (low + high) >> 1;
            if (snapshots[mid].timestamp <= _at) {
                pivot = mid;
                low = mid + 1;
            } else high = mid;
        }
        return snapshots[pivot].value;
    }

    function uri(uint256 _tokenId) public view override (
        IERC1155MetadataURIUpgradeable,
        ERC1155Upgradeable,
        ERC1155URIStorageUpgradeable
    ) returns (string memory) {
        return super.uri(_tokenId);
    }

    function royaltyInfo(uint256 _tokenId, uint256 _salePrice) external view returns (address, uint256) {
        return (
            feeReceiver,
            MulDiv.mulDiv(
                _salePrice,
                royaltyRate,
                Constant.COMMON_PERCENTAGE_DENOMINATOR
            )
        );
    }

    function totalSupply(uint256 _tokenId)
    public view override (ERC1155SupplyUpgradeable, IEstateToken) returns (uint256) {
        return super.totalSupply(_tokenId);
    }

    function exists(uint256 _tokenId)
    public view override (ERC1155SupplyUpgradeable, IEstateToken) returns (bool) {
        return super.exists(_tokenId);
    }

    function supportsInterface(bytes4 _interfaceId) public view override (
        IERC165Upgradeable,
        ERC1155Upgradeable,
        ERC1155ReceiverUpgradeable
    ) returns (bool) {
        return _interfaceId == type(IERC2981Upgradeable).interfaceId || super.supportsInterface(_interfaceId);
    }

    function _beforeTokenTransfer(
        address _operator,
        address _from,
        address _to,
        uint256[] memory _ids,
        uint256[] memory _amounts,
        bytes memory _data
    ) internal override (
        ERC1155Upgradeable,
        ERC1155PausableUpgradeable,
        ERC1155SupplyUpgradeable
    ) {
        super._beforeTokenTransfer(_operator, _from, _to, _ids, _amounts, _data);
        uint256 n = _ids.length;
        for (uint256 i = 0; i < n; ++i) {
            require(
                !estates[_ids[i]].isDeprecated && estates[_ids[i]].expireAt > block.timestamp,
                "estateToken: Token is unavailable"
            );
        }
    }

    function _afterTokenTransfer(
        address _operator,
        address _from,
        address _to,
        uint256[] memory _ids,
        uint256[] memory _amounts,
        bytes memory _data
    ) internal override (ERC1155Upgradeable) {
        super._afterTokenTransfer(_operator, _from, _to, _ids, _amounts, _data);
        uint256 timestamp = block.timestamp;
        uint256 n = _ids.length;
        for (uint256 i = 0; i < n; ++i) {
            uint256 tokenId = _ids[i];
            if (_from != address(0)) {
                balanceSnapshots[tokenId][_from].push(Snapshot(balanceOf(_from, tokenId), timestamp));
            }
            if (_to != address(0)) {
                balanceSnapshots[tokenId][_to].push(Snapshot(balanceOf(_to, tokenId), timestamp));
            }
        }
    }
}
