import { ERC721Marketplace } from "@typechain-types";
import { BuyParams } from "@utils/models/lux/erc721Marketplace";
import { BigNumber } from "ethers";

export async function getSafeBuyAnchor(
    erc721Marketplace: ERC721Marketplace,
    params: BuyParams
): Promise<BigNumber> {
    return (await erc721Marketplace.getOffer(params.offerId)).tokenId;
}
