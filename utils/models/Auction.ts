export interface UpdateStakeTokensParamsInput {
    stakeToken1: string;
    stakeToken2: string;
    stakeToken3: string;
}

export interface UpdateStakeTokensParams extends UpdateStakeTokensParamsInput {
    signatures: string[];
}

export interface StartAuctionParamsInput {
    endAt: number;
    vestingDuration: number;
}

export interface StartAuctionParams extends StartAuctionParamsInput {
    signatures: string[];
}