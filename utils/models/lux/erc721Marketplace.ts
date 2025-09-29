import { BigNumber } from "ethers";

export interface RegisterCollectionsParamsInput {
    collections: string[];
    isCollection: boolean;
}

export interface RegisterCollectionsParams extends RegisterCollectionsParamsInput {
    signatures: string[];
}

export interface ListParams {
    collection: string;
    tokenId: BigNumber;
    price: BigNumber;
    currency: string;
}

export interface BuyParams {
    offerId: BigNumber;
}

export interface SafeBuyParams {
    offerId: BigNumber;
    anchor: BigNumber;
}
