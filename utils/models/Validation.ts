import { BigNumber } from "ethers";

export interface Validation {
    nonce: BigNumber;
    expiry: BigNumber;
    signature: string;
};