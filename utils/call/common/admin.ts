import { Admin } from "@typechain-types";
import { callTransaction } from "@utils/blockchain";
import { 
    TransferAdministration1Params,
    TransferAdministration1ParamsInput,
    TransferAdministration2Params,
    TransferAdministration2ParamsInput,
    TransferAdministration3Params,
    TransferAdministration3ParamsInput,
    TransferAdministration4Params,
    TransferAdministration4ParamsInput,
    TransferAdministration5Params,
    TransferAdministration5ParamsInput,
    AuthorizeManagersParams,
    AuthorizeManagersParamsInput,
    AuthorizeModeratorsParams,
    AuthorizeModeratorsParamsInput,
    AuthorizeGovernorsParams,
    AuthorizeGovernorsParamsInput,
    DeclareZoneParams,
    DeclareZoneParamsInput,
    ActivateInParams,
    ActivateInParamsInput,
    UpdateCurrencyRegistriesParams,
    UpdateCurrencyRegistriesParamsInput
} from "@utils/models/common/admin";
import {
    getTransferAdministration1Signatures,
    getTransferAdministration2Signatures,
    getTransferAdministration3Signatures,
    getTransferAdministration4Signatures,
    getTransferAdministration5Signatures,
    getAuthorizeManagersSignatures,
    getAuthorizeModeratorsSignatures,
    getAuthorizeGovernorsSignatures,
    getDeclareZoneSignatures,
    getActivateInSignatures,
    getUpdateCurrencyRegistriesSignatures
} from "@utils/signatures/common/admin";
import {
    getTransferAdministration1Tx,
    getTransferAdministration2Tx,
    getTransferAdministration3Tx,
    getTransferAdministration4Tx,
    getTransferAdministration5Tx,
    getAuthorizeManagersTx,
    getAuthorizeModeratorsTx,
    getAuthorizeGovernorsTx,
    getDeclareZoneTx,
    getActivateInTx,
    getUpdateCurrencyRegistriesTx
} from "@utils/transaction/common/admin";

export async function callAdmin_TransferAdministration1(
    admin: Admin,
    deployer: any,
    admins: any[],
    paramsInput: TransferAdministration1ParamsInput
) {
    const params: TransferAdministration1Params = {
        ...paramsInput,
        signatures: await getTransferAdministration1Signatures(admin, admins, paramsInput)
    };
    await callTransaction(getTransferAdministration1Tx(admin as Admin, deployer, params));
}

export async function callAdmin_TransferAdministration2(
    admin: Admin,
    deployer: any,
    admins: any[],
    paramsInput: TransferAdministration2ParamsInput
) {
    const params: TransferAdministration2Params = {
        ...paramsInput,
        signatures: await getTransferAdministration2Signatures(admin, admins, paramsInput)
    };
    await callTransaction(getTransferAdministration2Tx(admin as Admin, deployer, params));
}

export async function callAdmin_TransferAdministration3(
    admin: Admin,
    deployer: any,
    admins: any[],
    paramsInput: TransferAdministration3ParamsInput
) {
    const params: TransferAdministration3Params = {
        ...paramsInput,
        signatures: await getTransferAdministration3Signatures(admin, admins, paramsInput)
    };
    await callTransaction(getTransferAdministration3Tx(admin as Admin, deployer, params));
}

export async function callAdmin_TransferAdministration4(
    admin: Admin,
    deployer: any,
    admins: any[],
    paramsInput: TransferAdministration4ParamsInput
) {
    const params: TransferAdministration4Params = {
        ...paramsInput,
        signatures: await getTransferAdministration4Signatures(admin, admins, paramsInput)
    };
    await callTransaction(getTransferAdministration4Tx(admin as Admin, deployer, params));
}

export async function callAdmin_TransferAdministration5(
    admin: Admin,
    deployer: any,
    admins: any[],
    paramsInput: TransferAdministration5ParamsInput
) {
    const params: TransferAdministration5Params = {
        ...paramsInput,
        signatures: await getTransferAdministration5Signatures(admin, admins, paramsInput)
    };
    await callTransaction(getTransferAdministration5Tx(admin as Admin, deployer, params));
}

export async function callAdmin_AuthorizeManagers(
    admin: Admin,
    deployer: any,
    admins: any[],
    paramsInput: AuthorizeManagersParamsInput
) {
    const params: AuthorizeManagersParams = {
        ...paramsInput,
        signatures: await getAuthorizeManagersSignatures(admin, admins, paramsInput)
    };
    await callTransaction(getAuthorizeManagersTx(admin as Admin, deployer, params));
}

export async function callAdmin_AuthorizeModerators(
    admin: Admin,
    deployer: any,
    admins: any[],
    paramsInput: AuthorizeModeratorsParamsInput
) {
    const params: AuthorizeModeratorsParams = {
        ...paramsInput,
        signatures: await getAuthorizeModeratorsSignatures(admin, admins, paramsInput)
    };
    await callTransaction(getAuthorizeModeratorsTx(admin as Admin, deployer, params));
}

export async function callAdmin_AuthorizeGovernors(
    admin: Admin,
    deployer: any,
    admins: any[],
    paramsInput: AuthorizeGovernorsParamsInput
) {
    const params: AuthorizeGovernorsParams = {
        ...paramsInput,
        signatures: await getAuthorizeGovernorsSignatures(admin, admins, paramsInput)
    };
    await callTransaction(getAuthorizeGovernorsTx(admin as Admin, deployer, params));
}

export async function callAdmin_DeclareZone(
    admin: Admin,
    deployer: any,
    admins: any[],
    paramsInput: DeclareZoneParamsInput
) {
    const params: DeclareZoneParams = {
        ...paramsInput,
        signatures: await getDeclareZoneSignatures(admin, admins, paramsInput)
    };
    await callTransaction(getDeclareZoneTx(admin as Admin, deployer, params));
}

export async function callAdmin_ActivateIn(
    admin: Admin,
    deployer: any,
    admins: any[],
    paramsInput: ActivateInParamsInput
) {
    const params: ActivateInParams = {
        ...paramsInput,
        signatures: await getActivateInSignatures(admin, admins, paramsInput)
    };
    await callTransaction(getActivateInTx(admin as Admin, deployer, params));
}

export async function callAdmin_UpdateCurrencyRegistries(
    admin: Admin,
    deployer: any,
    admins: any[],
    paramsInput: UpdateCurrencyRegistriesParamsInput
) {
    const params: UpdateCurrencyRegistriesParams = {
        ...paramsInput,
        signatures: await getUpdateCurrencyRegistriesSignatures(admin, admins, paramsInput)
    };
    await callTransaction(getUpdateCurrencyRegistriesTx(admin as Admin, deployer, params));
}