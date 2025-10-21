import { BigNumber } from 'ethers';

export enum MortgageState {
    Nil,
    Pending,
    Supplied,
    Repaid,
    Foreclosed,
    Cancelled,
}

// updateBaseURI
export interface UpdateBaseURIParamsInput {
    uri: string;
}

export interface UpdateBaseURIParams extends UpdateBaseURIParamsInput {
    signatures: string[];
}

// updateFeeRate
export interface UpdateFeeRateParamsInput {
    feeRate: BigNumber;
}

export interface UpdateFeeRateParams extends UpdateFeeRateParamsInput {
    signatures: string[];
}

// cancel
export interface CancelParams {
    mortgageId: BigNumber;
}

// lend
export interface LendParams {
    mortgageId: BigNumber;
}

// safeLend
export interface SafeLendParams extends LendParams {
    anchor: BigNumber;
}

// repay
export interface RepayParams {
    mortgageId: BigNumber;
}

// safeRepay
export interface SafeRepayParams extends RepayParams {
    anchor: BigNumber;
}

// foreclose
export interface ForecloseParams {
    mortgageId: BigNumber;
}
