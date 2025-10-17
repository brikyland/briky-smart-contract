import { BigNumber } from 'ethers';

// updateBaseURI
export interface UpdateBaseURIParamsInput {
    uri: string;
}

export interface UpdateBaseURIParams extends UpdateBaseURIParamsInput {
    signatures: string[];
}

// updateRoyaltyRate
export interface UpdateRoyaltyRateParamsInput {
    royaltyRate: BigNumber;
}

export interface UpdateRoyaltyRateParams extends UpdateRoyaltyRateParamsInput {
    signatures: string[];
}

// registerBroker
export interface RegisterBrokerParams {
    zone: string;
    broker: string;
    commissionRate: BigNumber;
}

// activateBroker
export interface ActivateBrokerParams {
    zone: string;
    broker: string;
    isActive: boolean;
}

// mint
export interface MintParams {
    zone: string;
    broker: string;
    tokenId: BigNumber;
}
