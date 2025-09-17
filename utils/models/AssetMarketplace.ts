import { BigNumber } from "ethers";

export interface ListParams {
    tokenId: BigNumber;
    sellingAmount: BigNumber;
    unitPrice: BigNumber;
    currency: string;
    isDivisible: boolean;
}