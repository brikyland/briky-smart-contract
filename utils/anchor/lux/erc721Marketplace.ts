import { BigNumber } from 'ethers';

// @typechain-types
import { ERC721Marketplace } from '@typechain-types';

// @utils/models/lux
import { BuyParams } from '@utils/models/lux/erc721Marketplace';

// safeBuy
export async function getSafeBuyAnchor(erc721Marketplace: ERC721Marketplace, params: BuyParams): Promise<BigNumber> {
    return (await erc721Marketplace.getOffer(params.offerId)).tokenId;
}
