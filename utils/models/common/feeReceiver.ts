import { BigNumber } from 'ethers';

// withdraw
export interface WithdrawParamsInput {
    receiver: string;
    currencies: string[];
    values: BigNumber[];
}

export interface WithdrawParams extends WithdrawParamsInput {
    signatures: string[];
}
