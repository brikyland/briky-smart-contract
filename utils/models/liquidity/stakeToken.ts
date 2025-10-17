import { BigNumber } from 'ethers';

export enum StakeTokenOperation {
    Stake,
    Unstake,
    FetchReward,
    Promote,
    Transfer,
}

// initializeRewarding
export interface InitializeRewardingParamsInput {
    initialLastRewardFetch: BigNumber;
    successor: string;
}

export interface InitializeRewardingParams extends InitializeRewardingParamsInput {
    signatures: string[];
}

// updateFeeRate
export interface UpdateFeeRateParamsInput {
    feeRate: BigNumber;
}

export interface UpdateFeeRateParams extends UpdateFeeRateParamsInput {
    signatures: string[];
}

// stake
export interface StakeParams {
    account: string;
    value: BigNumber;
}

// unstake
export interface UnstakeParams {
    value: BigNumber;
}

// promote
export interface PromoteParams {
    value: BigNumber;
}

// transfer
export interface TransferParams {
    to: string;
    amount: BigNumber;
}
