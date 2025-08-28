import { BigNumber } from "ethers";
import { Validation } from "./Validation";

export interface PrestigePadRoundInput {
    uri: string;
    quota: PrestigePadRoundQuotaInput;
    quote: PrestigePadRoundQuoteInput;
};

export interface PrestigePadRound {
    uri: string;
    quota: PrestigePadRoundQuotaInput;
    quote: PrestigePadRoundQuoteInput;
    agenda: PrestigePadRoundAgendaInput;
};

export interface PrestigePadRoundQuotaInput {
    totalQuantity: BigNumber;
    minSellingQuantity: BigNumber;
    maxSellingQuantity: BigNumber;
};

export interface PrestigePadRoundQuota {
    totalQuantity: BigNumber;
    minSellingQuantity: BigNumber;
    maxSellingQuantity: BigNumber;
    soldQuantity: BigNumber;
};

export interface PrestigePadRoundQuoteInput {
    unitPrice: BigNumber;
    currency: string;
};

export interface PrestigePadRoundQuote {
    unitPrice: BigNumber;
    currency: string;
    cashbackThreshold: BigNumber;
    cashbackFundId: BigNumber;
    feeDenomination: BigNumber;
};

export interface PrestigePadRoundAgendaInput {
    raiseStartsAt: number;
    raiseEndsAt: number;
};

export interface PrestigePadRoundAgenda {
    saleStartsAt: number;
    privateSaleEndsAt: number;
    publicSaleEndsAt: number;
};

export interface InitiateLaunchParams {
    initiator: string;
    zone: string;
    projectURI: string;
    launchURI: string;
    feeRate: BigNumber;
    initialQuantity: BigNumber;
}

export interface UpdateRoundParams {
    launchId: BigNumber;
    index: BigNumber;
    round: PrestigePadRoundInput;
}

export interface UpdateRoundsParams {
    launchId: BigNumber;
    removedRoundNumber: BigNumber;
    addedRounds: PrestigePadRoundInput[];
}

export interface RaiseNextRoundParams {
    launchId: BigNumber;
    cashbackThreshold: BigNumber;
    cashbackBaseRate: BigNumber;
    cashbackCurrencies: string[];
    cashbackDenominations: BigNumber[];
    raiseStartsAt: number;
    raiseDuration: number;
}

export interface UpdateLaunchURIParams {
    launchId: BigNumber;
    uri: string;
}