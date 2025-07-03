import { BigNumber } from "ethers";

export interface RequestEstateInput {
    zone: string;
    uri: string;
    decimals: number;
    expireAt: number;
};

export interface RequestQuotaInput {
    totalQuantity: BigNumber;
    minSellingQuantity: BigNumber;
    maxSellingQuantity: BigNumber;
};

export interface RequestQuoteInput {
    unitPrice: BigNumber;
    currency: string;
    cashbackThreshold: BigNumber;
    cashbackBaseRate: BigNumber;
    cashbackCurrencies: string[];
    cashbackDenominations: BigNumber[];
};

export interface RequestEstate {
    estateId: BigNumber;
    zone: string;
    uri: string;
    decimals: number;
    expireAt: number;
};

export interface RequestQuota {
    totalQuantity: BigNumber;
    minSellingQuantity: BigNumber;
    maxSellingQuantity: BigNumber;
    soldQuantity: BigNumber;
};

export interface RequestQuote {
    unitPrice: BigNumber;
    currency: string;
    cashbackThreshold: BigNumber;
    cashbackFundId: BigNumber;
};

export interface RequestAgenda {
    privateSaleEndsAt: number;
    publicSaleEndsAt: number;
};
