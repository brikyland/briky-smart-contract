import { BigNumber } from "ethers";

export interface RequestEstateInput {
    zone: string;
    uri: string;
    expireAt: number;
};

export interface RequestEstate {
    estateId: BigNumber;
    zone: string;
    uri: string;
    expireAt: number;
};

export interface RequestQuotaInput {
    totalQuantity: BigNumber;
    minSellingQuantity: BigNumber;
    maxSellingQuantity: BigNumber;
};

export interface RequestQuota {
    totalQuantity: BigNumber;
    minSellingQuantity: BigNumber;
    maxSellingQuantity: BigNumber;
    soldQuantity: BigNumber;
};

export interface RequestQuoteInput {
    unitPrice: BigNumber;
    currency: string;
    cashbackThreshold: BigNumber;
    cashbackBaseRate: BigNumber;
    cashbackCurrencies: string[];
    cashbackDenominations: BigNumber[];
};

export interface RequestQuote {
    unitPrice: BigNumber;
    currency: string;
    cashbackThreshold: BigNumber;
    cashbackFundId: BigNumber;
    feeDenomination: BigNumber;
    commissionDenomination: BigNumber;
};

export interface RequestAgendaInput {
    saleStartsAt: number;
    privateSaleDuration: number;
    publicSaleDuration: number;
};

export interface RequestAgenda {
    saleStartsAt: number;
    privateSaleEndsAt: number;
    publicSaleEndsAt: number;
    confirmAt: number;
};

export interface RegisterSellerInParams {
    zone: string;
    account: string;
    uri: string;
}

export interface RequestTokenizationParams {
    requester: string;
    estate: RequestEstateInput;
    quota: RequestQuotaInput;
    quote: RequestQuoteInput;
    agenda: RequestAgendaInput;
}

export interface UpdateRequestURIParams {
    requestId: BigNumber;
    uri: string;
}

export interface UpdateRequestAgendaParams {
    requestId: BigNumber;
    agenda: RequestAgendaInput;
}
