import { AssetMarketplace, ProxyCaller } from "@typechain-types";
import { BuyParams, BuyPartParams, ListParams, SafeBuyParams, SafeBuyPartParams } from "@utils/models/lux/assetMarketplace";

export async function getListTx(
    assetMarketplace: AssetMarketplace,
    signer: any,
    params: ListParams
) {
    const tx = await assetMarketplace.connect(signer).list(
        params.tokenId,
        params.sellingAmount,
        params.unitPrice,
        params.currency,
        params.isDivisible
    );
    return tx;
}

export async function getCallListTx(
    assetMarketplace: AssetMarketplace,
    caller: ProxyCaller,
    params: ListParams
) {

    const tx = await caller.call(
        assetMarketplace.address,
        assetMarketplace.interface.encodeFunctionData("list", [
            params.tokenId,
            params.sellingAmount,
            params.unitPrice,
            params.currency,
            params.isDivisible
        ])
    );
    return tx;
}

export async function getBuyTx(
    assetMarketplace: AssetMarketplace,
    signer: any,
    params: BuyParams,
    txConfig = {}
) {
    return await assetMarketplace.connect(signer)["buy(uint256)"](
        params.offerId,
        txConfig
    );
}

export async function getSafeBuyTx(
    assetMarketplace: AssetMarketplace,
    signer: any,
    params: SafeBuyParams,
    txConfig = {}
) {
    return await assetMarketplace.connect(signer)["safeBuy(uint256,bytes32)"](
        params.offerId,
        params.anchor,
        txConfig
    );
}

export async function getBuyPartTx(
    assetMarketplace: AssetMarketplace,
    signer: any,
    params: BuyPartParams,
    txConfig = {}
) {
    return await assetMarketplace.connect(signer)["buy(uint256,uint256)"](
        params.offerId,
        params.amount,
        txConfig
    );
}

export async function getSafeBuyPartTx(
    assetMarketplace: AssetMarketplace,
    signer: any,
    params: SafeBuyPartParams,
    txConfig = {}
) {
    return await assetMarketplace.connect(signer)["safeBuy(uint256,uint256,bytes32)"](
        params.offerId,
        params.amount,
        params.anchor,
        txConfig
    );
}