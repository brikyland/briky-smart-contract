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
    signer: SignerWithAddress,
    admin: Admin,
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
    signer: SignerWithAddress,
    admins: any[],
    admin: Admin,
    paramsInput: TransferAdministration1ParamsInput,
    txConfig = {}
) {
    const params: TransferAdministration1Params = {
        ...paramsInput,
        signatures: await getTransferAdministration1Signatures(admins, admin, paramsInput)
    };
    return await getTransferAdministration1Tx(signer, admin, params, txConfig);
}


// transferAdministration2
export async function getTransferAdministration2Tx(
    signer: SignerWithAddress,
    admin: Admin,
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
    signer: SignerWithAddress,
    admins: any[],
    admin: Admin,
    paramsInput: TransferAdministration2ParamsInput,
    txConfig = {}
) {
    const params: TransferAdministration2Params = {
        ...paramsInput,
        signatures: await getTransferAdministration2Signatures(admins, admin, paramsInput)
    };
    return await getTransferAdministration2Tx(signer, admin, params, txConfig);
}


// transferAdministration3
export async function getTransferAdministration3Tx(
    signer: SignerWithAddress,
    admin: Admin,
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
    signer: SignerWithAddress,
    admins: any[],
    admin: Admin,
    paramsInput: TransferAdministration3ParamsInput,
    txConfig = {}
) {
    const params: TransferAdministration3Params = {
        ...paramsInput,
        signatures: await getTransferAdministration3Signatures(admins, admin, paramsInput)
    };
    return await getTransferAdministration3Tx(signer, admin, params, txConfig);
}


// transferAdministration4
export async function getTransferAdministration4Tx(
    signer: SignerWithAddress,
    admin: Admin,
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
    signer: SignerWithAddress,
    admins: any[],
    admin: Admin,
    paramsInput: TransferAdministration4ParamsInput,
    txConfig = {}
) {
    const params: TransferAdministration4Params = {
        ...paramsInput,
        signatures: await getTransferAdministration4Signatures(admins, admin, paramsInput)
    };
    return await getTransferAdministration4Tx(signer, admin, params, txConfig);
}


// transferAdministration5
export async function getTransferAdministration5Tx(
    signer: SignerWithAddress,
    admin: Admin,
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
    signer: SignerWithAddress,
    admins: any[],
    admin: Admin,
    paramsInput: TransferAdministration5ParamsInput,
    txConfig = {}
) {
    const params: TransferAdministration5Params = {
        ...paramsInput,
        signatures: await getTransferAdministration5Signatures(admins, admin, paramsInput)
    };
    return await getTransferAdministration5Tx(signer, admin, params, txConfig);
}


// authorizeManagers
export async function getAuthorizeManagersTx(
    signer: SignerWithAddress,
    admin: Admin,
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
    signer: SignerWithAddress,
    admins: any[],
    admin: Admin,
    paramsInput: AuthorizeManagersParamsInput,
    txConfig = {}
) {
    const params: AuthorizeManagersParams = {
        ...paramsInput,
        signatures: await getAuthorizeManagersSignatures(admins, admin, paramsInput)
    };
    return await getAuthorizeManagersTx(signer, admin, params, txConfig);
}


// authorizeModerators
export async function getAuthorizeModeratorsTx(
    signer: SignerWithAddress,
    admin: Admin,
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
    signer: SignerWithAddress,
    admins: any[],
    admin: Admin,
    paramsInput: AuthorizeModeratorsParamsInput,
    txConfig = {}
) {
    const params: AuthorizeModeratorsParams = {
        ...paramsInput,
        signatures: await getAuthorizeModeratorsSignatures(admins, admin, paramsInput)
    };
    return await getAuthorizeModeratorsTx(signer, admin, params, txConfig);
}


// authorizeGovernors
export async function getAuthorizeGovernorsTx(
    signer: SignerWithAddress,
    admin: Admin,
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
    signer: SignerWithAddress,
    admins: any[],
    admin: Admin,
    paramsInput: AuthorizeGovernorsParamsInput,
    txConfig = {}
) {
    const params: AuthorizeGovernorsParams = {
        ...paramsInput,
        signatures: await getAuthorizeGovernorsSignatures(admins, admin, paramsInput)
    };
    return await getAuthorizeGovernorsTx(signer, admin, params, txConfig);
}


// declareZone
export async function getDeclareZoneTx(
    signer: SignerWithAddress,
    admin: Admin,
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
    signer: SignerWithAddress,
    admins: any[],
    admin: Admin,
    paramsInput: DeclareZoneParamsInput,
    txConfig = {}
) {
    const params: DeclareZoneParams = {
        ...paramsInput,
        signatures: await getDeclareZoneSignatures(admins, admin, paramsInput)
    };
    return await getDeclareZoneTx(signer, admin, params, txConfig);
}


// activateIn
export async function getActivateInTx(
    signer: SignerWithAddress,
    admin: Admin,
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
    signer: SignerWithAddress,
    admins: any[],
    admin: Admin,
    paramsInput: ActivateInParamsInput,
    txConfig = {}
) {
    const params: ActivateInParams = {
        ...paramsInput,
        signatures: await getActivateInSignatures(admins, admin, paramsInput)
    };
    return await getActivateInTx(signer, admin, params, txConfig);
}


// updateCurrencyRegistries
export async function getUpdateCurrencyRegistriesTx(
    signer: SignerWithAddress,
    admin: Admin,
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
    signer: SignerWithAddress,
    admins: any[],
    admin: Admin,
    paramsInput: UpdateCurrencyRegistriesParamsInput,
    txConfig = {}
) {
    const params: UpdateCurrencyRegistriesParams = {
        ...paramsInput,
        signatures: await getUpdateCurrencyRegistriesSignatures(admins, admin, paramsInput)
    };
    return await getUpdateCurrencyRegistriesTx(signer, admin, params, txConfig);
}
