import { BigNumber } from 'ethers';

export interface AirdropParams {
    receivers: string[];
    amounts: BigNumber[];
    currency: string;
}
