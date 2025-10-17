import { ethers } from 'ethers';

// @typechain-types
import { EstateToken } from '@typechain-types';

// @utils/models/land
import {
    DeprecateEstateParams,
    ExtendEstateExpirationParams,
    UpdateEstateCustodianParams,
    UpdateEstateURIParamsInput,
} from '@utils/models/land/estateToken';

// safeDeprecateEstate
export async function getSafeDeprecateEstateAnchor(
    estateToken: EstateToken,
    params: DeprecateEstateParams
): Promise<string> {
    const currentURI = await estateToken.uri(params.estateId);
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(currentURI));
}

// safeExtendEstateExpiration
export async function getSafeExtendEstateExpirationAnchor(
    estateToken: EstateToken,
    params: ExtendEstateExpirationParams
): Promise<string> {
    const currentURI = await estateToken.uri(params.estateId);
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(currentURI));
}

// safeUpdateEstateCustodian
export async function getSafeUpdateEstateCustodianAnchor(
    estateToken: EstateToken,
    params: UpdateEstateCustodianParams
): Promise<string> {
    const currentURI = await estateToken.uri(params.estateId);
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(currentURI));
}

// safeUpdateEstateURI
export async function getSafeUpdateEstateURIAnchor(
    estateToken: EstateToken,
    params: UpdateEstateURIParamsInput
): Promise<string> {
    const currentURI = await estateToken.uri(params.estateId);
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(currentURI));
}
