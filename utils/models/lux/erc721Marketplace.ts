import { BigNumber } from 'ethers';

// registerCollections
export interface RegisterCollectionsParamsInput {
    collections: string[];
    isCollection: boolean;
}

export interface RegisterCollectionsParams extends RegisterCollectionsParamsInput {
    signatures: string[];
}

// list
export interface ListParams {
    collection: string;
    tokenId: BigNumber;
    price: BigNumber;
    currency: string;
}

// buy
export interface BuyParams {
    offerId: BigNumber;
}

// cancel
export interface CancelParams {
    offerId: BigNumber;
}

// safeBuy
export interface SafeBuyParams {
    offerId: BigNumber;
    anchor: BigNumber;
}
