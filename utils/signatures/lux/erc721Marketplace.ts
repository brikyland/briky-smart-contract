import { Admin, ERC721Marketplace } from "@typechain-types";
import { RegisterCollectionsParamsInput } from "@utils/models/lux/erc721Marketplace";
import { getSignatures } from "@utils/blockchain";
import { ethers } from "ethers";

export async function getRegisterCollectionsSignatures(
    erc721Marketplace: ERC721Marketplace,
    paramsInput: RegisterCollectionsParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address[]", "bool"],
        [erc721Marketplace.address, "registerCollections", paramsInput.collections, paramsInput.isCollection]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}
