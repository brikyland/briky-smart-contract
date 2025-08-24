import { BigNumber } from "ethers";

export interface RegisterBrokerParams {
    zone: string;
    broker: string;
    commissionRate: BigNumber;
    duration: number;
}

export interface ExtendBrokerExpirationParams {
    zone: string;
    broker: string;
    duration: number;
}

export interface MintParams {
    zone: string;
    broker: string;
    tokenId: BigNumber;
}
