// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC20Upgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {ERC20CappedUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20CappedUpgradeable.sol";
import {ERC20PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import {ERC20PermitUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol";

import {CurrencyHandler} from "../common/utilities/CurrencyHandler.sol";
import {Formula} from "../common/utilities/Formula.sol";

import {IAdmin} from "../common/interfaces/IAdmin.sol";

import {CommonConstant} from "../common/constants/CommonConstant.sol";

import {Pausable} from "../common/utilities/Pausable.sol";

import {PrimaryTokenConstant} from "./constants/PrimaryTokenConstant.sol";

import {ITreasury} from "../liquidity/interfaces/ITreasury.sol";

import {PrimaryTokenStorage} from "../liquidity/storages/PrimaryTokenStorage.sol";

contract PrimaryToken is
PrimaryTokenStorage,
ERC20CappedUpgradeable,
ERC20PausableUpgradeable,
ERC20PermitUpgradeable,
Pausable,
ReentrancyGuardUpgradeable {
    using Formula for uint256;

    string constant private VERSION = "v1.2.1";

    /**
     *  @notice Executed on a call to the contract with empty calldata.
     */
    receive() external payable {}

    function initialize(
        address _admin,
        string calldata _name,
        string calldata _symbol,
        uint256 _liquidationUnlockedAt
    ) external initializer {
        __ERC20_init(_name, _symbol);
        __ERC20Capped_init(PrimaryTokenConstant.MAX_SUPPLY);
        __ERC20Pausable_init();
        __ERC20Permit_init(_name);

        __ReentrancyGuard_init();

        admin = _admin;
        liquidationUnlockedAt = _liquidationUnlockedAt;

        unchecked {
            _mint(
                address(this),
                PrimaryTokenConstant.BACKER_ROUND_ALLOCATION
                + PrimaryTokenConstant.CORE_TEAM_ALLOCATION
                + PrimaryTokenConstant.EXTERNAL_TREASURY_ALLOCATION
                + PrimaryTokenConstant.MARKET_MAKER_ALLOCATION
                + PrimaryTokenConstant.PRIVATE_SALE_1_ALLOCATION
                + PrimaryTokenConstant.PRIVATE_SALE_2_ALLOCATION
                + PrimaryTokenConstant.PUBLIC_SALE_ALLOCATION
                + PrimaryTokenConstant.SEED_ROUND_ALLOCATION
            );
        }
    }

    function version() external pure returns (string memory) {
        return VERSION;
    }

    /**
     *  @notice Update the treasury contract.
     *
     *          Name            Description
     *  @param  _treasury       New treasury contract address.
     *  @param  _signatures     Array of admin signatures.
     * 
     *  @dev    Administrative configuration.
     */
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
        if (_treasury == address(0) || treasury != address(0)) {
            revert InvalidUpdating();
        }
        treasury = _treasury;
        emit TreasuryUpdate(_treasury);
    }

    /**
     *  @notice Update stake token contracts.
     *
     *          Name            Description
     *  @param  _stakeToken1    New the stake token #1 contract address.
     *  @param  _stakeToken2    New the stake token #2 contract address.
     *  @param  _stakeToken3    New the stake token #3 contract address.
     *  @param  _signatures     Array of admin signatures.
     * 
     *  @dev    Administrative configuration.
     */
    function updateStakeTokens(
        address _stakeToken1,
        address _stakeToken2,
        address _stakeToken3,
        bytes[] calldata _signatures
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "updateStakeTokens",
                _stakeToken1,
                _stakeToken2,
                _stakeToken3
            ),
            _signatures
        );

        if (_stakeToken1 == address(0) || _stakeToken2 == address(0) || _stakeToken3 == address(0)
            || stakeToken1 != address(0) || stakeToken2 != address(0) || stakeToken3 != address(0)) {
            revert InvalidUpdating();
        }

        stakeToken1 = _stakeToken1;
        stakeToken2 = _stakeToken2;
        stakeToken3 = _stakeToken3;

        emit StakeTokensUpdate(
            _stakeToken1,
            _stakeToken2,
            _stakeToken3
        );
    }

    function totalStake() public view returns (uint256) {
        return (stakeToken1 != address(0) ? IERC20Upgradeable(stakeToken1).totalSupply() : 0)
            + (stakeToken2 != address(0) ? IERC20Upgradeable(stakeToken2).totalSupply() : 0)
            + (stakeToken3 != address(0) ? IERC20Upgradeable(stakeToken3).totalSupply() : 0);
    }

    function isStakeRewardingCulminated() external view returns (bool) {
        if (msg.sender == stakeToken1) return stakeToken1Waves >= PrimaryTokenConstant.STAKE_1_CULMINATING_WAVE;
        if (msg.sender == stakeToken2) return stakeToken2Waves >= PrimaryTokenConstant.STAKE_2_CULMINATING_WAVE;
        if (msg.sender == stakeToken3) return stakeToken3Waves >= PrimaryTokenConstant.STAKE_3_CULMINATING_WAVE;
        revert Unauthorized();
    }

    /**
     *  @notice Unlock tokens allocated for Backer Round to a distributor.
     *
     *          Name            Description
     *  @param  _distributor    Distributor address.
     *  @param  _signatures     Array of admin signatures.
     * 
     *  @dev    Administrative operation.
     */
    function unlockForBackerRound(
        address _distributor,
        bytes[] calldata _signatures
    ) external nonReentrant {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "unlockForBackerRound",
                _distributor
            ),
            _signatures
        );

        if (backerRoundUnlocked) {
            revert AlreadyUnlockedTokens();
        }
        backerRoundUnlocked = true;

        _transfer(
            address(this),
            _distributor,
            PrimaryTokenConstant.BACKER_ROUND_ALLOCATION
        );

        emit BackerRoundTokensUnlock();
    }

    /**
     *  @notice Unlock tokens allocated for Seed Round to a distributor.
     *
     *          Name            Description
     *  @param  _distributor    Distributor address.
     *  @param  _signatures     Array of admin signatures.
     * 
     *  @dev    Administrative operation.
     */
    function unlockForSeedRound(
        address _distributor,
        bytes[] calldata _signatures
    ) external nonReentrant {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "unlockForSeedRound",
                _distributor
            ),
            _signatures
        );

        if (seedRoundUnlocked) {
            revert AlreadyUnlockedTokens();
        }
        seedRoundUnlocked = true;

        _transfer(
            address(this),
            _distributor,
            PrimaryTokenConstant.SEED_ROUND_ALLOCATION
        );

        emit SeedRoundTokensUnlock();
    }

    /**
     *  @notice Unlock tokens allocated for Private Sale #1 to a distributor.
     *
     *          Name            Description
     *  @param  _distributor    Distributor address.
     *  @param  _signatures     Array of admin signatures.
     * 
     *  @dev    Administrative operation.
     */
    function unlockForPrivateSale1(
        address _distributor,
        bytes[] calldata _signatures
    ) external nonReentrant {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "unlockForPrivateSale1",
                _distributor
            ),
            _signatures
        );

        if (privateSale1Unlocked) {
            revert AlreadyUnlockedTokens();
        }
        privateSale1Unlocked = true;

        _transfer(
            address(this),
            _distributor,
            PrimaryTokenConstant.PRIVATE_SALE_1_ALLOCATION
        );

        emit PrivateSale1TokensUnlock();
    }

    /**
     *  @notice Unlock tokens allocated for Private Sale #2 to a distributor.
     *
     *          Name            Description
     *  @param  _distributor    Distributor address.
     *  @param  _signatures     Array of admin signatures.
     * 
     *  @dev    Administrative operation.
     */
    function unlockForPrivateSale2(
        address _distributor,
        bytes[] calldata _signatures
    ) external nonReentrant {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "unlockForPrivateSale2",
                _distributor
            ),
            _signatures
        );


        if (privateSale2Unlocked) {
            revert AlreadyUnlockedTokens();
        }
        privateSale2Unlocked = true;

        _transfer(
            address(this),
            _distributor,
            PrimaryTokenConstant.PRIVATE_SALE_2_ALLOCATION
        );

        emit PrivateSale2TokensUnlock();
    }

    /**
     *  @notice Unlock tokens allocated for Public Sale to a distributor.
     *
     *          Name            Description
     *  @param  _distributor    Distributor address.
     *  @param  _signatures     Array of admin signatures.
     * 
     *  @dev    Administrative operation.
     */
    function unlockForPublicSale(
        address _distributor,
        bytes[] calldata _signatures
    ) external nonReentrant {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "unlockForPublicSale",
                _distributor
            ),
            _signatures
        );

        if (publicSaleUnlocked) {
            revert AlreadyUnlockedTokens();
        }
        publicSaleUnlocked = true;

        _transfer(
            address(this),
            _distributor,
            PrimaryTokenConstant.PUBLIC_SALE_ALLOCATION
        );

        emit PublicSaleTokensUnlock();
    }

    /**
     *  @notice Unlock tokens allocated for Core Team to a distributor.
     *
     *          Name            Description
     *  @param  _distributor    Distributor address.
     *  @param  _signatures     Array of admin signatures.
     * 
     *  @dev    Administrative operation.
     */
    function unlockForCoreTeam(
        address _distributor,
        bytes[] calldata _signatures
    ) external nonReentrant {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "unlockForCoreTeam",
                _distributor
            ),
            _signatures
        );

        if (coreTeamTokensUnlocked) {
            revert AlreadyUnlockedTokens();
        }
        coreTeamTokensUnlocked = true;

        _transfer(
            address(this),
            _distributor,
            PrimaryTokenConstant.CORE_TEAM_ALLOCATION
        );

        emit CoreTeamTokensUnlock();
    }

    /**
     *  @notice Unlock tokens allocated for Market Maker to a distributor.
     *
     *          Name            Description
     *  @param  _distributor    Distributor address.
     *  @param  _signatures     Array of admin signatures.
     * 
     *  @dev    Administrative operation.
     */
    function unlockForMarketMaker(
        address _distributor,
        bytes[] calldata _signatures
    ) external nonReentrant {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "unlockForMarketMaker",
                _distributor
            ),
            _signatures
        );

        if (marketMakerTokensUnlocked) {
            revert AlreadyUnlockedTokens();
        }
        marketMakerTokensUnlocked = true;

        _transfer(
            address(this),
            _distributor,
            PrimaryTokenConstant.MARKET_MAKER_ALLOCATION
        );

        emit MarketMakerTokensUnlock();
    }

    /**
     *  @notice Unlock tokens allocated for External Treasury to a distributor.
     *
     *          Name            Description
     *  @param  _distributor    Distributor address.
     *  @param  _signatures     Array of admin signatures.
     * 
     *  @dev    Administrative operation.
     */
    function unlockForExternalTreasury(
        address _distributor,
        bytes[] calldata _signatures
    ) external nonReentrant {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "unlockForExternalTreasury",
                _distributor
            ),
            _signatures
        );

        if (externalTreasuryTokensUnlocked) {
            revert AlreadyUnlockedTokens();
        }
        externalTreasuryTokensUnlocked = true;

        _transfer(
            address(this),
            _distributor,
            PrimaryTokenConstant.EXTERNAL_TREASURY_ALLOCATION
        );

        emit ExternalTreasuryTokensUnlock();
    }

    /**
     *  @notice Contribute liquidity funded from Backer Round.
     *
     *          Name          Description
     *  @param  _liquidity    Contributed liquidity.
     */
    function contributeLiquidityFromBackerRound(uint256 _liquidity) external nonReentrant {
        _contributeLiquidity(_liquidity);

        unchecked {
            backerRoundContribution += _liquidity;
        }

        emit LiquidityContributionFromBackerRound(_liquidity);
    }

    /**
     *  @notice Contribute liquidity funded from Seed Round.
     *
     *          Name          Description
     *  @param  _liquidity    Contributed liquidity.
     */
    function contributeLiquidityFromSeedRound(uint256 _liquidity) external nonReentrant {
        _contributeLiquidity(_liquidity);

        unchecked {
            seedRoundContribution += _liquidity;
        }

        emit LiquidityContributionFromSeedRound(_liquidity);
    }

    /**
     *  @notice Contribute liquidity funded from Private Sale #1.
     *
     *          Name          Description
     *  @param  _liquidity    Contributed liquidity.
     */
    function contributeLiquidityFromPrivateSale1(uint256 _liquidity) external nonReentrant {
        _contributeLiquidity(_liquidity);

        unchecked {
            privateSale1Contribution += _liquidity;
        }

        emit LiquidityContributionFromPrivateSale1(_liquidity);
    }

    /**
     *  @notice Contribute liquidity funded from Private Sale #2.
     *
     *          Name          Description
     *  @param  _liquidity    Contributed liquidity.
     */
    function contributeLiquidityFromPrivateSale2(uint256 _liquidity) external nonReentrant {
        _contributeLiquidity(_liquidity);

        unchecked {
            privateSale2Contribution += _liquidity;
        }

        emit LiquidityContributionFromPrivateSale2(_liquidity);
    }

    /**
     *  @notice Contribute liquidity funded from Public Sale.
     *
     *          Name          Description
     *  @param  _liquidity    Contributed liquidity.
     */
    function contributeLiquidityFromPublicSale(uint256 _liquidity) external nonReentrant {
        _contributeLiquidity(_liquidity);

        unchecked {
            publicSaleContribution += _liquidity;
        }

        emit LiquidityContributionFromPublicSale(_liquidity);
    }

    /**
     *  @notice Contribute liquidity funded from Market Maker.
     *
     *          Name          Description
     *  @param  _liquidity    Contributed liquidity.
     */
    function contributeLiquidityFromMarketMaker(uint256 _liquidity) external nonReentrant {
        _contributeLiquidity(_liquidity);

        unchecked {
            marketMakerContribution += _liquidity;
        }

        emit LiquidityContributionFromMarketMaker(_liquidity);
    }

    /**
     *  @notice Contribute liquidity funded from External Treasury.
     *
     *          Name          Description
     *  @param  _liquidity    Contributed liquidity.
     */
    function contributeLiquidityFromExternalTreasury(uint256 _liquidity) external nonReentrant {
        _contributeLiquidity(_liquidity);

        unchecked {
            externalTreasuryContribution += _liquidity;
        }

        emit LiquidityContributionFromExternalTreasury(_liquidity);
    }

    /**
     *  @notice Contribute liquidity funded from a stake token contract.
     *
     *          Name          Description
     *  @param  _liquidity    Contributed liquidity.
     *  @param  _stakeToken   Stake token address.
     */
    function contributeLiquidityFromStakeToken(uint256 _liquidity, address _stakeToken) external nonReentrant {
        _contributeLiquidity(_liquidity);

        unchecked {
            if (_stakeToken == stakeToken1) {
                stakeToken1Contribution += _liquidity;
                emit LiquidityContributionFromStakeToken1(_liquidity);
            } else if (_stakeToken == stakeToken2) {
                stakeToken2Contribution += _liquidity;
                emit LiquidityContributionFromStakeToken2(_liquidity);
            } else if (_stakeToken == stakeToken3) {
                stakeToken3Contribution += _liquidity;
                emit LiquidityContributionFromStakeToken3(_liquidity);
            }
        }
    }

    function mintForStake() external returns (uint256) {
        if (msg.sender == stakeToken1) {
            if (stakeToken1Waves == PrimaryTokenConstant.STAKE_1_CULMINATING_WAVE) {
                revert AllStakeRewardMinted();
            }
            unchecked {
                stakeToken1Waves += 1;
            }

            _mint(msg.sender, PrimaryTokenConstant.STAKE_1_WAVE_REWARD);

            emit DailyStake1Mint(stakeToken1Waves, PrimaryTokenConstant.STAKE_1_WAVE_REWARD);

            return PrimaryTokenConstant.STAKE_1_WAVE_REWARD;
        } else if (msg.sender == stakeToken2) {
            if (stakeToken2Waves == PrimaryTokenConstant.STAKE_2_CULMINATING_WAVE) {
                revert AllStakeRewardMinted();
            }
            unchecked {
                stakeToken2Waves += 1;
            }

            _mint(msg.sender, PrimaryTokenConstant.STAKE_2_WAVE_REWARD);

            emit DailyStake2Mint(stakeToken2Waves, PrimaryTokenConstant.STAKE_2_WAVE_REWARD);

            return PrimaryTokenConstant.STAKE_2_WAVE_REWARD;
        } else if (msg.sender == stakeToken3) {
            uint256 amount = PrimaryTokenConstant.MAX_SUPPLY - totalSupply();
            if (amount == 0) {
                revert SupplyCapReached();
            }
            unchecked {
                stakeToken3Waves += 1;
            }

            amount = amount > PrimaryTokenConstant.STAKE_3_WAVE_REWARD
                ? PrimaryTokenConstant.STAKE_3_WAVE_REWARD
                : amount;

            _mint(msg.sender, amount);

            emit DailyStake3Mint(stakeToken3Waves, amount);

            return amount;
        } else {
            revert Unauthorized();
        }
    }

    function liquidate(uint256 _amount) external nonReentrant whenNotPaused returns (uint256) {
        if (liquidationUnlockedAt > block.timestamp) {
            revert BeingLocked();
        }

        ITreasury treasuryContract = ITreasury(treasury);

        uint256 liquidity = treasuryContract.liquidity().scale(_amount, totalSupply());

        treasuryContract.withdrawLiquidity(msg.sender, liquidity);
        _burn(msg.sender, _amount);

        emit Liquidation(msg.sender, _amount, liquidity);

        return liquidity;
    }

    function exclusiveDiscount() external view returns (Rate memory rate) {
        return Rate(
            PrimaryTokenConstant.BASE_DISCOUNT.scale(totalStake() + totalSupply(), totalSupply()),
            CommonConstant.RATE_DECIMALS
        );
    }

    function _beforeTokenTransfer(address _from, address _to, uint256 _amount)
    internal override(ERC20Upgradeable, ERC20PausableUpgradeable) {
        super._beforeTokenTransfer(_from, _to, _amount);
    }

    function _mint(address _account, uint256 _amount)
    internal override(ERC20Upgradeable, ERC20CappedUpgradeable) {
        super._mint(_account, _amount);
    }

    function _contributeLiquidity(uint256 _liquidity) internal {
        address treasuryAddress = treasury;

        address currency = ITreasury(treasuryAddress).currency();
        CurrencyHandler.receiveERC20(currency, _liquidity);

        CurrencyHandler.allowERC20(currency, treasuryAddress, _liquidity);
        ITreasury(treasuryAddress).provideLiquidity(_liquidity);
    }
}
