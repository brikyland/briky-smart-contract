import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { Admin, FeeReceiver } from "@typechain-types";

import { WithdrawParams, WithdrawParamsInput } from "@utils/models/common/feeReceiver";
import { getWithdrawSignatures } from "@utils/signatures/common/feeReceiver";


// withdraw
export async function getWithdrawTx(
    signer: SignerWithAddress,
    feeReceiver: FeeReceiver,
    params: WithdrawParams,
    txConfig = {},
) {
    return await feeReceiver.connect(signer).withdraw(
        params.receiver,
        params.currencies,
        params.values,
        params.signatures,
        txConfig,
    );
}

export async function getWithdrawTxByInput(
    signer: SignerWithAddress,
    admins: any[],
    admin: Admin,
    feeReceiver: FeeReceiver,
    paramsInput: WithdrawParamsInput,
    txConfig = {},
) {
    const params: WithdrawParams = {
        ...paramsInput,
        signatures: await getWithdrawSignatures(admins, admin, feeReceiver, paramsInput)
    };
    return await getWithdrawTx(signer, feeReceiver, params, txConfig);
}
