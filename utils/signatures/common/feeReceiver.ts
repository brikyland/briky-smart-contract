import { ethers } from 'ethers';

// @typechain-types
import { Admin, FeeReceiver } from '@typechain-types';

// @utils
import { getSignatures } from '@utils/blockchain';

// @utils/models/common
import { WithdrawParamsInput } from '@utils/models/common/feeReceiver';

// withdraw
export async function getWithdrawSignatures(
    feeReceiver: FeeReceiver,
    paramsInput: WithdrawParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ['address', 'string', 'address', 'address[]', 'uint256[]'],
        [feeReceiver.address, 'withdraw', paramsInput.receiver, paramsInput.currencies, paramsInput.values]
    );
    return await getSignatures(message, admins, isValid ? await admin.nonce() : (await admin.nonce()).add(1));
}
