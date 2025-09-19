import { BigNumber } from "ethers";

export interface RegisterCustodianParams {
    zone: string;
    custodian: string;
    uri: string;
}

export interface TokenizeEstateParams {
    totalSupply: BigNumber;
    zone: string;
    tokenizationId: BigNumber;
    uri: string;
    expireAt: number;
    custodian: string;
    broker: string;
}

export interface UpdateEstateURIParams {
    estateId: BigNumber;
    uri: string;
}

export interface UpdateEstateCustodianParams {
    estateId: BigNumber;
    custodian: string;
}

export interface DeprecateEstateParams {
    estateId: BigNumber;
    note: string;
}

export interface ExtendEstateExpirationParams {
    estateId: BigNumber;
    expireAt: number;
}

export interface SafeUpdateEstateURIParams {
    estateId: BigNumber;
    uri: string;
    anchor: string;
}

export interface SafeUpdateEstateCustodianParams {
    estateId: BigNumber;
    custodian: string;
    anchor: string;
}

export interface SafeDeprecateEstateParams {
    estateId: BigNumber;
    note: string;
    anchor: string;
}

export interface SafeExtendEstateExpirationParams {
    estateId: BigNumber;
    expireAt: number;
    anchor: string;
}
