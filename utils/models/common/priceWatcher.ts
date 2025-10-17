import { Rate } from './common';

// updatePriceFeeds
export interface UpdatePriceFeedsParamsInput {
    currencies: string[];
    feeds: string[];
    heartbeats: number[];
}

export interface UpdatePriceFeedsParams extends UpdatePriceFeedsParamsInput {
    signatures: string[];
}

// updateDefaultRates
export interface UpdateDefaultRatesParamsInput {
    currencies: string[];
    rates: Rate[];
}

export interface UpdateDefaultRatesParams extends UpdateDefaultRatesParamsInput {
    signatures: string[];
}
