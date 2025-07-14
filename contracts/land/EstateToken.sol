// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC165Upgradeable.sol";
import {IERC1155Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC1155Upgradeable.sol";
import {IERC1155MetadataURIUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC1155MetadataURIUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {ERC1155Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import {ERC1155PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155PausableUpgradeable.sol";
import {ERC1155SupplyUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import {ERC1155URIStorageUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155URIStorageUpgradeable.sol";
import {ERC165CheckerUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";

import {Constant} from "../lib/Constant.sol";
import {CurrencyHandler} from "../lib/CurrencyHandler.sol";
import {Formula} from "../lib/Formula.sol";

import {IAdmin} from "../common/interfaces/IAdmin.sol";
import {IGovernanceHub} from "../common/interfaces/IGovernanceHub.sol";
import {IGovernor} from "../common/interfaces/IGovernor.sol";
import {IPaymentHub} from "../common/interfaces/IPaymentHub.sol";
import {IRoyaltyRateProposer} from "../common/interfaces/IRoyaltyRateProposer.sol";

import {Administrable} from "../common/utilities/Administrable.sol";
import {Pausable} from "../common/utilities/Pausable.sol";
import {Validatable} from "../common/utilities/Validatable.sol";
import {RoyaltyRateProposer} from "../common/utilities/RoyaltyRateProposer.sol";

import {ICommissionToken} from "./interfaces/ICommissionToken.sol";
import {IEstateToken} from "./interfaces/IEstateToken.sol";
import {IEstateTokenizer} from "./interfaces/IEstateTokenizer.sol";

import {EstateTokenStorage} from "./storages/EstateTokenStorage.sol";

contract EstateToken is
EstateTokenStorage,
RoyaltyRateProposer,
ERC1155PausableUpgradeable,
ERC1155SupplyUpgradeable,
ERC1155URIStorageUpgradeable,
Administrable,
Validatable,
Pausable,
ReentrancyGuardUpgradeable {
    using ERC165CheckerUpgradeable for address;
    using Formula for uint256;

    string constant private VERSION = "v1.1.1";

    modifier validEstate(uint256 _estateId) {
        if (!isAvailable(_estateId)) {
            revert InvalidEstateId();
        }
        _;
    }

    modifier validExtraction(uint256 _extractionId) {
        if (_extractionId == 0 || _extractionId > extractionNumber) {
            revert InvalidExtractionId();
        }
        _;
    }

    modifier onlyEligibleZone(uint256 _estateId) {
        if (!IAdmin(admin).getZoneEligibility(estates[_estateId].zone, msg.sender)) {
            revert Unauthorized();
        }
        _;
    }

    receive() external payable {}

    function initialize(
        address _admin,
        address _feeReceiver,
        address _governanceHub,
        address _paymentHub,
        address _validator,
        string calldata _uri,
        uint256 _royaltyRate
    ) external initializer {
        require(_royaltyRate <= Constant.COMMON_RATE_MAX_FRACTION);

        __ERC1155Pausable_init();

        __ReentrancyGuard_init();

        __Validatable_init(_validator);

        admin = _admin;
        feeReceiver = _feeReceiver;
        governanceHub = _governanceHub;
        paymentHub = _paymentHub;
        validator = _validator;

        _setBaseURI(_uri);

        royaltyRate = _royaltyRate;

        emit BaseURIUpdate(_uri);
        emit RoyaltyRateUpdate(_royaltyRate);
    }

    function version() external pure returns (string memory) {
        return VERSION;
    }

    function decimals() external pure returns (uint8) {
        return Constant.ESTATE_TOKEN_DECIMALS;
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
            for (uint256 i; i < _accounts.length; ++i) {
                if (isTokenizer[_accounts[i]]) {
                    revert AuthorizedAccount(_accounts[i]);
                }
                if (!_accounts[i].supportsInterface(type(IEstateTokenizer).interfaceId)) {
                    revert InvalidTokenizer(_accounts[i]);
                }
                isTokenizer[_accounts[i]] = true;
                emit TokenizerAuthorization(_accounts[i]);
            }
        } else {
            for (uint256 i; i < _accounts.length; ++i) {
                if (!isTokenizer[_accounts[i]]) {
                    revert NotAuthorizedAccount(_accounts[i]);
                }
                isTokenizer[_accounts[i]] = false;
                emit TokenizerDeauthorization(_accounts[i]);
            }
        }
    }

    function getRoyaltyRate()
    public view override(IRoyaltyRateProposer, RoyaltyRateProposer) returns (Rate memory) {
        return Rate(royaltyRate, Constant.COMMON_RATE_DECIMALS);
    }

    function getEstate(uint256 _estateId) external view returns (Estate memory) {
        if (!exists(_estateId)) {
            revert InvalidEstateId();
        }
        return estates[_estateId];
    }

    function getExtraction(uint256 _extractionId)
    external view validExtraction(_extractionId) returns (Extraction memory) {
        return extractions[_extractionId];
    }

    function tokenizeEstate(
        uint256 _totalSupply,
        bytes32 _zone,
        uint256 _tokenizationId,
        string calldata _uri,
        uint40 _expireAt,
        address _commissionReceiver
    ) external whenNotPaused returns (uint256) {
        if (!isTokenizer[msg.sender]) {
            revert Unauthorized();
        }

        if (!IAdmin(admin).isZone(_zone)) {
            revert InvalidInput();
        }

        if (_expireAt <= block.timestamp) {
            revert InvalidTimestamp();
        }

        uint256 estateId = ++estateNumber;
        estates[estateId] = Estate(
            _zone,
            _tokenizationId,
            msg.sender,
            uint40(block.timestamp),
            _expireAt,
            Constant.COMMON_INFINITE_TIMESTAMP
        );
        _mint(msg.sender, estateId, _totalSupply, "");
        _setURI(estateId, _uri);

        ICommissionToken(commissionToken).mint(
            _commissionReceiver,
            estateId
        );

        emit NewToken(
            estateId,
            _zone,
            _tokenizationId,
            msg.sender,
            uint40(block.timestamp),
            _expireAt
        );

        return estateId;
    }

    function deprecateEstate(uint256 _estateId)
    external validEstate(_estateId) onlyManager onlyEligibleZone(_estateId) {
        estates[_estateId].deprecateAt = uint40(block.timestamp);
        emit EstateDeprecation(_estateId);
    }

    function extendEstateExpiration(uint256 _estateId, uint40 _expireAt)
    external validEstate(_estateId) onlyManager onlyEligibleZone(_estateId) {
        if (_expireAt <= block.timestamp) {
            revert InvalidTimestamp();
        }
        estates[_estateId].expireAt = _expireAt;
        emit EstateExpirationExtension(_estateId, _expireAt);
    }

    function updateEstateURI(
        uint256 _estateId,
        string calldata _uri,
        Validation calldata _validation
    ) external validEstate(_estateId) onlyManager onlyEligibleZone(_estateId) {
        _validate(
            abi.encode(_estateId, _uri),
            _validation
        );

        _setURI(_estateId, _uri);
    }

    function requestExtraction(
        uint256 _estateId,
        uint256 _value,
        address _currency,
        bytes32 _uuid,
        Validation calldata _validation
    ) external nonReentrant validEstate(_estateId) onlyEligibleZone(_estateId) onlyAvailableCurrency(_currency) whenNotPaused returns (uint256) {
        if (_value == 0) {
            revert InvalidInput();
        }

        CurrencyHandler.receiveCurrency(_currency, _value);

        uint256 proposalId = IGovernanceHub(governanceHub).propose(
            address(this),
            _estateId,
            msg.sender,
            _uuid,
            ProposalRule.ApprovalBeyondQuorum,
            totalSupply(_estateId).scale(
                estates[_estateId].tokenizeAt + Constant.ESTATE_TOKEN_EXTRACTION_UNANIMOUS_GUARD_DURATION > block.timestamp
                ? Constant.ESTATE_TOKEN_EXTRACTION_UNANIMOUS_QUORUM_RATE
                : Constant.ESTATE_TOKEN_EXTRACTION_MAJORITY_QUORUM_RATE,
                Constant.COMMON_RATE_MAX_FRACTION
            ),
            Constant.ESTATE_TOKEN_EXTRACTION_VOTING_DURATION,
            uint40(block.timestamp) + Constant.ESTATE_TOKEN_EXTRACTION_ADMISSION_DURATION,
            _validation
        );

        uint256 extractionId = ++extractionNumber;
        extractions[extractionId] = Extraction(
            _estateId,
            proposalId,
            _value,
            _currency,
            msg.sender
        );

        emit NewExtraction(
            extractionId,
            _estateId,
            proposalId,
            msg.sender,
            _value,
            _currency
        );

        return extractionId;
    }

    function concludeExtraction(uint256 _extractionId)
    external nonReentrant validExtraction(_extractionId) whenNotPaused returns (bool) {
        Extraction storage extraction = extractions[_extractionId];
        uint256 estateId = extraction.estateId;
        if (estateId == 0) {
            revert Cancelled();
        }

        if (!isAvailable(estateId)) {
            revert UnavailableEstate();
        }

        ProposalState state = IGovernanceHub(governanceHub).getProposalState(extraction.proposalId);

        if (state == ProposalState.SuccessfulExecuted) {
            estates[estateId].deprecateAt = uint40(block.timestamp);

            address currency = extraction.currency;
            uint256 value = extraction.value;
            if (currency == address(0)) {
                IPaymentHub(paymentHub).issuePayment{value: value}(
                    address(this),
                    estateId,
                    value,
                    currency
                );
            } else {
                address paymentHubAddress = paymentHub;
                CurrencyHandler.allowERC20(currency, paymentHubAddress, value);
                IPaymentHub(paymentHubAddress).issuePayment(
                    address(this),
                    estateId,
                    value,
                    currency
                );
            }

            emit EstateExtraction(estateId, _extractionId);

            return true;
        }

        if (state == ProposalState.UnsuccessfulExecuted
            || state == ProposalState.Disqualified
            || state == ProposalState.Rejected) {
            extraction.estateId = 0;

            CurrencyHandler.sendCurrency(
                extraction.currency,
                extraction.extractor,
                extraction.value
            );

            emit ExtractionCancellation(_extractionId);

            return false;
        }

        revert InvalidExtractionConclusion();
    }

    function balanceOf(address _account, uint256 _estateId)
    public view override(IERC1155Upgradeable, ERC1155Upgradeable) returns (uint256) {
        return estates[_estateId].deprecateAt <= block.timestamp || estates[_estateId].expireAt <= block.timestamp
            ? 0
            : super.balanceOf(_account, _estateId);
    }

    function balanceOfAt(address _account, uint256 _estateId, uint256 _at) public view returns (uint256) {
        if (!exists(_estateId)) {
            revert InvalidEstateId();
        }
        if (_at > block.timestamp
            || _at < estates[_estateId].tokenizeAt
            || _at > estates[_estateId].deprecateAt
            || _at >= estates[_estateId].expireAt) {
            revert InvalidTimestamp();
        }
        if (_account == estates[_estateId].tokenizer) {
            return 0;
        }
        Snapshot[] storage snapshots = balanceSnapshots[_estateId][_account];
        uint256 high = snapshots.length;
        if (high == 0 || _at < snapshots[0].timestamp) {
            return IEstateTokenizer(estates[_estateId].tokenizer).allocationOfAt(
                estates[_estateId].tokenizationId,
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
            } else {
                high = mid;
            }
        }
        return snapshots[pivot].value;
    }

    function uri(uint256 _estateId) public view override(
        IERC1155MetadataURIUpgradeable,
        ERC1155Upgradeable,
        ERC1155URIStorageUpgradeable
    ) returns (string memory) {
        return super.uri(_estateId);
    }

    function totalSupply(uint256 _estateId)
    public view override(IEstateToken, ERC1155SupplyUpgradeable) returns (uint256) {
        return super.totalSupply(_estateId);
    }

    function isAvailable(uint256 _estateId) public view returns (bool) {
        return exists(_estateId)
            && estates[_estateId].deprecateAt == Constant.COMMON_INFINITE_TIMESTAMP
            && estates[_estateId].expireAt > block.timestamp;
    }

    function zoneOf(uint256 _estateId) external view returns (bytes32) {
        return estates[_estateId].zone;
    }

    function totalVoteAt(uint256 _estateId, uint256 _at) external view returns (uint256) {
        if (!exists(_estateId)) {
            revert InvalidEstateId();
        }

        return _at > block.timestamp
            || _at < estates[_estateId].tokenizeAt
            || _at > estates[_estateId].deprecateAt
            || _at >= estates[_estateId].expireAt
            ? 0
            : totalSupply(_estateId);
    }

    function voteOfAt(address _account, uint256 _estateId, uint256 _at) external view returns (uint256) {
        return balanceOfAt(_account, _estateId, _at);
    }

    function supportsInterface(bytes4 _interfaceId) public view override(
        IERC165Upgradeable,
        ERC1155Upgradeable,
        RoyaltyRateProposer
    ) returns (bool) {
        return _interfaceId == type(IGovernor).interfaceId
            || RoyaltyRateProposer.supportsInterface(_interfaceId)
            || ERC1155Upgradeable.supportsInterface(_interfaceId)
            || super.supportsInterface(_interfaceId);
    }

    function _beforeTokenTransfer(
        address _operator,
        address _from,
        address _to,
        uint256[] memory _estateIds,
        uint256[] memory _amounts,
        bytes memory _data
    ) internal override(
        ERC1155Upgradeable,
        ERC1155PausableUpgradeable,
        ERC1155SupplyUpgradeable
    ) {
        super._beforeTokenTransfer(_operator, _from, _to, _estateIds, _amounts, _data);
        for (uint256 i; i < _estateIds.length; ++i) {
            require(
                estates[_estateIds[i]].deprecateAt == Constant.COMMON_INFINITE_TIMESTAMP
                    && estates[_estateIds[i]].expireAt > block.timestamp,
                "EstateToken: Token is unavailable"
            );
        }
    }

    function _afterTokenTransfer(
        address _operator,
        address _from,
        address _to,
        uint256[] memory _estateIds,
        uint256[] memory _amounts,
        bytes memory _data
    ) internal override {
        super._afterTokenTransfer(_operator, _from, _to, _estateIds, _amounts, _data);
        uint256 timestamp = block.timestamp;
        for (uint256 i; i < _estateIds.length; ++i) {
            uint256 estateId = _estateIds[i];
            if (_from != address(0)) {
                balanceSnapshots[estateId][_from].push(Snapshot(balanceOf(_from, estateId), timestamp));
            }
            if (_to != address(0)) {
                balanceSnapshots[estateId][_to].push(Snapshot(balanceOf(_to, estateId), timestamp));
            }
        }
    }

    function _royaltyReceiver() internal view override returns (address) {
        return feeReceiver;
    }
}
