import { ethers } from 'ethers';

// @typechain-types
import { Admin, Treasury } from '@typechain-types';

// @utils
import { getSignatures } from '@utils/blockchain';

// @utils/models/liquidity
import { WithdrawOperationFundParamsInput } from '@utils/models/liquidity/treasury';

// withdrawOperationFund
export async function getWithdrawOperationFundSignatures(
    treasury: Treasury,
    paramsInput: WithdrawOperationFundParamsInput,
    admin: Admin,
    admins: any[],
    isValid: boolean = true
) {
    const message = ethers.utils.defaultAbiCoder.encode(
        ['address', 'string', 'address', 'uint256'],
        [treasury.address, 'withdrawOperationFund', paramsInput.operator, paramsInput.value]
    );
    const nonce = await admin.nonce();
    return await getSignatures(message, admins, isValid ? nonce : nonce.add(1));
}
