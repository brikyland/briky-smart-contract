import { BigNumber } from 'ethers';

// updateStakeTokens
export interface UpdateStakeTokensParamsInput {
    stakeToken1: string;
    stakeToken2: string;
    stakeToken3: string;
}

export interface UpdateStakeTokensParams extends UpdateStakeTokensParamsInput {
    signatures: string[];
}

// startAuction
export interface StartAuctionParamsInput {
    endAt: number;
    vestingDuration: number;
}

export interface StartAuctionParams extends StartAuctionParamsInput {
    signatures: string[];
}

// deposit
export interface DepositParams {
    value: BigNumber;
}

// stake
export interface StakeParams {
    stake1: BigNumber;
    stake2: BigNumber;
}
