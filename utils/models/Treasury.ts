import { BigNumber } from "ethers";

export interface WithdrawOperationFundParamsInput {
    operator: string;
    value: BigNumber;
}

export interface WithdrawOperationFundParams extends WithdrawOperationFundParamsInput {
    signatures: string[];
}