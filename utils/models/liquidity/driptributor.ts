import { BigNumber, BigNumberish } from 'ethers';

// updateStakeTokens
export interface UpdateStakeTokensParamsInput {
    stakeToken1: string;
    stakeToken2: string;
    stakeToken3: string;
}

export interface UpdateStakeTokensParams extends UpdateStakeTokensParamsInput {
    signatures: string[];
}

// distributeTokensWithDuration
export interface DistributeTokensWithDurationParamsInput {
    receivers: string[];
    amounts: BigNumberish[];
    durations: number[];
    notes: string[];
}

export interface DistributeTokensWithDurationParams extends DistributeTokensWithDurationParamsInput {
    signatures: string[];
}

// distributeTokensWithTimestamp
export interface DistributeTokensWithTimestampParamsInput {
    receivers: string[];
    amounts: BigNumberish[];
    endAts: number[];
    notes: string[];
}

export interface DistributeTokensWithTimestampParams extends DistributeTokensWithTimestampParamsInput {
    signatures: string[];
}

// withdraw
export interface WithdrawParams {
    distributionIds: number[];
}

// stake
export interface StakeParams {
    distributionIds: number[];
    stake1: BigNumber;
    stake2: BigNumber;
}
