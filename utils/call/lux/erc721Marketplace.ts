import { getSafeBuyAnchor } from "@utils/anchor/lux/erc721Marketplace";
import { Admin, ERC721Marketplace } from "../../../typechain-types";
import { callTransaction } from "../../blockchain";
import { BuyParams, RegisterCollectionsParams, RegisterCollectionsParamsInput, SafeBuyParams } from "@utils/models/lux/erc721Marketplace";
import { getRegisterCollectionsSignatures } from "@utils/signatures/lux/erc721Marketplace";
import { getRegisterCollectionsTx, getSafeBuyTx } from "@utils/transaction/lux/erc721Marketplace";

export async function callERC721Marketplace_RegisterCollections(
    erc721Marketplace: ERC721Marketplace,
    deployer: any,
    admins: any[],
    admin: Admin,
    paramsInput: RegisterCollectionsParamsInput,
) {
    const params: RegisterCollectionsParams = {
        ...paramsInput,
        signatures: await getRegisterCollectionsSignatures(erc721Marketplace, admins, admin, paramsInput),
    };
    await callTransaction(getRegisterCollectionsTx(erc721Marketplace as any, deployer, params));
}

export async function callERC721Marketplace_SafeBuy(
    erc721Marketplace: ERC721Marketplace,
    deployer: any,
    params: BuyParams,
) {
    const safeParams: SafeBuyParams = {
        ...params,
        anchor: await getSafeBuyAnchor(erc721Marketplace, params),
    };
    await callTransaction(getSafeBuyTx(erc721Marketplace as any, deployer, safeParams));
}
