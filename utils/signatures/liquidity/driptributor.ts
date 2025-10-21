import { ethers } from 'ethers';

// @typechain-types
import { Admin, Driptributor } from '@typechain-types';

// @utils
import { getSignatures } from '@utils/blockchain';

// @utils/models/liquidity
import {
    DistributeTokensWithDurationParamsInput,
    DistributeTokensWithTimestampParamsInput,
    UpdateStakeTokensParamsInput,
} from '@utils/models/liquidity/driptributor';

// updateStakeTokens
export async function getUpdateStakeTokensSignatures(
    driptributor: Driptributor,
    paramsInput: UpdateStakeTokensParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ['address', 'string', 'address', 'address', 'address'],
        [
            driptributor.address,
            'updateStakeTokens',
            paramsInput.stakeToken1,
            paramsInput.stakeToken2,
            paramsInput.stakeToken3,
        ]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

// distributeTokensWithDuration
export async function getDistributeTokensWithDurationSignatures(
    driptributor: Driptributor,
    paramsInput: DistributeTokensWithDurationParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ['address', 'string', 'address[]', 'uint256[]', 'uint40[]', 'string[]'],
        [
            driptributor.address,
            'distributeTokensWithDuration',
            paramsInput.receivers,
            paramsInput.amounts,
            paramsInput.durations,
            paramsInput.notes,
        ]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}

// distributeTokensWithTimestamp
export async function getDistributeTokensWithTimestampSignatures(
    driptributor: Driptributor,
    paramsInput: DistributeTokensWithTimestampParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ['address', 'string', 'address[]', 'uint256[]', 'uint40[]', 'string[]'],
        [
            driptributor.address,
            'distributeTokensWithTimestamp',
            paramsInput.receivers,
            paramsInput.amounts,
            paramsInput.endAts,
            paramsInput.notes,
        ]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}
