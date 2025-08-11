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
    totalSupply: number;
    zone: string;
    tokenizationId: number;
    uri: string;
    expireAt: number;
    custodian: string;
    commissionReceiverAddress: string;
}

export interface UpdateEstateURIParams {
    estateId: BigNumber;
    uri: string;
}

export interface UpdateEstateCustodianParams {
    estateId: BigNumber;
    custodian: string;
}