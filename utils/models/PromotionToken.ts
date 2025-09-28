import { BigNumber } from "ethers";

export interface UpdateFeeParamsInput {
    fee: BigNumber;
}

export interface UpdateFeeParams extends UpdateFeeParamsInput {
    signatures: string[];
}

export interface UpdateRoyaltyRateParamsInput {
    royaltyRate: BigNumber;
}

export interface UpdateRoyaltyRateParams extends UpdateRoyaltyRateParamsInput {
    signatures: string[];
}

export interface WithdrawParamsInput {
    receiver: string;
    currencies: string[];
    values: BigNumber[];
}

export interface WithdrawParams extends WithdrawParamsInput {
    signatures: string[];
}

export interface CreateContentsParamsInput {
    uris: string[];
    startAts: number[];
    durations: number[];
}

export interface CreateContentsParams extends CreateContentsParamsInput {
    signatures: string[];
}

export interface UpdateContentURIsParamsInput {
    contentIds: BigNumber[];
    uris: string[];
}

export interface UpdateContentURIsParams extends UpdateContentURIsParamsInput {
    signatures: string[];
}

export interface CancelContentsParamsInput {
    contentIds: BigNumber[];
}

export interface CancelContentsParams extends CancelContentsParamsInput {
    signatures: string[];
}