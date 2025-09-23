import { EstateToken, MockEstateToken } from "@typechain-types";
import { MockValidator } from "@utils/mockValidator";
import { RegisterCustodianParams, TokenizeEstateParams, SafeUpdateEstateURIParams, SafeUpdateEstateCustodianParams, SafeDeprecateEstateParams, SafeExtendEstateExpirationParams, UpdateEstateURIParams, UpdateEstateCustodianParams, DeprecateEstateParams, ExtendEstateExpirationParams } from "@utils/models/EstateToken";
import { getRegisterCustodianValidation, getUpdateEstateURIValidation } from "@utils/validation/EstateToken";
import { ContractTransaction, ethers } from "ethers";

export async function getRegisterCustodianTx(
    estateToken: EstateToken | MockEstateToken,
    validator: MockValidator,
    deployer: any,
    params: RegisterCustodianParams
): Promise<ContractTransaction> {
    const validation = await getRegisterCustodianValidation(
        estateToken,
        validator,
        params
    );
    const tx = estateToken.connect(deployer).registerCustodian(
        params.zone,
        params.custodian,
        params.uri,
        validation
    );

    return tx;
}

export async function getCallTokenizeEstateTx(
    estateToken: EstateToken | MockEstateToken,
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

export async function getSafeUpdateEstateURITx(
    estateToken: EstateToken | MockEstateToken,
    validator: MockValidator,
    deployer: any,
    params: SafeUpdateEstateURIParams
): Promise<ContractTransaction> {
    const validation = await getUpdateEstateURIValidation(
        estateToken,
        validator,
        params
    );
    const tx = estateToken.connect(deployer).safeUpdateEstateURI(
        params.estateId,
        params.uri,
        validation,
        params.anchor
    );

    return tx;
}

export async function getSafeUpdateEstateCustodianTx(
    estateToken: EstateToken | MockEstateToken,
    deployer: any,
    params: SafeUpdateEstateCustodianParams
): Promise<ContractTransaction> {
    const tx = estateToken.connect(deployer).safeUpdateEstateCustodian(
        params.estateId,
        params.custodian,
        params.anchor
    );
    return tx;
}

export async function getSafeDeprecateEstateTx(
    estateToken: EstateToken | MockEstateToken,
    deployer: any,
    params: SafeDeprecateEstateParams
): Promise<ContractTransaction> {
    const tx = estateToken.connect(deployer).safeDeprecateEstate(
        params.estateId,
        params.data,
        params.anchor
    );
    return tx;
}

export async function getSafeExtendEstateExpirationTx(
    estateToken: EstateToken | MockEstateToken,
    deployer: any,
    params: SafeExtendEstateExpirationParams
): Promise<ContractTransaction> {
    const tx = estateToken.connect(deployer).safeExtendEstateExpiration(
        params.estateId,
        params.expireAt,
        params.anchor
    );
    return tx;
}

export async function getSafeUpdateEstateURITxByParams(
    estateToken: EstateToken | MockEstateToken,
    validator: MockValidator,
    deployer: any,
    params: UpdateEstateURIParams
): Promise<ContractTransaction> {
    const currentURI = await estateToken.uri(params.estateId);
    const safeParams = {
        estateId: params.estateId,
        uri: params.uri,
        anchor: ethers.utils.keccak256(ethers.utils.toUtf8Bytes(currentURI)),
    };
    return await getSafeUpdateEstateURITx(estateToken, validator, deployer, safeParams);
}

export async function getSafeUpdateEstateCustodianTxByParams(
    estateToken: EstateToken | MockEstateToken,
    deployer: any,
    params: UpdateEstateCustodianParams
): Promise<ContractTransaction> {
    const currentURI = await estateToken.uri(params.estateId);
    const safeParams = {
        estateId: params.estateId,
        custodian: params.custodian,
        anchor: ethers.utils.keccak256(ethers.utils.toUtf8Bytes(currentURI)),
    };
    return await getSafeUpdateEstateCustodianTx(estateToken, deployer, safeParams);
}

export async function getSafeDeprecateEstateTxByParams(
    estateToken: EstateToken | MockEstateToken,
    deployer: any,
    params: DeprecateEstateParams
): Promise<ContractTransaction> {
    const currentURI = await estateToken.uri(params.estateId);
    const safeParams: SafeDeprecateEstateParams = {
        estateId: params.estateId,
        data: params.data,
        anchor: ethers.utils.keccak256(ethers.utils.toUtf8Bytes(currentURI)),
    };
    return await getSafeDeprecateEstateTx(estateToken, deployer, safeParams);
}

export async function getSafeExtendEstateExpirationTxByParams(
    estateToken: EstateToken | MockEstateToken,
    deployer: any,
    params: ExtendEstateExpirationParams
): Promise<ContractTransaction> {
    const currentURI = await estateToken.uri(params.estateId);
    const safeParams = {
        estateId: params.estateId,
        expireAt: params.expireAt,
        anchor: ethers.utils.keccak256(ethers.utils.toUtf8Bytes(currentURI)),
    };
    return await getSafeExtendEstateExpirationTx(estateToken, deployer, safeParams);
}
