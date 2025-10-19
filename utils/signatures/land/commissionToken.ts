// @typechain-types
import { Admin, CommissionToken } from '@typechain-types';

// @utils
import { getSignatures } from '@utils/blockchain';

// @utils/models/land
import { UpdateBaseURIParamsInput, UpdateRoyaltyRateParamsInput } from '@utils/models/land/commissionToken';

// @ethers
import { ethers } from 'ethers';

// updateBaseURI
export async function getUpdateBaseURISignatures(
    commissionToken: CommissionToken,
    paramsInput: UpdateBaseURIParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ['address', 'string', 'string'],
        [commissionToken.address, 'updateBaseURI', paramsInput.uri]
    );

    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

// updateRoyaltyRate
export async function getUpdateRoyaltyRateSignatures(
    commissionToken: CommissionToken,
    paramsInput: UpdateRoyaltyRateParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ['address', 'string', 'uint256'],
        [commissionToken.address, 'updateRoyaltyRate', paramsInput.royaltyRate]
    );

    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}
