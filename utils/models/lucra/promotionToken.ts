import { BigNumber } from 'ethers';

// updateFee
export interface UpdateFeeParamsInput {
    fee: BigNumber;
}

export interface UpdateFeeParams extends UpdateFeeParamsInput {
    signatures: string[];
}

// updateRoyaltyRate
export interface UpdateRoyaltyRateParamsInput {
    royaltyRate: BigNumber;
}

export interface UpdateRoyaltyRateParams extends UpdateRoyaltyRateParamsInput {
    signatures: string[];
}

// withdraw
export interface WithdrawParamsInput {
    receiver: string;
    currencies: string[];
    values: BigNumber[];
}

export interface WithdrawParams extends WithdrawParamsInput {
    signatures: string[];
}

// createContents
export interface CreateContentsParamsInput {
    uris: string[];
    startAts: number[];
    durations: number[];
}

export interface CreateContentsParams extends CreateContentsParamsInput {
    signatures: string[];
}

// updateContentURIs
export interface UpdateContentURIsParamsInput {
    contentIds: BigNumber[];
    uris: string[];
}

export interface UpdateContentURIsParams extends UpdateContentURIsParamsInput {
    signatures: string[];
}

// cancelContents
export interface CancelContentsParamsInput {
    contentIds: BigNumber[];
}

export interface CancelContentsParams extends CancelContentsParamsInput {
    signatures: string[];
}

// mint
export interface MintParams {
    contentId: BigNumber;
    amount: BigNumber;
}
