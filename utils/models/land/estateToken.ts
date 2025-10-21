import { BigNumber } from 'ethers';

// @utils/models/common
import { Validation } from '@utils/models/common/validatable';

// updateCommissionToken
export interface UpdateCommissionTokenParamsInput {
    commissionToken: string;
}

export interface UpdateCommissionTokenParams extends UpdateCommissionTokenParamsInput {
    signatures: string[];
}

// updateBaseURI
export interface UpdateBaseURIParamsInput {
    uri: string;
}

export interface UpdateBaseURIParams extends UpdateBaseURIParamsInput {
    signatures: string[];
}

// authorizeTokenizers
export interface AuthorizeTokenizersParamsInput {
    accounts: string[];
    isTokenizer: boolean;
}

export interface AuthorizeTokenizersParams extends AuthorizeTokenizersParamsInput {
    signatures: string[];
}

// authorizeExtractors
export interface AuthorizeExtractorsParamsInput {
    accounts: string[];
    isExtractor: boolean;
}

export interface AuthorizeExtractorsParams extends AuthorizeExtractorsParamsInput {
    signatures: string[];
}

// updateZoneRoyaltyRate
export interface UpdateZoneRoyaltyRateParamsInput {
    zone: string;
    royaltyRate: BigNumber;
}

export interface UpdateZoneRoyaltyRateParams extends UpdateZoneRoyaltyRateParamsInput {
    signatures: string[];
}

// registerCustodian
export interface RegisterCustodianParamsInput {
    zone: string;
    custodian: string;
    uri: string;
}

export interface RegisterCustodianParams extends RegisterCustodianParamsInput {
    validation: Validation;
}

// tokenizeEstate
export interface TokenizeEstateParams {
    totalSupply: BigNumber;
    zone: string;
    tokenizationId: BigNumber;
    uri: string;
    expireAt: number;
    custodian: string;
    broker: string;
}

// extractEstate
export interface ExtractEstateParams {
    estateId: BigNumber;
    extractionId: BigNumber;
}

// safeDeprecateEstate
export interface DeprecateEstateParams {
    estateId: BigNumber;
    note: string;
}

export interface SafeDeprecateEstateParams extends DeprecateEstateParams {
    anchor: string;
}

// safeExtendEstateExpiration
export interface ExtendEstateExpirationParams {
    estateId: BigNumber;
    expireAt: number;
}

export interface SafeExtendEstateExpirationParams extends ExtendEstateExpirationParams {
    anchor: string;
}

// safeUpdateEstateCustodian
export interface UpdateEstateCustodianParams {
    estateId: BigNumber;
    custodian: string;
}

export interface SafeUpdateEstateCustodianParams extends UpdateEstateCustodianParams {
    anchor: string;
}

// safeUpdateEstateURI
export interface UpdateEstateURIParamsInput {
    estateId: BigNumber;
    uri: string;
}

export interface UpdateEstateURIParams extends UpdateEstateURIParamsInput {
    validation: Validation;
}

export interface SafeUpdateEstateURIParams extends UpdateEstateURIParams {
    anchor: string;
}
