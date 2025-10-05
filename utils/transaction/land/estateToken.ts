import { Admin, EstateToken, MockEstateToken, ProxyCaller } from "@typechain-types";
import { MockValidator } from "@utils/mockValidator";
import { RegisterCustodianParams, TokenizeEstateParams, SafeUpdateEstateURIParams, SafeUpdateEstateCustodianParams, SafeDeprecateEstateParams, SafeExtendEstateExpirationParams, UpdateEstateURIParams, UpdateEstateCustodianParams, DeprecateEstateParams, ExtendEstateExpirationParams, RegisterCustodianParamsInput, UpdateCommissionTokenParams, UpdateCommissionTokenParamsInput, UpdateBaseURIParams, UpdateBaseURIParamsInput, AuthorizeTokenizersParams, AuthorizeTokenizersParamsInput, AuthorizeExtractorsParams, AuthorizeExtractorsParamsInput, UpdateZoneRoyaltyRateParams, UpdateZoneRoyaltyRateParamsInput, ExtractEstateParams, UpdateEstateURIParamsInput } from "@utils/models/land/estateToken";
import { getRegisterCustodianValidation, getUpdateEstateURIValidation } from "@utils/validation/land/estateToken";
import { ContractTransaction, ethers } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { getAuthorizeExtractorsSignatures, getAuthorizeTokenizersSignatures, getUpdateBaseURISignatures, getUpdateCommissionTokenSignatures, getUpdateZoneRoyaltyRateSignatures } from "@utils/signatures/land/estateToken";
import { getSafeDeprecateEstateAnchor, getSafeExtendEstateExpirationAnchor, getSafeUpdateEstateCustodianAnchor, getSafeUpdateEstateURIAnchor } from "@utils/anchor/land/estateToken";


// updateCommissionToken
export async function getUpdateCommissionTokenTx(
    estateToken: EstateToken,
    deployer: SignerWithAddress,
    params: UpdateCommissionTokenParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return estateToken.connect(deployer).updateCommissionToken(
        params.commissionToken,
        params.signatures,
        txConfig
    );
}

export async function getUpdateCommissionTokenTxByInput(
    estateToken: EstateToken,
    deployer: SignerWithAddress,
    paramsInput: UpdateCommissionTokenParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: UpdateCommissionTokenParams = {
        ...paramsInput,
        signatures: await getUpdateCommissionTokenSignatures(estateToken, paramsInput, admin, admins)
    };
    return await getUpdateCommissionTokenTx(estateToken, deployer, params, txConfig);
}


// updateBaseURI
export async function getUpdateBaseURITx(
    estateToken: EstateToken,
    deployer: SignerWithAddress,
    params: UpdateBaseURIParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return estateToken.connect(deployer).updateBaseURI(
        params.uri,
        params.signatures,
        txConfig
    );
}

export async function getUpdateBaseURITxByInput(
    estateToken: EstateToken,
    deployer: SignerWithAddress,
    paramsInput: UpdateBaseURIParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: UpdateBaseURIParams = {
        ...paramsInput,
        signatures: await getUpdateBaseURISignatures(estateToken, paramsInput, admin, admins)
    };
    return await getUpdateBaseURITx(estateToken, deployer, params, txConfig);
}


// authorizeTokenizers
export async function getAuthorizeTokenizersTx(
    estateToken: EstateToken,
    deployer: SignerWithAddress,
    params: AuthorizeTokenizersParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return estateToken.connect(deployer).authorizeTokenizers(
        params.accounts,
        params.isTokenizer,
        params.signatures,
        txConfig
    );
}

export async function getAuthorizeTokenizersTxByInput(
    estateToken: EstateToken,
    deployer: SignerWithAddress,
    paramsInput: AuthorizeTokenizersParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: AuthorizeTokenizersParams = {
        ...paramsInput,
        signatures: await getAuthorizeTokenizersSignatures(estateToken, paramsInput, admin, admins)
    };
    return await getAuthorizeTokenizersTx(estateToken, deployer, params, txConfig);
}


// authorizeExtractors
export async function getAuthorizeExtractorsTx(
    estateToken: EstateToken,
    deployer: SignerWithAddress,
    params: AuthorizeExtractorsParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return estateToken.connect(deployer).authorizeExtractors(
        params.accounts,
        params.isExtractor,
        params.signatures,
        txConfig
    );
}

export async function getAuthorizeExtractorsTxByInput(
    estateToken: EstateToken,
    deployer: SignerWithAddress,
    paramsInput: AuthorizeExtractorsParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: AuthorizeExtractorsParams = {
        ...paramsInput,
        signatures: await getAuthorizeExtractorsSignatures(estateToken, paramsInput, admin, admins)
    };
    return await getAuthorizeExtractorsTx(estateToken, deployer, params, txConfig);
}


// updateZoneRoyaltyRate
export async function getUpdateZoneRoyaltyRateTx(
    estateToken: EstateToken,
    deployer: SignerWithAddress,
    params: UpdateZoneRoyaltyRateParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return estateToken.connect(deployer).updateZoneRoyaltyRate(
        params.zone,
        params.royaltyRate,
        params.signatures,
        txConfig
    );
}

export async function getUpdateZoneRoyaltyRateTxByInput(
    estateToken: EstateToken,
    deployer: SignerWithAddress,
    paramsInput: UpdateZoneRoyaltyRateParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: UpdateZoneRoyaltyRateParams = {
        ...paramsInput,
        signatures: await getUpdateZoneRoyaltyRateSignatures(estateToken, paramsInput, admin, admins)
    };
    return await getUpdateZoneRoyaltyRateTx(estateToken, deployer, params, txConfig);
}


