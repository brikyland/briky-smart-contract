import { AssetMarketplace } from "@typechain-types";
import { getSafeBuyAnchor, getSafeBuyPartAnchor } from "@utils/anchor/AssetMarketplace";
import { BuyParams, BuyPartParams, SafeBuyParams, SafeBuyPartParams } from "@utils/models/AssetMarketplace";
import { callTransaction } from "../blockchain";
import { getSafeBuyPartTx, getSafeBuyTx } from "../transaction/AssetMarketplace";

export async function callAssetMarketplace_SafeBuy(
    assetMarketplace: AssetMarketplace,
    deployer: any,
    params: BuyParams,
    txConfig = {}
) {
    const safeParams: SafeBuyParams = {
        ...params,
        anchor: await getSafeBuyAnchor(assetMarketplace, params),
    };
    await callTransaction(getSafeBuyTx(assetMarketplace as any, deployer, safeParams, txConfig));
}

export async function callAssetMarketplace_SafeBuyPart(
    assetMarketplace: AssetMarketplace,
    deployer: any,
    params: BuyPartParams,
    txConfig = {}
) {
    const safeParams: SafeBuyPartParams = {
        ...params,
        anchor: await getSafeBuyPartAnchor(assetMarketplace, params),
    };
    await callTransaction(getSafeBuyPartTx(assetMarketplace as any, deployer, safeParams, txConfig));
}