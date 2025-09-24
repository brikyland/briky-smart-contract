import { BigNumberish } from "ethers";

export interface UpdateStakeTokensParamsInput {
    stakeToken1: string;
    stakeToken2: string;
    stakeToken3: string;
}

export interface UpdateStakeTokensParams extends UpdateStakeTokensParamsInput {
    signatures: string[];
}

export interface DistributeTokensWithDurationParamsInput {
    receivers: string[];
    amounts: BigNumberish[];
    durations: number[];
    notes: string[];
}

export interface DistributeTokensWithDurationParams extends DistributeTokensWithDurationParamsInput {
    signatures: string[];
}

export interface DistributeTokensWithTimestampParamsInput {
    receivers: string[];
    amounts: BigNumberish[];
    endAts: number[];
    notes: string[];
}

export interface DistributeTokensWithTimestampParams extends DistributeTokensWithTimestampParamsInput {
    signatures: string[];
}