// registerCustodian
export async function getRegisterCustodianTx(
    estateToken: EstateToken,
    deployer: SignerWithAddress,
    params: RegisterCustodianParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return estateToken.connect(deployer).registerCustodian(
        params.zone,
        params.custodian,
        params.uri,
        params.validation,
        txConfig
    );
}


export async function getRegisterCustodianTxByInput(
    estateToken: EstateToken,
    deployer: SignerWithAddress,
    paramsInput: RegisterCustodianParamsInput,
    validator: MockValidator,
    txConfig = {}
): Promise<ContractTransaction> {
    const params: RegisterCustodianParams = {
        ...paramsInput,
        validation: await getRegisterCustodianValidation(estateToken, paramsInput, validator)
    };
    return await getRegisterCustodianTx(estateToken, deployer, params, txConfig);
}


// tokenizeEstate
export async function getCallTokenizeEstateTx(
    estateToken: EstateToken,
    proxyCaller: any,
    params: TokenizeEstateParams
): Promise<ContractTransaction> {
    const tx = proxyCaller.call(
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
    return tx;
}


// extractEstate
export async function getCallExtractEstateTx(
    estateToken: EstateToken,
    caller: ProxyCaller,
    params: ExtractEstateParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return caller.call(
        estateToken.address,
        estateToken.interface.encodeFunctionData('extractEstate', [
            params.estateId,
            params.extractionId,
        ]),
        txConfig
    );
}


// safeDeprecateEstate
export async function getSafeDeprecateEstateTx(
    estateToken: EstateToken,
    deployer: SignerWithAddress,
    params: SafeDeprecateEstateParams,
    txConfig = {}
): Promise<ContractTransaction> {
    const tx = estateToken.connect(deployer).safeDeprecateEstate(
        params.estateId,
        params.note,
        params.anchor,
        txConfig
    );
    return tx;
}

export async function getSafeDeprecateEstateTxByParams(
    estateToken: EstateToken,
    deployer: SignerWithAddress,
    paramsInput: DeprecateEstateParams,
    txConfig = {}
): Promise<ContractTransaction> {
    const params: SafeDeprecateEstateParams = {
        ...paramsInput,
        anchor: await getSafeDeprecateEstateAnchor(estateToken, paramsInput)
    };
    return await getSafeDeprecateEstateTx(estateToken, deployer, params, txConfig);
}


// safeExtendEstateExpiration
export async function getSafeExtendEstateExpirationTx(
    estateToken: EstateToken,
    deployer: SignerWithAddress,
    params: SafeExtendEstateExpirationParams,
    txConfig = {}
): Promise<ContractTransaction> {
    const tx = estateToken.connect(deployer).safeExtendEstateExpiration(
        params.estateId,
        params.expireAt,
        params.anchor,
        txConfig
    );
    return tx;
}

export async function getSafeExtendEstateExpirationTxByParams(
    estateToken: EstateToken,
    deployer: SignerWithAddress,
    params: ExtendEstateExpirationParams,
    txConfig = {}
): Promise<ContractTransaction> {
    const safeParams: SafeExtendEstateExpirationParams = {
        ...params,
        anchor: await getSafeExtendEstateExpirationAnchor(estateToken, params)
    };
    return await getSafeExtendEstateExpirationTx(estateToken, deployer, safeParams, txConfig);
}


// safeUpdateEstateCustodian
export async function getSafeUpdateEstateCustodianTx(
    estateToken: EstateToken,
    deployer: SignerWithAddress,
    params: SafeUpdateEstateCustodianParams,
    txConfig = {}
): Promise<ContractTransaction> {
    const tx = estateToken.connect(deployer).safeUpdateEstateCustodian(
        params.estateId,
        params.custodian,
        params.anchor,
        txConfig
    );
    return tx;
}

export async function getSafeUpdateEstateCustodianTxByParams(
    estateToken: EstateToken,
    deployer: SignerWithAddress,
    params: UpdateEstateCustodianParams,
    txConfig = {}
): Promise<ContractTransaction> {
    const safeParams: SafeUpdateEstateCustodianParams = {
        ...params,
        anchor: await getSafeUpdateEstateCustodianAnchor(estateToken, params)
    };
    return await getSafeUpdateEstateCustodianTx(estateToken, deployer, safeParams, txConfig);
}


// safeUpdateEstateURI
export async function getSafeUpdateEstateURITx(
    estateToken: EstateToken,
    deployer: SignerWithAddress,
    params: SafeUpdateEstateURIParams,
    txConfig = {}
): Promise<ContractTransaction> {
    const tx = estateToken.connect(deployer).safeUpdateEstateURI(
        params.estateId,
        params.uri,
        params.validation,
        params.anchor,
        txConfig
    );
    return tx;
}

export async function getSafeUpdateEstateURITxByInput(
    estateToken: EstateToken,
    deployer: SignerWithAddress,
    paramsInput: UpdateEstateURIParamsInput,
    validator: MockValidator,
    txConfig = {}
): Promise<ContractTransaction> {
    const params: SafeUpdateEstateURIParams = {
        ...paramsInput,
        anchor: await getSafeUpdateEstateURIAnchor(estateToken, paramsInput),
        validation: await getUpdateEstateURIValidation(estateToken, paramsInput, validator)
    };
    return await getSafeUpdateEstateURITx(estateToken, deployer, params, txConfig);
}
