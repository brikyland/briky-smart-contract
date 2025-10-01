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

export async function getTransferAdministration1Signatures(
    admin: Admin,
    admins: any[],
    params: TransferAdministration1ParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address"],
        [admin.address, "transferAdministration1", params.admin1]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

export async function getTransferAdministration2Signatures(
    admin: Admin,
    admins: any[],
    params: TransferAdministration2ParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address"],
        [admin.address, "transferAdministration2", params.admin2]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

export async function getTransferAdministration3Signatures(
    admin: Admin,
    admins: any[],
    params: TransferAdministration3ParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address"],
        [admin.address, "transferAdministration3", params.admin3]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

export async function getTransferAdministration4Signatures(
    admin: Admin,
    admins: any[],
    params: TransferAdministration4ParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address"],
        [admin.address, "transferAdministration4", params.admin4]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

export async function getTransferAdministration5Signatures(
    admin: Admin,
    admins: any[],
    params: TransferAdministration5ParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address"],
        [admin.address, "transferAdministration5", params.admin5]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

export async function getAuthorizeManagersSignatures(
    admin: Admin,
    admins: any[],
    params: AuthorizeManagersParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address[]", "bool"],
        [admin.address, "authorizeManagers", params.accounts, params.isManager]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

export async function getAuthorizeModeratorsSignatures(
    admin: Admin,
    admins: any[],
    params: AuthorizeModeratorsParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address[]", "bool"],
        [admin.address, "authorizeModerators", params.accounts, params.isModerator]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

export async function getAuthorizeGovernorsSignatures(
    admin: Admin,
    admins: any[],
    params: AuthorizeGovernorsParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address[]", "bool"],
        [admin.address, "authorizeGovernors", params.accounts, params.isGovernor]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

export async function getDeclareZoneSignatures(
    admin: Admin,
    admins: any[],
    params: DeclareZoneParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "bytes32"],
        [admin.address, "declareZone", params.zone]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

export async function getActivateInSignatures(
    admin: Admin,
    admins: any[],
    params: ActivateInParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "bytes32", "address[]", "bool"],
        [admin.address, "activateIn", params.zone, params.accounts, params.isActive]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

export async function getUpdateCurrencyRegistriesSignatures(
    admin: Admin,
    admins: any[],
    params: UpdateCurrencyRegistriesParamsInput,
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "string", "address[]", "bool[]", "bool[]"],
        [admin.address, "updateCurrencyRegistries", params.currencies, params.isAvailable, params.isExclusive]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}
