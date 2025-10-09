import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { Admin, FeeReceiver } from "@typechain-types";

import { WithdrawParams, WithdrawParamsInput } from "@utils/models/common/feeReceiver";
import { getWithdrawSignatures } from "@utils/signatures/common/feeReceiver";
import {ContractTransaction} from "ethers";


// withdraw
export async function getFeeReceiverTx_Withdraw(
    feeReceiver: FeeReceiver,
    signer: SignerWithAddress,
    params: WithdrawParams,
    txConfig = {},
): Promise<ContractTransaction> {
    return await feeReceiver.connect(signer).withdraw(
        params.receiver,
        params.currencies,
        params.values,
        params.signatures,
        txConfig,
    );
}

export async function getFeeReceiverTxByInput_Withdraw(
    feeReceiver: FeeReceiver,
    signer: SignerWithAddress,
    paramsInput: WithdrawParamsInput,
    admin: Admin,
    admins: any[],
    txConfig = {},
): Promise<ContractTransaction> {
    const params: WithdrawParams = {
        ...paramsInput,
        signatures: await getWithdrawSignatures(feeReceiver, paramsInput, admin, admins)
    };
    return await getFeeReceiverTx_Withdraw(feeReceiver, signer, params, txConfig);
}
