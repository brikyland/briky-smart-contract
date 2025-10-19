// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @openzeppelin/contracts-upgradeable/
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC20Upgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {ERC20CappedUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20CappedUpgradeable.sol";
import {ERC20PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import {ERC20PermitUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol";

/// contracts/common/constants/
import {CommonConstant} from "../common/constants/CommonConstant.sol";

/// contracts/common/interfaces/
import {IAdmin} from "../common/interfaces/IAdmin.sol";

/// contracts/common/utilities/
import {CurrencyHandler} from "../common/utilities/CurrencyHandler.sol";
import {Formula} from "../common/utilities/Formula.sol";
import {Pausable} from "../common/utilities/Pausable.sol";

/// contracts/liquidity/constants/
import {PrimaryTokenConstant} from "./constants/PrimaryTokenConstant.sol";

/// contracts/liquidity/interfaces/
import {ITreasury} from "../liquidity/interfaces/ITreasury.sol";

/// contracts/liquidity/storages/
import {PrimaryTokenStorage} from "../liquidity/storages/PrimaryTokenStorage.sol";

/**
 *  @author Briky Team
 *
 *  @notice Interface for contract `PrimaryToken`.
 *  @notice The `PrimaryToken` is an ERC-20 token circulating as the exclusive currency of the system.
 *  @notice The maximum supply is 20,000,000,000 tokens.
 *  @notice Tokens are distributed through 5 rounds:
 *          -   Backer Round:         100,000,000 tokens
 *          -   Seed Round:            50,000,000 tokens
 *          -   Private Sale #1:       30,000,000 tokens
 *          -   Private Sale #2:       50,000,000 tokens
 *          -   Public Sale:          500,000,000 tokens
 *  @notice Tokens are reserved in 3 funds:
 *          -   Core Team:          1,000,000,000 tokens
 *          -   Market Marker:      2,270,000,000 tokens
 *          -   External Treasury:  1,000,000,000 tokens
 *  @notice Tokens are periodically rewarded in 3 staking pools:
 *          -   Staking pool #1:    Culminates in wave  750, 2,000,000 tokens each wave.
 *          -   Staking pool #2:    Culminates in wave 1500, 3,000,000 tokens each wave.
 *          -   Staking pool #3:    Culminates in wave 2250, 4,000,000 tokens each wave.
 *  @notice After all three staking pool have culminated, the staking pool #3 may still fetch new wave with the reward capped
 *          at the lesser between its standard wave reward and the remaining mintable tokens to reach the maximum supply cap.
 *  @notice Token liquidation is backed by a stablecoin treasury. Holders may burn tokens to redeem value once liquidation is
 *          unlocked.
 *  @notice Exclusive Discount: `15% * (1 + globalStake/totalSupply)`.
 *          Note:   `globalStake` is the total tokens staked in 3 pools.
 */
contract PrimaryToken is
PrimaryTokenStorage,
ERC20CappedUpgradeable,
ERC20PausableUpgradeable,
ERC20PermitUpgradeable,
Pausable,
ReentrancyGuardUpgradeable {
    /** ===== LIBRARY ===== **/
    using Formula for uint256;


    /** ===== CONSTANT ===== **/
    string constant private VERSION = "v1.2.1";


    /** ===== FUNCTION ===== **/
    /* --- Common --- */
    /**
     *  @notice Executed on a call to this contract with empty calldata.
     */
    receive() external payable {}

    /**
     *  @return Version of implementation.
     */
    function version() external pure returns (string memory) {
        return VERSION;
    }


    /* --- Initialization --- */
    /**
     *  @notice Initialize the contract after deployment, serving as the constructor.
     *
     *          Name                        Description
     *  @param  _admin                      `Admin` contract address.
     *  @param  _name                       Token name.
     *  @param  _symbol                     Token symbol.
     *  @param  _liquidationUnlockedAt      Liquidation unlock timestamp.
     */
    function initialize(
        address _admin,
        string calldata _name,
        string calldata _symbol,
        uint256 _liquidationUnlockedAt
    ) external
    initializer {
        /// Initializer
        __ERC20_init(_name, _symbol);
        __ERC20Capped_init(PrimaryTokenConstant.MAX_SUPPLY);
        __ERC20Pausable_init();
        __ERC20Permit_init(_name);
        __ReentrancyGuard_init();

        /// Dependency
        admin = _admin;

        /// Configuration
        liquidationUnlockedAt = _liquidationUnlockedAt;

        /// @dev    Initially mint 5,000,000,000 tokens for 5 distribution rounds and 3 funds.
        unchecked {
            _mint(
                address(this),
                PrimaryTokenConstant.BACKER_ROUND_ALLOCATION
                + PrimaryTokenConstant.SEED_ROUND_ALLOCATION
                + PrimaryTokenConstant.PRIVATE_SALE_1_ALLOCATION
                + PrimaryTokenConstant.PRIVATE_SALE_2_ALLOCATION
                + PrimaryTokenConstant.PUBLIC_SALE_ALLOCATION
                + PrimaryTokenConstant.CORE_TEAM_ALLOCATION
                + PrimaryTokenConstant.MARKET_MAKER_ALLOCATION
                + PrimaryTokenConstant.EXTERNAL_TREASURY_ALLOCATION
            );
        }
    }


    /* --- Administration --- */
    /**
     *  @notice Update the treasury contract.
     *
     *          Name            Description
     *  @param  _treasury       `Treasury` contract address.
     *  @param  _signatures     Array of admin signatures.
     * 
     *  @dev    Administrative operator.
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
    }

    /**
     *  @notice Update staking pools contract.
     *
     *          Name            Description
     *  @param  _stakeToken1    `StakeToken` contract address #1.
     *  @param  _stakeToken2    `StakeToken` contract address #2.
     *  @param  _stakeToken3    `StakeToken` contract address #3.
     *  @param  _signatures     Array of admin signatures.
     *
     *  @dev    Administrative operator.
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
    }

    /**
     *  @notice Unlock token allocation of the Backer Round to a distributor.
     *
     *          Name            Description
     *  @param  _distributor    Distributor address.
     *  @param  _signatures     Array of admin signatures.
     * 
     *  @dev    Administrative operator.
     */
    function unlockForBackerRound(
        address _distributor,
        bytes[] calldata _signatures
    ) external
    nonReentrant {
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
     *  @notice Unlock token allocation of the Seed Round to a distributor.
     *
     *          Name            Description
     *  @param  _distributor    Distributor address.
     *  @param  _signatures     Array of admin signatures.
     * 
     *  @dev    Administrative operator.
     */
    function unlockForSeedRound(
        address _distributor,
        bytes[] calldata _signatures
    ) external {
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
     *  @notice Unlock token allocation of the Private Sale #1 to a distributor.
     *
     *          Name            Description
     *  @param  _distributor    Distributor address.
     *  @param  _signatures     Array of admin signatures.
     * 
     *  @dev    Administrative operator.
     */
    function unlockForPrivateSale1(
        address _distributor,
        bytes[] calldata _signatures
    ) external {
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
     *  @notice Unlock token allocation of the Private Sale #2 to a distributor.
     *
     *          Name            Description
     *  @param  _distributor    Distributor address.
     *  @param  _signatures     Array of admin signatures.
     * 
     *  @dev    Administrative operator.
     */
    function unlockForPrivateSale2(
        address _distributor,
        bytes[] calldata _signatures
    ) external {
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
     *  @notice Unlock token allocation of the Public Sale to a distributor.
     *
     *          Name            Description
     *  @param  _distributor    Distributor address.
     *  @param  _signatures     Array of admin signatures.
     * 
     *  @dev    Administrative operator.
     */
    function unlockForPublicSale(
        address _distributor,
        bytes[] calldata _signatures
    ) external {
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
     *  @notice Unlock token allocation of the Core Team to a distributor.
     *
     *          Name            Description
     *  @param  _distributor    Distributor address.
     *  @param  _signatures     Array of admin signatures.
     * 
     *  @dev    Administrative operator.
     */
    function unlockForCoreTeam(
        address _distributor,
        bytes[] calldata _signatures
    ) external {
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
     *  @notice Unlock token allocation of the Market Maker to a distributor.
     *
     *          Name            Description
     *  @param  _distributor    Distributor address.
     *  @param  _signatures     Array of admin signatures.
     * 
     *  @dev    Administrative operator.
     */
    function unlockForMarketMaker(
        address _distributor,
        bytes[] calldata _signatures
    ) external {
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
     *  @notice Unlock token allocation of the External Treasury to a distributor.
     *
     *          Name            Description
     *  @param  _distributor    Distributor address.
     *  @param  _signatures     Array of admin signatures.
     * 
     *  @dev    Administrative operator.
     */
    function unlockForExternalTreasury(
        address _distributor,
        bytes[] calldata _signatures
    ) external {
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


    /* --- Query --- */
    /**
     *  @return Total token amount staked in all staking pools.
     */
    function totalStake() public view returns (uint256) {
        return (stakeToken1 != address(0) ? IERC20Upgradeable(stakeToken1).totalSupply() : 0)
            + (stakeToken2 != address(0) ? IERC20Upgradeable(stakeToken2).totalSupply() : 0)
            + (stakeToken3 != address(0) ? IERC20Upgradeable(stakeToken3).totalSupply() : 0);
    }

    /**
     *          Name            Description
     *  @param  _stakeToken     Staking pool contract address.
     *
     *  @return Whether the staking pool has culminated.
     */
    function isStakeRewardingCulminated(address _stakeToken) external view returns (bool) {
        if (_stakeToken == stakeToken1) return stakeToken1Waves >= PrimaryTokenConstant.STAKE_1_CULMINATING_WAVE;
        if (_stakeToken == stakeToken2) return stakeToken2Waves >= PrimaryTokenConstant.STAKE_2_CULMINATING_WAVE;
        if (_stakeToken == stakeToken3) return stakeToken3Waves >= PrimaryTokenConstant.STAKE_3_CULMINATING_WAVE;
        revert InvalidStakeToken();
    }


    /* --- Command --- */
    /**
     *  @notice Contribute liquidity funded from Backer Round to the treasury.
     *
     *          Name          Description
     *  @param  _liquidity    Contributed liquidity.
     */
    function contributeLiquidityFromBackerRound(
        uint256 _liquidity
    ) external
    nonReentrant {
        if (!backerRoundUnlocked) {
            revert NotUnlocked();
        }

        _contributeLiquidity(_liquidity);

        unchecked {
            backerRoundContribution += _liquidity;
        }

        emit LiquidityContributionFromBackerRound(_liquidity);
    }

    /**
     *  @notice Contribute liquidity funded from Seed Round to the treasury.
     *
     *          Name          Description
     *  @param  _liquidity    Contributed liquidity.
     */
    function contributeLiquidityFromSeedRound(
        uint256 _liquidity
    ) external
    nonReentrant {
        if (!seedRoundUnlocked) {
            revert NotUnlocked();
        }

        _contributeLiquidity(_liquidity);

        unchecked {
            seedRoundContribution += _liquidity;
        }

        emit LiquidityContributionFromSeedRound(_liquidity);
    }

    /**
     *  @notice Contribute liquidity funded from Private Sale #1 to the treasury.
     *
     *          Name          Description
     *  @param  _liquidity    Contributed liquidity.
     */
    function contributeLiquidityFromPrivateSale1(
        uint256 _liquidity
    ) external
    nonReentrant {
        if (!privateSale1Unlocked) {
            revert NotUnlocked();
        }

        _contributeLiquidity(_liquidity);

        unchecked {
            privateSale1Contribution += _liquidity;
        }

        emit LiquidityContributionFromPrivateSale1(_liquidity);
    }

    /**
     *  @notice Contribute liquidity funded from Private Sale #2 to the treasury.
     *
     *          Name          Description
     *  @param  _liquidity    Contributed liquidity.
     */
    function contributeLiquidityFromPrivateSale2(
        uint256 _liquidity
    ) external
    nonReentrant {
        if (!privateSale2Unlocked) {
            revert NotUnlocked();
        }

        _contributeLiquidity(_liquidity);

        unchecked {
            privateSale2Contribution += _liquidity;
        }

        emit LiquidityContributionFromPrivateSale2(_liquidity);
    }

    /**
     *  @notice Contribute liquidity funded from Public Sale to the treasury.
     *
     *          Name          Description
     *  @param  _liquidity    Contributed liquidity.
     */
    function contributeLiquidityFromPublicSale(
        uint256 _liquidity
    ) external
    nonReentrant {
        if (!publicSaleUnlocked) {
            revert NotUnlocked();
        }

        _contributeLiquidity(_liquidity);

        unchecked {
            publicSaleContribution += _liquidity;
        }

        emit LiquidityContributionFromPublicSale(_liquidity);
    }

    /**
     *  @notice Contribute liquidity funded from Market Maker to the treasury.
     *
     *          Name          Description
     *  @param  _liquidity    Contributed liquidity.
     */
    function contributeLiquidityFromMarketMaker(
        uint256 _liquidity
    ) external
    nonReentrant {
        if (!marketMakerTokensUnlocked) {
            revert NotUnlocked();
        }

        _contributeLiquidity(_liquidity);

        unchecked {
            marketMakerContribution += _liquidity;
        }

        emit LiquidityContributionFromMarketMaker(_liquidity);
    }

    /**
     *  @notice Contribute liquidity funded from External Treasury to the treasury.
     *
     *          Name          Description
     *  @param  _liquidity    Contributed liquidity.
     */
    function contributeLiquidityFromExternalTreasury(
        uint256 _liquidity
    ) external
    nonReentrant {
        if (!externalTreasuryTokensUnlocked) {
            revert NotUnlocked();
        }

        _contributeLiquidity(_liquidity);

        unchecked {
            externalTreasuryContribution += _liquidity;
        }

        emit LiquidityContributionFromExternalTreasury(_liquidity);
    }

    /**
     *  @notice Contribute liquidity funded from a staking pool to the treasury.
     *
     *          Name          Description
     *  @param  _liquidity    Contributed liquidity.
     * 
     *  @dev    Permission: Staking pools.
     */
    function contributeLiquidityFromStakeToken(
        uint256 _liquidity
    ) external
    nonReentrant {
        _contributeLiquidity(_liquidity);

        unchecked {
            if (msg.sender == stakeToken1) {
                stakeToken1Contribution += _liquidity;
                emit LiquidityContributionFromStakeToken1(_liquidity);
            } else if (msg.sender == stakeToken2) {
                stakeToken2Contribution += _liquidity;
                emit LiquidityContributionFromStakeToken2(_liquidity);
            } else if (msg.sender == stakeToken3) {
                stakeToken3Contribution += _liquidity;
                emit LiquidityContributionFromStakeToken3(_liquidity);
            } else {
                revert InvalidStakeToken();
            }
        }
    }


    /**
     *  @notice Mint reward tokens for the sending staking pool based on its wave progression.
     *  @notice After all three staking pool have culminated, the staking pool #3 may still fetch new wave with the reward capped
     *          at the lesser between its standard wave reward and the remaining mintable tokens to reach the maximum supply cap.
     *
     *  @return Staking reward.
     *
     *  @dev    Permission: Staking pools.
     */
    function mintForStake() external returns (uint256) {
        if (msg.sender == stakeToken1) {
            if (stakeToken1Waves == PrimaryTokenConstant.STAKE_1_CULMINATING_WAVE) {
                revert AllStakeRewardMinted();
            }
            unchecked {
                stakeToken1Waves += 1;
            }

            _mint(
                msg.sender,
                PrimaryTokenConstant.STAKE_1_WAVE_REWARD
            );

            emit Stake1WaveReward(
                stakeToken1Waves,
                PrimaryTokenConstant.STAKE_1_WAVE_REWARD
            );

            return PrimaryTokenConstant.STAKE_1_WAVE_REWARD;
        } else if (msg.sender == stakeToken2) {
            if (stakeToken2Waves == PrimaryTokenConstant.STAKE_2_CULMINATING_WAVE) {
                revert AllStakeRewardMinted();
            }
            unchecked {
                stakeToken2Waves += 1;
            }

            _mint(
                msg.sender,
                PrimaryTokenConstant.STAKE_2_WAVE_REWARD
            );

            emit Stake2WaveReward(
                stakeToken2Waves,
                PrimaryTokenConstant.STAKE_2_WAVE_REWARD
            );

            return PrimaryTokenConstant.STAKE_2_WAVE_REWARD;
        } else if (msg.sender == stakeToken3) {
            uint256 reward = PrimaryTokenConstant.MAX_SUPPLY - totalSupply();
            if (reward == 0) {
                revert SupplyCapReached();
            }

            unchecked {
                stakeToken3Waves += 1;
            }

            /// @dev    Reward is the lesser between standard wave reward and the remaining mintable tokens to reach the
            ///         maximum supply cap.
            reward = reward > PrimaryTokenConstant.STAKE_3_WAVE_REWARD
                ? PrimaryTokenConstant.STAKE_3_WAVE_REWARD
                : reward;

            _mint(
                msg.sender,
                reward
            );

            emit Stake3WaveReward(
                stakeToken3Waves,
                reward
            );

            return reward;
        } else {
            revert Unauthorized();
        }
    }


    /**
     *  @notice Liquidate tokens for proportional liquidity from the treasury.
     *  @notice Liquidate only after liquidation unlock timestamp.
     *
     *          Name        Description
     *  @param  _amount     Liquidated token amount.
     *
     *  @return Liquidated value.
     */
    function liquidate(
        uint256 _amount
    ) external
    whenNotPaused
    nonReentrant
    returns (uint256) {
        if (liquidationUnlockedAt > block.timestamp) {
            revert BeingLocked();
        }

        ITreasury treasuryContract = ITreasury(treasury);

        uint256 liquidity = treasuryContract.liquidity().scale(_amount, totalSupply());

        treasuryContract.withdrawLiquidity(
            msg.sender,
            liquidity
        );

        /// @dev    Burn liquidated tokens.
        _burn(msg.sender, _amount);

        emit Liquidation(
            msg.sender,
            _amount,
            liquidity
        );

        return liquidity;
    }

    /**
     *  @notice Exclusive Discount: `15% * (1 + globalStake/totalSupply)`.
     *          Note:   `globalStake` is the total tokens staked in 3 pools.
     *
     *  @return Discount rate for exclusive token.
     */
    function exclusiveDiscount() external view returns (Rate memory) {
        return Rate(
            PrimaryTokenConstant.BASE_DISCOUNT.scale(totalStake() + totalSupply(), totalSupply()),
            CommonConstant.RATE_DECIMALS
        );
    }


    /* --- Helper --- */
    /**
     *  @notice Contribute liquidity to the treasury.
     *
     *          Name            Description
     *  @param  _liquidity      Contributed liquidity.
     */
    function _contributeLiquidity(
        uint256 _liquidity
    ) internal {
        address treasuryAddress = treasury;
        address currency = ITreasury(treasuryAddress).currency();
        CurrencyHandler.receiveERC20(
            currency,
            _liquidity
        );
        CurrencyHandler.allowERC20(
            currency,
            treasuryAddress,
            _liquidity
        );
        ITreasury(treasuryAddress).provideLiquidity(_liquidity);
    }

    /**
     *  @notice Mint new tokens to an account.
     *
     *          Name            Description
     *  @param  _account        Receiver address.
     *  @param  _amount         Minted amount.
     */
    function _mint(
        address _account,
        uint256 _amount
    ) internal override(
        ERC20Upgradeable,
        ERC20CappedUpgradeable
    ) {
        super._mint(_account, _amount);
    }

    /**
     *  @notice Hook to be called before any token transfer.
     *
     *          Name            Description
     *  @param  _from           Sender address.
     *  @param  _to             Receiver address.
     *  @param  _amount         Transferred amount.
     */
    function _beforeTokenTransfer(
        address _from,
        address _to,
        uint256 _amount
    ) internal override(
        ERC20Upgradeable,
        ERC20PausableUpgradeable
    ) {
        super._beforeTokenTransfer(_from, _to, _amount);
    }
}
