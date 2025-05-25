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
import {Formula} from "../lib/Formula.sol";

import {IAdmin} from "../common/interfaces/IAdmin.sol";

import {ITreasury} from "./interfaces/ITreasury.sol";

import {PrimaryTokenStorage} from "./storages/PrimaryTokenStorage.sol";

contract PrimaryToken is
PrimaryTokenStorage,
ERC20CappedUpgradeable,
ERC20PausableUpgradeable,
ERC20PermitUpgradeable,
ReentrancyGuardUpgradeable {
    using Formula for uint256;
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
        __ERC20Capped_init(Constant.PRIMARY_TOKEN_MAX_SUPPLY);
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
        if (treasury != address(0)) revert InvalidUpdating();
        treasury = _treasury;
        emit TreasuryUpdate(_treasury);
    }

    function updateStakeToken1(
        address _stakeToken1,
        bytes[] calldata _signatures
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "updateStakeToken1",
                _stakeToken1
            ),
            _signatures
        );
        if (stakeToken1 != address(0)) {
            revert InvalidUpdating();
        }
        stakeToken1 = _stakeToken1;
        emit StakeToken1Update(stakeToken1);
    }

    function updateStakeToken2(
        address _stakeToken2,
        bytes[] calldata _signatures
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "updateStakeToken2",
                _stakeToken2
            ),
            _signatures
        );
        stakeToken2 = _stakeToken2;
        emit StakeToken2Update(stakeToken2);
    }

    function updateStakeToken3(
        address _stakeToken3,
        bytes[] calldata _signatures
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "updateStakeToken3",
                _stakeToken3
            ),
            _signatures
        );
        if (stakeToken3 != address(0)) {
            revert InvalidUpdating();
        }
        stakeToken3 = _stakeToken3;
        emit StakeToken3Update(stakeToken3);
    }

    function totalStake() public view returns (uint256) {
        return IERC20Upgradeable(stakeToken1).totalSupply()
            + IERC20Upgradeable(stakeToken2).totalSupply()
            + IERC20Upgradeable(stakeToken3).totalSupply();
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
        uint256 availableAmount;
        uint256 newStake;
        if (msg.sender == stakeToken1) {
            availableAmount = Constant.PRIMARY_TOKEN_STAKE_REWARD_1 - mintedStakeReward1;
            if (availableAmount == 0) {
                revert AllStakeRewardMinted();
            }

            newStake = availableAmount > Constant.PRIMARY_TOKEN_DAILY_STAKE_REWARD_LIMIT_1
                ? Constant.PRIMARY_TOKEN_DAILY_STAKE_REWARD_LIMIT_1
                : availableAmount;
            mintedStakeReward1 += newStake;

            emit DailyStake1Mint(newStake);
        } else if (msg.sender == stakeToken2) {
            availableAmount = Constant.PRIMARY_TOKEN_STAKE_REWARD_2 - mintedStakeReward2;
            if (availableAmount == 0) {
                revert AllStakeRewardMinted();
            }

            newStake = availableAmount > Constant.PRIMARY_TOKEN_DAILY_STAKE_REWARD_LIMIT_2
                ? Constant.PRIMARY_TOKEN_DAILY_STAKE_REWARD_LIMIT_2
                : availableAmount;
            mintedStakeReward2 += newStake;

            emit DailyStake2Mint(newStake);
        } else if (msg.sender == stakeToken3) {
            availableAmount = Constant.PRIMARY_TOKEN_MAX_SUPPLY - mintedStakeReward3;
            if (availableAmount == 0) {
                revert AllStakeRewardMinted();
            }
            newStake = availableAmount > Constant.PRIMARY_TOKEN_DAILY_STAKE_REWARD_LIMIT_3
                ? Constant.PRIMARY_TOKEN_DAILY_STAKE_REWARD_LIMIT_3
                : availableAmount;
            mintedStakeReward3 += newStake;

            emit DailyStake3Mint(newStake);
        } else {
            revert Unauthorized();
        }

        return newStake;
    }

    function liquidate(uint256 _amount) external whenNotPaused nonReentrant {
        if (liquidationUnlockedAt > block.timestamp) revert BeingLocked();

        ITreasury treasuryContract = ITreasury(treasury);

        uint256 liquidity = treasuryContract.liquidity().scale(_amount, totalSupply());

        treasuryContract.withdrawLiquidity(liquidity);
        IERC20Upgradeable(treasuryContract.currency()).safeTransfer(msg.sender, liquidity);
        _burn(msg.sender, _amount);

        emit Liquidation(msg.sender, _amount, liquidity);
    }

    function exclusiveDiscount() external view returns (Rate memory rate) {
        return Rate(
            Constant.PRIMARY_TOKEN_BASE_DISCOUNT.scale(totalStake() + totalSupply(), totalSupply()),
            Constant.PRIMARY_TOKEN_DISCOUNT_DECIMALS
        );
    }

    function _beforeTokenTransfer(address _from, address _to, uint256 _amount) internal
    override(ERC20Upgradeable, ERC20PausableUpgradeable) {
        super._beforeTokenTransfer(_from, _to, _amount);
    }

    function _mint(address _account, uint256 _amount) internal
    override(ERC20Upgradeable, ERC20CappedUpgradeable) {
        super._mint(_account, _amount);
    }
}
