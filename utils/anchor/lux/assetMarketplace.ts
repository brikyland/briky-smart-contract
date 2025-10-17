import { ethers } from 'ethers';

// @typechain-types
import { AssetMarketplace } from '@typechain-types';

// @utils/models/lux
import { BuyParams, BuyPartParams } from '@utils/models/lux/assetMarketplace';

// safeBuy(uint256,bytes32)
export async function getSafeBuyAnchor(assetMarketplace: AssetMarketplace, params: BuyParams): Promise<string> {
    const offer = await assetMarketplace.getOffer(params.offerId);
    return ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
            ['uint256', 'uint256', 'uint256'],
            [offer.sellingAmount, offer.tokenId, offer.unitPrice]
        )
    );
}

// safeBuy(uint256,uint256,bytes32)
export async function getSafeBuyPartAnchor(assetMarketplace: AssetMarketplace, params: BuyPartParams): Promise<string> {
    const offer = await assetMarketplace.getOffer(params.offerId);
    return ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
            ['uint256', 'uint256', 'uint256'],
            [params.amount, offer.tokenId, offer.unitPrice]
        )
    );
}
