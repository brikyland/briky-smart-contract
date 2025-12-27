import { ethers } from 'ethers';

// @typechain-types
import { Admin, PrestigePad } from '@typechain-types';

// @utils
import { getSignatures } from '@utils/blockchain';

// @utils/models/launch
import { UpdateBaseUnitPriceRangeParamsInput, WhitelistParamsInput } from '@utils/models/launch/prestigePad';

// updateBaseUnitPriceRange
export async function getUpdateBaseUnitPriceRangeSignatures(
    prestigePad: PrestigePad,
    paramsInput: UpdateBaseUnitPriceRangeParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ['address', 'string', 'uint256', 'uint256'],
        [prestigePad.address, 'updateBaseUnitPriceRange', paramsInput.baseMinUnitPrice, paramsInput.baseMaxUnitPrice]
    );

    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

// whitelist
export async function getWhitelistSignatures(
    prestigePad: PrestigePad,
    paramsInput: WhitelistParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ['address', 'string', 'address[]', 'bool'],
        [prestigePad.address, 'whitelist', paramsInput.accounts, paramsInput.isWhitelisted]
    );

    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}
