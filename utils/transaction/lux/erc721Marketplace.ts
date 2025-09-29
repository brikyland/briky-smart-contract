import { ERC721Marketplace, ProxyCaller } from "@typechain-types";
import { ethers } from "hardhat";
import { BuyParams, ListParams, RegisterCollectionsParams, SafeBuyParams } from "@utils/models/lux/erc721Marketplace";

export async function getListTx(
    erc721Marketplace: ERC721Marketplace,
    signer: any,
    params: ListParams
) {
    const tx = await erc721Marketplace.connect(signer).list(
        params.collection,
        params.tokenId,
        params.price,
        params.currency
    );
    return tx;
}

export async function getCallListTx(
    erc721Marketplace: ERC721Marketplace,
    caller: ProxyCaller,
    params: ListParams
) {

    const tx = await caller.call(
        erc721Marketplace.address,
        erc721Marketplace.interface.encodeFunctionData("list", [
            params.collection,
            params.tokenId,
            params.price,
            params.currency
        ])
    );
    return tx;
}

export async function getRegisterCollectionsTx(
    erc721Marketplace: ERC721Marketplace,
    signer: any,
    params: RegisterCollectionsParams,
    txConfig = {}
) {
    return await erc721Marketplace.connect(signer).registerCollections(
        params.collections,
        params.isCollection,
        params.signatures,
        txConfig
    );
}

export async function getBuyTx(
    erc721Marketplace: ERC721Marketplace,
    signer: any,
    params: BuyParams,
    txConfig = {}
) {
    return await erc721Marketplace.connect(signer).buy(
        params.offerId,
        txConfig
    );
}

export async function getSafeBuyTx(
    erc721Marketplace: ERC721Marketplace,
    signer: any,
    params: SafeBuyParams,
    txConfig = {}
) {
    return await erc721Marketplace.connect(signer).safeBuy(
        params.offerId,
        params.anchor,
        txConfig
    );
}
