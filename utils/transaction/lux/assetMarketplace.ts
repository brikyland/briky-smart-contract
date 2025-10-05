import { AssetMarketplace, ProxyCaller } from "@typechain-types";
import { BuyParams, BuyPartParams, CancelParams, ListParams, SafeBuyParams, SafeBuyPartParams } from "@utils/models/lux/assetMarketplace";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ContractTransaction } from "ethers";
import { getSafeBuyAnchor, getSafeBuyPartAnchor } from "@utils/anchor/lux/assetMarketplace";


// list
export async function getListTx(
    assetMarketplace: AssetMarketplace,
    signer: SignerWithAddress,
    params: ListParams
): Promise<ContractTransaction> {
    return assetMarketplace.connect(signer).list(
        params.tokenId,
        params.sellingAmount,
        params.unitPrice,
        params.currency,
        params.isDivisible
    );
}

export async function getCallListTx(
    assetMarketplace: AssetMarketplace,
    caller: ProxyCaller,
    params: ListParams
): Promise<ContractTransaction> {
    return caller.call(
        assetMarketplace.address,
        assetMarketplace.interface.encodeFunctionData("list", [
            params.tokenId,
            params.sellingAmount,
            params.unitPrice,
            params.currency,
            params.isDivisible
        ])
    );
}


// buy(uint256)
export async function getBuyTx(
    assetMarketplace: AssetMarketplace,
    signer: SignerWithAddress,
    params: BuyParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return assetMarketplace.connect(signer)["buy(uint256)"](
        params.offerId,
        txConfig
    );
}


// buy(uint256,uint256)
export async function getBuyPartTx(
    assetMarketplace: AssetMarketplace,
    signer: SignerWithAddress,
    params: BuyPartParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return assetMarketplace.connect(signer)["buy(uint256,uint256)"](
        params.offerId,
        params.amount,
        txConfig
    );
}


// cancel
export async function getCancelTx(
    assetMarketplace: AssetMarketplace,
    signer: SignerWithAddress,
    params: CancelParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return assetMarketplace.connect(signer).cancel(
        params.offerId,
        txConfig
    );
}


// safeBuy(uint256,bytes32)
export async function getSafeBuyTx(
    assetMarketplace: AssetMarketplace,
    signer: SignerWithAddress,
    params: SafeBuyParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return assetMarketplace.connect(signer)["safeBuy(uint256,bytes32)"](
        params.offerId,
        params.anchor,
        txConfig
    );
}

export async function getSafeBuyTxByParams(
    assetMarketplace: AssetMarketplace,
    signer: SignerWithAddress,
    params: BuyParams,
    txConfig = {}
): Promise<ContractTransaction> {
    const safeParams: SafeBuyParams = {
        ...params,
        anchor: await getSafeBuyAnchor(assetMarketplace, params),
    };
    return getSafeBuyTx(assetMarketplace, signer, safeParams, txConfig);
}


// safeBuy(uint256,uint256,bytes32)
export async function getSafeBuyPartTx(
    assetMarketplace: AssetMarketplace,
    signer: SignerWithAddress,
    params: SafeBuyPartParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return await assetMarketplace.connect(signer)["safeBuy(uint256,uint256,bytes32)"](
        params.offerId,
        params.amount,
        params.anchor,
        txConfig
    );
}

export async function getSafeBuyPartTxByParams(
    assetMarketplace: AssetMarketplace,
    signer: SignerWithAddress,
    params: BuyPartParams,
    txConfig = {}
): Promise<ContractTransaction> {
    const safeParams: SafeBuyPartParams = {
        ...params,
        anchor: await getSafeBuyPartAnchor(assetMarketplace, params),
    };
    return getSafeBuyPartTx(assetMarketplace, signer, safeParams, txConfig);
}
