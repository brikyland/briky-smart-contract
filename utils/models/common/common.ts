import { BigNumber } from 'ethers';

export interface Rate {
    value: BigNumber;
    decimals: number;
}

export const RATES_SCHEMA = {
    type: 'tuple[]',
    name: 'rates',
    components: [
        { name: 'value', type: 'uint256' },
        { name: 'decimals', type: 'uint8' },
    ],
} as any;
