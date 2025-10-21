import { ethers } from 'ethers';

// @typechain-types
import { Admin } from '@typechain-types';

// @utils
import { getSignatures } from '@utils/blockchain';

// @utils/models/common
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
    UpdateCurrencyRegistriesParamsInput,
} from '@utils/models/common/admin';

// transferAdministration1
export async function getTransferAdministration1Signatures(
    admin: Admin,
    params: TransferAdministration1ParamsInput,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ['address', 'string', 'address'],
        [admin.address, 'transferAdministration1', params.admin1]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

// transferAdministration2
export async function getTransferAdministration2Signatures(
    admin: Admin,
    params: TransferAdministration2ParamsInput,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ['address', 'string', 'address'],
        [admin.address, 'transferAdministration2', params.admin2]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

// transferAdministration3
export async function getTransferAdministration3Signatures(
    admin: Admin,
    params: TransferAdministration3ParamsInput,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ['address', 'string', 'address'],
        [admin.address, 'transferAdministration3', params.admin3]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

// transferAdministration4
export async function getTransferAdministration4Signatures(
    admin: Admin,
    params: TransferAdministration4ParamsInput,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ['address', 'string', 'address'],
        [admin.address, 'transferAdministration4', params.admin4]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

// transferAdministration5
export async function getTransferAdministration5Signatures(
    admin: Admin,
    params: TransferAdministration5ParamsInput,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ['address', 'string', 'address'],
        [admin.address, 'transferAdministration5', params.admin5]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

// authorizeManagers
export async function getAuthorizeManagersSignatures(
    admin: Admin,
    params: AuthorizeManagersParamsInput,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ['address', 'string', 'address[]', 'bool'],
        [admin.address, 'authorizeManagers', params.accounts, params.isManager]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

// authorizeModerators
export async function getAuthorizeModeratorsSignatures(
    admin: Admin,
    params: AuthorizeModeratorsParamsInput,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ['address', 'string', 'address[]', 'bool'],
        [admin.address, 'authorizeModerators', params.accounts, params.isModerator]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

// authorizeGovernors
export async function getAuthorizeGovernorsSignatures(
    admin: Admin,
    params: AuthorizeGovernorsParamsInput,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ['address', 'string', 'address[]', 'bool'],
        [admin.address, 'authorizeGovernors', params.accounts, params.isGovernor]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

// declareZone
export async function getDeclareZoneSignatures(
    admin: Admin,
    params: DeclareZoneParamsInput,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ['address', 'string', 'bytes32'],
        [admin.address, 'declareZone', params.zone]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

// activateIn
export async function getActivateInSignatures(
    admin: Admin,
    params: ActivateInParamsInput,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ['address', 'string', 'bytes32', 'address[]', 'bool'],
        [admin.address, 'activateIn', params.zone, params.accounts, params.isActive]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

// updateCurrencyRegistries
export async function getUpdateCurrencyRegistriesSignatures(
    admin: Admin,
    params: UpdateCurrencyRegistriesParamsInput,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ['address', 'string', 'address[]', 'bool[]', 'bool[]'],
        [admin.address, 'updateCurrencyRegistries', params.currencies, params.isAvailable, params.isExclusive]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}
