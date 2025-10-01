// withdraw
export interface WithdrawParamsInput {
    receiver: string;
    currencies: string[];
    values: number[];
}

export interface WithdrawParams extends WithdrawParamsInput {
    signatures: string[];
}