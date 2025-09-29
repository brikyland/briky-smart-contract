import { BigNumber } from "ethers";

export interface ListParams {
    tokenId: BigNumber;
    sellingAmount: BigNumber;
    unitPrice: BigNumber;
    currency: string;
    isDivisible: boolean;
}

export interface BuyParams {
    offerId: BigNumber;
}

export interface SafeBuyParams extends BuyParams {
    anchor: string;
}

export interface BuyPartParams {
    offerId: BigNumber;
    amount: BigNumber;
}

export interface SafeBuyPartParams extends BuyPartParams {
    anchor: string;
}