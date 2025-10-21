import { BigNumber } from 'ethers';

// withdrawOperationFund
export interface WithdrawOperationFundParamsInput {
    operator: string;
    value: BigNumber;
}

export interface WithdrawOperationFundParams extends WithdrawOperationFundParamsInput {
    signatures: string[];
}

// withdrawLiquidity
export interface WithdrawLiquidityParams {
    withdrawer: string;
    value: BigNumber;
}

// provideLiquidity
export interface ProvideLiquidityParams {
    value: BigNumber;
}
