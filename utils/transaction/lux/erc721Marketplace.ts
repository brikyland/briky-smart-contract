import { Admin, ERC721Marketplace, ProxyCaller } from "@typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ContractTransaction } from "ethers";
import { BuyParams, CancelParams, ListParams, RegisterCollectionsParams, RegisterCollectionsParamsInput, SafeBuyParams } from "@utils/models/lux/erc721Marketplace";
import { getRegisterCollectionsSignatures } from "@utils/signatures/lux/erc721Marketplace";


// registerCollections
export async function getERC721MarketplaceTx_RegisterCollections(
    erc721Marketplace: ERC721Marketplace,
    signer: SignerWithAddress,
    params: RegisterCollectionsParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return await erc721Marketplace.connect(signer).registerCollections(
        params.collections,
        params.isCollection,
        params.signatures,
        txConfig
    );
}

export async function getERC721MarketplaceTxByInput_RegisterCollections(
    erc721Marketplace: ERC721Marketplace,
    signer: SignerWithAddress,
    paramsInput: RegisterCollectionsParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: RegisterCollectionsParams = {
        ...paramsInput,
        signatures: await getRegisterCollectionsSignatures(erc721Marketplace, paramsInput, admin, admins)
    };
    return getERC721MarketplaceTx_RegisterCollections(erc721Marketplace, signer, params, txConfig);
}


// list
export async function getERC721MarketplaceTx_List(
    erc721Marketplace: ERC721Marketplace,
    signer: SignerWithAddress,
    params: ListParams
): Promise<ContractTransaction> {
    return await erc721Marketplace.connect(signer).list(
        params.collection,
        params.tokenId,
        params.price,
        params.currency
    );
}

export async function getCallERC721MarketplaceTx_List(
    erc721Marketplace: ERC721Marketplace,
    caller: ProxyCaller,
    params: ListParams
): Promise<ContractTransaction> {
    return await caller.call(
        erc721Marketplace.address,
        erc721Marketplace.interface.encodeFunctionData("list", [
            params.collection,
            params.tokenId,
            params.price,
            params.currency
        ])
    );
}


// buy
export async function getERC721MarketplaceTx_Buy(
    erc721Marketplace: ERC721Marketplace,
    signer: SignerWithAddress,
    params: BuyParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return await erc721Marketplace.connect(signer).buy(
        params.offerId,
        txConfig
    );
}


// cancel
export async function getERC721MarketplaceTx_Cancel(
    erc721Marketplace: ERC721Marketplace,
    signer: SignerWithAddress,
    params: CancelParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return await erc721Marketplace.connect(signer).cancel(
        params.offerId,
        txConfig
    );
}


// safeBuy
export async function getERC721MarketplaceTx_SafeBuy(
    erc721Marketplace: ERC721Marketplace,
    signer: SignerWithAddress,
    params: SafeBuyParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return await erc721Marketplace.connect(signer).safeBuy(
        params.offerId,
        params.anchor,
        txConfig
    );
}
