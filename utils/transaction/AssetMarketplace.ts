import { AssetMarketplace, ProxyCaller } from "@typechain-types";
import { ListParams } from "@utils/models/AssetMarketplace";

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
