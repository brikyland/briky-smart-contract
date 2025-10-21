import { BigNumber } from 'ethers';

// @utils/models/common
import { Validation } from '@utils/models/common/validatable';

// updateBaseUnitPriceRange
export interface UpdateBaseUnitPriceRangeParamsInput {
    baseMinUnitPrice: BigNumber;
    baseMaxUnitPrice: BigNumber;
}

export interface UpdateBaseUnitPriceRangeParams extends UpdateBaseUnitPriceRangeParamsInput {
    signatures: string[];
}

// whitelist
export interface WhitelistParamsInput {
    accounts: string[];
    isWhitelisted: boolean;
}

export interface WhitelistParams extends WhitelistParamsInput {
    signatures: string[];
}

// requestTokenization
export interface RequestEstateInput {
    zone: string;
    uri: string;
    expireAt: number;
}

export interface RequestEstate {
    estateId: BigNumber;
    zone: string;
    uri: string;
    expireAt: number;
}

export interface RequestQuotaInput {
    totalQuantity: BigNumber;
    minSellingQuantity: BigNumber;
    maxSellingQuantity: BigNumber;
}

export interface RequestQuota {
    totalQuantity: BigNumber;
    minSellingQuantity: BigNumber;
    maxSellingQuantity: BigNumber;
    soldQuantity: BigNumber;
}

export interface RequestQuoteInput {
    unitPrice: BigNumber;
    currency: string;
    cashbackThreshold: BigNumber;
    cashbackBaseRate: BigNumber;
    cashbackCurrencies: string[];
    cashbackDenominations: BigNumber[];
    feeDenomination: BigNumber;
    broker: string;
}

export interface RequestQuote {
    unitPrice: BigNumber;
    currency: string;
    cashbackThreshold: BigNumber;
    cashbackFundId: BigNumber;
    feeDenomination: BigNumber;
    commissionDenomination: BigNumber;
    broker: string;
}

export interface RequestAgendaInput {
    saleStartsAt: number;
    privateSaleDuration: number;
    publicSaleDuration: number;
}

export interface RequestAgenda {
    saleStartsAt: number;
    privateSaleEndsAt: number;
    publicSaleEndsAt: number;
    confirmAt: number;
}

export interface RequestTokenizationParamsInput {
    requester: string;
    estate: RequestEstateInput;
    quota: RequestQuotaInput;
    quote: RequestQuoteInput;
    agenda: RequestAgendaInput;
}

export interface RequestTokenizationParams extends RequestTokenizationParamsInput {
    validation: Validation;
}

// whitelistFor
export interface WhitelistForParams {
    requestId: BigNumber;
    accounts: string[];
    isWhitelisted: boolean;
}

// updateRequestEstateURI
export interface UpdateRequestEstateURIParamsInput {
    requestId: BigNumber;
    uri: string;
}

export interface UpdateRequestEstateURIParams extends UpdateRequestEstateURIParamsInput {
    validation: Validation;
}

// updateRequestAgenda
export interface UpdateRequestAgendaParams {
    requestId: BigNumber;
    agenda: RequestAgendaInput;
}

// cancel
export interface CancelParams {
    requestId: BigNumber;
}

// deposit
export interface DepositParams {
    requestId: BigNumber;
    quantity: BigNumber;
}

// safeDeposit
export interface SafeDepositParams extends DepositParams {
    anchor: string;
}

// confirm
export interface ConfirmParams {
    requestId: BigNumber;
}

// safeConfirm
export interface SafeConfirmParams extends ConfirmParams {
    anchor: string;
}

// withdrawDeposit
export interface WithdrawDepositParams {
    requestId: BigNumber;
}

// withdrawEstateToken
export interface WithdrawEstateTokenParams {
    requestId: BigNumber;
}
