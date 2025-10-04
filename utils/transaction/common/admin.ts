import { Admin } from "@typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

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
    UpdateCurrencyRegistriesParamsInput
} from "@utils/models/common/admin";

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
    getUpdateCurrencyRegistriesSignatures
} from "@utils/signatures/common/admin";


// transferAdministration1
export async function getTransferAdministration1Tx(
    admin: Admin,
    signer: SignerWithAddress,
    params: TransferAdministration1Params,
    txConfig = {}
) {
    return await admin.connect(signer).transferAdministration1(
        params.admin1,
        params.signatures,
        txConfig
    );
}

export async function getTransferAdministration1TxByInput(
    admin: Admin,
    signer: SignerWithAddress,
    paramsInput: TransferAdministration1ParamsInput,
    admins: any[],
    txConfig = {}
) {
    const params: TransferAdministration1Params = {
        ...paramsInput,
        signatures: await getTransferAdministration1Signatures(admin, paramsInput, admins)
    };
    return await getTransferAdministration1Tx(admin, signer, params, txConfig);
}


// transferAdministration2
export async function getTransferAdministration2Tx(
    admin: Admin,
    signer: SignerWithAddress,
    params: TransferAdministration2Params,
    txConfig = {}
) {
    return await admin.connect(signer).transferAdministration2(
        params.admin2,
        params.signatures,
        txConfig
    );
}

export async function getTransferAdministration2TxByInput(
    admin: Admin,
    signer: SignerWithAddress,
    paramsInput: TransferAdministration2ParamsInput,
    admins: any[],
    txConfig = {}
) {
    const params: TransferAdministration2Params = {
        ...paramsInput,
        signatures: await getTransferAdministration2Signatures(admin, paramsInput, admins)
    };
    return await getTransferAdministration2Tx(admin, signer, params, txConfig);
}


// transferAdministration3
export async function getTransferAdministration3Tx(
    admin: Admin,
    signer: SignerWithAddress,
    params: TransferAdministration3Params,
    txConfig = {}
) {
    return await admin.connect(signer).transferAdministration3(
        params.admin3,
        params.signatures,
        txConfig
    );
}

export async function getTransferAdministration3TxByInput(
    admin: Admin,
    signer: SignerWithAddress,
    paramsInput: TransferAdministration3ParamsInput,
    admins: any[],
    txConfig = {}
) {
    const params: TransferAdministration3Params = {
        ...paramsInput,
        signatures: await getTransferAdministration3Signatures(admin, paramsInput, admins)
    };
    return await getTransferAdministration3Tx(admin, signer, params, txConfig);
}


// transferAdministration4
export async function getTransferAdministration4Tx(
    admin: Admin,
    signer: SignerWithAddress,
    params: TransferAdministration4Params,
    txConfig = {}
) {
    return await admin.connect(signer).transferAdministration4(
        params.admin4,
        params.signatures,
        txConfig
    );
}

export async function getTransferAdministration4TxByInput(
    admin: Admin,
    signer: SignerWithAddress,
    paramsInput: TransferAdministration4ParamsInput,
    admins: any[],
    txConfig = {}
) {
    const params: TransferAdministration4Params = {
        ...paramsInput,
        signatures: await getTransferAdministration4Signatures(admin, paramsInput, admins)
    };
    return await getTransferAdministration4Tx(admin, signer, params, txConfig);
}


// transferAdministration5
export async function getTransferAdministration5Tx(
    admin: Admin,
    signer: SignerWithAddress,
    params: TransferAdministration5Params,
    txConfig = {}
) {
    return await admin.connect(signer).transferAdministration5(
        params.admin5,
        params.signatures,
        txConfig
    );
}

export async function getTransferAdministration5TxByInput(
    admin: Admin,
    signer: SignerWithAddress,
    paramsInput: TransferAdministration5ParamsInput,
    admins: any[],
    txConfig = {}
) {
    const params: TransferAdministration5Params = {
        ...paramsInput,
        signatures: await getTransferAdministration5Signatures(admin, paramsInput, admins)
    };
    return await getTransferAdministration5Tx(admin, signer, params, txConfig);
}


// authorizeManagers
export async function getAuthorizeManagersTx(
    admin: Admin,
    signer: SignerWithAddress,
    params: AuthorizeManagersParams,
    txConfig = {}
) {
    return await admin.connect(signer).authorizeManagers(
        params.accounts,
        params.isManager,
        params.signatures,
        txConfig
    );
}

