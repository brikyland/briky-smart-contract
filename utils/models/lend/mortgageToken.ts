import { BigNumber } from "ethers";

export enum MortgageState {
    Nil,
    Pending,
    Supplied,
    Repaid,
    Foreclosed,
    Cancelled
}

export interface UpdateBaseURIParamsInput {
    uri: string;
}

export interface UpdateBaseURIParams extends UpdateBaseURIParamsInput {
    signatures: string[];
}

export interface UpdateFeeRateParamsInput {
    feeRate: BigNumber;
}

export interface UpdateFeeRateParams extends UpdateFeeRateParamsInput {
    signatures: string[];
}

export interface LendParams {
    mortgageId: BigNumber;
}

export interface SafeLendParams extends LendParams {
    anchor: BigNumber;
}

export interface RepayParams {
    mortgageId: BigNumber;
}

export interface SafeRepayParams extends RepayParams {
    anchor: BigNumber;
}
