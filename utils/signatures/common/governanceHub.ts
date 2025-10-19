import { ethers } from 'ethers';

// @typechain-types
import { Admin, GovernanceHub } from '@typechain-types';

// @utils
import { getSignatures } from '@utils/blockchain';

// @utils/models/common
import { UpdateFeeParamsInput } from '@utils/models/common/governanceHub';

// updateFee
export async function getUpdateFeeSignatures(
    governanceHub: GovernanceHub,
    paramsInput: UpdateFeeParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ['address', 'string', 'uint256'],
        [governanceHub.address, 'updateFee', paramsInput.fee]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}
