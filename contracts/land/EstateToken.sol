// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC20Upgradeable.sol";
import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC165Upgradeable.sol";
import {IERC1155Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC1155Upgradeable.sol";
import {IERC1155MetadataURIUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC1155MetadataURIUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {ERC1155Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import {ERC1155PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155PausableUpgradeable.sol";
import {ERC1155SupplyUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import {ERC1155URIStorageUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155URIStorageUpgradeable.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import {Constant} from "../lib/Constant.sol";
import {Formula} from "../lib/Formula.sol";

import {IAdmin} from "../common/interfaces/IAdmin.sol";
import {IRoyaltyRateProposer} from "../common/interfaces/IRoyaltyRateProposer.sol";

import {RoyaltyRateProposer} from "../common/utilities/RoyaltyRateProposer.sol";

import {ICommissionToken} from "./interfaces/ICommissionToken.sol";
import {IEstateToken} from "./interfaces/IEstateToken.sol";
import {IEstateTokenizer} from "./interfaces/IEstateTokenizer.sol";

import {EstateTokenStorage} from "./storages/EstateTokenStorage.sol";
import {Pausable} from "../common/utilities/Pausable.sol";

contract EstateToken is
EstateTokenStorage,
RoyaltyRateProposer,
ERC1155PausableUpgradeable,
ERC1155SupplyUpgradeable,
ERC1155URIStorageUpgradeable,
Pausable,
ReentrancyGuardUpgradeable {
    using Formula for uint256;
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
        require(_royaltyRate <= Constant.COMMON_RATE_MAX_FRACTION);
        __ERC1155Pausable_init();

        __ReentrancyGuard_init();

        admin = _admin;
        feeReceiver = _feeReceiver;

        _setBaseURI(_uri);

        royaltyRate = _royaltyRate;

        emit BaseURIUpdate(_uri);
        emit RoyaltyRateUpdate(_royaltyRate);
    }

    function version() external pure returns (string memory) {
        return VERSION;
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
        if (_commissionToken == address(0) || commissionToken != address(0)) {
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
        if (_royaltyRate > Constant.COMMON_RATE_MAX_FRACTION) {
            revert InvalidRate();
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
                emit TokenizerAuthorization(_accounts[i]);
            }
        } else {
            for (uint256 i = 0; i < _accounts.length; ++i) {
                if (!isTokenizer[_accounts[i]]) {
                    revert NotAuthorizedAccount(_accounts[i]);
                }
                isTokenizer[_accounts[i]] = false;
                emit TokenizerDeauthorization(_accounts[i]);
            }
        }
    }

    function getRoyaltyRate() public view override(IRoyaltyRateProposer, RoyaltyRateProposer) returns (Rate memory) {
        return Rate(royaltyRate, Constant.COMMON_RATE_DECIMALS);
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
        if (!IAdmin(admin).isZone(_zone)
            || _decimals > Constant.ESTATE_TOKEN_MAX_DECIMALS
            || _expireAt <= uint40(block.timestamp)) {
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
        if (!exists(_estateId)) {
            revert InvalidEstateId();
        }
        if (estates[_estateId].isDeprecated) {
            revert Deprecated();
        }
        if (_expireAt <= block.timestamp) {
            revert InvalidInput();
        }
        estates[_estateId].expireAt = _expireAt;
        emit EstateExpirationExtension(_estateId, _expireAt);
    }

    function updateEstateURI(uint256 _estateId, string calldata _uri) external onlyManager {
        if (!isAvailable(_estateId)) revert InvalidEstateId();
        _setURI(_estateId, _uri);
    }

    function balanceOf(address _account, uint256 _tokenId)
    public view override(IERC1155Upgradeable, ERC1155Upgradeable) returns (uint256) {
        return estates[_tokenId].isDeprecated || estates[_tokenId].expireAt <= block.timestamp
            ? 0
            : super.balanceOf(_account, _tokenId);
    }

    function balanceOfAt(address _account, uint256 _tokenId, uint256 _at) external view returns (uint256) {
        Snapshot[] storage snapshots = balanceSnapshots[_tokenId][_account];
        uint256 high = snapshots.length;
        if (high == 0 || _at < snapshots[0].timestamp) {
            return IEstateTokenizer(estates[_tokenId].tokenizer).allocationOfAt(
                estates[_tokenId].tokenizationId,
                _account,
                _at
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

    function uri(uint256 _tokenId) public view override(
        IERC1155MetadataURIUpgradeable,
        ERC1155Upgradeable,
        ERC1155URIStorageUpgradeable
    ) returns (string memory) {
        return super.uri(_tokenId);
    }

    function totalSupply(uint256 _tokenId)
    public view override(IEstateToken, ERC1155SupplyUpgradeable) returns (uint256) {
        return super.totalSupply(_tokenId);
    }

    function exists(uint256 _tokenId)
    public view override(IEstateToken, ERC1155SupplyUpgradeable) returns (bool) {
        return super.exists(_tokenId);
    }

    function supportsInterface(bytes4 _interfaceId) public view override(
        IERC165Upgradeable,
        RoyaltyRateProposer,
        ERC1155Upgradeable
    ) returns (bool) {
        return super.supportsInterface(_interfaceId);
    }

    function _beforeTokenTransfer(
        address _operator,
        address _from,
        address _to,
        uint256[] memory _ids,
        uint256[] memory _amounts,
        bytes memory _data
    ) internal override(
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
    ) internal override {
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

    function _royaltyReceiver() internal view override returns (address) {
        return feeReceiver;
    }
}
