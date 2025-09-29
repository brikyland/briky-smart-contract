import { Admin } from "@typechain-types";
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
    UpdateCurrencyRegistriesParams
} from "@utils/models/common/admin";

export async function getTransferAdministration1Tx(
    admin: Admin,
    signer: any,
    params: TransferAdministration1Params,
    txConfig = {}
) {
    return await admin.connect(signer).transferAdministration1(
        params.admin1,
        params.signatures,
        txConfig
    );
}

export async function getTransferAdministration2Tx(
    admin: Admin,
    signer: any,
    params: TransferAdministration2Params,
    txConfig = {}
) {
    return await admin.connect(signer).transferAdministration2(
        params.admin2,
        params.signatures,
        txConfig
    );
}

export async function getTransferAdministration3Tx(
    admin: Admin,
    signer: any,
    params: TransferAdministration3Params,
    txConfig = {}
) {
    return await admin.connect(signer).transferAdministration3(
        params.admin3,
        params.signatures,
        txConfig
    );
}

export async function getTransferAdministration4Tx(
    admin: Admin,
    signer: any,
    params: TransferAdministration4Params,
    txConfig = {}
) {
    return await admin.connect(signer).transferAdministration4(
        params.admin4,
        params.signatures,
        txConfig
    );
}

export async function getTransferAdministration5Tx(
    admin: Admin,
    signer: any,
    params: TransferAdministration5Params,
    txConfig = {}
) {
    return await admin.connect(signer).transferAdministration5(
        params.admin5,
        params.signatures,
        txConfig
    );
}

export async function getAuthorizeManagersTx(
    admin: Admin,
    signer: any,
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

export async function getAuthorizeModeratorsTx(
    admin: Admin,
    signer: any,
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

export async function getAuthorizeGovernorsTx(
    admin: Admin,
    signer: any,
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

export async function getDeclareZoneTx(
    admin: Admin,
    signer: any,
    params: DeclareZoneParams,
    txConfig = {}
) {
    return await admin.connect(signer).declareZone(
        params.zone,
        params.signatures,
        txConfig
    );
}

export async function getActivateInTx(
    admin: Admin,
    signer: any,
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

export async function getUpdateCurrencyRegistriesTx(
    admin: Admin,
    signer: any,
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
