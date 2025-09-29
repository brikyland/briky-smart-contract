import { AssetMarketplace } from "@typechain-types";
import { BuyParams, BuyPartParams } from "@utils/models/lux/assetMarketplace";
import { ethers } from "ethers";

export async function getSafeBuyAnchor(
    assetMarketplace: AssetMarketplace,
    params: BuyParams
): Promise<string> {
    const offer = await assetMarketplace.getOffer(params.offerId);
    return ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(
        ["uint256", "uint256", "uint256"],
        [offer.sellingAmount, offer.tokenId, offer.unitPrice]
    ));
}

export async function getSafeBuyPartAnchor(
    assetMarketplace: AssetMarketplace,
    params: BuyPartParams
): Promise<string> {
    const offer = await assetMarketplace.getOffer(params.offerId);
    return ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(
        ["uint256", "uint256", "uint256"],
        [params.amount, offer.tokenId, offer.unitPrice]
    ));
}
