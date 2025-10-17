import { BigNumber } from 'ethers';

// list
export interface ListParams {
    tokenId: BigNumber;
    sellingAmount: BigNumber;
    unitPrice: BigNumber;
    currency: string;
    isDivisible: boolean;
}

// buy(uint256)
export interface BuyParams {
    offerId: BigNumber;
}

// buy(uint256,uint256)
export interface BuyPartParams {
    offerId: BigNumber;
    amount: BigNumber;
}

// cancel
export interface CancelParams {
    offerId: BigNumber;
}

// safeBuy(uint256,bytes32)
export interface SafeBuyParams extends BuyParams {
    anchor: string;
}

// safeBuy(uint256,uint256,bytes32)
export interface SafeBuyPartParams extends BuyPartParams {
    anchor: string;
}
