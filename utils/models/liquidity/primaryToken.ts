import { BigNumber } from "ethers";

export interface UpdateTreasuryParamsInput {
    treasury: string;
}

export interface UpdateTreasuryParams extends UpdateTreasuryParamsInput {
    signatures: string[];
}

export interface UpdateStakeTokensParamsInput {
    stakeToken1: string;
    stakeToken2: string;
    stakeToken3: string;
}

export interface UpdateStakeTokensParams extends UpdateStakeTokensParamsInput {
    signatures: string[];
}

export interface UnlockForBackerRoundParamsInput {
    distributor: string;
}

export interface UnlockForBackerRoundParams extends UnlockForBackerRoundParamsInput {
    signatures: string[];
}

export interface UnlockForSeedRoundParamsInput {
    distributor: string;
}

export interface UnlockForSeedRoundParams extends UnlockForSeedRoundParamsInput {
    signatures: string[];
}

export interface UnlockForPrivateSale1ParamsInput {
    distributor: string;
}

export interface UnlockForPrivateSale1Params extends UnlockForPrivateSale1ParamsInput {
    signatures: string[];
}

export interface UnlockForPrivateSale2ParamsInput {
    distributor: string;
}

export interface UnlockForPrivateSale2Params extends UnlockForPrivateSale2ParamsInput {
    signatures: string[];
}

export interface UnlockForPublicSaleParamsInput {
    distributor: string;
}

export interface UnlockForPublicSaleParams extends UnlockForPublicSaleParamsInput {
    signatures: string[];
}

export interface UnlockForCoreTeamParamsInput {
    distributor: string;
}

export interface UnlockForCoreTeamParams extends UnlockForCoreTeamParamsInput {
    signatures: string[];
}

export interface UnlockForMarketMakerParamsInput {
    distributor: string;
}

export interface UnlockForMarketMakerParams extends UnlockForMarketMakerParamsInput {
    signatures: string[];
}

export interface UnlockForExternalTreasuryParamsInput {
    distributor: string;
}

export interface UnlockForExternalTreasuryParams extends UnlockForExternalTreasuryParamsInput {
    signatures: string[];
}

export interface ContributeLiquidityFromStakeTokenParams {
    liquidity: BigNumber;
}
