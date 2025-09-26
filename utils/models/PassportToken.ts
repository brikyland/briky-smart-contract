import { BigNumber } from "ethers";

export interface UpdateBaseURIParamsInput {
    uri: string;
}

export interface UpdateBaseURIParams extends UpdateBaseURIParamsInput {
    signatures: string[];
}

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