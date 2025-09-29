export interface TransferAdministration1ParamsInput {
    admin1: string;
}

export interface TransferAdministration1Params extends TransferAdministration1ParamsInput {
    signatures: string[];
}

export interface TransferAdministration2ParamsInput {
    admin2: string;
}

export interface TransferAdministration2Params extends TransferAdministration2ParamsInput {
    signatures: string[];
}

export interface TransferAdministration3ParamsInput {
    admin3: string;
}

export interface TransferAdministration3Params extends TransferAdministration3ParamsInput {
    signatures: string[];
}

export interface TransferAdministration4ParamsInput {
    admin4: string;
}

export interface TransferAdministration4Params extends TransferAdministration4ParamsInput {
    signatures: string[];
}

export interface TransferAdministration5ParamsInput {
    admin5: string;
}

export interface TransferAdministration5Params extends TransferAdministration5ParamsInput {
    signatures: string[];
}

export interface AuthorizeManagersParamsInput {
    accounts: string[];
    isManager: boolean;
}

export interface AuthorizeManagersParams extends AuthorizeManagersParamsInput {
    signatures: string[];
}

export interface AuthorizeModeratorsParamsInput {
    accounts: string[];
    isModerator: boolean;
}

export interface AuthorizeModeratorsParams extends AuthorizeModeratorsParamsInput {
    signatures: string[];
}

export interface AuthorizeGovernorsParamsInput {
    accounts: string[];
    isGovernor: boolean;
}

export interface AuthorizeGovernorsParams extends AuthorizeGovernorsParamsInput {
    signatures: string[];
}

export interface DeclareZoneParamsInput {
    zone: string;
}

export interface DeclareZoneParams extends DeclareZoneParamsInput {
    signatures: string[];
}

export interface ActivateInParamsInput {
    zone: string;
    accounts: string[];
    isActive: boolean;
}

export interface ActivateInParams extends ActivateInParamsInput {
    signatures: string[];
}

export interface UpdateCurrencyRegistriesParamsInput {
    currencies: string[];
    isAvailable: boolean[];
    isExclusive: boolean[];
}

export interface UpdateCurrencyRegistriesParams extends UpdateCurrencyRegistriesParamsInput {
    signatures: string[];
}
