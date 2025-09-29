import { BigNumber } from "ethers";

export enum StakeTokenOperation {
    Stake,
    Unstake,
    FetchReward,
    Promote,
    Transfer
}

export interface InitializeRewardingParamsInput {
    initialLastRewardFetch: BigNumber;
    successor: string;
}

export interface InitializeRewardingParams extends InitializeRewardingParamsInput {
    signatures: string[];
}

export interface UpdateFeeRateParamsInput {
    feeRate: BigNumber;
}

export interface UpdateFeeRateParams extends UpdateFeeRateParamsInput {
    signatures: string[];
}
