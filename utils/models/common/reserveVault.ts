import { BigNumber } from 'ethers';

// authorizeProviders
export interface AuthorizeProviderParamsInput {
    accounts: string[];
    isProvider: boolean;
}

export interface AuthorizeProviderParams extends AuthorizeProviderParamsInput {
    signatures: string[];
}

// openFund
export interface OpenFundParams {
    mainCurrency: string;
    mainDenomination: number;
    extraCurrencies: string[];
    extraDenominations: number[];
}

// expandFund
export interface ExpandFundParams {
    fundId: BigNumber;
    quantity: BigNumber;
}

// provideFund
export interface ProvideFundParams {
    fundId: BigNumber;
}

// withdrawFund
export interface WithdrawFundParams {
    fundId: BigNumber;
    receiver: string;
    quantity: BigNumber;
}
