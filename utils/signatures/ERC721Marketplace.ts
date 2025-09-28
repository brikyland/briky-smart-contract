import { Admin, ERC721Marketplace } from "@typechain-types";
import { RegisterCollectionsParamsInput } from "@utils/models/ERC721Marketplace";
import { getSignatures } from "@utils/blockchain";
import { ethers } from "ethers";

export async function getRegisterCollectionsSignatures(
    erc721Marketplace: ERC721Marketplace,
    admins: any[],
    admin: Admin,
    params: RegisterCollectionsParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address[]", "bool"],
        [erc721Marketplace.address, "registerCollections", params.collections, params.isCollection]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}
