// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {ERC20CappedUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20CappedUpgradeable.sol";
import {ERC20PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import {ERC20PermitUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol";
import {IERC20MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import {Constant} from "../lib/Constant.sol";
import {MulDiv} from "../lib/MulDiv.sol";

import {IAdmin} from "../common/interfaces/IAdmin.sol";

import {ITreasury} from "./interfaces/ITreasury.sol";

import {PrimaryTokenStorage} from "./storages/PrimaryTokenStorage.sol";

contract PrimaryToken is
PrimaryTokenStorage,
ERC20CappedUpgradeable,
ERC20PausableUpgradeable,
ERC20PermitUpgradeable,
ReentrancyGuardUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    string internal constant VERSION = "v1.1.1";

    receive() external payable {}

    function initialize(
        address _admin,
        string calldata _name,
        string calldata _symbol,
        uint256 _liquidationUnlockedAt
    ) external initializer {
        __ERC20_init(_name, _symbol);
        __ERC20Capped_init(Constant.PRIMARY_TOKEN_MAXIMUM_SUPPLY);
        __ERC20Pausable_init();
        __ERC20Permit_init(_name);

        __ReentrancyGuard_init();

        admin = _admin;
        liquidationUnlockedAt = _liquidationUnlockedAt;

        unchecked {
            _mint(
                address(this),
                Constant.PRIMARY_TOKEN_BACKER_ROUND
                + Constant.PRIMARY_TOKEN_CORE_TEAM
                + Constant.PRIMARY_TOKEN_EXTERNAL_TREASURY
                + Constant.PRIMARY_TOKEN_MARKET_MAKER
                + Constant.PRIMARY_TOKEN_PRIVATE_SALE_1
                + Constant.PRIMARY_TOKEN_PRIVATE_SALE_2
                + Constant.PRIMARY_TOKEN_PUBLIC_SALE
                + Constant.PRIMARY_TOKEN_SEED_ROUND
            );
        }
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

    function updateStakeToken(
        address _stakeToken,
        bytes[] calldata _signatures
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "updateStakeToken",
                _stakeToken
            ),
            _signatures
        );
        stakeToken = _stakeToken;
        emit StakeTokenUpdate(_stakeToken);
    }

    function updateTreasury(
        address _treasury,
        bytes[] calldata _signatures
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "updateTreasury",
                _treasury
            ),
            _signatures
        );
        treasury = _treasury;
        emit TreasuryUpdate(_treasury);
    }

    function unlockForBackerRound(
        address _receiver,
        bytes[] calldata _signatures
    ) external nonReentrant {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "unlockForBackerRound",
                _receiver
            ),
            _signatures
        );

        if (backerRoundUnlocked) {
            revert AlreadyUnlockedTokens();
        }
        backerRoundUnlocked = true;

        _transfer(
            address(this),
            _receiver,
            Constant.PRIMARY_TOKEN_BACKER_ROUND
        );

        emit BackerRoundTokensUnlock();
    }

    function unlockForSeedRound(
        address _receiver,
        bytes[] calldata _signatures
    ) external nonReentrant {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "unlockForSeedRound",
                _receiver
            ),
            _signatures
        );

        if (seedRoundUnlocked) {
            revert AlreadyUnlockedTokens();
        }
        seedRoundUnlocked = true;

        _transfer(
            address(this),
            _receiver,
            Constant.PRIMARY_TOKEN_SEED_ROUND
        );

        emit SeedRoundTokensUnlock();
    }

    function unlockForPrivateSale1(
        address _receiver,
        bytes[] calldata _signatures
    ) external nonReentrant {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "unlockForPrivateSale1",
                _receiver
            ),
            _signatures
        );

        if (privateSale1Unlocked) {
            revert AlreadyUnlockedTokens();
        }
        privateSale1Unlocked = true;

        _transfer(
            address(this),
            _receiver,
            Constant.PRIMARY_TOKEN_PRIVATE_SALE_1
        );

        emit PrivateSale1TokensUnlock();
    }

    function unlockForPrivateSale2(
        address _receiver,
        bytes[] calldata _signatures
    ) external nonReentrant {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "unlockForPrivateSale2",
                _receiver
            ),
            _signatures
        );

        if (privateSale2Unlocked) {
            revert AlreadyUnlockedTokens();
        }
        privateSale2Unlocked = true;

        _transfer(
            address(this),
            _receiver,
            Constant.PRIMARY_TOKEN_PRIVATE_SALE_2
        );

        emit PrivateSale2TokensUnlock();
    }

    function unlockForPublicSale(
        address _receiver,
        bytes[] calldata _signatures
    ) external nonReentrant {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "unlockForPublicSale",
                _receiver
            ),
            _signatures
        );

        if (publicSaleUnlocked) {
            revert AlreadyUnlockedTokens();
        }
        publicSaleUnlocked = true;

        _transfer(
            address(this),
            _receiver,
            Constant.PRIMARY_TOKEN_PUBLIC_SALE
        );

        emit PublicSaleTokensUnlock();
    }

    function unlockForCoreTeam(
        address _receiver,
        bytes[] calldata _signatures
    ) external nonReentrant {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "unlockForCoreTeam",
                _receiver
            ),
            _signatures
        );

        if (coreTeamTokensUnlocked) {
            revert AlreadyUnlockedTokens();
        }
        coreTeamTokensUnlocked = true;

        _transfer(
            address(this),
            _receiver,
            Constant.PRIMARY_TOKEN_CORE_TEAM
        );

        emit CoreTeamTokensUnlock();
    }

    function unlockForMarketMaker(
        address _receiver,
        bytes[] calldata _signatures
    ) external nonReentrant {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "unlockForMarketMaker",
                _receiver
            ),
            _signatures
        );

        if (marketMakerTokensUnlocked) {
            revert AlreadyUnlockedTokens();
        }
        marketMakerTokensUnlocked = true;

        _transfer(
            address(this),
            _receiver,
            Constant.PRIMARY_TOKEN_MARKET_MAKER
        );

        emit MarketMakerTokensUnlock();
    }

    function unlockForExternalTreasury(
        address _receiver,
        bytes[] calldata _signatures
    ) external nonReentrant {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "unlockForExternalTreasury",
                _receiver
            ),
            _signatures
        );

        if (externalTreasuryTokensUnlocked) {
            revert AlreadyUnlockedTokens();
        }
        externalTreasuryTokensUnlocked = true;

        _transfer(
            address(this),
            _receiver,
            Constant.PRIMARY_TOKEN_EXTERNAL_TREASURY
        );

        emit ExternalTreasuryTokensUnlock();
    }

    function contributeLiquidityFromBackerRound(uint256 _liquidity) external nonReentrant {
        ITreasury treasuryContract = ITreasury(treasury);
        IERC20Upgradeable currencyContract = IERC20Upgradeable(treasuryContract.currency());
        currencyContract.safeTransferFrom(msg.sender, address(this), _liquidity);

        currencyContract.safeIncreaseAllowance(address(treasuryContract), _liquidity);
        treasuryContract.provideLiquidity(_liquidity);

        unchecked {
            backerRoundContribution += _liquidity;
        }

        emit LiquidityContributionFromBackerRound(_liquidity);
    }

    function contributeLiquidityFromSeedRound(uint256 _liquidity) external nonReentrant {
        ITreasury treasuryContract = ITreasury(treasury);
        IERC20Upgradeable currencyContract = IERC20Upgradeable(treasuryContract.currency());
        currencyContract.safeTransferFrom(msg.sender, address(this), _liquidity);

        currencyContract.safeIncreaseAllowance(address(treasuryContract), _liquidity);
        treasuryContract.provideLiquidity(_liquidity);

        unchecked {
            seedRoundContribution += _liquidity;
        }

        emit LiquidityContributionFromSeedRound(_liquidity);
    }

    function contributeLiquidityFromPrivateSale1(uint256 _liquidity) external nonReentrant {
        ITreasury treasuryContract = ITreasury(treasury);
        IERC20Upgradeable currencyContract = IERC20Upgradeable(treasuryContract.currency());
        currencyContract.safeTransferFrom(msg.sender, address(this), _liquidity);

        currencyContract.safeIncreaseAllowance(address(treasuryContract), _liquidity);
        treasuryContract.provideLiquidity(_liquidity);

        unchecked {
            privateSale1Contribution += _liquidity;
        }

        emit LiquidityContributionFromPrivateSale1(_liquidity);
    }

    function contributeLiquidityFromPrivateSale2(uint256 _liquidity) external nonReentrant {
        ITreasury treasuryContract = ITreasury(treasury);
        IERC20Upgradeable currencyContract = IERC20Upgradeable(treasuryContract.currency());
        currencyContract.safeTransferFrom(msg.sender, address(this), _liquidity);

        currencyContract.safeIncreaseAllowance(address(treasuryContract), _liquidity);
        treasuryContract.provideLiquidity(_liquidity);

        unchecked {
            privateSale2Contribution += _liquidity;
        }

        emit LiquidityContributionFromPrivateSale2(_liquidity);
    }

    function contributeLiquidityFromPublicSale(uint256 _liquidity) external nonReentrant {
        ITreasury treasuryContract = ITreasury(treasury);
        IERC20Upgradeable currencyContract = IERC20Upgradeable(treasuryContract.currency());

        currencyContract.safeTransferFrom(msg.sender, address(this), _liquidity);
        currencyContract.safeIncreaseAllowance(address(treasuryContract), _liquidity);
        treasuryContract.provideLiquidity(_liquidity);

        unchecked {
            publicSaleContribution += _liquidity;
        }

        emit LiquidityContributionFromPublicSale(_liquidity);
    }

    function contributeLiquidityFromMarketMaker(uint256 _liquidity) external nonReentrant {
        ITreasury treasuryContract = ITreasury(treasury);
        IERC20Upgradeable currencyContract = IERC20Upgradeable(treasuryContract.currency());
        currencyContract.safeTransferFrom(msg.sender, address(this), _liquidity);

        currencyContract.safeIncreaseAllowance(address(treasuryContract), _liquidity);
        treasuryContract.provideLiquidity(_liquidity);

        unchecked {
            marketMakerContribution += _liquidity;
        }

        emit LiquidityContributionFromMarketMaker(_liquidity);
    }

    function contributeLiquidityFromExternalTreasury(uint256 _liquidity) external nonReentrant {
        ITreasury treasuryContract = ITreasury(treasury);
        IERC20Upgradeable currencyContract = IERC20Upgradeable(treasuryContract.currency());
        currencyContract.safeTransferFrom(msg.sender, address(this), _liquidity);

        currencyContract.safeIncreaseAllowance(address(treasuryContract), _liquidity);
        treasuryContract.provideLiquidity(_liquidity);

        unchecked {
            externalTreasuryContribution += _liquidity;
        }

        emit LiquidityContributionFromExternalTreasury(_liquidity);
    }

    function mintForStake() external returns (uint256) {
        address receiver = stakeToken;
        if (msg.sender != receiver) {
            revert Unauthorized();
        }

        uint256 availableAmount = Constant.PRIMARY_TOKEN_MAXIMUM_SUPPLY - totalSupply();

        if (availableAmount == 0) {
            revert SupplyLimitationExceeded();
        }

        if (availableAmount > Constant.PRIMARY_TOKEN_DAILY_STAKE_REWARD_LIMIT) {
            _mint(receiver, Constant.PRIMARY_TOKEN_DAILY_STAKE_REWARD_LIMIT);

            emit DailyStakeMint(Constant.PRIMARY_TOKEN_DAILY_STAKE_REWARD_LIMIT);

            return Constant.PRIMARY_TOKEN_DAILY_STAKE_REWARD_LIMIT;
        } else {
            _mint(receiver, availableAmount);

            emit DailyStakeMint(availableAmount);

            return availableAmount;
        }
    }

    function liquidate(uint256 _amount) external whenNotPaused nonReentrant {
        if (liquidationUnlockedAt > block.timestamp) revert BeingLocked();

        ITreasury treasuryContract = ITreasury(treasury);

        uint256 liquidity = MulDiv.mulDiv(
            _amount,
            treasuryContract.liquidity(),
            totalSupply()
        );

        treasuryContract.withdrawLiquidity(liquidity);
        IERC20Upgradeable(treasuryContract.currency()).safeTransfer(msg.sender, liquidity);
        _burn(msg.sender, _amount);

        emit Liquidation(msg.sender, _amount, liquidity);
    }

    function _beforeTokenTransfer(address _from, address _to, uint256 _amount)
    internal override (ERC20Upgradeable, ERC20PausableUpgradeable) {
        super._beforeTokenTransfer(_from, _to, _amount);
    }

    function _mint(address _account, uint256 _amount)
    internal override (ERC20Upgradeable, ERC20CappedUpgradeable) {
        super._mint(_account, _amount);
    }
}
