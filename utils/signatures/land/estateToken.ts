import { Admin, EstateToken } from "@typechain-types";
import { getSignatures } from "@utils/blockchain";
import {
    AuthorizeExtractorsParamsInput,
    AuthorizeTokenizersParamsInput,
    UpdateBaseURIParamsInput,
    UpdateCommissionTokenParamsInput,
    UpdateZoneRoyaltyRateParamsInput,
} from "@utils/models/land/estateToken";
import { ethers } from "ethers";


// updateCommissionToken
export async function getUpdateCommissionTokenSignatures(
    estateToken: EstateToken,
    paramsInput: UpdateCommissionTokenParamsInput,
    admins: any[],
    admin: Admin,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address"],
        [estateToken.address, "updateCommissionToken", paramsInput.commissionToken]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}


// updateBaseURI
export async function getUpdateBaseURISignatures(
    estateToken: EstateToken,
    paramsInput: UpdateBaseURIParamsInput,
    admins: any[],
    admin: Admin,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "string"],
        [estateToken.address, "updateBaseURI", paramsInput.uri]
    );

    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}


// authorizeTokenizers
export async function getAuthorizeTokenizersSignatures(
    estateToken: EstateToken,
    paramsInput: AuthorizeTokenizersParamsInput,
    admins: any[],
    admin: Admin,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address[]", "bool"],
        [estateToken.address, "authorizeTokenizers", paramsInput.accounts, paramsInput.isTokenizer]
    );

    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}


// authorizeExtractors
export async function getAuthorizeExtractorsSignatures(
    estateToken: EstateToken,
    paramsInput: AuthorizeExtractorsParamsInput,
    admins: any[],
    admin: Admin,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address[]", "bool"],
        [estateToken.address, "authorizeExtractors", paramsInput.accounts, paramsInput.isExtractor]
    );

    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}


// updateZoneRoyaltyRate
export async function getUpdateZoneRoyaltyRateSignatures(
    estateToken: EstateToken,
    paramsInput: UpdateZoneRoyaltyRateParamsInput,
    admins: any[],
    admin: Admin,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "bytes32", "uint256"],
        [estateToken.address, "updateZoneRoyaltyRate", paramsInput.zone, paramsInput.royaltyRate]
    );

    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}
