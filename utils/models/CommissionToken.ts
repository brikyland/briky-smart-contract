import { BigNumber } from "ethers";

export interface RegisterBrokerParams {
    zone: string;
    broker: string;
    commissionRate: BigNumber;
}

export interface ActivateBrokerParams {
    zone: string;
    broker: string;
    isActive: boolean;
}

export interface MintParams {
    zone: string;
    broker: string;
    tokenId: BigNumber;
}
