import { ethers, Contract } from 'ethers';

// @typechain-types
import { Admin } from '@typechain-types';

// @utils
import { getSignatures } from '@utils/blockchain';

// @utils/models/lend
import { UpdateBaseURIParamsInput, UpdateFeeRateParamsInput } from '@utils/models/lend/mortgageToken';

// updateBaseURI
export async function getUpdateBaseURISignatures(
    mortgageToken: Contract,
    paramsInput: UpdateBaseURIParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ['address', 'string', 'string'],
        [mortgageToken.address, 'updateBaseURI', paramsInput.uri]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

// updateFeeRate
export async function getUpdateFeeRateSignatures(
    mortgageToken: Contract,
    paramsInput: UpdateFeeRateParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ['address', 'string', 'uint256'],
        [mortgageToken.address, 'updateFeeRate', paramsInput.feeRate]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}
