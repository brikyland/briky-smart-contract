import { ContractTransaction } from 'ethers';

// @nomiclabs/hardhat-ethers
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

// @typechain-types
import { Admin, FeeReceiver } from '@typechain-types';

// @utils/models/common
import { WithdrawParams, WithdrawParamsInput } from '@utils/models/common/feeReceiver';

// @utils/signatures/common
import { getWithdrawSignatures } from '@utils/signatures/common/feeReceiver';

// withdraw
export async function getFeeReceiverTx_Withdraw(
    feeReceiver: FeeReceiver,
    signer: SignerWithAddress,
    params: WithdrawParams,
    txConfig = {}
): Promise<ContractTransaction> {
    return await feeReceiver
        .connect(signer)
        .withdraw(params.receiver, params.currencies, params.values, params.signatures, txConfig);
}

export async function getFeeReceiverTxByInput_Withdraw(
    feeReceiver: FeeReceiver,
    signer: SignerWithAddress,
    paramsInput: WithdrawParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {}
): Promise<ContractTransaction> {
    const params: WithdrawParams = {
        ...paramsInput,
        signatures: await getWithdrawSignatures(feeReceiver, paramsInput, admin, admins),
    };
    return await getFeeReceiverTx_Withdraw(feeReceiver, signer, params, txConfig);
}
