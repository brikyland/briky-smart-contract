import { ethers } from "ethers";

import { Admin } from "@typechain-types";

import { getSignatures } from "@utils/blockchain";
import { 
    TransferAdministration1ParamsInput,
    TransferAdministration2ParamsInput,
    TransferAdministration3ParamsInput,
    TransferAdministration4ParamsInput,
    TransferAdministration5ParamsInput,
    AuthorizeManagersParamsInput,
    AuthorizeModeratorsParamsInput,
    AuthorizeGovernorsParamsInput,
    DeclareZoneParamsInput,
    ActivateInParamsInput,
    UpdateCurrencyRegistriesParamsInput
} from "@utils/models/common/admin";


// transferAdministration1
export async function getTransferAdministration1Signatures(
    admins: any[],
    admin: Admin,
    params: TransferAdministration1ParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address"],
        [admin.address, "transferAdministration1", params.admin1]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}


// transferAdministration2
export async function getTransferAdministration2Signatures(
    admins: any[],
    admin: Admin,
    params: TransferAdministration2ParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address"],
        [admin.address, "transferAdministration2", params.admin2]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}


// transferAdministration3
export async function getTransferAdministration3Signatures(
    admins: any[],
    admin: Admin,
    params: TransferAdministration3ParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address"],
        [admin.address, "transferAdministration3", params.admin3]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}


// transferAdministration4
export async function getTransferAdministration4Signatures(
    admins: any[],
    admin: Admin,
    params: TransferAdministration4ParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address"],
        [admin.address, "transferAdministration4", params.admin4]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}


// transferAdministration5
export async function getTransferAdministration5Signatures(
    admins: any[],
    admin: Admin,
    params: TransferAdministration5ParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address"],
        [admin.address, "transferAdministration5", params.admin5]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}


// authorizeManagers
export async function getAuthorizeManagersSignatures(
    admins: any[],
    admin: Admin,
    params: AuthorizeManagersParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address[]", "bool"],
        [admin.address, "authorizeManagers", params.accounts, params.isManager]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}


// authorizeModerators
export async function getAuthorizeModeratorsSignatures(
    admins: any[],
    admin: Admin,
    params: AuthorizeModeratorsParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address[]", "bool"],
        [admin.address, "authorizeModerators", params.accounts, params.isModerator]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}


// authorizeGovernors
export async function getAuthorizeGovernorsSignatures(
    admins: any[],
    admin: Admin,
    params: AuthorizeGovernorsParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address[]", "bool"],
        [admin.address, "authorizeGovernors", params.accounts, params.isGovernor]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}


// declareZone
export async function getDeclareZoneSignatures(
    admins: any[],
    admin: Admin,
    params: DeclareZoneParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "bytes32"],
        [admin.address, "declareZone", params.zone]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}


// activateIn
export async function getActivateInSignatures(
    admins: any[],
    admin: Admin,
    params: ActivateInParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "bytes32", "address[]", "bool"],
        [admin.address, "activateIn", params.zone, params.accounts, params.isActive]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}


// updateCurrencyRegistries
export async function getUpdateCurrencyRegistriesSignatures(
    admins: any[],
    admin: Admin,
    params: UpdateCurrencyRegistriesParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address[]", "bool[]", "bool[]"],
        [admin.address, "updateCurrencyRegistries", params.currencies, params.isAvailable, params.isExclusive]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}
