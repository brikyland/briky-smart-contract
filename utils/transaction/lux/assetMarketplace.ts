import { ContractTransaction } from 'ethers';

// @nomiclabs/hardhat-ethers
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

// @typechain-types
import { AssetMarketplace, ProxyCaller } from '@typechain-types';

// @utils/models/lux
import {
    BuyParams,
    BuyPartParams,
    CancelParams,
    ListParams,
    SafeBuyParams,
    SafeBuyPartParams,
} from '@utils/models/lux/assetMarketplace';

// @utils/anchor/lux
import { getSafeBuyAnchor, getSafeBuyPartAnchor } from '@utils/anchor/lux/assetMarketplace';

// list
export async function getAssetMarketplaceTx_List(
    assetMarketplace: AssetMarketplace,
    signer: SignerWithAddress,
    params: ListParams
): Promise<ContractTransaction> {
    return assetMarketplace
        .connect(signer)
        .list(params.tokenId, params.sellingAmount, params.unitPrice, params.currency, params.isDivisible);
}

export async function getCallAssetMarketplaceTx_List(
    assetMarketplace: AssetMarketplace,
    caller: ProxyCaller,
    params: ListParams
): Promise<ContractTransaction> {
    return caller.call(
        assetMarketplace.address,
        assetMarketplace.interface.encodeFunctionData('list', [
            params.tokenId,
            params.sellingAmount,
            params.unitPrice,
            params.currency,
            params.isDivisible,
        ])
    );
}

// buy(uint256)
export async function getAssetMarketplaceTx_Buy(
    assetMarketplace: AssetMarketplace,
    signer: SignerWithAddress,
    params: BuyParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return assetMarketplace.connect(signer)['buy(uint256)'](params.offerId, txConfig);
}

// buy(uint256,uint256)
export async function getAssetMarketplaceTx_BuyPart(
    assetMarketplace: AssetMarketplace,
    signer: SignerWithAddress,
    params: BuyPartParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return assetMarketplace.connect(signer)['buy(uint256,uint256)'](params.offerId, params.amount, txConfig);
}

// cancel
export async function getAssetMarketplaceTx_Cancel(
    assetMarketplace: AssetMarketplace,
    signer: SignerWithAddress,
    params: CancelParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return assetMarketplace.connect(signer).cancel(params.offerId, txConfig);
}

// safeBuy(uint256,bytes32)
export async function getAssetMarketplaceTx_SafeBuy(
    assetMarketplace: AssetMarketplace,
    signer: SignerWithAddress,
    params: SafeBuyParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return assetMarketplace.connect(signer)['safeBuy(uint256,bytes32)'](params.offerId, params.anchor, txConfig);
}

export async function getAssetMarketplaceTxByParams_SafeBuy(
    assetMarketplace: AssetMarketplace,
    signer: SignerWithAddress,
    params: BuyParams,
    txConfig = {}
): Promise<ContractTransaction> {
    const safeParams: SafeBuyParams = {
        ...params,
        anchor: await getSafeBuyAnchor(assetMarketplace, params),
    };
    return getAssetMarketplaceTx_SafeBuy(assetMarketplace, signer, safeParams, txConfig);
}

// safeBuy(uint256,uint256,bytes32)
export async function getAssetMarketplaceTx_SafeBuyPart(
    assetMarketplace: AssetMarketplace,
    signer: SignerWithAddress,
    params: SafeBuyPartParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return await assetMarketplace
        .connect(signer)
        ['safeBuy(uint256,uint256,bytes32)'](params.offerId, params.amount, params.anchor, txConfig);
}

export async function getAssetMarketplaceTxByParams_SafeBuyPart(
    assetMarketplace: AssetMarketplace,
    signer: SignerWithAddress,
    params: BuyPartParams,
    txConfig = {}
): Promise<ContractTransaction> {
    const safeParams: SafeBuyPartParams = {
        ...params,
        anchor: await getSafeBuyPartAnchor(assetMarketplace, params),
    };
    return getAssetMarketplaceTx_SafeBuyPart(assetMarketplace, signer, safeParams, txConfig);
}
