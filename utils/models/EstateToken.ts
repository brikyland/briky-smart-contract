import { BigNumber } from "ethers";

import { Validation } from "./Validation";

export interface UpdateEstateURIParams {
    estateId: BigNumber;
    uri: string;
}

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