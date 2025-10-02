import { ethers } from "ethers";

import {
    Admin,
    ReserveVault
} from "@typechain-types";

import { getSignatures } from "@utils/blockchain";

import { AuthorizeProviderParamsInput } from "@utils/models/common/reserveVault";


// authorizeProviders
export async function getAuthorizeProviderSignatures(
    admins: any[],
    admin: Admin,
    reserveVault: ReserveVault,
    paramsInput: AuthorizeProviderParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address[]", "bool"],
        [reserveVault.address, "authorizeProviders", paramsInput.accounts, paramsInput.isProvider]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}
