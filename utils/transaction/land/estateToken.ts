import {ContractTransaction} from 'ethers';

// @nomiclabs/hardhat-ethers
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

// @typechain-types
import {Admin, EstateToken, ProxyCaller} from '@typechain-types';

// @utils
import {MockValidator} from '@utils/mockValidator';

// @utils/anchor/land
import {
    getSafeDeprecateEstateAnchor,
    getSafeExtendEstateExpirationAnchor,
    getSafeUpdateEstateCustodianAnchor,
    getSafeUpdateEstateURIAnchor,
} from '@utils/anchor/land/estateToken';

// @utils/models/land
import {
    AuthorizeExtractorsParams,
    AuthorizeExtractorsParamsInput,
    AuthorizeTokenizersParams,
    AuthorizeTokenizersParamsInput,
    DeprecateEstateParams,
    ExtendEstateExpirationParams,
    ExtractEstateParams,
    RegisterCustodianParams,
    RegisterCustodianParamsInput,
    SafeDeprecateEstateParams,
    SafeExtendEstateExpirationParams,
    SafeUpdateEstateCustodianParams,
    SafeUpdateEstateURIParams,
    TokenizeEstateParams,
    UpdateBaseURIParams,
    UpdateBaseURIParamsInput,
    UpdateCommissionTokenParams,
    UpdateCommissionTokenParamsInput,
    UpdateEstateCustodianParams,
    UpdateEstateURIParamsInput,
    UpdateZoneRoyaltyRateParams,
    UpdateZoneRoyaltyRateParamsInput,
} from '@utils/models/land/estateToken';

// @utils/validation/land
import {getRegisterCustodianValidation, getUpdateEstateURIValidation} from '@utils/validation/land/estateToken';

// @utils/signatures/land
import {
    getAuthorizeExtractorsSignatures,
    getAuthorizeTokenizersSignatures,
    getUpdateBaseURISignatures,
    getUpdateCommissionTokenSignatures,
    getUpdateZoneRoyaltyRateSignatures,
} from '@utils/signatures/land/estateToken';

// updateCommissionToken
export async function getEstateTokenTx_UpdateCommissionToken(
    estateToken: EstateToken,
    deployer: SignerWithAddress,
    params: UpdateCommissionTokenParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return estateToken.connect(deployer).updateCommissionToken(params.commissionToken, params.signatures, txConfig);
}

export async function getEstateTokenTxByInput_UpdateCommissionToken(
    estateToken: EstateToken,
    deployer: SignerWithAddress,
    paramsInput: UpdateCommissionTokenParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: UpdateCommissionTokenParams = {
        ...paramsInput,
        signatures: await getUpdateCommissionTokenSignatures(estateToken, paramsInput, admin, admins),
    };
    return await getEstateTokenTx_UpdateCommissionToken(estateToken, deployer, params, txConfig);
}

// updateBaseURI
export async function getEstateTokenTx_UpdateBaseURI(
    estateToken: EstateToken,
    deployer: SignerWithAddress,
    params: UpdateBaseURIParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return estateToken.connect(deployer).updateBaseURI(params.uri, params.signatures, txConfig);
}

export async function getEstateTokenTxByInput_UpdateBaseURI(
    estateToken: EstateToken,
    deployer: SignerWithAddress,
    paramsInput: UpdateBaseURIParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: UpdateBaseURIParams = {
        ...paramsInput,
        signatures: await getUpdateBaseURISignatures(estateToken, paramsInput, admin, admins),
    };
    return await getEstateTokenTx_UpdateBaseURI(estateToken, deployer, params, txConfig);
}

// authorizeTokenizers
export async function getEstateTokenTx_AuthorizeTokenizers(
    estateToken: EstateToken,
    deployer: SignerWithAddress,
    params: AuthorizeTokenizersParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return estateToken
        .connect(deployer)
        .authorizeTokenizers(params.accounts, params.isTokenizer, params.signatures, txConfig);
}

