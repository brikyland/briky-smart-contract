import { ethers } from 'ethers';

// @typechain-types
import { Admin, EstateToken } from '@typechain-types';

// @utils
import { getSignatures } from '@utils/blockchain';

// @utils/models/land
import {
    AuthorizeExtractorsParamsInput,
    AuthorizeTokenizersParamsInput,
    UpdateBaseURIParamsInput,
    UpdateCommissionTokenParamsInput,
    UpdateZoneRoyaltyRateParamsInput,
} from '@utils/models/land/estateToken';

// updateCommissionToken
export async function getUpdateCommissionTokenSignatures(
    estateToken: EstateToken,
    paramsInput: UpdateCommissionTokenParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ['address', 'string', 'address'],
        [estateToken.address, 'updateCommissionToken', paramsInput.commissionToken]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

// updateBaseURI
export async function getUpdateBaseURISignatures(
    estateToken: EstateToken,
    paramsInput: UpdateBaseURIParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ['address', 'string', 'string'],
        [estateToken.address, 'updateBaseURI', paramsInput.uri]
    );

    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

// authorizeTokenizers
export async function getAuthorizeTokenizersSignatures(
    estateToken: EstateToken,
    paramsInput: AuthorizeTokenizersParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ['address', 'string', 'address[]', 'bool'],
        [estateToken.address, 'authorizeTokenizers', paramsInput.accounts, paramsInput.isTokenizer]
    );

    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

// authorizeExtractors
export async function getAuthorizeExtractorsSignatures(
    estateToken: EstateToken,
    paramsInput: AuthorizeExtractorsParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ['address', 'string', 'address[]', 'bool'],
        [estateToken.address, 'authorizeExtractors', paramsInput.accounts, paramsInput.isExtractor]
    );

    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

// updateZoneRoyaltyRate
export async function getUpdateZoneRoyaltyRateSignatures(
    estateToken: EstateToken,
    paramsInput: UpdateZoneRoyaltyRateParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ['address', 'string', 'bytes32', 'uint256'],
        [estateToken.address, 'updateZoneRoyaltyRate', paramsInput.zone, paramsInput.royaltyRate]
    );

    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}
