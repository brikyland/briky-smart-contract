import { ContractTransaction } from 'ethers';

// @nomiclabs/hardhat-ethers
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

// @typechain-types
import { Admin } from '@typechain-types';

// @utils/models/common
import {
    TransferAdministration1Params,
    TransferAdministration2Params,
    TransferAdministration3Params,
    TransferAdministration4Params,
    TransferAdministration5Params,
    AuthorizeManagersParams,
    AuthorizeModeratorsParams,
    AuthorizeGovernorsParams,
    DeclareZoneParams,
    ActivateInParams,
    UpdateCurrencyRegistriesParams,
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
import {
    getActivateInSignatures,
    getAuthorizeGovernorsSignatures,
    getAuthorizeManagersSignatures,
    getAuthorizeModeratorsSignatures,
    getDeclareZoneSignatures,
    getTransferAdministration1Signatures,
    getTransferAdministration2Signatures,
    getTransferAdministration3Signatures,
    getTransferAdministration4Signatures,
    getTransferAdministration5Signatures,
    getUpdateCurrencyRegistriesSignatures,
} from '@utils/signatures/common/admin';

// transferAdministration1
export async function getAdminTx_TransferAdministration1(
    admin: Admin,
    signer: SignerWithAddress,
    params: TransferAdministration1Params,
    txConfig = {}
): Promise<ContractTransaction> {
    return await admin.connect(signer).transferAdministration1(params.admin1, params.signatures, txConfig);
}

export async function getAdminTxByInput_TransferAdministration1(
    admin: Admin,
    signer: SignerWithAddress,
    paramsInput: TransferAdministration1ParamsInput,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: TransferAdministration1Params = {
        ...paramsInput,
        signatures: await getTransferAdministration1Signatures(admin, paramsInput, admins),
    };
    return await getAdminTx_TransferAdministration1(admin, signer, params, txConfig);
}

// transferAdministration2
export async function getAdminTx_TransferAdministration2(
    admin: Admin,
    signer: SignerWithAddress,
    params: TransferAdministration2Params,
    txConfig = {}
): Promise<ContractTransaction> {
    return await admin.connect(signer).transferAdministration2(params.admin2, params.signatures, txConfig);
}

export async function getAdminTxByInput_TransferAdministration2(
    admin: Admin,
    signer: SignerWithAddress,
    paramsInput: TransferAdministration2ParamsInput,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: TransferAdministration2Params = {
        ...paramsInput,
        signatures: await getTransferAdministration2Signatures(admin, paramsInput, admins),
    };
    return await getAdminTx_TransferAdministration2(admin, signer, params, txConfig);
}

// transferAdministration3
export async function getAdminTx_TransferAdministration3(
    admin: Admin,
    signer: SignerWithAddress,
    params: TransferAdministration3Params,
    txConfig = {}
): Promise<ContractTransaction> {
    return await admin.connect(signer).transferAdministration3(params.admin3, params.signatures, txConfig);
}

export async function getAdminTxByInput_TransferAdministration3(
    admin: Admin,
    signer: SignerWithAddress,
    paramsInput: TransferAdministration3ParamsInput,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: TransferAdministration3Params = {
        ...paramsInput,
        signatures: await getTransferAdministration3Signatures(admin, paramsInput, admins),
    };
    return await getAdminTx_TransferAdministration3(admin, signer, params, txConfig);
}

// transferAdministration4
export async function getAdminTx_TransferAdministration4(
    admin: Admin,
    signer: SignerWithAddress,
    params: TransferAdministration4Params,
    txConfig = {}
): Promise<ContractTransaction> {
    return await admin.connect(signer).transferAdministration4(params.admin4, params.signatures, txConfig);
}

export async function getAdminTxByInput_TransferAdministration4(
    admin: Admin,
    signer: SignerWithAddress,
    paramsInput: TransferAdministration4ParamsInput,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: TransferAdministration4Params = {
        ...paramsInput,
        signatures: await getTransferAdministration4Signatures(admin, paramsInput, admins),
    };
    return await getAdminTx_TransferAdministration4(admin, signer, params, txConfig);
}

// transferAdministration5
export async function getAdminTx_TransferAdministration5(
    admin: Admin,
    signer: SignerWithAddress,
    params: TransferAdministration5Params,
    txConfig = {}
): Promise<ContractTransaction> {
    return await admin.connect(signer).transferAdministration5(params.admin5, params.signatures, txConfig);
}

export async function getAdminTxByInput_TransferAdministration5(
    admin: Admin,
    signer: SignerWithAddress,
    paramsInput: TransferAdministration5ParamsInput,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: TransferAdministration5Params = {
        ...paramsInput,
        signatures: await getTransferAdministration5Signatures(admin, paramsInput, admins),
    };
    return await getAdminTx_TransferAdministration5(admin, signer, params, txConfig);
}

// authorizeManagers
export async function getAdminTx_AuthorizeManagers(
    admin: Admin,
    signer: SignerWithAddress,
    params: AuthorizeManagersParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return await admin
        .connect(signer)
        .authorizeManagers(params.accounts, params.isManager, params.signatures, txConfig);
}

export async function getAdminTxByInput_AuthorizeManagers(
    admin: Admin,
    signer: SignerWithAddress,
    paramsInput: AuthorizeManagersParamsInput,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: AuthorizeManagersParams = {
        ...paramsInput,
        signatures: await getAuthorizeManagersSignatures(admin, paramsInput, admins),
    };
    return await getAdminTx_AuthorizeManagers(admin, signer, params, txConfig);
}

// authorizeModerators
export async function getAdminTx_AuthorizeModerators(
    admin: Admin,
    signer: SignerWithAddress,
    params: AuthorizeModeratorsParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return await admin
        .connect(signer)
        .authorizeModerators(params.accounts, params.isModerator, params.signatures, txConfig);
}

export async function getAdminTxByInput_AuthorizeModerators(
    admin: Admin,
    signer: SignerWithAddress,
    paramsInput: AuthorizeModeratorsParamsInput,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: AuthorizeModeratorsParams = {
        ...paramsInput,
        signatures: await getAuthorizeModeratorsSignatures(admin, paramsInput, admins),
    };
    return await getAdminTx_AuthorizeModerators(admin, signer, params, txConfig);
}

// authorizeGovernors
export async function getAdminTx_AuthorizeGovernors(
    admin: Admin,
    signer: SignerWithAddress,
    params: AuthorizeGovernorsParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return await admin
        .connect(signer)
        .authorizeGovernors(params.accounts, params.isGovernor, params.signatures, txConfig);
}

export async function getAdminTxByInput_AuthorizeGovernors(
    admin: Admin,
    signer: SignerWithAddress,
    paramsInput: AuthorizeGovernorsParamsInput,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: AuthorizeGovernorsParams = {
        ...paramsInput,
        signatures: await getAuthorizeGovernorsSignatures(admin, paramsInput, admins),
    };
    return await getAdminTx_AuthorizeGovernors(admin, signer, params, txConfig);
}

// declareZone
export async function getAdminTx_DeclareZone(
    admin: Admin,
    signer: SignerWithAddress,
    params: DeclareZoneParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return await admin.connect(signer).declareZone(params.zone, params.signatures, txConfig);
}

export async function getAdminTxByInput_DeclareZone(
    admin: Admin,
    signer: SignerWithAddress,
    paramsInput: DeclareZoneParamsInput,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: DeclareZoneParams = {
        ...paramsInput,
        signatures: await getDeclareZoneSignatures(admin, paramsInput, admins),
    };
    return await getAdminTx_DeclareZone(admin, signer, params, txConfig);
}

// activateIn
export async function getAdminTx_ActivateIn(
    admin: Admin,
    signer: SignerWithAddress,
    params: ActivateInParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return await admin
        .connect(signer)
        .activateIn(params.zone, params.accounts, params.isActive, params.signatures, txConfig);
}

export async function getAdminTxByInput_ActivateIn(
    admin: Admin,
    signer: SignerWithAddress,
    paramsInput: ActivateInParamsInput,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: ActivateInParams = {
        ...paramsInput,
        signatures: await getActivateInSignatures(admin, paramsInput, admins),
    };
    return await getAdminTx_ActivateIn(admin, signer, params, txConfig);
}

// updateCurrencyRegistries
export async function getAdminTx_UpdateCurrencyRegistries(
    admin: Admin,
    signer: SignerWithAddress,
    params: UpdateCurrencyRegistriesParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return await admin
        .connect(signer)
        .updateCurrencyRegistries(
            params.currencies,
            params.isAvailable,
            params.isExclusive,
            params.signatures,
            txConfig
        );
}

export async function getAdminTxByInput_UpdateCurrencyRegistries(
    admin: Admin,
    signer: SignerWithAddress,
    paramsInput: UpdateCurrencyRegistriesParamsInput,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: UpdateCurrencyRegistriesParams = {
        ...paramsInput,
        signatures: await getUpdateCurrencyRegistriesSignatures(admin, paramsInput, admins),
    };
    return await getAdminTx_UpdateCurrencyRegistries(admin, signer, params, txConfig);
}