export async function getEstateTokenTxByInput_AuthorizeTokenizers(
    estateToken: EstateToken,
    deployer: SignerWithAddress,
    paramsInput: AuthorizeTokenizersParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: AuthorizeTokenizersParams = {
        ...paramsInput,
        signatures: await getAuthorizeTokenizersSignatures(estateToken, paramsInput, admin, admins),
    };
    return await getEstateTokenTx_AuthorizeTokenizers(estateToken, deployer, params, txConfig);
}

// authorizeExtractors
export async function getEstateTokenTx_AuthorizeExtractors(
    estateToken: EstateToken,
    deployer: SignerWithAddress,
    params: AuthorizeExtractorsParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return estateToken
        .connect(deployer)
        .authorizeExtractors(params.accounts, params.isExtractor, params.signatures, txConfig);
}

export async function getEstateTokenTxByInput_AuthorizeExtractors(
    estateToken: EstateToken,
    deployer: SignerWithAddress,
    paramsInput: AuthorizeExtractorsParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: AuthorizeExtractorsParams = {
        ...paramsInput,
        signatures: await getAuthorizeExtractorsSignatures(estateToken, paramsInput, admin, admins),
    };
    return await getEstateTokenTx_AuthorizeExtractors(estateToken, deployer, params, txConfig);
}

// updateZoneRoyaltyRate
export async function getEstateTokenTx_UpdateZoneRoyaltyRate(
    estateToken: EstateToken,
    deployer: SignerWithAddress,
    params: UpdateZoneRoyaltyRateParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return estateToken
        .connect(deployer)
        .updateZoneRoyaltyRate(params.zone, params.royaltyRate, params.signatures, txConfig);
}

export async function getEstateTokenTxByInput_UpdateZoneRoyaltyRate(
    estateToken: EstateToken,
    deployer: SignerWithAddress,
    paramsInput: UpdateZoneRoyaltyRateParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: UpdateZoneRoyaltyRateParams = {
        ...paramsInput,
        signatures: await getUpdateZoneRoyaltyRateSignatures(estateToken, paramsInput, admin, admins),
    };
    return await getEstateTokenTx_UpdateZoneRoyaltyRate(estateToken, deployer, params, txConfig);
}

// registerCustodian
export async function getEstateTokenTx_RegisterCustodian(
    estateToken: EstateToken,
    deployer: SignerWithAddress,
    params: RegisterCustodianParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return estateToken
        .connect(deployer)
        .registerCustodian(params.zone, params.custodian, params.uri, params.validation, txConfig);
}

export async function getEstateTokenTxByInput_RegisterCustodian(
    estateToken: EstateToken,
    deployer: SignerWithAddress,
    paramsInput: RegisterCustodianParamsInput,
    validator: MockValidator,
    txConfig = {}
): Promise<ContractTransaction> {
    const params: RegisterCustodianParams = {
        ...paramsInput,
        validation: await getRegisterCustodianValidation(estateToken, paramsInput, validator),
    };
    return await getEstateTokenTx_RegisterCustodian(estateToken, deployer, params, txConfig);
}

// tokenizeEstate
export async function getCallEstateTokenTx_TokenizeEstate(
    estateToken: EstateToken,
    proxyCaller: any,
    params: TokenizeEstateParams
): Promise<ContractTransaction> {
    return proxyCaller.call(
        estateToken.address,
        estateToken.interface.encodeFunctionData('tokenizeEstate', [
            params.totalSupply,
            params.zone,
            params.tokenizationId,
            params.uri,
            params.expireAt,
            params.custodian,
            params.broker,
        ])
    );
}

// extractEstate
export async function getCallEstateTokenTx_ExtractEstate(
    estateToken: EstateToken,
    caller: ProxyCaller,
    params: ExtractEstateParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return caller.call(
        estateToken.address,
        estateToken.interface.encodeFunctionData('extractEstate', [params.estateId, params.extractionId]),
        txConfig
    );
}

