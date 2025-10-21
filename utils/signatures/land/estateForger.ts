import { ethers } from 'ethers';

// @typechain-types
import { Admin, EstateForger } from '@typechain-types';

// @utils
import { getSignatures } from '@utils/blockchain';

// @utils/models/land
import { UpdateBaseUnitPriceRangeParamsInput, WhitelistParamsInput } from '@utils/models/land/estateForger';

// updateBaseUnitPriceRange
export async function getUpdateBaseUnitPriceRangeSignatures(
    estateForger: EstateForger,
    paramsInput: UpdateBaseUnitPriceRangeParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ['address', 'string', 'uint256', 'uint256'],
        [estateForger.address, 'updateBaseUnitPriceRange', paramsInput.baseMinUnitPrice, paramsInput.baseMaxUnitPrice]
    );

    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

// whitelist
export async function getWhitelistSignatures(
    estateForger: EstateForger,
    paramsInput: WhitelistParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ['address', 'string', 'address[]', 'bool'],
        [estateForger.address, 'whitelist', paramsInput.accounts, paramsInput.isWhitelisted]
    );

    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}