export async function getAuthorizeManagersTxByInput(
    admin: Admin,
    signer: SignerWithAddress,
    paramsInput: AuthorizeManagersParamsInput,
    admins: any[],
    txConfig = {}
) {
    const params: AuthorizeManagersParams = {
        ...paramsInput,
        signatures: await getAuthorizeManagersSignatures(admin, paramsInput, admins)
    };
    return await getAuthorizeManagersTx(admin, signer, params, txConfig);
}


// authorizeModerators
export async function getAuthorizeModeratorsTx(
    admin: Admin,
    signer: SignerWithAddress,
    params: AuthorizeModeratorsParams,
    txConfig = {}
) {
    return await admin.connect(signer).authorizeModerators(
        params.accounts,
        params.isModerator,
        params.signatures,
        txConfig
    );
}

export async function getAuthorizeModeratorsTxByInput(
    admin: Admin,
    signer: SignerWithAddress,
    paramsInput: AuthorizeModeratorsParamsInput,
    admins: any[],
    txConfig = {}
) {
    const params: AuthorizeModeratorsParams = {
        ...paramsInput,
        signatures: await getAuthorizeModeratorsSignatures(admin, paramsInput, admins)
    };
    return await getAuthorizeModeratorsTx(admin, signer, params, txConfig);
}


// authorizeGovernors
export async function getAuthorizeGovernorsTx(
    admin: Admin,
    signer: SignerWithAddress,
    params: AuthorizeGovernorsParams,
    txConfig = {}
) {
    return await admin.connect(signer).authorizeGovernors(
        params.accounts,
        params.isGovernor,
        params.signatures,
        txConfig
    );
}

export async function getAuthorizeGovernorsTxByInput(
    admin: Admin,
    signer: SignerWithAddress,
    paramsInput: AuthorizeGovernorsParamsInput,
    admins: any[],
    txConfig = {}
) {
    const params: AuthorizeGovernorsParams = {
        ...paramsInput,
        signatures: await getAuthorizeGovernorsSignatures(admin, paramsInput, admins)
    };
    return await getAuthorizeGovernorsTx(admin, signer, params, txConfig);
}


// declareZone
export async function getDeclareZoneTx(
    admin: Admin,
    signer: SignerWithAddress,
    params: DeclareZoneParams,
    txConfig = {}
) {
    return await admin.connect(signer).declareZone(
        params.zone,
        params.signatures,
        txConfig
    );
}

export async function getDeclareZoneTxByInput(
    admin: Admin,
    signer: SignerWithAddress,
    paramsInput: DeclareZoneParamsInput,
    admins: any[],
    txConfig = {}
) {
    const params: DeclareZoneParams = {
        ...paramsInput,
        signatures: await getDeclareZoneSignatures(admin, paramsInput, admins)
    };
    return await getDeclareZoneTx(admin, signer, params, txConfig);
}


// activateIn
export async function getActivateInTx(
    admin: Admin,
    signer: SignerWithAddress,
    params: ActivateInParams,
    txConfig = {}
) {
    return await admin.connect(signer).activateIn(
        params.zone,
        params.accounts,
        params.isActive,
        params.signatures,
        txConfig
    );
}

export async function getActivateInTxByInput(
    admin: Admin,
    signer: SignerWithAddress,
    paramsInput: ActivateInParamsInput,
    admins: any[],
    txConfig = {}
) {
    const params: ActivateInParams = {
        ...paramsInput,
        signatures: await getActivateInSignatures(admin, paramsInput, admins)
    };
    return await getActivateInTx(admin, signer, params, txConfig);
}


// updateCurrencyRegistries
export async function getUpdateCurrencyRegistriesTx(
    admin: Admin,
    signer: SignerWithAddress,
    params: UpdateCurrencyRegistriesParams,
    txConfig = {}
) {
    return await admin.connect(signer).updateCurrencyRegistries(
        params.currencies,
        params.isAvailable,
        params.isExclusive,
        params.signatures,
        txConfig
    );
}

export async function getUpdateCurrencyRegistriesTxByInput(
    admin: Admin,
    signer: SignerWithAddress,
    paramsInput: UpdateCurrencyRegistriesParamsInput,
    admins: any[],
    txConfig = {}
) {
    const params: UpdateCurrencyRegistriesParams = {
        ...paramsInput,
        signatures: await getUpdateCurrencyRegistriesSignatures(admin, paramsInput, admins)
    };
    return await getUpdateCurrencyRegistriesTx(admin, signer, params, txConfig);
}