// safeDeprecateEstate
export async function getEstateTokenTx_SafeDeprecateEstate(
    estateToken: EstateToken,
    deployer: SignerWithAddress,
    params: SafeDeprecateEstateParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return estateToken.connect(deployer).safeDeprecateEstate(params.estateId, params.note, params.anchor, txConfig);
}

export async function getEstateTokenTxByParams_SafeDeprecateEstate(
    estateToken: EstateToken,
    deployer: SignerWithAddress,
    paramsInput: DeprecateEstateParams,
    txConfig = {}
): Promise<ContractTransaction> {
    const params: SafeDeprecateEstateParams = {
        ...paramsInput,
        anchor: await getSafeDeprecateEstateAnchor(estateToken, paramsInput),
    };
    return await getEstateTokenTx_SafeDeprecateEstate(estateToken, deployer, params, txConfig);
}

// safeExtendEstateExpiration
export async function getEstateTokenTx_SafeExtendEstateExpiration(
    estateToken: EstateToken,
    deployer: SignerWithAddress,
    params: SafeExtendEstateExpirationParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return estateToken
        .connect(deployer)
        .safeExtendEstateExpiration(params.estateId, params.expireAt, params.anchor, txConfig);
}

export async function getEstateTokenTxByParams_SafeExtendEstateExpiration(
    estateToken: EstateToken,
    deployer: SignerWithAddress,
    params: ExtendEstateExpirationParams,
    txConfig = {}
): Promise<ContractTransaction> {
    const safeParams: SafeExtendEstateExpirationParams = {
        ...params,
        anchor: await getSafeExtendEstateExpirationAnchor(estateToken, params),
    };
    return await getEstateTokenTx_SafeExtendEstateExpiration(estateToken, deployer, safeParams, txConfig);
}

// safeUpdateEstateCustodian
export async function getEstateTokenTx_SafeUpdateEstateCustodian(
    estateToken: EstateToken,
    deployer: SignerWithAddress,
    params: SafeUpdateEstateCustodianParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return estateToken
        .connect(deployer)
        .safeUpdateEstateCustodian(params.estateId, params.custodian, params.anchor, txConfig);
}

export async function getEstateTokenTxByParams_SafeUpdateEstateCustodian(
    estateToken: EstateToken,
    deployer: SignerWithAddress,
    params: UpdateEstateCustodianParams,
    txConfig = {}
): Promise<ContractTransaction> {
    const safeParams: SafeUpdateEstateCustodianParams = {
        ...params,
        anchor: await getSafeUpdateEstateCustodianAnchor(estateToken, params),
    };
    return await getEstateTokenTx_SafeUpdateEstateCustodian(estateToken, deployer, safeParams, txConfig);
}

// safeUpdateEstateURI
export async function getEstateTokenTx_SafeUpdateEstateURI(
    estateToken: EstateToken,
    deployer: SignerWithAddress,
    params: SafeUpdateEstateURIParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return estateToken
        .connect(deployer)
        .safeUpdateEstateURI(params.estateId, params.uri, params.validation, params.anchor, txConfig);
}

export async function getEstateTokenTxByInput_SafeUpdateEstateURI(
    estateToken: EstateToken,
    deployer: SignerWithAddress,
    paramsInput: UpdateEstateURIParamsInput,
    validator: MockValidator,
    txConfig = {}
): Promise<ContractTransaction> {
    const params: SafeUpdateEstateURIParams = {
        ...paramsInput,
        anchor: await getSafeUpdateEstateURIAnchor(estateToken, paramsInput),
        validation: await getUpdateEstateURIValidation(estateToken, paramsInput, validator),
    };
    return await getEstateTokenTx_SafeUpdateEstateURI(estateToken, deployer, params, txConfig);
}
