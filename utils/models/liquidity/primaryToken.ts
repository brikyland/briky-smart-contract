import { BigNumber } from 'ethers';

// updateTreasury
export interface UpdateTreasuryParamsInput {
    treasury: string;
}

export interface UpdateTreasuryParams extends UpdateTreasuryParamsInput {
    signatures: string[];
}

// updateStakeTokens
export interface UpdateStakeTokensParamsInput {
    stakeToken1: string;
    stakeToken2: string;
    stakeToken3: string;
}

export interface UpdateStakeTokensParams extends UpdateStakeTokensParamsInput {
    signatures: string[];
}

// unlockForBackerRound
export interface UnlockForBackerRoundParamsInput {
    distributor: string;
}

export interface UnlockForBackerRoundParams extends UnlockForBackerRoundParamsInput {
    signatures: string[];
}

// unlockForSeedRound
export interface UnlockForSeedRoundParamsInput {
    distributor: string;
}

export interface UnlockForSeedRoundParams extends UnlockForSeedRoundParamsInput {
    signatures: string[];
}

// unlockForPrivateSale1
export interface UnlockForPrivateSale1ParamsInput {
    distributor: string;
}

export interface UnlockForPrivateSale1Params extends UnlockForPrivateSale1ParamsInput {
    signatures: string[];
}

// unlockForPrivateSale2
export interface UnlockForPrivateSale2ParamsInput {
    distributor: string;
}

export interface UnlockForPrivateSale2Params extends UnlockForPrivateSale2ParamsInput {
    signatures: string[];
}

// unlockForPublicSale
export interface UnlockForPublicSaleParamsInput {
    distributor: string;
}

export interface UnlockForPublicSaleParams extends UnlockForPublicSaleParamsInput {
    signatures: string[];
}

// unlockForCoreTeam
export interface UnlockForCoreTeamParamsInput {
    distributor: string;
}

export interface UnlockForCoreTeamParams extends UnlockForCoreTeamParamsInput {
    signatures: string[];
}

// unlockForMarketMaker
export interface UnlockForMarketMakerParamsInput {
    distributor: string;
}

export interface UnlockForMarketMakerParams extends UnlockForMarketMakerParamsInput {
    signatures: string[];
}

// unlockForExternalTreasury
export interface UnlockForExternalTreasuryParamsInput {
    distributor: string;
}

export interface UnlockForExternalTreasuryParams extends UnlockForExternalTreasuryParamsInput {
    signatures: string[];
}

// contributeLiquidityFromBackerRound
export interface ContributeLiquidityFromBackerRoundParams {
    liquidity: BigNumber;
}

// contributeLiquidityFromSeedRound
export interface ContributeLiquidityFromSeedRoundParams {
    liquidity: BigNumber;
}

// contributeLiquidityFromPrivateSale1
export interface ContributeLiquidityFromPrivateSale1Params {
    liquidity: BigNumber;
}

// contributeLiquidityFromPrivateSale2
export interface ContributeLiquidityFromPrivateSale2Params {
    liquidity: BigNumber;
}

// contributeLiquidityFromPublicSale
export interface ContributeLiquidityFromPublicSaleParams {
    liquidity: BigNumber;
}

// contributeLiquidityFromMarketMaker
export interface ContributeLiquidityFromMarketMakerParams {
    liquidity: BigNumber;
}

// contributeLiquidityFromExternalTreasury
export interface ContributeLiquidityFromExternalTreasuryParams {
    liquidity: BigNumber;
}

// contributeLiquidityFromStakeToken
export interface ContributeLiquidityFromStakeTokenParams {
    liquidity: BigNumber;
}

// liquidate
export interface LiquidateParams {
    amount: BigNumber;
}
