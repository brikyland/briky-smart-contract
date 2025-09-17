import { BigNumber } from "ethers";

export interface ListParams {
    collection: string;
    tokenId: BigNumber;
    price: BigNumber;
    currency: string;
}