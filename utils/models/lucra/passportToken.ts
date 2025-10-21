import { BigNumber } from 'ethers';

// updateBaseURI
export interface UpdateBaseURIParamsInput {
    uri: string;
}

export interface UpdateBaseURIParams extends UpdateBaseURIParamsInput {
    signatures: string[];
}

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
